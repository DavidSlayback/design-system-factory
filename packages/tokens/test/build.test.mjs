import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const packageRoot = fileURLToPath(new URL("..", import.meta.url));

describe("token build happy path", () => {
  it("emits sorted, resolved --ds-* custom properties in base.css", async () => {
    await execFileAsync(process.execPath, ["scripts/build.mjs"], { cwd: packageRoot });

    const css = await readFile(new URL("../generated/css/base.css", import.meta.url), "utf8");

    // Shape: a single :root block, LF endings, one custom property per line.
    expect(css.startsWith(":root {\n")).toBe(true);
    expect(css.endsWith("}\n")).toBe(true);
    expect(css.includes("\r")).toBe(false);

    const props = [...css.matchAll(/^ {2}(--ds-[a-z0-9-]+): (.+);$/gm)];

    // The full base semantic surface: 3 surface + 4 content + 12 action +
    // 6 feedback + 2 border + 1 focus.
    expect(props).toHaveLength(28);

    const names = props.map((prop) => prop[1]);
    expect(new Set(names).size).toBe(28);
    expect(names).toEqual([...names].sort());

    // v1 emits resolved values — no reference syntax may survive.
    for (const [, value] of props) {
      expect(value).not.toMatch(/[{}]/);
    }
  });
});
