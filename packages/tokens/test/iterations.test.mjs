import { describe, expect, it } from "vitest";
import {
  ITERATION_NAME_PATTERN,
  listIterations,
  mergeIteration,
  renderIterationCss,
  validateIterationName,
} from "../scripts/lib/iterations.mjs";
import { validateTokenGraph } from "../scripts/lib/validate-tokens.mjs";

// Minimal base graph mirroring the real tier split: primitives under
// tokens/primitive/, semantic aliases under tokens/semantic/.
const token = (path, value, file) => ({
  path: path.split("."),
  type: "color",
  value,
  file,
});

const primitive = (path, value) => token(path, value, "tokens/primitive/color.neutral.tokens.json");
const semantic = (path, value) => token(path, value, "tokens/semantic/base.tokens.json");

const base = new Map(
  [
    primitive("color.neutral.100", "#f3f4f6"),
    primitive("color.neutral.950", "#030712"),
    primitive("color.brand.600", "#2563eb"),
    semantic("surface.default", "{color.neutral.100}"),
    semantic("surface.raised", "{color.neutral.50}"),
    semantic("action.primary.bg", "{color.brand.600}"),
    // Same key shape as the build: dotted token path -> token record.
  ].map((t) => [t.path.join("."), t]),
);

const overridesFrom = (map, file = "iterations/midnight/overrides.tokens.json") =>
  new Map(
    Object.entries(map).map(([path, value]) => [
      path,
      { path: path.split("."), type: "color", value, file },
    ]),
  );

describe("validateIterationName", () => {
  it("accepts kebab-case names", () => {
    expect(validateIterationName("midnight")).toBeNull();
    expect(validateIterationName("deep-ocean-2")).toBeNull();
    expect(ITERATION_NAME_PATTERN.test("midnight")).toBe(true);
  });

  it("rejects names that would break directories or the data-iteration selector", () => {
    for (const bad of ["", "Midnight", "mid_night", "../escape", "a--b", "-lead", "2cool", "mid night"]) {
      expect(validateIterationName(bad), bad).toMatch(/invalid|required/);
    }
  });
});

describe("mergeIteration", () => {
  it("replaces only the overridden semantic values and never mutates the base", () => {
    const overrides = overridesFrom({ "surface.default": "{color.neutral.950}" });

    const { merged, overridden, errors } = mergeIteration({ name: "midnight", overrides, base });

    expect(errors).toEqual([]);
    expect(overridden).toEqual(["surface.default"]);
    expect(merged.get("surface.default").value).toBe("{color.neutral.950}");
    // Override attribution: errors on merged output name the override file.
    expect(merged.get("surface.default").file).toBe("iterations/midnight/overrides.tokens.json");
    // Untouched tokens keep base identity and attribution.
    expect(merged.get("action.primary.bg")).toBe(base.get("action.primary.bg"));
    // The base map is never mutated.
    expect(base.get("surface.default").value).toBe("{color.neutral.100}");
  });

  it("fails loudly on an override path that exists nowhere, naming file and path", () => {
    const overrides = overridesFrom({ "content.typography": "{color.neutral.100}" });

    const { errors } = mergeIteration({ name: "midnight", overrides, base });

    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe("unknown-path");
    expect(errors[0].message).toMatch(/iterations\/midnight\/overrides\.tokens\.json/);
    expect(errors[0].message).toMatch(/content\.typography/);
  });

  it("fails loudly when an override targets a primitive token", () => {
    const overrides = overridesFrom({ "color.brand.600": "{color.neutral.950}" });

    const { errors } = mergeIteration({ name: "midnight", overrides, base });

    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe("not-semantic");
    expect(errors[0].message).toMatch(/color\.brand\.600/);
    expect(errors[0].message).toMatch(/semantic tier only/);
  });

  it("fails loudly when an override changes the token type", () => {
    const overrides = new Map([
      [
        "surface.default",
        { path: ["surface", "default"], type: "dimension", value: "1rem", file: "iterations/x/overrides.tokens.json" },
      ],
    ]);

    const { errors } = mergeIteration({ name: "x", overrides, base });

    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe("type-mismatch");
    expect(errors[0].message).toMatch(/surface\.default/);
    expect(errors[0].message).toMatch(/"dimension"/);
  });

  it("rejects embedded references and composite values that would corrupt CSS", () => {
    const overrides = overridesFrom({
      "surface.default": "0 1px {color.neutral.950}",
      "surface.raised": { r: 255, g: 255, b: 255 },
    });

    const { errors } = mergeIteration({ name: "midnight", overrides, base });

    expect(errors.map((error) => error.kind)).toEqual(["unsupported-value", "unsupported-value"]);
    expect(errors[0].message).toMatch(/embeds a \{reference\}/);
  });

  it("surfaces reference cycles introduced by overrides via the shared validator", () => {
    const overrides = overridesFrom({
      "surface.default": "{surface.raised}",
      "surface.raised": "{surface.default}",
    });

    const { merged, errors } = mergeIteration({ name: "midnight", overrides, base });
    const graphErrors = validateTokenGraph(merged);

    expect(errors).toEqual([]);
    expect(graphErrors).toHaveLength(1);
    expect(graphErrors[0].kind).toBe("cycle");
    // The cycle error names the override file and both token paths.
    expect(graphErrors[0].message).toMatch(/overrides\.tokens\.json/);
    expect(graphErrors[0].message).toMatch(/surface\.default/);
    expect(graphErrors[0].message).toMatch(/surface\.raised/);
  });
});

describe("renderIterationCss", () => {
  it("emits full references as var() so base primitives keep flowing through", () => {
    const overrides = overridesFrom({
      "surface.default": "{color.neutral.950}",
      "action.primary.bg": "{color.brand.600}",
    });
    const { merged, overridden } = mergeIteration({ name: "midnight", overrides, base });

    const css = renderIterationCss({ name: "midnight", tokens: merged, overridden });

    expect(css).toBe(
      '[data-iteration="midnight"] {\n' +
        "  --ds-action-primary-bg: var(--ds-color-brand-600);\n" +
        "  --ds-surface-default: var(--ds-color-neutral-950);\n" +
        "}\n",
    );
  });

  it("emits literal values as-is", () => {
    const overrides = overridesFrom({ "surface.default": "#101010" });
    const { merged, overridden } = mergeIteration({ name: "midnight", overrides, base });

    expect(renderIterationCss({ name: "midnight", tokens: merged, overridden })).toContain(
      "  --ds-surface-default: #101010;\n",
    );
  });

  it("renders a comment-only file for an iteration with no overrides", () => {
    const css = renderIterationCss({ name: "fresh", tokens: base, overridden: [] });

    expect(css).toMatch(/^\/\* iteration "fresh"/);
    expect(css).not.toContain("[data-iteration");
    expect(css.endsWith("\n")).toBe(true);
  });
});

describe("listIterations", () => {
  it("returns [] when the iterations root does not exist yet", async () => {
    await expect(listIterations("/nonexistent/dsf-iterations-root")).resolves.toEqual([]);
  });
});
