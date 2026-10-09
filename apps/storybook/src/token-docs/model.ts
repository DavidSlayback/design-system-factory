/**
 * Pure model for the token documentation pages: DTCG flattening, grouping,
 * reference resolution, and iteration metadata shaping. No Vite imports
 * here — unit tests feed fixtures directly; the build-time readers live in
 * source.ts.
 *
 * The flatten/parse logic mirrors packages/tokens/scripts/lib/load-tokens.mjs
 * (same $type inheritance, same leaf rule) so docs and build agree on what a
 * token is.
 */

export interface TokenLeaf {
  path: string[];
  type: string | undefined;
  value: unknown;
  file: string;
}

export interface TokenGroup {
  key: string;
  tokens: TokenLeaf[];
}

export interface IterationInfo {
  id: string;
  label: string;
  description: string;
  overrides: TokenLeaf[];
}

/**
 * Flatten one parsed DTCG tree: `$type` inherits down the tree, `$value`
 * marks a leaf, `$`-prefixed keys are metadata and never path segments.
 */
export function flattenDtcg(
  node: unknown,
  pathSegments: string[],
  file: string,
  inheritedType: string | undefined,
  out: TokenLeaf[],
): void {
  if (node === null || typeof node !== "object" || Array.isArray(node)) return;
  const record = node as Record<string, unknown>;
  const type = typeof record.$type === "string" ? record.$type : inheritedType;
  if ("$value" in record) {
    if (pathSegments.length === 0) {
      throw new Error(`${file}: a token file must not declare "$value" at the root`);
    }
    out.push({ path: pathSegments, type, value: record.$value, file });
    return;
  }
  for (const [key, child] of Object.entries(record)) {
    if (key.startsWith("$")) continue;
    flattenDtcg(child, [...pathSegments, key], file, type, out);
  }
}

/** Parse one raw DTCG file body into its token leaves. */
export function parseDtcgFile(raw: string, file: string): TokenLeaf[] {
  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  } catch (error) {
    throw new Error(
      `${file}: invalid JSON — ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const out: TokenLeaf[] = [];
  flattenDtcg(json, [], file, undefined, out);
  return out;
}

/**
 * Docs grouping rule: a token lives under its first two path segments when
 * it nests that deep (color.brand.600 → "color.brand") and under its first
 * segment otherwise (spacing.4 → "spacing").
 */
export function tokenGroupKey(path: string[]): string {
  return path.length >= 3 ? path.slice(0, 2).join(".") : (path[0] ?? "");
}

/** Group leaves by tokenGroupKey; groups and rows are code-unit sorted. */
export function groupTokens(leaves: TokenLeaf[]): TokenGroup[] {
  const groups = new Map<string, TokenLeaf[]>();
  for (const leaf of leaves) {
    const key = tokenGroupKey(leaf.path);
    const bucket = groups.get(key);
    if (bucket) bucket.push(leaf);
    else groups.set(key, [leaf]);
  }
  return [...groups.keys()]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((key) => ({
      key,
      tokens: (groups.get(key) ?? []).slice().sort((a, b) => {
        const pa = a.path.join(".");
        const pb = b.path.join(".");
        return pa < pb ? -1 : pa > pb ? 1 : 0;
      }),
    }));
}

/** CSS custom property name for a token path, matching the Style Dictionary build. */
export function cssVarName(path: string[]): string {
  return `--ds-${path.join("-")}`;
}

/** A full `{reference}` value, or null when the value is not one. */
export function fullValueRef(value: unknown): string | null {
  if (typeof value !== "string" || !/^\{[^{}]+\}$/.test(value)) return null;
  return value.slice(1, -1);
}

/**
 * Resolve a token value against a token map, following `{reference}` chains.
 * Unresolvable references return null so docs render the gap instead of
 * inventing a value.
 */
export function resolveTokenValue(value: unknown, byPath: Map<string, TokenLeaf>): unknown {
  const ref = fullValueRef(value);
  if (ref === null) return value;
  const target = byPath.get(ref);
  if (!target) return null;
  return resolveTokenValue(target.value, byPath);
}

/**
 * Shape one iteration from its raw meta + override file bodies (either may be
 * absent — an iteration without overrides still appears in the docs).
 */
export function buildIterationInfo(
  id: string,
  metaRaw: string | undefined,
  overrides: TokenLeaf[],
): IterationInfo {
  let label = id;
  let description = "";
  if (metaRaw !== undefined) {
    const meta = JSON.parse(metaRaw) as { label?: unknown; description?: unknown };
    if (typeof meta.label === "string" && meta.label.length > 0) label = meta.label;
    if (typeof meta.description === "string") description = meta.description;
  }
  return { id, label, description, overrides };
}

/** Toolbar items for the iteration switcher: core first, then every iteration. */
export function buildSwitcherItems(
  iterations: IterationInfo[],
): Array<{ value: string; title: string }> {
  return [
    { value: "core", title: "Core" },
    ...iterations.map((iteration) => ({ value: iteration.id, title: iteration.label })),
  ];
}
