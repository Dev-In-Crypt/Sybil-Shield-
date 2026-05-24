"""Tests for derive_ens_veterans and derive_power_users (mocked, no network)."""
from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

from sybilshield.data.derive_ens_veterans import derive as derive_ens
from sybilshield.data.derive_power_users import derive as derive_power


def _ens_owner(seed: int) -> dict[str, Any]:
    return {"domain": {"owner": {"id": "0x" + f"{seed:040x}"}}}


def test_ens_veterans_pagination_and_csv_schema(tmp_path: Path) -> None:
    out = tmp_path / "ens.csv"
    ckpt = tmp_path / "ckpt.json"

    pages = [
        [_ens_owner(i) for i in range(1, 6)],
        [_ens_owner(i) for i in range(6, 9)],
        [],
    ]

    def fake_pages(_sess: Any, skip: int) -> list[dict[str, Any]]:
        # Translate skip to page index using lengths
        idx = 0
        consumed = 0
        for p in pages:
            if consumed >= skip and len(p) > 0:
                return p
            consumed += len(p)
            idx += 1
        return []

    def fake_count(_sess: Any, addr: str) -> int:
        # Half pass the threshold, half don't, deterministically.
        return 60 if int(addr, 16) % 2 == 0 else 10

    n = derive_ens(
        out_csv=out,
        checkpoint_path=ckpt,
        limit=None,
        min_tx=50,
        sleep_subgraph=0,
        sleep_rpc=0,
        fetch_registrations=fake_pages,
        fetch_count=fake_count,
    )
    assert n > 0
    with out.open() as f:
        rows = list(csv.DictReader(f))
    assert set(rows[0].keys()) == {"address", "chain"}
    assert all(r["chain"] == "ethereum" for r in rows)
    assert all(r["address"].startswith("0x") and len(r["address"]) == 42 for r in rows)


def test_ens_veterans_respects_min_tx_threshold(tmp_path: Path) -> None:
    out = tmp_path / "ens.csv"
    ckpt = tmp_path / "ckpt.json"
    addrs = [_ens_owner(i) for i in range(1, 11)]

    def fake_pages(_sess: Any, skip: int) -> list[dict[str, Any]]:
        return addrs if skip == 0 else []

    def fake_count(_sess: Any, addr: str) -> int:
        return 5  # below threshold

    n = derive_ens(
        out_csv=out,
        checkpoint_path=ckpt,
        min_tx=50,
        sleep_subgraph=0,
        sleep_rpc=0,
        fetch_registrations=fake_pages,
        fetch_count=fake_count,
    )
    assert n == 0
    # CSV exists but only header
    with out.open() as f:
        rows = list(csv.reader(f))
    assert rows == [["address", "chain"]]


def test_ens_veterans_resume_from_checkpoint(tmp_path: Path) -> None:
    """Running the script twice on the same data is a no-op the second time."""
    out = tmp_path / "ens.csv"
    ckpt = tmp_path / "ckpt.json"
    page = [_ens_owner(i) for i in range(2, 12, 2)]  # 5 addresses

    def fake_pages(_sess: Any, skip: int) -> list[dict[str, Any]]:
        return page if skip == 0 else []

    def fake_count(_sess: Any, addr: str) -> int:
        return 100

    n1 = derive_ens(
        out_csv=out,
        checkpoint_path=ckpt,
        sleep_subgraph=0,
        sleep_rpc=0,
        fetch_registrations=fake_pages,
        fetch_count=fake_count,
    )
    n2 = derive_ens(
        out_csv=out,
        checkpoint_path=ckpt,
        sleep_subgraph=0,
        sleep_rpc=0,
        fetch_registrations=fake_pages,
        fetch_count=fake_count,
    )
    assert n1 == 5
    # Second run keeps the existing kept list AND skip pointer past the page
    assert n2 == 5


def test_power_users_keeps_candidates_with_reverse_and_high_tx(tmp_path: Path) -> None:
    candidates = tmp_path / "ens.csv"
    out = tmp_path / "power.csv"
    ckpt = tmp_path / "ckpt.json"
    with candidates.open("w", encoding="utf-8") as f:
        f.write("address,chain\n")
        for i in range(1, 6):
            f.write(f"0x{i:040x},ethereum\n")

    def fake_count(_sess: Any, addr: str) -> int:
        return 500  # >= MIN_TX

    def fake_reverse(_sess: Any, addr: str) -> bool:
        return True

    n = derive_power(
        candidates_csv=candidates,
        out_csv=out,
        checkpoint_path=ckpt,
        sleep_per_check=0,
        fetch_count_fn=fake_count,
        fetch_reverse_fn=fake_reverse,
    )
    assert n == 5
    rows = list(csv.DictReader(out.open()))
    assert len(rows) == 5


def test_power_users_filters_low_tx_count(tmp_path: Path) -> None:
    candidates = tmp_path / "ens.csv"
    out = tmp_path / "power.csv"
    ckpt = tmp_path / "ckpt.json"
    with candidates.open("w", encoding="utf-8") as f:
        f.write("address,chain\n0x" + "01" * 20 + ",ethereum\n")

    def fake_count(_sess: Any, addr: str) -> int:
        return 10  # below MIN_TX

    def fake_reverse(_sess: Any, addr: str) -> bool:
        return True

    n = derive_power(
        candidates_csv=candidates,
        out_csv=out,
        checkpoint_path=ckpt,
        sleep_per_check=0,
        fetch_count_fn=fake_count,
        fetch_reverse_fn=fake_reverse,
    )
    assert n == 0


def test_power_users_filters_no_reverse_record(tmp_path: Path) -> None:
    candidates = tmp_path / "ens.csv"
    out = tmp_path / "power.csv"
    ckpt = tmp_path / "ckpt.json"
    with candidates.open("w", encoding="utf-8") as f:
        f.write("address,chain\n0x" + "02" * 20 + ",ethereum\n")

    def fake_count(_sess: Any, addr: str) -> int:
        return 500

    def fake_reverse(_sess: Any, addr: str) -> bool:
        return False  # no reverse record

    n = derive_power(
        candidates_csv=candidates,
        out_csv=out,
        checkpoint_path=ckpt,
        sleep_per_check=0,
        fetch_count_fn=fake_count,
        fetch_reverse_fn=fake_reverse,
    )
    assert n == 0
