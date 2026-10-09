import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// V4 hard rule: components style exclusively from semantic CSS custom
// properties. A color literal anywhere in component source is the named
// failure mode of this task — a hand-rolled primitive value that would
// survive iteration switches instead of re-theming with them.
const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

const colorDeclaration = /(background|color|border|outline)\s*:\s*([^;]+);/g;

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .filter((file) => /\.(tsx|ts|css)$/.test(file));
}

describe("source purity (semantic variables only)", () => {
  it("contains no color literals in component source", () => {
    const offenders = collectSourceFiles(srcDir).flatMap((file) => {
      const content = readFileSync(file, "utf8");
      return content
        .split("\n")
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => COLOR_LITERAL.test(line))
        .map(({ line, index }) => `${file}:${index + 1}: ${line.trim()}`);
    });
    expect(offenders).toEqual([]);
  });

  it("declares every color in the stylesheet through a var(--ds-*) reference", () => {
    const stylesheet = readFileSync(join(srcDir, "styles", "components.css"), "utf8");
    const bareDeclarations = [...stylesheet.matchAll(colorDeclaration)]
      // match[2] is the declaration value; match[1] is only the property name.
      .filter((match) => !match[2]?.includes("var(--ds-"))
      .map((match) => match[0]?.trim());
    expect(bareDeclarations).toEqual([]);
  });
});
