# @sybilshield/snapshot-strategy

Prep package for TODO-306 (Snapshot governance-strategy integration). This
package is **not published or run in production** — it's a self-contained,
tested development environment for a Snapshot Score API validation strategy
that's meant to eventually live in
[snapshot-labs/score-api](https://github.com/snapshot-labs/score-api) (the
current, active repo — the older `snapshot-labs/snapshot-strategies` is
archived and deprecated as of this writing).

## What's here

- `strategy/` — the actual strategy, structured exactly as score-api expects
  a contribution (`index.ts`, `examples.json`, `schema.json`, `README.md`).
  This folder is meant to be copied verbatim into
  `score-api/src/strategies/validations/sybilshield/` at PR time — see
  `strategy/README.md`'s "Note for reviewers" for the one import line that
  needs to change (`./validation-base.js` → `../validation.js`, swapping the
  local test stand-in for score-api's real base class).
- `src/index.test.ts` — a local vitest suite exercising every branch of the
  validation logic against a mocked `fetch`, so the logic is fully verified
  without needing score-api's own toolchain installed.

## Why a validation, not a voting-power strategy

SybilShield's decision model is DROP/REVIEW/KEEP — a gate, not a continuous
weight. Score API's `strategies/` folder (voting power) and `validations/`
folder (binary proposal/vote eligibility) are separate mechanisms; every
real strategy in that repo does its own self-contained data fetching (none
of them wrap another named strategy dynamically), so DROP/REVIEW/KEEP maps
far more naturally onto a validation (`author -> boolean`) than onto a
voting-power multiplier that would need to be summed against an unrelated
token-balance strategy at the space level. See `strategy/index.ts`'s header
comment for the full design reasoning, including why `blockReview` and
`unscoredIsValid` both default to permissive.

## Run it

```bash
cd packages/snapshot-strategy-sybilshield
npm install
npm run typecheck
npm test
```

## What's NOT done here

Submitting the PR to `snapshot-labs/score-api` is a human step — publishing
to a third-party repo isn't something to automate. See TODO-306 in the
internal roadmap for the full split.
