"""
Curate labeled Sybil/genuine datasets into a single parquet with tier weights.

Reads `labeled/manifest.yaml`, fetches each enabled source, applies conflict
resolution rules, and emits `labeled_addresses.parquet`.

Deterministic: same manifest + same source files -> byte-identical output
(addresses sorted, columns ordered, tier sample weights pinned).
"""
from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from pathlib import Path

import pandas as pd
import yaml

log = logging.getLogger(__name__)

TIER_CONFIDENCE: dict[str, float] = {
    "T1": 0.98,
    "T2": 0.95,
    "T3": 0.85,
    "T4": 0.65,
    "T5": 0.75,
    "G1": 0.95,
    "G2": 0.80,
}

# Sample weight used during LightGBM training.
# Genuine tiers get same numeric weight as their sybil counterparts.
TIER_WEIGHT: dict[str, float] = {
    "T1": 4.0,
    "T2": 3.0,
    "T3": 2.0,
    "T4": 0.8,
    "T5": 1.0,
    "G1": 4.0,
    "G2": 2.0,
}


@dataclass(frozen=True)
class Source:
    id: str
    label_class: str  # "sybil" | "genuine"
    tier: str
    confidence: float
    chains: list[str]
    retrieval: dict
    enabled: bool

    @classmethod
    def from_dict(cls, d: dict) -> "Source":
        return cls(
            id=d["id"],
            label_class=d["label_class"],
            tier=d["tier"],
            confidence=d["confidence"],
            chains=d.get("chains", ["ethereum"]),
            retrieval=d.get("retrieval", {}),
            enabled=d.get("enabled", True),
        )


def load_manifest(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def fetch_source(source: Source, cache_dir: Path) -> pd.DataFrame:
    """Fetch a labeled source. For offline/test mode reads from cache dir."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / f"{source.id}.csv"
    if not cache_file.exists():
        log.warning(
            "Source %s not cached at %s - skipping (offline mode). "
            "In production, fetch from %s",
            source.id,
            cache_file,
            source.retrieval.get("url", "<derived>"),
        )
        return pd.DataFrame(columns=["address", "chain"])
    df = pd.read_csv(cache_file)
    addr_col = source.retrieval.get("address_column", "address")
    if addr_col not in df.columns:
        raise ValueError(f"{source.id}: missing column '{addr_col}'")
    df = df.rename(columns={addr_col: "address"})
    df["address"] = df["address"].str.lower().str.strip()
    df = df[df["address"].str.match(r"^0x[0-9a-f]{40}$")].copy()
    if "chain" not in df.columns:
        df["chain"] = source.chains[0]
    return df[["address", "chain"]].drop_duplicates()


def apply_conflict_rules(rows: pd.DataFrame, rules: list[dict]) -> pd.DataFrame:
    """
    Input: long-form rows with columns [address, chain, label_class, tier, source_id].
    One address+chain may appear multiple times across sources.

    Output: deduped rows. For each (address, chain), choose a single
    (label_class, tier, confidence_weight, sources[]) according to rules.
    """
    out_rows: list[dict] = []
    for (addr, chain), group in rows.groupby(["address", "chain"], sort=False):
        sybil_tiers = sorted(group.loc[group.label_class == "sybil", "tier"].unique().tolist())
        genuine_tiers = sorted(group.loc[group.label_class == "genuine", "tier"].unique().tolist())
        sources = sorted(group["source_id"].unique().tolist())

        decision = _resolve(sybil_tiers, genuine_tiers, rules)
        if decision is None:
            continue  # drop

        chosen_class, chosen_tier = decision
        out_rows.append(
            {
                "address": addr,
                "chain": chain,
                "label": 1 if chosen_class == "sybil" else 0,
                "tier": chosen_tier,
                "confidence": TIER_CONFIDENCE[chosen_tier],
                "sample_weight": TIER_WEIGHT[chosen_tier],
                "sources": ",".join(sources),
            }
        )

    out = pd.DataFrame(out_rows)
    if not out.empty:
        out = out.sort_values(["chain", "address"]).reset_index(drop=True)
    return out


def _resolve(
    sybil_tiers: list[str], genuine_tiers: list[str], rules: list[dict]
) -> tuple[str, str] | None:
    """Apply rules in order. Returns (class, best_tier) or None to drop."""
    s_set, g_set = set(sybil_tiers), set(genuine_tiers)
    if s_set and not g_set:
        return ("sybil", _best_tier(sybil_tiers))
    if g_set and not s_set:
        return ("genuine", _best_tier(genuine_tiers))

    for rule in rules:
        cond = rule.get("if", {})
        if "genuine_tiers" in cond and "sybil_tiers" in cond:
            need_g = set(cond["genuine_tiers"])
            need_s = set(cond["sybil_tiers"])
            if g_set & need_g and s_set & need_s:
                action = rule["then"]
                if action == "keep_genuine":
                    return ("genuine", _best_tier(genuine_tiers))
                if action == "keep_sybil":
                    return ("sybil", _best_tier(sybil_tiers))
                if action == "drop":
                    return None
    # No rule matched the cross-class case - drop to be safe.
    return None


def _best_tier(tiers: list[str]) -> str:
    """Return strongest tier (lowest T-number / G1 over G2)."""
    order = {"T1": 0, "T2": 1, "T3": 2, "T5": 3, "T4": 4, "G1": 0, "G2": 1}
    return min(tiers, key=lambda t: order.get(t, 99))


def curate(
    manifest_path: Path,
    cache_dir: Path,
    out_path: Path,
) -> pd.DataFrame:
    manifest = load_manifest(manifest_path)
    sources = [Source.from_dict(s) for s in manifest["sources"] if s.get("enabled", True)]

    frames: list[pd.DataFrame] = []
    for src in sources:
        df = fetch_source(src, cache_dir)
        if df.empty:
            continue
        df = df.assign(label_class=src.label_class, tier=src.tier, source_id=src.id)
        frames.append(df)

    if not frames:
        log.warning("No source data found; producing empty curated dataset")
        empty = pd.DataFrame(
            columns=["address", "chain", "label", "tier", "confidence", "sample_weight", "sources"]
        )
        empty.to_parquet(out_path, index=False)
        return empty

    long = pd.concat(frames, ignore_index=True)
    curated = apply_conflict_rules(long, manifest.get("conflict_rules", []))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    curated.to_parquet(out_path, index=False)

    digest = hashlib.sha256(out_path.read_bytes()).hexdigest()
    log.info("Curated %d rows -> %s (sha256=%s)", len(curated), out_path, digest[:12])
    return curated


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    root = Path(__file__).resolve().parent
    curate(
        manifest_path=root / "labeled" / "manifest.yaml",
        cache_dir=root / "labeled" / "raw",
        out_path=root / "labeled" / "labeled_addresses.parquet",
    )
