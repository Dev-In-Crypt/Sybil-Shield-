# Contributing to SybilShield

Thanks for considering a contribution.

## What kind of contributions we want

**Strongly welcomed:**
- New detection methods (with a paper or reproducible analysis backing them)
- Adversarial test cases that break the current model
- New labeled data sources with documented provenance
- Bug fixes with tests
- Documentation improvements
- New language SDKs

**Welcomed with caution:**
- Performance optimisations (must include before/after benchmarks)
- New chain support (must include test fixtures)
- UI/UX changes to the dashboard (open an issue first to discuss)

**Out of scope:**
- Detection rules that aren't reproducible from public data
- "Score this address higher because…" — we don't bias for specific projects
- KYC / identity verification features — that's Worldcoin/Civic's lane

## Workflow

1. Open an issue describing what you want to do
2. Get a thumbs-up from a maintainer before writing code (saves wasted effort)
3. Fork → branch → PR
4. Every PR must pass `docker compose -f docker-compose.test.yml up` green
5. New detection methods must include:
   - A test on synthetic data
   - A test on the adversarial set
   - Honest evaluation on T1+T2+G1 holdout (no T4 inflation)

## Code style

- TypeScript: ESLint default + Prettier (2-space, semicolons)
- Python: ruff (configured in `pyproject.toml`) + type hints
- Tests must be deterministic; seed RNG explicitly

## Data contributions

If you submit labeled data:
- Document the source publicly verifiable (GitHub URL, archive.org snapshot, etc.)
- Tag with the appropriate tier (T1–T5 / G1–G2) per the manifest
- Include a note on potential biases

## Security disclosures

Don't open public issues for security holes. Email security@sybilshield.com.
See [SECURITY.md](./SECURITY.md) for details.

## Code of conduct

Be technical, not personal. Disagreements are about methodology, not people.
Adversarial conditions exist between us and farmers, not between contributors.

## Legal

By contributing you agree your contribution is licensed under MIT (the project
license). You retain authorship; the project gains the right to use, modify,
and redistribute.
