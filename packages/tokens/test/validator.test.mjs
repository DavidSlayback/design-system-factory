import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { loadTokenGraph } from "../scripts/lib/load-tokens.mjs";
import { validateTokenGraph } from "../scripts/lib/validate-tokens.mjs";

const fixtureDir = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

describe("validateTokenGraph error paths", () => {
  it("detects a reference cycle and names the file and token path", async () => {
    const graph = await loadTokenGraph(fixtureDir("cycle"));
    const errors = validateTokenGraph(graph.tokens);

    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe("cycle");
    expect(errors[0].message).toMatch(/cycle\.tokens\.json/);
    expect(errors[0].message).toMatch(/color\.a/);
    expect(errors[0].message).toMatch(/color\.b/);
  });

  it("detects an unknown reference and names the file and token path", async () => {
    const graph = await loadTokenGraph(fixtureDir("unknown-ref"));
    const errors = validateTokenGraph(graph.tokens);

    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe("unknown-ref");
    expect(errors[0].message).toMatch(/unknown-ref\.tokens\.json/);
    expect(errors[0].message).toMatch(/color\.link/);
    expect(errors[0].message).toMatch(/color\.missing\.stop/);
  });

  it("detects a type mismatch and names the file and token path", async () => {
    const graph = await loadTokenGraph(fixtureDir("type-mismatch"));
    const errors = validateTokenGraph(graph.tokens);

    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe("type-mismatch");
    expect(errors[0].message).toMatch(/type-mismatch\.tokens\.json/);
    expect(errors[0].message).toMatch(/color\.broken/);
    expect(errors[0].message).toMatch(/spacing\.md/);
  });

  it("passes the real token tree with no errors", async () => {
    const tokensDir = fileURLToPath(new URL("../tokens", import.meta.url));
    const graph = await loadTokenGraph(tokensDir);

    expect(validateTokenGraph(graph.tokens)).toEqual([]);
  });
});
