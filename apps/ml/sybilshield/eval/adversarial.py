"""
Adversarial test set: hand-crafted addresses simulating known evasion techniques.

If recall on this set drops over time, farmers have adapted - retrain trigger.
"""
from __future__ import annotations

import hashlib
import random

from sybilshield.types import RawAddressData, Transaction


def _hash_addr(s: str) -> str:
    return "0x" + hashlib.sha256(s.encode()).hexdigest()[:40]


def generate_adversarial_set(n_per_technique: int = 100, seed: int = 13) -> list[RawAddressData]:
    """
    Generate `n_per_technique` synthetic sybil wallets per evasion technique.

    Techniques (each must still be detectable - that's the requirement):
      1. Randomized inter-tx timing (Poisson) but shared funder
      2. CEX-funded but identical contract sequence
      3. Long dormancy + slow burst
      4. Multi-hop funding chain (3+ hops)
      5. "Noise" txs interspersed but still high autocorrelation in trade pattern
    """
    rng = random.Random(seed)
    out: list[RawAddressData] = []

    out.extend(_technique_randomized_timing(n_per_technique, rng))
    out.extend(_technique_cex_funded_scripted(n_per_technique, rng))
    out.extend(_technique_dormant_burst(n_per_technique, rng))
    out.extend(_technique_multihop_funding(n_per_technique, rng))
    out.extend(_technique_noisy_scripted(n_per_technique, rng))

    return out


def _technique_randomized_timing(n: int, rng: random.Random) -> list[RawAddressData]:
    funder = _hash_addr("adv-shared-funder")
    out = []
    for k in range(n):
        addr = _hash_addr(f"adv-rand-{k}")
        ts = 1_700_000_000 + rng.randint(0, 3600)
        txs = [Transaction(_hash_addr(f"f-{k}"), funder, addr, int(0.05 * 1e18), ts, "ethereum", "external")]
        cur = ts
        for i in range(20):
            cur += int(rng.expovariate(1 / 600))
            txs.append(
                Transaction(
                    _hash_addr(f"t-{k}-{i}"),
                    addr,
                    _hash_addr(f"step-{i % 4}"),
                    10**16,
                    cur,
                    "ethereum",
                    "external",
                )
            )
        out.append(
            RawAddressData(
                address=addr,
                chain="ethereum",
                transactions=txs,
                funding_source=funder,
                funding_timestamp=ts,
                funding_amount_wei=int(0.05 * 1e18),
                first_tx_timestamp=ts,
                last_tx_timestamp=cur,
                total_tx_count=len(txs),
            )
        )
    return out


def _technique_cex_funded_scripted(n: int, rng: random.Random) -> list[RawAddressData]:
    from sybilshield.ingest import KNOWN_EXCHANGES

    cex = next(iter(KNOWN_EXCHANGES))
    out = []
    for k in range(n):
        addr = _hash_addr(f"adv-cex-{k}")
        ts = 1_700_000_000 + rng.randint(0, 86400)
        txs = [Transaction(_hash_addr(f"cf-{k}"), cex, addr, int(0.05 * 1e18), ts, "ethereum", "external")]
        cur = ts + 60
        for i in range(15):
            cur += 30  # rigidly scripted
            txs.append(
                Transaction(_hash_addr(f"ct-{k}-{i}"), addr, _hash_addr(f"s-{i % 3}"), 10**16, cur, "ethereum", "external")
            )
        out.append(
            RawAddressData(
                address=addr,
                chain="ethereum",
                transactions=txs,
                funding_source=cex,
                funding_timestamp=ts,
                first_tx_timestamp=ts,
                last_tx_timestamp=cur,
                total_tx_count=len(txs),
            )
        )
    return out


def _technique_dormant_burst(n: int, rng: random.Random) -> list[RawAddressData]:
    funder = _hash_addr("dormant-funder")
    out = []
    for k in range(n):
        addr = _hash_addr(f"adv-dorm-{k}")
        ts = 1_650_000_000
        txs = [Transaction(_hash_addr(f"df-{k}"), funder, addr, int(0.01 * 1e18), ts, "ethereum", "external")]
        # Long dormancy
        cur = ts + 86400 * 400
        for i in range(30):
            cur += rng.randint(20, 60)
            txs.append(
                Transaction(_hash_addr(f"dt-{k}-{i}"), addr, _hash_addr(f"b-{i % 5}"), 10**16, cur, "ethereum", "external")
            )
        out.append(
            RawAddressData(
                address=addr, chain="ethereum", transactions=txs,
                funding_source=funder, funding_timestamp=ts,
                first_tx_timestamp=ts, last_tx_timestamp=cur,
                total_tx_count=len(txs),
            )
        )
    return out


def _technique_multihop_funding(n: int, rng: random.Random) -> list[RawAddressData]:
    out = []
    for k in range(n):
        addr = _hash_addr(f"adv-mh-{k}")
        hop = _hash_addr(f"hop-{k // 5}")  # 5 addresses share a hop
        ts = 1_700_000_000 + rng.randint(0, 86400)
        txs = [Transaction(_hash_addr(f"mf-{k}"), hop, addr, int(0.05 * 1e18), ts, "ethereum", "external")]
        cur = ts + 600
        for i in range(15):
            cur += rng.randint(40, 80)
            txs.append(
                Transaction(_hash_addr(f"mt-{k}-{i}"), addr, _hash_addr(f"p-{i % 4}"), 10**16, cur, "ethereum", "external")
            )
        out.append(
            RawAddressData(
                address=addr, chain="ethereum", transactions=txs,
                funding_source=hop, funding_timestamp=ts,
                first_tx_timestamp=ts, last_tx_timestamp=cur,
                total_tx_count=len(txs),
            )
        )
    return out


def _technique_noisy_scripted(n: int, rng: random.Random) -> list[RawAddressData]:
    funder = _hash_addr("noise-funder")
    out = []
    for k in range(n):
        addr = _hash_addr(f"adv-noise-{k}")
        ts = 1_700_000_000 + rng.randint(0, 3600)
        txs = [Transaction(_hash_addr(f"nf-{k}"), funder, addr, int(0.05 * 1e18), ts, "ethereum", "external")]
        cur = ts + 300
        for i in range(40):
            # Mix script intervals with random noise
            if i % 3 == 0:
                cur += rng.randint(3000, 7000)  # noise
            else:
                cur += rng.randint(28, 32)  # script
            txs.append(
                Transaction(_hash_addr(f"nt-{k}-{i}"), addr, _hash_addr(f"x-{i % 4}"), 10**16, cur, "ethereum", "external")
            )
        out.append(
            RawAddressData(
                address=addr, chain="ethereum", transactions=txs,
                funding_source=funder, funding_timestamp=ts,
                first_tx_timestamp=ts, last_tx_timestamp=cur,
                total_tx_count=len(txs),
            )
        )
    return out


def evaluate_adversarial(model, adversarial_batch: list[RawAddressData]) -> float:
    """
    Returns recall at threshold 70 on the adversarial set.

    `model` is a SybilModel; we extract features and score.
    """
    from sybilshield.features.combine import extract_all_features
    from sybilshield.scoring.predict import predict_batch

    feats = extract_all_features(adversarial_batch)
    preds = predict_batch(model, feats)
    n = len(preds)
    if n == 0:
        return 0.0
    detected = sum(1 for v in preds.values() if v["sybil_score"] >= 70)
    return detected / n
