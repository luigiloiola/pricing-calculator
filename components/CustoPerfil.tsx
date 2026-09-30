"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, HeartHandshake } from "lucide-react";
import { useState } from "react";
import { NumberField } from "./fields";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatBRL, formatPctFino, type DetalhePerfil, type LinhaPerfil } from "@/lib/pricing";
import { BENEFICIOS } from "@/lib/zoho/params";

/** Composição do custo mensal (base + encargos + benefícios) e seleção de benefícios. */
export default function CustoPerfil({
  linha,
  detalhe,
  onUpdate,
}: {
  linha: LinhaPerfil;
  detalhe: DetalhePerfil | undefined;
  onUpdate: (patch: Partial<LinhaPerfil>) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const d = detalhe ?? { base: 0, encargos: 0, encargosItens: [], beneficios: 0, custoMensal: 0, pessoasMes: 0 };

  const partes = [
    { label: linha.modoSalario === "hora" ? `Salário (${linha.horas} h)` : "Salário", valor: d.base },
    // encargos item a item (só CLT)
    ...d.encargosItens.map((e) => ({ label: e.nome, valor: e.valor })),
    { label: `Benefícios (${linha.beneficios.length})`, valor: d.beneficios },
  ];

  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
        <div className="text-muted-foreground flex flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {partes.map((p, i) => (
            <span key={p.label} className="inline-flex items-center gap-2">
              {i > 0 && <span className="text-muted-foreground/60">+</span>}
              <span>
                {p.label} <strong className="text-foreground font-medium">{formatBRL(p.valor)}</strong>
              </span>
            </span>
          ))}
          <span className="text-muted-foreground/60">=</span>
          <span>
            <strong className="text-foreground font-semibold">{formatBRL(d.custoMensal)}</strong>/mês por pessoa
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground -mr-1 h-7 text-xs"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
        >
          <HeartHandshake className="size-3.5" />
          Benefícios
          <ChevronDown className={`size-3.5 transition-transform ${aberto ? "rotate-180" : ""}`} />
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="grid gap-3 border-t px-3 py-3">
              <span className="text-muted-foreground text-xs font-medium">Benefícios</span>
              <ToggleGroup
                type="multiple"
                variant="outline"
                size="sm"
                value={linha.beneficios}
                onValueChange={(v) => onUpdate({ beneficios: v })}
                className="flex w-full flex-wrap gap-1.5 shadow-none"
              >
                {BENEFICIOS.map((b) => (
                  <ToggleGroupItem
                    key={b.nome}
                    value={b.nome}
                    className="data-[state=on]:border-brand/40 data-[state=on]:bg-brand/10 data-[state=on]:text-brand h-7 flex-none rounded-full! border! px-2.5 text-xs shadow-none"
                  >
                    {b.nome}
                    <span className="opacity-60">
                      {b.pctBase ? `${formatPctFino(b.pctBase)} base` : formatBRL(b.valor)}
                    </span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div className="flex flex-wrap items-end gap-3">
                <NumberField
                  label="Demais benefícios (R$/mês)"
                  prefix="R$"
                  value={linha.demaisBeneficios}
                  min={0}
                  onChange={(v) => onUpdate({ demaisBeneficios: v })}
                  className="w-48"
                />
                <p className="text-muted-foreground pb-2 text-[11px]">
                  Valores mensais da fórmula “R$ Benefícios” do Zoho.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
