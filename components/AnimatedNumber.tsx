"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";
import { formatBRL } from "@/lib/pricing";

interface Props {
  value: number;
  format?: (v: number) => string;
  className?: string;
}

/** Número que "rola" suavemente até o novo valor. */
export default function AnimatedNumber({ value, format = formatBRL, className }: Props) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => format(v));

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [mv, value]);

  return <motion.span className={className}>{text}</motion.span>;
}
