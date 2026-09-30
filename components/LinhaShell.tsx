"use client";

import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export default function LinhaShell({
  indice,
  titulo,
  children,
  rodape,
  onRemove,
}: {
  indice: number;
  titulo: ReactNode;
  children: ReactNode;
  rodape?: ReactNode;
  onRemove: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      data-linha
      className="bg-card grid gap-4 rounded-xl border p-4 shadow-xs"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground inline-flex items-center gap-2 text-xs font-medium">
          <span className="bg-muted text-foreground inline-grid size-5 place-items-center rounded-full text-[10px] font-semibold">
            {indice}
          </span>
          {titulo}
        </span>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive size-7" onClick={onRemove} aria-label="Remover linha">
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      {children}
      {rodape && (
        <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 border-t pt-3 text-xs">{rodape}</div>
      )}
    </motion.div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span>
      {label} <strong className="text-foreground font-semibold">{value}</strong>
    </span>
  );
}
