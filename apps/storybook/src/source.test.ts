import { describe, expect, it } from "vitest";
import { cssVarName, fullValueRef, resolveTokenValue } from "./token-docs/model";
import {
  iterationInfos,
  iterationSwitcherItems,
  primitiveLeaves,
  primitivesByPath,
  semanticLeaves,
} from "./source";

/**
 * Integration guard over the real build-time reads: the Vite globs in
 * source.ts must see the actual DTCG tree and iteration metadata, so the
 * docs pages can never silently render stale or empty token data.
 */
describe("build-time token source reads", () => {
  it("sees the primitive tier with resolved hex values", () => {
    const brand600 = primitivesByPath.get("color.brand.600");
    expect(brand600).toBeDefined();
    expect(brand600?.value).toBe("#2563eb");
    expect(brand600?.type).toBe("color");
    // Composite shadow tokens stay in the tree for docs rendering.
    expect(
      primitiveLeaves.some((leaf) => leaf.type === "shadow" && typeof leaf.value === "object"),
    ).toBe(true);
  });

  it("sees the semantic tier with full references resolvable against primitives", () => {
    expect(semanticLeaves.length).toBeGreaterThan(0);
    for (const leaf of semanticLeaves) {
      const ref = fullValueRef(leaf.value);
      expect(ref, `semantic token ${leaf.path.join(".")} should be a {reference}`).not.toBeNull();
      expect(primitivesByPath.has(ref ?? ""), `unresolved reference ${ref}`).toBe(true);
      expect(resolveTokenValue(leaf.value, primitivesByPath)).not.toBeNull();
    }
  });

  it("sees every iteration with kebab-case ids and core-first switcher items", () => {
    expect(iterationInfos.length).toBeGreaterThan(0);
    for (const iteration of iterationInfos) {
      expect(iteration.id).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
      expect(iteration.overrides.length).toBeGreaterThan(0);
      for (const override of iteration.overrides) {
        expect(semanticLeaves.some((leaf) => leaf.path.join(".") === override.path.join("."))).toBe(
          true,
        );
      }
    }
    expect(iterationSwitcherItems[0]).toEqual({ value: "core", title: "Core" });
    expect(iterationSwitcherItems).toContainEqual({ value: "midnight", title: "Midnight" });
  });

  it("documents tokens under --ds- names that match the generated CSS", () => {
    // Spot-check the contract: docs naming == build naming.
    const surfaceDefault = semanticLeaves.find((leaf) => leaf.path.join(".") === "surface.default");
    expect(surfaceDefault).toBeDefined();
    expect(cssVarName(surfaceDefault?.path ?? [])).toBe("--ds-surface-default");
  });
});
