#!/usr/bin/env node
// Token build: validate the combined DTCG graph, merge every iteration's
// semantic overrides over the base graph, then emit into generated/:
//   - css/base.css               :root --ds-* custom properties — every scalar
//                                token (primitives and semantic aliases), so
//                                per-iteration var() references resolve
//   - css/iterations/<name>.css  [data-iteration="<name>"] overrides as
//                                var(--ds-<primitive>) references; the alias
//                                chain survives and themes switch at runtime
//   - tokens.flat.json           flat key -> resolved value dump for tooling
//   - manifest.json              { sourcesSha256, outputsSha256, iterations }
//                                — hashes only
//
// Determinism contract: cleaned output dir, plain code-unit sorts, LF endings,
// no timestamps or locale-dependent formatting anywhere.
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import StyleDictionary from "style-dictionary";
import {
  listIterations,
  mergeIteration,
  renderIterationCss,
  validateIterationName,
} from "./lib/iterations.mjs";
import { loadTokenGraph } from "./lib/load-tokens.mjs";
import { validateTokenGraph } from "./lib/validate-tokens.mjs";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const tokensDir = fileURLToPath(new URL("../tokens", import.meta.url));
const iterationsRoot = fileURLToPath(new URL("../iterations", import.meta.url));
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

const sha256 = (text) => createHash("sha256").update(text).digest("hex");

// 1. Fail loudly before Style Dictionary sees anything malformed: the base
// graph, then each iteration's overrides merged over it. Override tokens keep
// their file attribution, so graph errors on merged output name the override
// file and token path.
const graph = await loadTokenGraph(tokensDir);
const errors = validateTokenGraph(graph.tokens);

const iterationNames = await listIterations(iterationsRoot);
for (const name of iterationNames) {
  const invalid = validateIterationName(name);
  if (invalid) errors.push({ kind: "invalid-name", message: `iterations/${name}: ${invalid}` });
}

const iterations = [];
for (const name of iterationNames.filter((valid) => validateIterationName(valid) === null)) {
  const overrides = await loadTokenGraph(join(iterationsRoot, name), packageRoot);
  const iteration = mergeIteration({ name, overrides: overrides.tokens, base: graph.tokens });
  iteration.errors.push(...validateTokenGraph(iteration.merged));
  iterations.push({ name, ...iteration });
  errors.push(...iteration.errors);
}

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

StyleDictionary.registerFormat({
  name: "dsf/base-css",
  format: ({ dictionary }) => {
    // Scalar tokens only — composite values (shadows) cannot become custom
    // properties; they remain available in tokens.flat.json. Semantic
    // aliases stay resolved literals (the v1 base contract); per-iteration
    // CSS carries the var() reference form.
    const declarations = dictionary.allTokens
      .filter((token) => token.$value !== null && typeof token.$value !== "object")
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
      files: [{ destination: "css/base.css", format: "dsf/base-css" }],
    },
    json: {
      transforms: ["dsf/name"],
      buildPath: "generated/",
      files: [{ destination: "tokens.flat.json", format: "dsf/flat-json" }],
    },
  },
});
await sd.buildAllPlatforms();

// 4. Per-iteration CSS: one file per iteration, rendered directly from the
// merged graph (Style Dictionary has no say in the override-and-scope
// semantics; the pure renderer owns them).
await mkdir(join(generatedDir, "css", "iterations"), { recursive: true });
for (const { name, merged, overridden } of iterations) {
  await writeFile(
    join(generatedDir, "css", "iterations", `${name}.css`),
    renderIterationCss({ name, tokens: merged, overridden }),
  );
}

// 5. Manifest — hashes only, no volatile fields. Top-level sources cover the
// base tree plus every iteration's files; per-iteration entries give granular
// attribution. Written last so it never hashes itself.
const sourceHashes = {};
const iterationSourceHashes = {};
for (const [key, hash] of Object.entries(await hashTree(tokensDir))) {
  sourceHashes[`tokens/${key}`] = hash;
}
for (const name of iterationNames) {
  const hashes = await hashTree(join(iterationsRoot, name));
  for (const [key, hash] of Object.entries(hashes)) {
    sourceHashes[`iterations/${name}/${key}`] = hash;
    iterationSourceHashes[name] ??= {};
    iterationSourceHashes[name][`iterations/${name}/${key}`] = hash;
  }
}

const outputHashes = await hashTree(generatedDir);
const manifest = {
  sourcesSha256: sha256(canonicalJson(sourceHashes)),
  outputsSha256: sha256(canonicalJson(outputHashes)),
  iterations: Object.fromEntries(
    iterationNames.map((name) => {
      // Exact output key — iteration names that prefix each other must not
      // leak into one another's entries.
      const outputKey = `css/iterations/${name}.css`;
      const outputs = outputKey in outputHashes ? { [outputKey]: outputHashes[outputKey] } : {};
      return [
        name,
        {
          sourcesSha256: sha256(canonicalJson(iterationSourceHashes[name] ?? {})),
          outputsSha256: sha256(canonicalJson(outputs)),
        },
      ];
    }),
  ),
};
await writeFile(join(generatedDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  `✓ Built ${Object.keys(outputHashes).length} output file(s) from ${graph.tokens.size} base tokens across ${iterationNames.length} iteration(s).`,
);
