// Iteration scaffolding: create packages/tokens/iterations/<name>/ from core
// defaults. Thin filesystem wrapper — name rules come from the tokens package
// and file templates from scaffold-files, so the CLI and the build cannot
// drift apart.
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { validateIterationName } from "@dsf/tokens/scripts/lib/iterations.mjs";
import { scaffoldFiles } from "./scaffold-files.mjs";

/**
 * Locate the @dsf/tokens workspace package from the CLI's own install. Works
 * from any cwd as long as the monorepo dependencies are installed; a missing
 * workspace link is a loud error, not a silent wrong-directory write.
 *
 * @param {string} fromModuleUrl - import.meta.url of the calling module
 * @returns {string} absolute path of the tokens package root
 */
export function tokensRootFrom(fromModuleUrl) {
  const require = createRequire(fromModuleUrl);
  return dirname(require.resolve("@dsf/tokens/package.json"));
}

/**
 * Scaffold one iteration directory. Refuses invalid names and existing
 * targets loudly, naming the path in the error message.
 *
 * @param {{ name: string, tokensRoot: string }} input - `tokensRoot` is the
 *   @dsf/tokens package root (iterations land in `<tokensRoot>/iterations/`)
 * @returns {Promise<{target: string, files: string[]}>} created directory and
 *   file names
 */
export async function scaffoldIteration({ name, tokensRoot }) {
  const invalid = validateIterationName(name);
  if (invalid !== null) {
    throw new Error(`cannot create iteration: ${invalid}`);
  }

  const target = join(tokensRoot, "iterations", name);
  try {
    // Ensure the iterations root exists (a repo with zero iterations yet has
    // none), then rely on non-recursive mkdir of the target itself as the
    // atomic "must not exist" check — no exists-then-create race.
    await mkdir(join(tokensRoot, "iterations"), { recursive: true });
    await mkdir(target);
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === "EEXIST") {
      throw new Error(
        `cannot create iteration "${name}": packages/tokens/iterations/${name} already exists — edit it directly or choose another name`,
      );
    }
    throw error;
  }

  const files = scaffoldFiles(name);
  for (const file of files) {
    await writeFile(join(target, file.name), file.content);
  }
  return { target, files: files.map((file) => file.name) };
}
