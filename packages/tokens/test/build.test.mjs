import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const packageRoot = fileURLToPath(new URL("..", import.meta.url));

const customProps = (css) => [...css.matchAll(/^ {2}(--ds-[a-z0-9-]+): (.+);$/gm)];

describe("token build happy path", () => {
  it("emits sorted, resolved --ds-* custom properties in base.css", async () => {
    await execFileAsync(process.execPath, ["scripts/build.mjs"], { cwd: packageRoot });

    const css = await readFile(new URL("../generated/css/base.css", import.meta.url), "utf8");

    // Shape: a single :root block, LF endings, one custom property per line.
    expect(css.startsWith(":root {\n")).toBe(true);
    expect(css.endsWith("}\n")).toBe(true);
    expect(css.includes("\r")).toBe(false);

    // Every scalar token — 116 of 119 (the 3 composite shadows cannot become
    // custom properties and stay in tokens.flat.json only).
    const props = customProps(css);
    expect(props).toHaveLength(116);

    const names = props.map((prop) => prop[1]);
    expect(new Set(names).size).toBe(116);
    expect(names).toEqual([...names].sort());

    // Resolved values — no reference syntax may survive.
    for (const [, , value] of props) {
      expect(value).not.toMatch(/[{}]/);
    }

    // Both tiers live here: primitives (so per-iteration var() references
    // resolve) and the semantic aliases.
    expect(names).toContain("--ds-color-brand-600");
    expect(names).toContain("--ds-color-neutral-950");
    expect(names).toContain("--ds-action-primary-bg");
    expect(names.filter((name) => name.startsWith("--ds-shadow-"))).toEqual([]);
  });

  it("emits the midnight iteration as a [data-iteration] block of var() references", async () => {
    await execFileAsync(process.execPath, ["scripts/build.mjs"], { cwd: packageRoot });

    const css = await readFile(
      new URL("../generated/css/iterations/midnight.css", import.meta.url),
      "utf8",
    );

    expect(css.startsWith('[data-iteration="midnight"] {\n')).toBe(true);
    expect(css.endsWith("}\n")).toBe(true);
    expect(css.includes("\r")).toBe(false);

    // The full midnight override set: 3 surface + 4 content + 12 action +
    // 6 feedback + 2 border + 1 focus.
    const props = customProps(css);
    expect(props).toHaveLength(28);
    const names = props.map((prop) => prop[1]);
    expect(names).toEqual([...names].sort());

    // outputReferences: overrides point at base primitives so primitives keep
    // flowing through — no resolved literals in the iteration layer.
    expect(css).toContain("  --ds-surface-default: var(--ds-color-neutral-950);\n");
    expect(css).toContain("  --ds-action-primary-bg: var(--ds-color-brand-500);\n");
    for (const [, , value] of props) {
      expect(value).toMatch(/^var\(--ds-[a-z0-9-]+\)$/);
    }
  });
});
