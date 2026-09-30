"use client";

import { AnimatePresence } from "framer-motion";
import { FieldLabel, NumberField, Segmented } from "./fields";
import LinhaShell, { Stat } from "./LinhaShell";
import Trio, { congelar } from "./Trio";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL, formatPct, type LinhaLicenca, type Produto, type ResultadoPricing } from "@/lib/pricing";

export default function LicencasBlock({
  linhas,
  produtos,
  resultado,
  onUpdate,
  onRemove,
}: {
  linhas: LinhaLicenca[];
  produtos: Produto[];
  resultado: ResultadoPricing;
  onUpdate: (uid: string, patch: Partial<LinhaLicenca>) => void;
  onRemove: (uid: string) => void;
}) {
  return (
    <AnimatePresence initial={false}>
      {linhas.map((l, i) => {
        const res = resultado.linhas[l.uid];
        const produto = produtos.find((p) => p.id === l.produtoId);
        return (
          <LinhaShell
            key={l.uid}
            indice={i + 1}
            titulo={produto?.nome ?? "Licença"}
            onRemove={() => onRemove(l.uid)}
            rodape={
              res && (
                <>
                  <Stat label="Custo total" value={formatBRL(res.custo)} />
                  {res.impostosImportacao > 0 && <Stat label="↳ importação" value={formatBRL(res.impostosImportacao)} />}
                  <Stat label="Receita bruta" value={formatBRL(res.receitaBruta)} />
                  <Stat label="Margem" value={Number.isFinite(res.margem) ? formatPct(res.margem) : "—"} />
                </>
              )
            }
          >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_5rem]">
              <div className="grid min-w-0 gap-1.5">
                <FieldLabel>Produto</FieldLabel>
                <Select
                  value={l.produtoId || undefined}
                  onValueChange={(id) => {
                    const p = produtos.find((x) => x.id === id);
                    onUpdate(l.uid, {
                      produtoId: id,
                      custoUnitario: p?.custoUnitario ?? l.custoUnitario,
                      faturamentoNacional: p?.faturamentoNacional ?? l.faturamentoNacional,
                    });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid content-start gap-1.5">
                <FieldLabel>Faturamento</FieldLabel>
                <Segmented
                  size="default"
                  value={l.faturamentoNacional ? "nac" : "imp"}
                  onChange={(v) => onUpdate(l.uid, { faturamentoNacional: v === "nac" })}
                  options={[
                    { value: "nac", label: "Nacional" },
                    { value: "imp", label: "Importado" },
                  ]}
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
              custoPrefix={l.faturamentoNacional ? "R$" : "US$"}
              custoHint={l.faturamentoNacional ? "Em reais" : "Moeda do fabricante · + câmbio e impostos de importação"}
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
