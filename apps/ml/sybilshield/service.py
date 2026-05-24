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


@app.post("/run")
def run(req: RunRequest) -> dict[str, Any]:
    if not req.addresses:
        raise HTTPException(status_code=400, detail="addresses must not be empty")
    pipe = get_pipeline()
    result = pipe.run(req.analysis_id, req.addresses, req.chains)
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
