import type { HTMLAttributes, ReactNode } from "react";
import { classNames } from "../lib/classNames";

export type StatusTone =
  | "warning"
  | "success"
  | "info"
  | "danger"
  | "neutral";

export interface StatusProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: StatusTone;
}

export function Status({
  children,
  tone = "warning",
  className,
  ...props
}: StatusProps) {
  return (
    <span className={classNames("status", tone, className)} {...props}>
      {children}
    </span>
  );
}
