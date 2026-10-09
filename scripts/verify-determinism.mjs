#!/usr/bin/env node
// Determinism check: run the token build twice and require byte-identical
// output in packages/tokens/generated/. Exits non-zero on any difference.
// Works standalone (no turbo) — CI wiring arrives with a later task.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const tokensPackage = join(repoRoot, "packages/tokens");
const buildScript = join(tokensPackage, "scripts/build.mjs");
const generatedDir = join(tokensPackage, "generated");

async function snapshot(dir) {
  const hashes = {};
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries.slice().sort((a, b) => (a.name < b.name ? -1 : 1))) {
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

function runBuild(label) {
  const result = spawnSync(process.execPath, [buildScript], {
    cwd: tokensPackage,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(`✗ verify-determinism: ${label} build failed (exit ${result.status ?? "?"})`);
    process.exit(result.status ?? 1);
  }
}

runBuild("first");
try {
  await stat(generatedDir);
} catch {
  console.error("✗ verify-determinism: generated/ missing after first build");
  process.exit(1);
}
const first = await snapshot(generatedDir);

runBuild("second");
const second = await snapshot(generatedDir);

const keys = [...new Set([...Object.keys(first), ...Object.keys(second)])].sort();
const diffs = [];
for (const key of keys) {
  if (first[key] !== second[key]) {
    diffs.push(
      first[key] === undefined ? `+ ${key}` : second[key] === undefined ? `- ${key}` : `~ ${key}`,
    );
  }
}
if (diffs.length > 0) {
  console.error(
    `✗ verify-determinism: generated output differs between runs:\n${diffs
      .map((line) => `  ${line}`)
      .join("\n")}`,
  );
  process.exit(1);
}

console.log(
  `✓ verify-determinism: two consecutive builds produced byte-identical output (${keys.length} files).`,
);
