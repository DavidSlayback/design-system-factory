import { describe, expect, it } from "vitest";
import {
  buildIterationInfo,
  buildSwitcherItems,
  cssVarName,
  fullValueRef,
  groupTokens,
  parseDtcgFile,
  resolveTokenValue,
  tokenGroupKey,
  type TokenLeaf,
} from "./model";

describe("flattenDtcg / parseDtcgFile", () => {
  it("flattens leaves with $type inherited down the tree", () => {
    const leaves = parseDtcgFile(
      JSON.stringify({
        color: {
          $type: "color",
          brand: { "600": { $value: "#2563eb" } },
        },
        spacing: { $type: "dimension", "4": { $value: "1rem" } },
      }),
      "test.tokens.json",
    );
    expect(leaves).toEqual([
      {
        path: ["color", "brand", "600"],
        type: "color",
        value: "#2563eb",
        file: "test.tokens.json",
      },
      { path: ["spacing", "4"], type: "dimension", value: "1rem", file: "test.tokens.json" },
    ]);
  });

  it("ignores $-prefixed metadata keys and keeps explicit leaf $type", () => {
    const leaves = parseDtcgFile(
      JSON.stringify({
        $description: "root meta",
        surface: {
          default: {
            $type: "color",
            $value: "{color.neutral.100}",
            $description: "page background",
          },
        },
      }),
      "test.tokens.json",
    );
    expect(leaves).toEqual([
      {
        path: ["surface", "default"],
        type: "color",
        value: "{color.neutral.100}",
        file: "test.tokens.json",
      },
    ]);
  });

  it("throws on invalid JSON and on a root $value, naming the file", () => {
    expect(() => parseDtcgFile("{not json", "bad.json")).toThrow(/^bad\.json: invalid JSON/);
    expect(() => parseDtcgFile('{"$value": "x"}', "bad.json")).toThrow(
      /^bad\.json: a token file must not declare/,
    );
  });
});

describe("tokenGroupKey / groupTokens", () => {
  const leaf = (path: string[], value = "x"): TokenLeaf => ({
    path,
    type: "color",
    value,
    file: "f",
  });

  it("groups three-segment paths by their first two segments and shallow paths by their first", () => {
    expect(tokenGroupKey(["color", "brand", "600"])).toBe("color.brand");
    expect(tokenGroupKey(["spacing", "4"])).toBe("spacing");
    expect(tokenGroupKey(["typography", "size", "md"])).toBe("typography.size");
  });

  it("sorts groups and rows by code-unit order", () => {
    const groups = groupTokens([
      leaf(["color", "warning", "500"]),
      leaf(["color", "brand", "600"]),
      leaf(["radius", "md"]),
      leaf(["spacing", "4"]),
    ]);
    expect(groups.map((group) => group.key)).toEqual([
      "color.brand",
      "color.warning",
      "radius",
      "spacing",
    ]);
    expect(groups[0]?.tokens.map((token) => token.path.join("."))).toEqual(["color.brand.600"]);
  });
});

describe("cssVarName / fullValueRef / resolveTokenValue", () => {
  it("mirrors the Style Dictionary --ds- naming", () => {
    expect(cssVarName(["color", "brand", "600"])).toBe("--ds-color-brand-600");
    expect(cssVarName(["surface", "default"])).toBe("--ds-surface-default");
  });

  it("accepts only full {references}", () => {
    expect(fullValueRef("{color.brand.600}")).toBe("color.brand.600");
    expect(fullValueRef("0 {color.brand.600} inset")).toBeNull();
    expect(fullValueRef("#2563eb")).toBeNull();
    expect(fullValueRef(42)).toBeNull();
  });

  it("resolves reference chains against the primitive map; unresolved becomes null", () => {
    const byPath = new Map<string, TokenLeaf>([
      [
        "color.brand.600",
        { path: ["color", "brand", "600"], type: "color", value: "#2563eb", file: "p" },
      ],
      [
        "surface.default",
        { path: ["surface", "default"], type: "color", value: "{color.brand.600}", file: "s" },
      ],
      [
        "surface.chained",
        { path: ["surface", "chained"], type: "color", value: "{surface.default}", file: "s" },
      ],
    ]);
    expect(resolveTokenValue("{color.brand.600}", byPath)).toBe("#2563eb");
    expect(resolveTokenValue("{surface.chained}", byPath)).toBe("#2563eb");
    expect(resolveTokenValue("{color.brand.999}", byPath)).toBeNull();
    expect(resolveTokenValue("1rem", byPath)).toBe("1rem");
  });
});

describe("buildIterationInfo / buildSwitcherItems", () => {
  const overrides: TokenLeaf[] = [
    {
      path: ["surface", "default"],
      type: "color",
      value: "{color.neutral.950}",
      file: "iterations/midnight/overrides.tokens.json",
    },
  ];

  it("reads label and description from meta, falling back to the id", () => {
    const withMeta = buildIterationInfo(
      "midnight",
      JSON.stringify({ label: "Midnight", description: "Dark surfaces" }),
      overrides,
    );
    expect(withMeta).toEqual({
      id: "midnight",
      label: "Midnight",
      description: "Dark surfaces",
      overrides,
    });

    const withoutMeta = buildIterationInfo("solstice", undefined, []);
    expect(withoutMeta).toEqual({
      id: "solstice",
      label: "solstice",
      description: "",
      overrides: [],
    });
  });

  it("lists core first, then every iteration by label", () => {
    const items = buildSwitcherItems([
      { id: "midnight", label: "Midnight", description: "", overrides: [] },
      { id: "aurora", label: "Aurora", description: "", overrides: [] },
    ]);
    expect(items).toEqual([
      { value: "core", title: "Core" },
      { value: "midnight", title: "Midnight" },
      { value: "aurora", title: "Aurora" },
    ]);
  });
});
