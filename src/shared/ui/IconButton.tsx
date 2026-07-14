import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  ComponentProps,
  ReactNode,
} from "react";
import { classNames } from "../lib/classNames";

interface IconControlProps {
  label: string;
  visibleLabel?: string;
  children: ReactNode;
  danger?: boolean;
  className?: string;
}

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  IconControlProps;

export function IconButton({
  label,
  visibleLabel,
  children,
  danger = false,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={classNames("icon-button", danger && "danger", className)}
      aria-label={label}
      title={props.title ?? label}
      {...props}
    >
      {children}
      {visibleLabel ? (
        <span className="icon-button-label" aria-hidden="true">
          {visibleLabel}
        </span>
      ) : null}
    </button>
  );
}

export type IconLinkProps = Omit<ComponentProps<typeof Link>, "children"> &
  IconControlProps;

export function IconLink({
  label,
  visibleLabel,
  children,
  danger = false,
  className,
  ...props
}: IconLinkProps) {
  return (
    <Link
      className={classNames("icon-button", danger && "danger", className)}
      aria-label={label}
      title={props.title ?? label}
      {...props}
    >
      {children}
      {visibleLabel ? (
        <span className="icon-button-label" aria-hidden="true">
          {visibleLabel}
        </span>
      ) : null}
    </Link>
  );
}
