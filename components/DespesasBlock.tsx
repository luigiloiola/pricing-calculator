"use client";

import { AnimatePresence } from "framer-motion";
import { FieldLabel, NumberField } from "./fields";
import LinhaShell, { Stat } from "./LinhaShell";
import Trio, { congelar } from "./Trio";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIAS_DESPESA } from "@/lib/zoho/params";
import { formatBRL, formatPct, type LinhaDespesa, type ResultadoPricing } from "@/lib/pricing";

export default function DespesasBlock({
  linhas,
  resultado,
  onUpdate,
  onRemove,
}: {
  linhas: LinhaDespesa[];
  resultado: ResultadoPricing;
  onUpdate: (uid: string, patch: Partial<LinhaDespesa>) => void;
  onRemove: (uid: string) => void;
}) {
  return (
    <AnimatePresence initial={false}>
      {linhas.map((l, i) => {
        const res = resultado.linhas[l.uid];
        return (
          <LinhaShell
            key={l.uid}
            indice={i + 1}
            titulo={l.categoria}
            onRemove={() => onRemove(l.uid)}
            rodape={
              res && (
                <>
                  <Stat label="Custo total" value={formatBRL(res.custo)} />
                  <Stat label="Receita bruta" value={formatBRL(res.receitaBruta)} />
                  <Stat label="Margem" value={Number.isFinite(res.margem) ? formatPct(res.margem) : "—"} />
                </>
              )
            }
          >
            <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)_5rem]">
              <div className="grid min-w-0 gap-1.5">
                <FieldLabel>Categoria</FieldLabel>
                <Select value={l.categoria} onValueChange={(v) => onUpdate(l.uid, { categoria: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_DESPESA.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid min-w-0 gap-1.5">
                <FieldLabel>Descrição</FieldLabel>
                <Input
                  value={l.descricao}
                  placeholder="Ex.: 2 viagens a SP para kickoff"
                  onChange={(e) => onUpdate(l.uid, { descricao: e.target.value })}
                />
              </div>
              <NumberField label="Qtd." value={l.quantidade} decimals={0} min={0} onChange={(v) => onUpdate(l.uid, { quantidade: v })} />
            </div>

            <Trio
              alvo={l.alvo}
              res={res}
              margem={l.margem}
              receita={l.receitaBruta}
              unitario={l.custoUnitario}
              custoLabel="Custo unitário"
              custoCurto="Custo"
              onAlvo={(alvo, atual) =>
                onUpdate(l.uid, { alvo, ...congelar(atual), ...(atual ? { custoUnitario: atual.unitario } : {}) })
              }
              onUnitario={(v) => onUpdate(l.uid, { custoUnitario: v })}
              onMargem={(v) => onUpdate(l.uid, { margem: v })}
              onReceita={(v) => onUpdate(l.uid, { receitaBruta: v })}
            />
          </LinhaShell>
        );
      })}
    </AnimatePresence>
  );
}
