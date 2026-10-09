/**
 * Build-time readers for everything the docs app renders. Vite inlines the
 * globs when bundling — raw string reads for the DTCG sources, eager style
 * imports for the generated CSS — so the docs always reflect token source,
 * and nothing here touches the filesystem at runtime.
 */
import {
  buildIterationInfo,
  buildSwitcherItems,
  parseDtcgFile,
  type IterationInfo,
  type TokenLeaf,
} from "./token-docs/model";

// Per-iteration token scopes as [data-iteration="<name>"] blocks. Base CSS is
// imported in .storybook/preview.tsx — in this module, the eager glob's
// generated imports hoist above a static import and would invert the cascade.
void import.meta.glob("../../../packages/tokens/generated/css/iterations/*.css", { eager: true });

const tokenSourceFiles = import.meta.glob<string>(
  "../../../packages/tokens/tokens/**/*.tokens.json",
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
);

const iterationMetaFiles = import.meta.glob<string>(
  "../../../packages/tokens/iterations/*/meta.json",
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
);

const iterationTokenFiles = import.meta.glob<string>(
  "../../../packages/tokens/iterations/*/*.tokens.json",
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
);

/** Repo-relative label for a glob key, e.g. "tokens/primitive/color.brand.tokens.json". */
function tokenId(globPath: string): string {
  return globPath.replace(/^.*packages\/tokens\//, "");
}

function iterationId(globPath: string): string | null {
  return /iterations\/([^/]+)\//.exec(globPath)?.[1] ?? null;
}

/** Primitive-tier token leaves, parsed from DTCG source at build time. */
export const primitiveLeaves: TokenLeaf[] = Object.entries(tokenSourceFiles)
  .filter(([path]) => path.includes("/tokens/primitive/"))
  .flatMap(([path, raw]) => parseDtcgFile(raw, tokenId(path)));

/** Semantic-tier base mappings, parsed from DTCG source at build time. */
export const semanticLeaves: TokenLeaf[] = Object.entries(tokenSourceFiles)
  .filter(([path]) => path.includes("/tokens/semantic/"))
  .flatMap(([path, raw]) => parseDtcgFile(raw, tokenId(path)));

/** Primitive tokens indexed by dot-path, for reference resolution in docs. */
export const primitivesByPath: Map<string, TokenLeaf> = new Map(
  primitiveLeaves.map((leaf) => [leaf.path.join("."), leaf]),
);

const iterationRaw = new Map<string, { meta?: string; overrides: TokenLeaf[] }>();
for (const [path, raw] of Object.entries(iterationMetaFiles)) {
  const id = iterationId(path);
  if (id === null) continue;
  const entry = iterationRaw.get(id) ?? { overrides: [] };
  entry.meta = raw;
  iterationRaw.set(id, entry);
}
for (const [path, raw] of Object.entries(iterationTokenFiles)) {
  const id = iterationId(path);
  if (id === null) continue;
  const entry = iterationRaw.get(id) ?? { overrides: [] };
  entry.overrides.push(...parseDtcgFile(raw, tokenId(path)));
}

/** Every iteration present in the token source, sorted by id. */
export const iterationInfos: IterationInfo[] = [...iterationRaw.entries()]
  .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  .map(([id, raw]) => buildIterationInfo(id, raw.meta, raw.overrides));

/** Iteration toolbar items: core first, then every iteration. */
export const iterationSwitcherItems = buildSwitcherItems(iterationInfos);
