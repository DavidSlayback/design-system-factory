import type { HTMLAttributes } from "react";
import { dsfClasses } from "../classes";

export type CardProps = HTMLAttributes<HTMLDivElement>;

/** A raised surface container for grouping related content. */
export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div className={dsfClasses("dsf-card", className)} {...rest}>
      {children}
    </div>
  );
}
