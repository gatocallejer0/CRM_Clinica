"use client";

import * as React from "react";
import { motion, type Variants } from "motion/react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Orquesta la entrada escalonada de los campos: cada <Field> hijo se anima
// en cascada sin que el formulario que lo usa tenga que configurar nada.
const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

const fieldMotion: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
};

export function FormStagger({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

// Fila de 2-3 campos en grid; no rompe la cascada de animación de FormStagger
// porque las variantes se heredan a través del árbol de React, no del DOM.
export function FieldRow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("grid grid-cols-2 gap-3", className)}>{children}</div>;
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div variants={fieldMotion} className={cn("group flex flex-col gap-1.5", className)}>
      {label && (
        <Label
          htmlFor={htmlFor}
          className="text-foreground/85 transition-colors duration-150 group-focus-within:text-primary"
        >
          {label}
          {required && (
            <span aria-hidden className="text-primary">
              *
            </span>
          )}
        </Label>
      )}
      {children}
      {(hint || error) && (
        <p
          className={cn(
            "text-xs transition-colors duration-150",
            error ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          {error ?? hint}
        </p>
      )}
    </motion.div>
  );
}
