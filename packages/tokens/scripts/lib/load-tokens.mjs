import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

const TOKENS_FILE_PATTERN = /\.tokens\.json$/;

// Plain code-unit sort: locale-aware ordering would break byte-determinism.
const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

async function collectTokenFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTokenFiles(full)));
    } else if (TOKENS_FILE_PATTERN.test(entry.name)) {
      files.push(full);
    }
  }
  return files.sort(byName);
}

/**
 * Flatten one parsed DTCG file into tokens: { path, type, value, file }.
 * `$type` inherits down the tree; `$value` marks a leaf.
 */
function flatten(node, pathSegments, file, inheritedType, out) {
  if (node === null || typeof node !== "object" || Array.isArray(node)) {
    throw new Error(`${file}: token group at "${pathSegments.join(".")}" must be an object`);
  }
  const type = typeof node.$type === "string" ? node.$type : inheritedType;
  if ("$value" in node) {
    if (pathSegments.length === 0) {
      throw new Error(`${file}: a token file must not declare "$value" at the root`);
    }
    out.push({ path: pathSegments, type, value: node.$value, file });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    flatten(child, [...pathSegments, key], file, type, out);
  }
}

/**
 * Load every *.tokens.json under `dir` into one combined token map.
 * File labels in errors are relative to `labelRoot` (default: the parent of
 * `dir`), so base tokens read as `tokens/semantic/base.tokens.json` and
 * iteration overrides as `iterations/<name>/overrides.tokens.json`.
 *
 * @param {string} dir - directory containing the DTCG token tree
 * @param {string} [labelRoot] - root for relative file labels in errors
 * @returns {Promise<{dir: string, tokens: Map<string, {path: string[], type: string|undefined, value: unknown, file: string}>}>}
 */
export async function loadTokenGraph(dir, labelRoot = dirname(dir)) {
  const filePaths = await collectTokenFiles(dir);
  const tokens = new Map();

  for (const filePath of filePaths) {
    const file = relative(labelRoot, filePath);
    const raw = await readFile(filePath, "utf8");
    let json;
    try {
      json = JSON.parse(raw);
    } catch (error) {
      throw new Error(`${file}: invalid JSON — ${error.message}`);
    }

    const flat = [];
    flatten(json, [], file, undefined, flat);
    for (const token of flat) {
      const key = token.path.join(".");
      const existing = tokens.get(key);
      if (existing) {
        throw new Error(`${file}: token "${key}" is already defined in ${existing.file}`);
      }
      tokens.set(key, token);
    }
  }

  return { dir: labelRoot, tokens };
}
