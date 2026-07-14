import { ArrowDown, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface CTAButtonProps {
  readonly children: ReactNode;
  readonly href?: string;
  readonly icon?: "right" | "down" | "none";
  readonly variant?: "dark" | "ghost" | "copper";
  readonly className?: string;
  readonly ariaLabel?: string;
}

function cn(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function CTAButton({
  children,
  href,
  icon = "right",
  variant = "dark",
  className,
  ariaLabel,
}: CTAButtonProps) {
  const classes = cn(
    "inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-copper focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
    variant === "dark" &&
      "bg-ink text-[#fffaf4] shadow-paper hover:bg-[#2a2520]",
    variant === "ghost" &&
      "border border-line bg-[rgba(255,252,246,0.46)] text-ink hover:border-copper hover:bg-[rgba(255,252,246,0.82)]",
    variant === "copper" &&
      "bg-copper text-[#fffaf4] shadow-copper hover:bg-[#b6533b]",
    className,
  );
  const iconNode =
    icon === "right" ? (
      <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
    ) : icon === "down" ? (
      <ArrowDown aria-hidden="true" size={16} strokeWidth={1.8} />
    ) : null;

  if (href) {
    return (
      <motion.a
        aria-label={ariaLabel}
        className={classes}
        href={href}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        <span>{children}</span>
        {iconNode}
      </motion.a>
    );
  }

  return (
    <motion.button
      aria-label={ariaLabel}
      className={classes}
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <span>{children}</span>
      {iconNode}
    </motion.button>
  );
}
