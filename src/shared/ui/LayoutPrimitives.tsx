import type { HTMLAttributes, ReactNode } from "react";
import { classNames } from "../lib/classNames";

type LayoutProps = HTMLAttributes<HTMLDivElement>;

export function PageStack({ className, ...props }: LayoutProps) {
  return <div className={classNames("page-stack", className)} {...props} />;
}

export function PageToolbar({ className, ...props }: LayoutProps) {
  return <div className={classNames("page-toolbar", className)} {...props} />;
}

export function Surface({ className, ...props }: LayoutProps) {
  return <div className={classNames("surface", className)} {...props} />;
}

export function StatGrid({ className, ...props }: LayoutProps) {
  return <div className={classNames("stat-grid", className)} {...props} />;
}

export interface BulkActionBarProps extends LayoutProps {
  readonly selectedCount: number;
  readonly children: ReactNode;
}

export function BulkActionBar({
  selectedCount,
  className,
  children,
  ...props
}: BulkActionBarProps) {
  return (
    <div
      className={classNames(
        "bulk-action-bar",
        selectedCount > 0 && "visible",
        className,
      )}
      aria-hidden={selectedCount > 0 ? undefined : "true"}
      {...props}
    >
      {children}
    </div>
  );
}
