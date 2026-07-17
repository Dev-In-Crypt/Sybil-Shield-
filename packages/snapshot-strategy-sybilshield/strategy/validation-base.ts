/**
 * LOCAL STAND-IN for score-api's real base class
 * (src/strategies/validations/validation.ts) — copied here (MIT-licensed,
 * same as this repo) so this strategy can be typechecked/tested outside the
 * score-api monorepo, which is where it's meant to end up.
 *
 * AT PR-SUBMISSION TIME: delete this file and change index.ts's import from
 * `./validation-base.js` to `../validation.js` (score-api's real base class,
 * one directory up from `src/strategies/validations/sybilshield/`). No other
 * change needed — the constructor signature and `doValidate` contract match
 * exactly (verified against score-api@master, 2026-07-17).
 *
 * Simplified from the original: `validateAddressType` here only checks the
 * EVM regex; the real class uses snapshot.js's multi-protocol (EVM +
 * Starknet) check. Not a behavior difference for this strategy — SybilShield
 * only ever scores EVM addresses.
 */
export default class Validation {
  public id = "";
  public github = "";
  public version = "";
  public title = "";
  public description = "";

  public author: string;
  public space: string;
  public network: string;
  public snapshot: number | "latest";
  public params: unknown;

  constructor(author: string, space: string, network: string, snapshot: number | "latest", params: unknown) {
    this.author = author;
    this.space = space;
    this.network = network;
    this.snapshot = snapshot;
    this.params = params;
  }

  async validate(customAuthor: string = this.author): Promise<boolean> {
    if (!/^0x[a-fA-F0-9]{40}$/.test(customAuthor)) return false;
    return this.doValidate(customAuthor);
  }

  protected async doValidate(_customAuthor: string): Promise<boolean> {
    return true;
  }
}
