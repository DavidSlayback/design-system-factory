import type { ButtonHTMLAttributes } from "react";
import { dsfClasses } from "../classes";

export type ButtonVariant = "primary" | "secondary" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight of the action. Defaults to "primary". */
  variant?: ButtonVariant;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "dsf-button--primary",
  secondary: "dsf-button--secondary",
  danger: "dsf-button--danger",
};

export function Button({ variant = "primary", type = "button", className, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={dsfClasses("dsf-button", variantClass[variant], className)}
      {...rest}
    />
  );
}
