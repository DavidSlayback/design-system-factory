import { axe } from "jest-axe";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "../src/components/Badge";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { TextField } from "../src/components/TextField";

const stylesheet = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "src", "styles", "components.css"),
  "utf8",
);

function Kit() {
  return (
    <Card>
      <TextField label="Email" error="Enter a valid email" />
      <Button variant="secondary">Cancel</Button>
      <Button>Save</Button>
      <Badge tone="warning">Beta</Badge>
    </Card>
  );
}

describe("data-iteration invariance", () => {
  // React's useId embeds a per-instance counter (_r_0_, _r_1_ in dev builds).
  // Ids are instance-scoped state, not structure, so they are normalized
  // before comparing the two mounts.
  const normalizeIds = (html: string): string => html.replace(/_r_\d+_/g, "_r_N_");

  it("renders identical structure under a data-iteration attribute", () => {
    const plain = render(<Kit />);
    const themed = render(
      <div data-iteration="midnight">
        <Kit />
      </div>,
    );
    const themedRoot = themed.container.querySelector<HTMLElement>("[data-iteration='midnight']");
    expect(themedRoot).not.toBeNull();
    // One build serves every iteration: the attribute switches theme at
    // runtime via CSS, never structure.
    expect(normalizeIds(themedRoot?.innerHTML ?? "")).toBe(normalizeIds(plain.container.innerHTML));
  });

  it("themes through semantic variables, not compiled values", () => {
    expect(stylesheet).toMatch(/var\(--ds-/);
    expect(stylesheet).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("has no axe violations under a data-iteration attribute", async () => {
    const { container } = render(
      <div data-iteration="midnight">
        <Kit />
      </div>,
    );
    expect((await axe(container)).violations).toEqual([]);
  });
});
