// Iteration pipeline logic: naming rules, override validation + merge over the
// base semantic tier, and per-iteration CSS rendering. Pure functions — file
// I/O and orchestration live in build.mjs and the CLI; tests feed data
// directly.
//
// An iteration is a directory of DTCG override files: leaves whose dot-paths
// must already exist in the base SEMANTIC tier. Values may be literals or
// full `{reference}` values; references emit as `var(--ds-…)` so base
// primitives keep flowing through. The primitive tree is never duplicated.
import { readdir } from "node:fs/promises";
import { fullValueRef } from "./validate-tokens.mjs";

/** Iteration names become directory names and `data-iteration` attribute values. */
export const ITERATION_NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * @param {string} name
 * @returns {string | null} reason the name is invalid, or null when valid
 */
export function validateIterationName(name) {
  if (typeof name !== "string" || name.length === 0) {
    return "iteration name is required";
  }
  if (!ITERATION_NAME_PATTERN.test(name)) {
    return `iteration name "${name}" is invalid — use kebab-case matching ${ITERATION_NAME_PATTERN} (e.g. "midnight")`;
  }
  return null;
}

/**
 * List iteration names: immediate subdirectories of the iterations root.
 *
 * @param {string} iterationsRoot
 * @returns {Promise<string[]>} sorted names
 */
export async function listIterations(iterationsRoot) {
  try {
    const entries = await readdir(iterationsRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === "ENOENT") return [];
    throw error;
  }
}

/** A string that embeds a `{reference}` without being one on its own. */
function isEmbeddedRef(value) {
  if (typeof value !== "string") return false;
  if (fullValueRef(value) !== null) return false;
  return /\{[^{}]+\}/.test(value);
}

/**
 * Merge one iteration's overrides over the base token graph.
 *
 * Every override path must exist in the base semantic tier (overriding a
 * primitive or an unknown path fails loudly), must not change the token's
 * type, and must be a scalar or full `{reference}` value. Overridden tokens
 * keep the override's file attribution so downstream validation errors name
 * the override file.
 *
 * @param {{ name: string, overrides: Map<string, {path: string[], type: string|undefined, value: unknown, file: string}>, base: Map<string, {path: string[], type: string|undefined, value: unknown, file: string}> }} input
 *   `base` is the full base graph (primitive + semantic tiers).
 * @returns {{ merged: Map<string, {path: string[], type: string|undefined, value: unknown, file: string}>, overridden: string[], errors: Array<{kind: 'unknown-path'|'not-semantic'|'type-mismatch'|'unsupported-value', message: string}> }}
 *   `merged` is a fresh Map — `base` is never mutated.
 */
export function mergeIteration({ name, overrides, base }) {
  const errors = [];
  const merged = new Map(base);
  const overridden = [];

  for (const path of [...overrides.keys()].sort()) {
    const override = overrides.get(path);
    const baseToken = base.get(path);
    if (!baseToken) {
      errors.push({
        kind: "unknown-path",
        message: `${override.file}: iteration "${name}" overrides unknown token "${path}" — override paths must match an existing semantic token`,
      });
      continue;
    }
    if (!baseToken.file.split(/[\\/]/).includes("semantic")) {
      errors.push({
        kind: "not-semantic",
        message: `${override.file}: iteration "${name}" overrides "${path}", which is a primitive token — iterations override the semantic tier only`,
      });
      continue;
    }
    if (override.type !== undefined && baseToken.type !== undefined && override.type !== baseToken.type) {
      errors.push({
        kind: "type-mismatch",
        message: `${override.file}: token "${path}" is "${override.type}" but the base semantic token is "${baseToken.type}"`,
      });
      continue;
    }
    if (isEmbeddedRef(override.value)) {
      errors.push({
        kind: "unsupported-value",
        message: `${override.file}: token "${path}" embeds a {reference} inside a larger value — v1 supports a full {reference} or a literal`,
      });
      continue;
    }
    if (override.value !== null && typeof override.value === "object") {
      errors.push({
        kind: "unsupported-value",
        message: `${override.file}: token "${path}" has a composite value — v1 semantic overrides must be scalars (string or number)`,
      });
      continue;
    }
    merged.set(path, {
      ...baseToken,
      type: override.type ?? baseToken.type,
      value: override.value,
      file: override.file,
    });
    overridden.push(path);
  }

  return { merged, overridden, errors };
}

/**
 * Render one iteration's CSS: overridden semantic tokens as custom properties
 * scoped to `[data-iteration="<name>"]`. Full `{reference}` values emit as
 * `var(--ds-…)` so base primitives keep flowing through at runtime; literals
 * emit as-is. Zero overrides produce a comment-only file — an empty rule is
 * valid CSS but says nothing, and the file must exist (one CSS file per
 * iteration).
 *
 * @param {{ name: string, tokens: Map<string, {value: unknown}>, overridden: string[] }} input
 * @returns {string} LF-terminated CSS with sorted declarations
 */
export function renderIterationCss({ name, tokens, overridden }) {
  if (overridden.length === 0) {
    return `/* iteration "${name}": no semantic overrides yet — edit tokens/iterations/${name}/*.tokens.json */\n`;
  }
  const declarations = overridden
    .slice()
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((path) => {
      const value = tokens.get(path).value;
      const ref = fullValueRef(value);
      const emitted = ref !== null ? `var(--ds-${ref.split(".").join("-")})` : String(value);
      return `  --ds-${path.split(".").join("-")}: ${emitted};`;
    });
  return `[data-iteration="${name}"] {\n${declarations.join("\n")}\n}\n`;
}
