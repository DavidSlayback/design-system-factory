import { axe } from "jest-axe";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "../src/components/Badge";

describe("Badge", () => {
  it("renders neutral by default", () => {
    render(<Badge>Beta</Badge>);
    expect(screen.getByText("Beta")).toHaveClass("dsf-badge", "dsf-badge--neutral");
  });

  it("applies the requested tone", () => {
    render(<Badge tone="success">Active</Badge>);
    expect(screen.getByText("Active")).toHaveClass("dsf-badge--success");
  });

  it("renders each tone without collisions", () => {
    render(
      <>
        <Badge tone="success">A</Badge>
        <Badge tone="warning">B</Badge>
        <Badge tone="danger">C</Badge>
      </>,
    );
    expect(screen.getByText("A")).toHaveClass("dsf-badge--success");
    expect(screen.getByText("B")).toHaveClass("dsf-badge--warning");
    expect(screen.getByText("C")).toHaveClass("dsf-badge--danger");
  });

  it("has no axe violations on the default render", async () => {
    const { container } = render(<Badge>Beta</Badge>);
    expect((await axe(container)).violations).toEqual([]);
  });
});
