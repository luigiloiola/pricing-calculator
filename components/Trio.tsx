"use client";

import { Sparkles } from "lucide-react";
import { NumberField, PercentField } from "./fields";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatBRL, type Alvo, type ResultadoLinha } from "@/lib/pricing";

/**
 * As três variáveis de uma linha — Custo, Margem % e Receita bruta.
 * O vendedor escolhe qual é calculada; as outras duas são digitadas.
 */
export default function Trio({
  alvo,
  res,
  margem,
  receita,
  unitario,
  custoLabel,
  custoCurto,
  custoPrefix = "R$",
  custoHint,
  onAlvo,
  onUnitario,
  onMargem,
  onReceita,
}: {
  alvo: Alvo;
  res: ResultadoLinha | undefined;
  margem: number;
  receita: number;
  unitario: number;
  custoLabel: string;
  custoCurto: string;
  custoPrefix?: string;
  custoHint?: string;
  onAlvo: (alvo: Alvo, atual: ResultadoLinha | undefined) => void;
  onUnitario: (v: number) => void;
  onMargem: (v: number) => void;
  onReceita: (v: number) => void;
}) {
  const margemCalc = res?.margem ?? NaN;
  return (
    <div className="bg-muted/50 grid gap-3 rounded-lg border border-dashed p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
          <Sparkles className="text-brand size-3.5" />
          Informe dois valores — o terceiro é calculado
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={alvo}
          aria-label="Valor calculado"
          onValueChange={(v) => v && onAlvo(v as Alvo, res)}
          className="bg-background"
        >
          {(
            [
              ["custo", custoCurto],
              ["margem", "Margem"],
              ["receita", "Receita"],
            ] as const
          ).map(([v, l]) => (
            <ToggleGroupItem
              key={v}
              value={v}
              className="data-[state=on]:bg-brand/10 data-[state=on]:text-brand px-3 text-xs"
            >
              {l}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField
          label={custoLabel}
          prefix={custoPrefix}
          value={alvo === "custo" ? (res?.unitario ?? 0) : unitario}
          computed={alvo === "custo"}
          onChange={onUnitario}
          min={0}
          hint={custoHint}
        />
        <PercentField
          label="Margem %"
          value={alvo === "margem" ? margemCalc : margem}
          computed={alvo === "margem"}
          onChange={onMargem}
          tone={Number.isFinite(margemCalc) && margemCalc < 0 ? "warn" : undefined}
          hint={alvo === "margem" && !(receita > 0) ? "Informe a receita" : undefined}
        />
        <NumberField
          label="Receita bruta (total)"
          prefix="R$"
          value={alvo === "receita" ? (res?.receitaBruta ?? 0) : receita}
          computed={alvo === "receita"}
          onChange={onReceita}
          min={0}
          hint={
            res && res.receitaBruta > 0 ? (
              <span className={alvo === "receita" ? "text-brand font-semibold" : undefined}>
                {formatBRL(res.receitaMensal)}/mês × {res.meses.toLocaleString("pt-BR")} {res.meses === 1 ? "mês" : "meses"}
              </span>
            ) : undefined
          }
        />
      </div>
    </div>
  );
}

/** Ao trocar qual valor é calculado, fixa os valores atuais para nada "pular". */
export function congelar(atual: ResultadoLinha | undefined) {
  if (!atual) return {};
  return {
    ...(Number.isFinite(atual.margem) ? { margem: atual.margem } : {}),
    receitaBruta: atual.receitaBruta,
  };
}
