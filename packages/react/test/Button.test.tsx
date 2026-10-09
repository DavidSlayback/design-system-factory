import { axe } from "jest-axe";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../src/components/Button";

describe("Button", () => {
  it("renders a primary button by default", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveClass("dsf-button", "dsf-button--primary");
    expect(button).toHaveAttribute("type", "button");
  });

  it("applies the requested variant", () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("dsf-button--danger");
  });

  it("fires onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations on the default render", async () => {
    const { container } = render(<Button>Save</Button>);
    expect((await axe(container)).violations).toEqual([]);
  });
});
