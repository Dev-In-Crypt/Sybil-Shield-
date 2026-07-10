import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PRESETS } from "../src/lib/presets.js";

/**
 * TS ↔ Python preset drift guard.
 *
 * `apps/ml/sybilshield/scoring/presets.py` is a hand-maintained mirror of the
 * canonical `apps/api/src/lib/presets.ts` (the worker's TS version computes the
 * live decision; the Python copy exists only for offline retrain/eval). For v1
 * they are kept in sync by hand (see DECISIONS.md), which is a standing drift
 * risk: a threshold edited in one file but not the other silently diverges the
 * dashboard/server decision from any Python-side preview.
 *
 * This test parses the numeric thresholds + descriptions straight out of the
 * Python source and asserts they equal the canonical TS values. If the two ever
 * drift, this fails in the normal `npm --workspace apps/api run test` run (and
 * therefore in CI) — no codegen needed, and no way to bypass it silently.
 *
 * If `presets.py` is heavily reformatted the regex below may need a touch-up;
 * that is intentional friction on the one file pair that must stay identical.
 */

const PY_PATH = fileURLToPath(
  new URL("../../ml/sybilshield/scoring/presets.py", import.meta.url),
);

function num(raw: string): number | null {
  return raw === "None" ? null : Number(raw);
}

interface PyPreset {
  description: string;
  drop: { score_gte: number | null; cluster_size_gte: number | null };
  review: { score_gte: number | null; cluster_size_gte: number | null };
}

/** Extract one preset's config from the Python source, or null if not found. */
function parsePyPreset(src: string, name: string): PyPreset | null {
  const N = "(\\d+|None)";
  const re = new RegExp(
    `"${name}":\\s*PresetConfig\\(\\s*` +
      `description="([^"]*)",\\s*` +
      `drop=Threshold\\(score_gte=${N},\\s*cluster_size_gte=${N}\\),\\s*` +
      `review=Threshold\\(score_gte=${N},\\s*cluster_size_gte=${N}\\),?\\s*\\)`,
  );
  const m = src.match(re);
  if (!m) return null;
  return {
    description: m[1]!,
    drop: { score_gte: num(m[2]!), cluster_size_gte: num(m[3]!) },
    review: { score_gte: num(m[4]!), cluster_size_gte: num(m[5]!) },
  };
}

describe("preset TS↔Python sync guard", () => {
  const pySrc = readFileSync(PY_PATH, "utf8");

  it("every canonical preset exists in the Python mirror", () => {
    for (const name of Object.keys(PRESETS)) {
      expect(parsePyPreset(pySrc, name), `Python mirror is missing preset "${name}"`).not.toBeNull();
    }
  });

  it("Python thresholds + descriptions match the canonical TS presets exactly", () => {
    for (const [name, ts] of Object.entries(PRESETS)) {
      const py = parsePyPreset(pySrc, name);
      expect(py, `preset "${name}" not parseable from presets.py`).not.toBeNull();
      expect({ name, ...py! }).toEqual({
        name,
        description: ts.description,
        drop: { score_gte: ts.drop.score_gte, cluster_size_gte: ts.drop.cluster_size_gte },
        review: { score_gte: ts.review.score_gte, cluster_size_gte: ts.review.cluster_size_gte },
      });
    }
  });

  it("the Python mirror defines no extra presets beyond the canonical set", () => {
    // Count preset keys inside the PRESETS dict block (each is `"name": PresetConfig(`).
    const pyNames = [...pySrc.matchAll(/"(\w+)":\s*PresetConfig\(/g)].map((m) => m[1]!);
    expect(new Set(pyNames)).toEqual(new Set(Object.keys(PRESETS)));
  });
});
