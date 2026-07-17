# SybilShield

Gates proposal/vote eligibility on an address's public SybilShield
sybil-detection decision. SybilShield ([sybilshield.org](https://www.sybilshield.org))
is a free, open-methodology (MIT-licensed) Sybil-detection service — no API
key or payment required to query it.

## Overview

Calls `GET /v1/score/:address` on SybilShield's public API. That endpoint
returns whatever decision (`DROP` / `REVIEW` / `KEEP`) SybilShield's most
recent analysis computed for the address, if any.

- **`DROP`** → invalid. SybilShield's decision engine flagged this address.
- **`REVIEW`** → valid by default (`blockReview: false`). REVIEW means
  "uncertain", not "confirmed sybil" — SybilShield's own methodology never
  treats a score as proof (see its `SECURITY_NOTES.md`). A space that wants
  stricter gating can set `blockReview: true`.
- **`KEEP`** → valid.
- **No decision on record** (the address was only ever part of a
  `cluster_only`-mode analysis, which doesn't compute a per-address verdict)
  → falls back to `sybil_score < scoreThreshold`.
- **Never analyzed by SybilShield at all** (404 from the API) → valid by
  default (`unscoredIsValid: true`). An address SybilShield has never seen is
  unknown, not guilty — defaulting to invalid would silently block every
  voter outside whatever cohort happened to be analyzed.

## Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `scoreThreshold` | number (0-100) | `70` | Fallback threshold used only when there's no decision on record |
| `blockReview` | boolean | `false` | Also block REVIEW-decision addresses |
| `unscoredIsValid` | boolean | `true` | Treat a never-analyzed address as valid |
| `apiUrl` | string | `https://api.sybilshield.org` | Override for a self-hosted SybilShield instance |

## Requests

One request per `doValidate` call (`GET /v1/score/:address`), well within
the 5-request budget. No API key needed — the endpoint is intentionally
public and free (SybilShield operates as a grant-funded public good, not a
paid service).

## Error handling

On an unexpected API error (5xx, network failure) this throws rather than
defaulting either way — a broken dependency should fail the validation
loudly, not silently pass or silently block. Matches this repository's
`passport-gated` validation's own error-handling convention.

## Note for reviewers

- `validation-base.ts` in this PR's source folder is a local stand-in used
  for standalone development/testing outside this monorepo — delete it and
  change `index.ts`'s import to `../validation.js` before merging (see that
  file's header comment; the constructor signature and `doValidate` contract
  were verified against this repo's real base class).
- `examples.json` currently has one example (the unscored/valid path,
  reproducible against the live public API right now). A second example
  demonstrating the `DROP` path needs a real address SybilShield has already
  scored as DROP — happy to add one if a maintainer points to a suitable
  test fixture, or we can seed one on a public sandbox address before
  merging.

## Source

- Detection methodology: [sybilshield.org/methodology](https://www.sybilshield.org/methodology)
- API docs: [sybilshield.org/docs](https://www.sybilshield.org/docs)
- Repository: [github.com/Dev-In-Crypt/Sybil-Shield-](https://github.com/Dev-In-Crypt/Sybil-Shield-)
