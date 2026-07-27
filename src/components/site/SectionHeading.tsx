import { motion } from "motion/react";
import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}
    >
      <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
        <span className="h-px w-6 bg-primary" />
        {eyebrow}
      </span>
      <h2 className="mt-4 font-display text-3xl font-extrabold leading-[1.05] sm:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      )}
    </motion.div>
  );
}
