"""Step 7.5: cross-chain identity linking via bridge events."""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

from sybilshield.types import Cluster, RawAddressData

# Known bridge contracts per chain. Sparse seed list - production extends.
BRIDGE_CONTRACTS: dict[str, set[str]] = {
    "ethereum": {
        "0x8731d54e9d02c286767d56ac03e8037c07e01e98",  # Stargate router
        "0x66a71dcef29a0ffbdbe3c6a460a3b5bc225cd675",  # Hop bridge
        "0x69b4d362cf7c1ccf0b9c54a47a52d9b71fd9c0e8",  # Across spoke pool (placeholder)
    },
    "arbitrum": {
        "0x53bf833a5d6c4dda888f69c22c88c9f356a41614",  # Stargate
    },
    "optimism": set(),
    "base": set(),
    "polygon": set(),
    "bsc": set(),
    "avalanche": set(),
    "linea": set(),
}


@dataclass(frozen=True)
class BridgeEvent:
    src_chain: str
    src_address: str
    dst_chain: str
    dst_address: str
    amount_wei: int
    timestamp: int
    bridge: str
    src_tx_hash: str


def detect_bridge_events(batch_by_chain: dict[str, list[RawAddressData]]) -> list[BridgeEvent]:
    """Heuristic: a transaction TO a known bridge contract from address A is a candidate."""
    events: list[BridgeEvent] = []
    for chain, batch in batch_by_chain.items():
        bridges = BRIDGE_CONTRACTS.get(chain, set())
        for d in batch:
            for t in d.transactions:
                if t.to_addr in bridges and t.from_addr == d.address:
                    # We do not know the dst yet without indexing bridge events on the other side.
                    # In production this is solved by indexing each bridge's event logs.
                    # For now we record a "half-link" with src side only.
                    events.append(
                        BridgeEvent(
                            src_chain=chain,
                            src_address=d.address,
                            dst_chain="",  # filled in by post-processor
                            dst_address=d.address,  # assumption: same address on dst
                            amount_wei=t.value_wei,
                            timestamp=t.timestamp,
                            bridge=t.to_addr,
                            src_tx_hash=t.tx_hash,
                        )
                    )
    return events


def link_cross_chain(
    batch_by_chain: dict[str, list[RawAddressData]],
) -> list[Cluster]:
    """
    Build entity clusters from cross-chain bridge events.

    Two layers:
      1. Deterministic links from bridge tx (src_addr -> dst_addr).
      2. Probabilistic links from same-funder + tight-time-window across chains.
    """
    events = detect_bridge_events(batch_by_chain)

    # Each address is a node. Edge = same entity. Use union-find.
    parent: dict[tuple[str, str], tuple[str, str]] = {}

    def find(x: tuple[str, str]) -> tuple[str, str]:
        while parent.get(x, x) != x:
            parent[x] = parent.get(parent.get(x, x), parent.get(x, x))
            x = parent.get(x, x)
        return x

    def union(a: tuple[str, str], b: tuple[str, str]) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    for chain, batch in batch_by_chain.items():
        for d in batch:
            parent.setdefault((chain, d.address), (chain, d.address))

    for ev in events:
        if ev.dst_chain == "":
            # Self-bridge: assume same address on every other chain shows up too
            for other_chain in batch_by_chain:
                if other_chain == ev.src_chain:
                    continue
                key = (other_chain, ev.src_address)
                if key in parent:
                    union((ev.src_chain, ev.src_address), key)
        else:
            union((ev.src_chain, ev.src_address), (ev.dst_chain, ev.dst_address))

    # Probabilistic: same funder, same chain, funded within 600s gets merged.
    by_funder: dict[str, list[tuple[str, str, int]]] = defaultdict(list)
    for chain, batch in batch_by_chain.items():
        for d in batch:
            if d.funding_source and d.funding_timestamp:
                by_funder[d.funding_source.lower()].append((chain, d.address, d.funding_timestamp))
    for funder, entries in by_funder.items():
        entries.sort(key=lambda x: x[2])
        for i in range(len(entries) - 1):
            for j in range(i + 1, len(entries)):
                if entries[j][2] - entries[i][2] > 600:
                    break
                if entries[i][0] != entries[j][0]:  # different chains
                    union(
                        (entries[i][0], entries[i][1]),
                        (entries[j][0], entries[j][1]),
                    )

    # Build connected components
    groups: dict[tuple[str, str], list[tuple[str, str]]] = defaultdict(list)
    for node in parent:
        groups[find(node)].append(node)

    clusters: list[Cluster] = []
    for root, members in groups.items():
        chains_set = {c for c, _ in members}
        if len(members) >= 3 and len(chains_set) >= 2:
            clusters.append(
                Cluster(
                    id=f"X-{hash(root) & 0xFFFFFFFF:08x}",
                    method="cross_chain",
                    addresses=sorted({addr for _, addr in members}),
                    size=len(members),
                    confidence=0.85,
                    evidence=(
                        f"Cross-chain entity: {len(members)} addresses across "
                        f"{len(chains_set)} chains ({', '.join(sorted(chains_set))})"
                    ),
                )
            )
    return clusters
