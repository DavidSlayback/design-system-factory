import { afterAll, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { scaffoldIteration, tokensRootFrom } from "../lib/scaffold.mjs";
import { labelFromName, scaffoldFiles } from "../lib/scaffold-files.mjs";

const execFileAsync = promisify(execFile);
const cliRoot = fileURLToPath(new URL("..", import.meta.url));

const scratchRoots = [];
const scratchDir = async () => {
  const root = await mkdtemp(join(tmpdir(), "dsf-cli-"));
  scratchRoots.push(root);
  return root;
};

afterAll(async () => {
  for (const root of scratchRoots) await rm(root, { recursive: true, force: true });
});

describe("scaffoldFiles", () => {
  it("emits an empty semantic override set plus metadata", () => {
    const files = scaffoldFiles("midnight");

    expect(files.map((file) => file.name)).toEqual(["overrides.tokens.json", "meta.json"]);

    const overrides = JSON.parse(files[0].content);
    expect(Object.keys(overrides)).toEqual(["$description"]);
    // No copied semantic tree: the iteration inherits base semantics until
    // the user adds overrides.
    expect(overrides.$description).toMatch(/empty override set builds identically to the base/);

    const meta = JSON.parse(files[1].content);
    expect(meta).toEqual({ label: "Midnight", description: "The midnight iteration." });
  });

  it("derives labels from kebab-case names", () => {
    expect(labelFromName("deep-ocean")).toBe("Deep Ocean");
  });
});

describe("scaffoldIteration", () => {
  it("creates the iteration directory from core defaults", async () => {
    const tokensRoot = await scratchDir();

    const { target, files } = await scaffoldIteration({ name: "demo", tokensRoot });

    expect(target).toBe(join(tokensRoot, "iterations", "demo"));
    expect(files).toEqual(["overrides.tokens.json", "meta.json"]);

    const written = await readFile(join(target, "overrides.tokens.json"), "utf8");
    expect(JSON.parse(written).$description).toContain("demo iteration");
  });

  it("rejects duplicate iteration names loudly", async () => {
    const tokensRoot = await scratchDir();
    await scaffoldIteration({ name: "demo", tokensRoot });

    await expect(scaffoldIteration({ name: "demo", tokensRoot })).rejects.toMatchObject({
      message: expect.stringMatching(/packages\/tokens\/iterations\/demo already exists/),
    });
  });

  it("rejects invalid names before touching the filesystem", async () => {
    const tokensRoot = await scratchDir();

    for (const bad of ["../escape", "Big", "a_b", ""]) {
      await expect(scaffoldIteration({ name: bad, tokensRoot }), bad).rejects.toMatchObject({
        message: expect.stringMatching(/cannot create iteration/),
      });
    }
    // Nothing was written.
    await expect(scaffoldIteration({ name: "ok-name", tokensRoot })).resolves.toBeTruthy();
  });
});

describe("dsf bin", () => {
  const run = (args) =>
    execFileAsync(process.execPath, [join(cliRoot, "bin/dsf.mjs"), ...args], { cwd: tmpdir() });

  it("scaffolds via `dsf iteration new` against a tokens dir", async () => {
    const tokensRoot = await scratchDir();

    const { stdout } = await run(["iteration", "new", "demo", "--tokens-dir", tokensRoot]);

    expect(stdout).toMatch(/✓ created iteration "demo"/);
    expect(stdout).toMatch(/overrides\.tokens\.json/);
  });

  it("refuses duplicates with exit 1 and the existing path", async () => {
    const tokensRoot = await scratchDir();
    await run(["iteration", "new", "demo", "--tokens-dir", tokensRoot]);

    await expect(run(["iteration", "new", "demo", "--tokens-dir", tokensRoot])).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringMatching(/already exists/),
    });
  });

  it("refuses unknown commands and missing names with the usage text", async () => {
    await expect(run(["iteration", "new"])).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringMatching(/requires a name/),
    });
    await expect(run(["flurb", "x"])).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringMatching(/unknown command "flurb x"/),
    });
  });

  it("prints usage on --help with exit 0", async () => {
    const { stdout } = await run(["--help"]);
    expect(stdout).toMatch(/dsf — Design System Factory CLI/);
  });
});

describe("tokensRootFrom", () => {
  it("locates the @dsf/tokens workspace package from the CLI install", () => {
    const binUrl = fileURLToPath(new URL("../bin/dsf.mjs", import.meta.url));

    expect(tokensRootFrom(binUrl)).toMatch(/packages[\\/]tokens$/);
  });
});
