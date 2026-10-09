import type { HTMLAttributes } from "react";
import { dsfClasses } from "../classes";

export type BadgeTone = "neutral" | "success" | "warning" | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Semantic tone of the badge. Defaults to "neutral". */
  tone?: BadgeTone;
}

const toneClass: Record<BadgeTone, string> = {
  neutral: "dsf-badge--neutral",
  success: "dsf-badge--success",
  warning: "dsf-badge--warning",
  danger: "dsf-badge--danger",
};

export function Badge({ tone = "neutral", className, children, ...rest }: BadgeProps) {
  return (
    <span className={dsfClasses("dsf-badge", toneClass[tone], className)} {...rest}>
      {children}
    </span>
  );
}
