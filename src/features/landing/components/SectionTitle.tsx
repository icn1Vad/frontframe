import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface SectionTitleProps {
  readonly eyebrow?: string;
  readonly title: ReactNode;
  readonly subtitle?: string;
  readonly align?: "left" | "center";
  readonly className?: string;
}

const smoothEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className,
}: SectionTitleProps) {
  return (
    <motion.div
      className={[
        "max-w-3xl",
        align === "center" ? "mx-auto text-center" : "",
        className ?? "",
      ].join(" ")}
      initial={{ opacity: 0, y: 22 }}
      transition={{ duration: 0.75, ease: smoothEase }}
      viewport={{ once: true, amount: 0.35 }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      {eyebrow ? (
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-copper">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-balance text-4xl font-semibold leading-[1.12] tracking-normal text-ink md:text-6xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-7 text-pretty text-base leading-8 text-muted md:text-lg">
          {subtitle}
        </p>
      ) : null}
    </motion.div>
  );
}
