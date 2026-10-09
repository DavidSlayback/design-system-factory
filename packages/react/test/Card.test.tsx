import { axe } from "jest-axe";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "../src/components/Card";

describe("Card", () => {
  it("renders children in a surface container", () => {
    render(
      <Card data-testid="card">
        <p>Card body</p>
      </Card>,
    );
    expect(screen.getByTestId("card")).toHaveClass("dsf-card");
    expect(screen.getByText("Card body")).toBeInTheDocument();
  });

  it("spreads extra props onto the container", () => {
    render(<Card aria-label="Account details">Body</Card>);
    expect(screen.getByLabelText("Account details")).toBeInTheDocument();
  });

  it("has no axe violations on the default render", async () => {
    const { container } = render(<Card>Card body</Card>);
    expect((await axe(container)).violations).toEqual([]);
  });
});
