/**
 * SybilShield validation strategy for Snapshot's Score API
 * (https://github.com/snapshot-labs/score-api). Gates proposal/vote
 * eligibility on an address's public SybilShield decision — free, no API
 * key, MIT-licensed methodology (https://www.sybilshield.org/methodology).
 *
 * Ready to drop into score-api's `src/strategies/validations/sybilshield/`
 * as-is EXCEPT for one import: swap `./validation-base.js` below for
 * `../validation.js` (score-api's real base class — see validation-base.ts's
 * own header comment for why a local copy exists here).
 *
 * Design notes (read before adjusting defaults):
 * - Prefers the address's `decision` (DROP/REVIEW/KEEP) when SybilShield has
 *   one. Falls back to a `sybil_score < scoreThreshold` heuristic when it
 *   doesn't (cluster_only-mode analyses have no per-address decision).
 * - `blockReview` defaults to false: REVIEW means "uncertain", not
 *   "confirmed sybil" (SECURITY_NOTES.md's own rule — SybilShield never
 *   treats a score as proof). Blocking on REVIEW by default would risk
 *   disenfranchising genuine voters caught in an uncertain zone; a space
 *   that wants stricter gating can opt in.
 * - `unscoredIsValid` defaults to true: an address SybilShield has never
 *   analyzed is unknown, not guilty. Defaulting to false would silently
 *   block every voter outside whatever cohort a customer happened to
 *   submit for analysis — the opposite of what a public-good sybil
 *   detector should do.
 * - On an API error (5xx, network failure, malformed body) this THROWS
 *   rather than defaulting either way, matching score-api's own
 *   `passport-gated` validation's error-handling convention — a proposal/
 *   vote should fail loudly on a broken dependency, not silently pass or
 *   silently block.
 * - Uses SybilShield's public `GET /v1/score/:address` (no API key, no
 *   request-count limit beyond the baseline unauthed rate limit) — a single
 *   request per `doValidate` call, well within score-api's "max 5 requests"
 *   guidance.
 */
import Validation from "./validation-base.js";

interface ScoreResponse {
  address: string;
  sybil_score: number;
  decision: "DROP" | "REVIEW" | "KEEP" | null;
}

export interface SybilShieldParams {
  /** sybil_score fallback threshold (0-100) when the address has no `decision`. */
  scoreThreshold?: number;
  /** Treat REVIEW as invalid too. Default false — see header comment. */
  blockReview?: boolean;
  /** Treat a never-analyzed address as valid. Default true — see header comment. */
  unscoredIsValid?: boolean;
  /** Override for self-hosted SybilShield deployments. */
  apiUrl?: string;
}

const DEFAULT_API_URL = "https://api.sybilshield.org";
const DEFAULT_SCORE_THRESHOLD = 70; // matches the README's own "Precision @ score 70" convention

export default class extends Validation {
  public id = "sybilshield";
  public github = "Dev-In-Crypt";
  public version = "0.1.0";
  public title = "SybilShield";
  public description =
    "Gate proposal/vote eligibility on the address's public SybilShield sybil-detection decision. Free, open-methodology, no API key required.";

  protected async doValidate(customAuthor: string): Promise<boolean> {
    const params = (this.params ?? {}) as SybilShieldParams;
    const apiUrl = (params.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, "");
    const scoreThreshold = params.scoreThreshold ?? DEFAULT_SCORE_THRESHOLD;
    const blockReview = params.blockReview ?? false;
    const unscoredIsValid = params.unscoredIsValid ?? true;

    const res = await fetch(`${apiUrl}/v1/score/${customAuthor}`);

    if (res.status === 404) return unscoredIsValid;
    if (!res.ok) {
      throw new Error(`SybilShield lookup failed: ${res.status} ${res.statusText}`);
    }

    const score = (await res.json()) as ScoreResponse;

    if (score.decision === "DROP") return false;
    if (score.decision === "REVIEW") return !blockReview;
    if (score.decision === "KEEP") return true;

    // No decision on record (cluster_only-mode analysis, or a row from
    // before decisions were tracked) — fall back to the raw score.
    return score.sybil_score < scoreThreshold;
  }
}
