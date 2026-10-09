import { axe } from "jest-axe";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TextField } from "../src/components/TextField";

describe("TextField", () => {
  it("associates the label with the input", () => {
    render(<TextField label="Email" />);
    const input = screen.getByLabelText("Email");
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("id");
  });

  it("accepts text input", () => {
    const onChange = vi.fn();
    render(<TextField label="Email" onChange={onChange} />);
    const input = screen.getByLabelText("Email");
    fireEvent.change(input, { target: { value: "david@example.com" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("links the error message to the input and marks it invalid", () => {
    render(<TextField label="Email" error="Enter a valid email" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).not.toBeNull();
    const message = document.getElementById(describedBy as string);
    expect(message).toHaveTextContent("Enter a valid email");
    expect(message).toHaveAttribute("role", "alert");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email");
  });

  it("omits the error affordances when no error is set", () => {
    render(<TextField label="Email" />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-describedby");
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
  });

  it("has no axe violations with an error present", async () => {
    const { container } = render(<TextField label="Email" error="Enter a valid email" />);
    expect((await axe(container)).violations).toEqual([]);
  });

  it("has no axe violations without an error", async () => {
    const { container } = render(<TextField label="Email" />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
