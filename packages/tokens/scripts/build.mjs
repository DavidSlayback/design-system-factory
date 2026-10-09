#!/usr/bin/env node
// Token build: validate the combined DTCG graph, then emit through Style
// Dictionary v4 into generated/:
//   - css/base.css      :root --ds-* custom properties (semantic tokens)
//   - tokens.flat.json  flat key -> resolved value dump for tooling
//   - manifest.json     { sourcesSha256, outputsSha256 } — hashes only
//
// Determinism contract: cleaned output dir, plain code-unit sorts, LF endings,
// no timestamps or locale-dependent formatting anywhere.
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import StyleDictionary from "style-dictionary";
import { loadTokenGraph } from "./lib/load-tokens.mjs";
import { validateTokenGraph } from "./lib/validate-tokens.mjs";

const tokensDir = fileURLToPath(new URL("../tokens", import.meta.url));
const generatedDir = fileURLToPath(new URL("../generated", import.meta.url));

// Plain code-unit sort: locale-aware ordering would break byte-determinism.
const byKey = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

async function hashTree(dir) {
  const hashes = {};
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries.slice().sort((a, b) => byKey(a.name, b.name))) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        const key = relative(dir, full).split(sep).join("/");
        hashes[key] = createHash("sha256")
          .update(await readFile(full))
          .digest("hex");
      }
    }
  }
  await walk(dir);
  return hashes;
}

const canonicalJson = (map) => {
  const sorted = {};
  for (const key of Object.keys(map).sort(byKey)) sorted[key] = map[key];
  return JSON.stringify(sorted);
};

// 1. Fail loudly before Style Dictionary sees anything malformed.
const graph = await loadTokenGraph(tokensDir);
const errors = validateTokenGraph(graph.tokens);
if (errors.length > 0) {
  for (const error of errors) console.error(`✗ ${error.message}`);
  console.error(`\nToken build aborted: ${errors.length} validation error(s).`);
  process.exit(1);
}

// 2. Clean output so stale files can never survive into a manifest hash.
await rm(generatedDir, { recursive: true, force: true });
await mkdir(generatedDir, { recursive: true });

// 3. Build through Style Dictionary v4. Custom formats give exact control
// over naming, ordering, and line endings; no value transforms are configured
// so resolved DTCG values are emitted as-is.
//
// v4 note: sources use DTCG `$value`, so the resolved value lives on
// `token.$value` (`token.value` stays undefined without value transforms).
StyleDictionary.registerTransform({
  name: "dsf/name",
  type: "name",
  transform: (token) => token.path.join("-"),
});

StyleDictionary.registerFilter({
  name: "dsf-semantic",
  filter: (token) => token.filePath.split(/[\\/]/).includes("semantic"),
});

StyleDictionary.registerFormat({
  name: "dsf/base-css",
  format: ({ dictionary }) => {
    const declarations = dictionary.allTokens
      .slice()
      .sort((a, b) => byKey(a.path.join("."), b.path.join(".")))
      .map((token) => `  --ds-${token.path.join("-")}: ${token.$value};`);
    return `:root {\n${declarations.join("\n")}\n}\n`;
  },
});

StyleDictionary.registerFormat({
  name: "dsf/flat-json",
  format: ({ dictionary }) => {
    const entries = dictionary.allTokens
      .map((token) => [token.path.join("."), token.$value])
      .sort((a, b) => byKey(a[0], b[0]));
    return `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`;
  },
});

const sd = new StyleDictionary({
  source: ["tokens/**/*.tokens.json"],
  platforms: {
    css: {
      transforms: ["dsf/name"],
      buildPath: "generated/",
      files: [{ destination: "css/base.css", filter: "dsf-semantic", format: "dsf/base-css" }],
    },
    json: {
      transforms: ["dsf/name"],
      buildPath: "generated/",
      files: [{ destination: "tokens.flat.json", format: "dsf/flat-json" }],
    },
  },
});
await sd.buildAllPlatforms();

// 4. Manifest — hashes only, no volatile fields. Written last so it never
// hashes itself.
const sourceHashes = await hashTree(tokensDir);
const outputHashes = await hashTree(generatedDir);
const manifest = {
  sourcesSha256: createHash("sha256").update(canonicalJson(sourceHashes)).digest("hex"),
  outputsSha256: createHash("sha256").update(canonicalJson(outputHashes)).digest("hex"),
};
await writeFile(join(generatedDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  `✓ Built ${Object.keys(outputHashes).length} output file(s) from ${graph.tokens.size} tokens.`,
);
