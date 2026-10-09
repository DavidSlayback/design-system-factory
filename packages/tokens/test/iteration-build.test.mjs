import { afterAll, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const packageRoot = fileURLToPath(new URL("..", import.meta.url));

const scratchRoots = [];

/**
 * Copy the token package (sources + scripts, no generated/) into a scratch
 * directory with a node_modules symlink, so builds run against throwaway
 * iteration sets without touching the real tree.
 */
async function makePackageCopy() {
  const root = await mkdtemp(join(tmpdir(), "dsf-tokens-"));
  scratchRoots.push(root);
  await cp(join(packageRoot, "scripts"), join(root, "scripts"), { recursive: true });
  await cp(join(packageRoot, "tokens"), join(root, "tokens"), { recursive: true });
  // The real iterations root is a sibling of tokens/ — copy it (with the
  // midnight example) so scratch builds cover existing iterations too.
  await cp(join(packageRoot, "iterations"), join(root, "iterations"), { recursive: true });
  await cp(join(packageRoot, "package.json"), join(root, "package.json"));
  await symlink(join(packageRoot, "node_modules"), join(root, "node_modules"), "dir");
  return root;
}

const scratchIteration = async (root, name, json) => {
  await mkdir(join(root, "iterations", name), { recursive: true });
  await writeFile(join(root, "iterations", name, "overrides.tokens.json"), `${JSON.stringify(json, null, 2)}\n`);
};

afterAll(async () => {
  for (const root of scratchRoots) await rm(root, { recursive: true, force: true });
});

describe("iteration build end to end", () => {
  // Spec V2 as an automated check: a scratch iteration produced by config
  // alone emits its override into its own CSS file.
  it("emits a scratch iteration's override as a [data-iteration] var() reference", async () => {
    const root = await makePackageCopy();
    await scratchIteration(root, "scratch-demo", {
      surface: { default: { $type: "color", "$value": "{color.neutral.950}" } },
    });

    await execFileAsync(process.execPath, ["scripts/build.mjs"], { cwd: root });

    const css = await readFile(join(root, "generated/css/iterations/scratch-demo.css"), "utf8");
    // Matching the repo convention (base.css has no header comment): the file
    // is exactly one scoped block carrying the override as a var() reference
    // to the base primitive.
    expect(css).toBe(
      '[data-iteration="scratch-demo"] {\n  --ds-surface-default: var(--ds-color-neutral-950);\n}\n',
    );
    // Existing iterations still build alongside the scratch one.
    const midnight = await readFile(join(root, "generated/css/iterations/midnight.css"), "utf8");
    expect(midnight).toContain('[data-iteration="midnight"]');
  });

  it("fails the build loudly on an unknown override path, naming file and token path", async () => {
    const root = await makePackageCopy();
    await scratchIteration(root, "scratch-bad", {
      content: { nonexistent: { $type: "color", "$value": "{color.neutral.100}" } },
    });

    await expect(execFileAsync(process.execPath, ["scripts/build.mjs"], { cwd: root })).rejects.toMatchObject({
      stderr: expect.stringMatching(/iterations\/scratch-bad\/overrides\.tokens\.json/),
    });
    await expect(
      execFileAsync(process.execPath, ["scripts/build.mjs"], { cwd: root }),
    ).rejects.toMatchObject({
      stderr: expect.stringMatching(/content\.nonexistent/),
    });
  });

  it("fails the build loudly on a cycle introduced through overrides", async () => {
    const root = await makePackageCopy();
    await scratchIteration(root, "scratch-cycle", {
      surface: {
        default: { $type: "color", "$value": "{surface.raised}" },
        raised: { $type: "color", "$value": "{surface.default}" },
      },
    });

    await expect(execFileAsync(process.execPath, ["scripts/build.mjs"], { cwd: root })).rejects.toMatchObject({
      stderr: expect.stringMatching(/reference cycle/),
    });
  });
});
