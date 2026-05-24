# Security policy

## Supported versions

Pre-1.0 — only the latest commit on `main` is supported.

## Reporting a vulnerability

**Do not open a public issue.** Email **security@sybilshield.org** with:

- A description of the issue
- Reproduction steps
- Impact assessment (confidentiality / integrity / availability)
- Optional: your suggested fix

We commit to:

| | |
|---|---|
| Acknowledge | within 48 hours |
| Triage | within 72 hours |
| Patch critical | within 7 days |
| Patch high | within 14 days |
| Public disclosure | coordinated with you, max 90 days |

## Bug bounty

The bug bounty program launches alongside the first hosted production deployment. Until then we credit researchers publicly (with your consent) and do not pursue legal action against good-faith research.

## Scope

In scope:
- API endpoints under `/v1/*`
- Authentication flows (API keys, webhooks, appeals)
- Model evasion that produces measurable FP/FN spikes
- Data leaks (customer-to-customer, public-to-customer)

Out of scope:
- Self-XSS that requires the user to paste arbitrary JS into devtools
- Issues in third-party services we depend on (report to them directly)
- Rate-limit bypass on free-tier sandbox
- Vulnerabilities in pre-incorporation infra that don't affect customer data
