#!/usr/bin/env node
// Pre-build validator CLI: walks the combined DTCG graph and exits non-zero,
// naming file + token path, for cycles, unknown references, and type
// mismatches. The build runs the same check internally; this entry exists for
// standalone use.
import { fileURLToPath } from "node:url";
import { loadTokenGraph } from "./lib/load-tokens.mjs";
import { validateTokenGraph } from "./lib/validate-tokens.mjs";

const tokensDir = fileURLToPath(new URL("../tokens", import.meta.url));

const graph = await loadTokenGraph(tokensDir);
const errors = validateTokenGraph(graph.tokens);

if (errors.length > 0) {
  for (const error of errors) console.error(`✗ ${error.message}`);
  console.error(`\nToken validation failed: ${errors.length} error(s).`);
  process.exit(1);
}

const fileCount = new Set([...graph.tokens.values()].map((token) => token.file)).size;
console.log(`✓ ${graph.tokens.size} tokens across ${fileCount} file(s) validate cleanly.`);
