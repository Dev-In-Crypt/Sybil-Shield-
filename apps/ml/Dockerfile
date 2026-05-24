# syntax=docker/dockerfile:1.7
# ML pipeline image.
# Needs build-essential + libffi-dev for hdbscan / leidenalg / lightgbm C ext.

FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/apps/ml

FROM base AS deps
COPY apps/ml/pyproject.toml ./
COPY apps/ml/sybilshield/__init__.py ./sybilshield/__init__.py
RUN pip install -e ".[dev]"

FROM deps AS test
COPY apps/ml ./
CMD ["pytest", "-q", "--tb=short"]

FROM deps AS service
COPY apps/ml ./
EXPOSE 8001
CMD ["uvicorn", "sybilshield.service:app", "--host", "0.0.0.0", "--port", "8001"]
