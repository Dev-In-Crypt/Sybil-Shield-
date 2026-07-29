"""
FastAPI HTTP service exposing the pipeline. The Node API enqueues jobs into
BullMQ; the Python worker (or this HTTP service in dev mode) drains them.

Run:
    uvicorn sybilshield.service:app --host 0.0.0.0 --port 8001
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from sybilshield.pipeline import SybilShieldPipeline
from sybilshield.providers.mock import MockProvider
from sybilshield.scoring.model import SybilModel

log = logging.getLogger(__name__)
app = FastAPI(title="SybilShield ML Service", version="0.1.0")


class RunRequest(BaseModel):
    analysis_id: str = Field(..., min_length=1)
    addresses: list[str]
    chains: list[str] = Field(default_factory=lambda: ["ethereum"])
    preset: str | None = None


class FirstSightRequest(BaseModel):
    """TODO-312 Phase 1 — single address, single chain. No `chains: list[]`
    on purpose (docs/design/realtime-first-sight-scoring.md §3: multi-chain
    on the synchronous path multiplies cost 1:1 per chain for zero added
    rate-limit protection)."""

    address: str = Field(..., min_length=1)
    chain: str = Field(default="ethereum")


def _build_pipeline() -> SybilShieldPipeline:
    use_mock = os.environ.get("USE_MOCK_PROVIDERS", "true") == "true"
    if use_mock:
        provider = MockProvider()
    else:
        from sybilshield.providers.alchemy import AlchemyProvider

        provider = AlchemyProvider(rps=float(os.environ.get("ALCHEMY_RATE_LIMIT_RPS", "10")))

    model = None
    model_path = os.environ.get("ML_MODEL_PATH")
    if model_path and Path(model_path).exists():
        try:
            model = SybilModel.load(Path(model_path))
            log.info("loaded model: %s", model.artifact.version)
        except Exception as e:
            log.warning("failed to load model from %s: %s", model_path, e)

    return SybilShieldPipeline(provider=provider, model=model)


_pipeline: SybilShieldPipeline | None = None


def get_pipeline() -> SybilShieldPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = _build_pipeline()
    return _pipeline


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "service": "sybilshield-ml"}


@app.post("/cluster-only")
def cluster_only(req: RunRequest) -> dict[str, Any]:
    """
    Cluster-only mode: ingests addresses, runs the 4 clustering modules,
    returns clusters + addr_to_clusters map. No per-address ML scoring.

    Worker side (apps/api/src/workers/analyze.worker.ts) calls this when
    the analysis was created with mode='cluster_only', and synthesises
    minimal addressScores rows for addresses that landed in any cluster.
    """
    if not req.addresses:
        raise HTTPException(status_code=400, detail="addresses must not be empty")
    pipe = get_pipeline()
    all_clusters, addr_to_clusters, cu_consumed = pipe.run_clusters_only(
        req.analysis_id, req.addresses, req.chains
    )
    return {
        "analysis_id": req.analysis_id,
        "clusters": [
            {
                "id": c.id,
                "method": c.method,
                "size": c.size,
                "confidence": c.confidence,
                "evidence": c.evidence,
            }
            for c in all_clusters
        ],
        "addr_to_clusters": addr_to_clusters,
        "cu_consumed": cu_consumed,
    }


@app.post("/first-sight")
def first_sight(req: FirstSightRequest) -> dict[str, Any]:
    """
    Synchronous single-address, single-chain score — TODO-312 Phase 1.

    Deliberately on the SAME FastAPI process as /run and /cluster-only,
    reusing get_pipeline()'s singleton (and therefore its AlchemyProvider's
    RateLimiter) rather than a separate service — this is a hard
    requirement from docs/design/realtime-first-sight-scoring.md §4: a
    second process would get its own independent rate limiter with no
    knowledge of this one's concurrent usage, silently letting the account
    exceed its real Alchemy throughput ceiling.

    Caller (apps/api/src/routes/first-sight.ts) owns the write-through
    cache check and rate limiting *before* calling this — every call here
    is real Alchemy spend.
    """
    if not req.address:
        raise HTTPException(status_code=400, detail="address must not be empty")
    pipe = get_pipeline()
    try:
        result = pipe.run_first_sight(req.address, req.chain)
    except Exception as e:  # noqa: BLE001 - ingest/provider failures degrade to 502, not a raw 500
        log.warning("first-sight failed for %s/%s: %s", req.address, req.chain, e)
        raise HTTPException(status_code=502, detail="first_sight_ingest_failed") from e
    return {
        "address": result.address,
        "chain": result.chain,
        "sybil_score": result.sybil_score,
        "label": result.label,
        "confidence": result.confidence,
        "evidence": result.evidence,
        "cu_consumed": result.cu_consumed,
    }


@app.post("/run")
def run(req: RunRequest) -> dict[str, Any]:
    if not req.addresses:
        raise HTTPException(status_code=400, detail="addresses must not be empty")
    pipe = get_pipeline()
    result = pipe.run(req.analysis_id, req.addresses, req.chains, preset=req.preset)
    # Trim large fields for HTTP transport
    compact_scores = [
        {
            "address": addr,
            "sybil_score": s["sybil_score"],
            "label": s["label"],
            "confidence": s["confidence"],
            "cluster_id": s["cluster_id"],
            "cluster_size": s["cluster_size"],
            "evidence": s["evidence"],
        }
        for addr, s in result.scores.items()
    ]
    return {
        "analysis_id": result.analysis_id,
        "summary": result.summary,
        "scores": compact_scores,
        "clusters": [
            {
                "id": c.id,
                "method": c.method,
                "size": c.size,
                "confidence": c.confidence,
                "evidence": c.evidence,
            }
            for c in result.clusters
        ],
        "cu_consumed": result.cu_consumed,
    }
