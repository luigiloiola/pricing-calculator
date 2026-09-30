"use client";

import { motion } from "framer-motion";
import { Check, Loader2, Send } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatBRL, formatPct, formatPctFino, type PricingInput, type ResultadoPricing } from "@/lib/pricing";
import type { PricingMeta } from "@/lib/zoho/pricing-record";
import { ZOHO_PARAMS } from "@/lib/zoho/params";

const SEGMENTOS = [
  { key: "perfis", label: "Perfis", color: "var(--chart-1)" },
  { key: "licencas", label: "Licenças", color: "var(--chart-2)" },
  { key: "despesas", label: "Despesas", color: "var(--chart-3)" },
] as const;


export interface EstadoEnvio {
  disponivel: boolean; // há uma pricing do Zoho aberta
  motivo?: string; // por que não dá para enviar
  estado: "idle" | "enviando" | "ok" | "erro";
  mensagem?: string;
  alteracoesPendentes: boolean;
  onEnviar: () => void;
}

export default function Summary({
  input,
  resultado: r,
  envio,
  zoho,
}: {
  input: PricingInput;
  resultado: ResultadoPricing;
  envio: EstadoEnvio;
  zoho?: PricingMeta["zoho"];
}) {
  const vazio = r.receitaBruta <= 0;
  const meses = Math.max(1, input.numMeses);
  const m = r.mensal;

  const linhas: { label: string; mes: number; total: number; sub?: boolean; forte?: boolean }[] = [
    { label: "Receita bruta", mes: m.receitaBruta, total: r.receitaBruta },
    {
      label: `Impostos (${formatPctFino(ZOHO_PARAMS.impostosSobreReceita)})`,
      mes: -m.impostos,
      total: -r.impostos,
    },
    { label: "Receita líquida", mes: m.receitaLiquida, total: r.receitaLiquida, forte: true },
    { label: "Custo total", mes: -m.custo, total: -r.custoTotal },
    ...(r.encargosPerfis > 0 ? [{ label: "encargos CLT", mes: m.encargos, total: r.encargosPerfis, sub: true }] : []),
    ...(r.beneficiosPerfis > 0 ? [{ label: "benefícios", mes: m.beneficios, total: r.beneficiosPerfis, sub: true }] : []),
    ...(r.impostosImportacao > 0
      ? [{ label: "impostos de importação", mes: m.importacao, total: r.impostosImportacao, sub: true }]
      : []),
  ];

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="from-brand/10 bg-gradient-to-b to-transparent px-6 pt-6 pb-5">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">Receita bruta mensal</p>
        <AnimatedNumber value={m.receitaBruta} className="mt-2 block text-4xl font-semibold tracking-tight" />
        <p className="text-muted-foreground mt-1 text-sm">
          <AnimatedNumber value={r.receitaBruta} /> no total · {meses} {meses === 1 ? "mês" : "meses"}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-brand/30 bg-brand/5 text-brand px-2.5 py-1 text-sm font-semibold">
            Margem <AnimatedNumber value={r.margemPct} format={formatPct} />
          </Badge>
          <Badge variant="secondary" className="px-2.5 py-1 text-sm">
            <AnimatedNumber value={m.margemRS} />/mês
          </Badge>
        </div>
      </div>

      <Separator />

      <div className="grid gap-5 p-6">
        <div className="grid gap-2">
          <div className="bg-muted flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {SEGMENTOS.map((s) => (
              <motion.span
                key={s.key}
                className="h-full"
                style={{ background: s.color }}
                animate={{ width: `${r.custoTotal ? (r[s.key].custo / r.custoTotal) * 100 : 0}%` }}
                transition={{ type: "spring", stiffness: 180, damping: 26 }}
              />
            ))}
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="text-foreground font-medium">Composição do custo</span>
            {SEGMENTOS.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5">
                <i className="inline-block size-2 rounded-[2px]" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        </div>

        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="text-muted-foreground text-xs">
              <th className="pb-2 text-left font-medium" />
              <th className="pb-2 text-right font-medium">Mensal</th>
              <th className="pb-2 pl-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.label} className={cn(l.sub && "text-muted-foreground text-xs")}>
                <td className={cn("py-1 pr-2", !l.sub && "text-muted-foreground", l.forte && "text-foreground font-medium")}>
                  {l.sub ? `↳ ${l.label}` : l.label}
                </td>
                <td className={cn("py-1 text-right whitespace-nowrap", l.forte && "font-medium")}>
                  <AnimatedNumber value={l.mes} />
                </td>
                <td className={cn("py-1 pl-3 text-right whitespace-nowrap", l.forte && "font-medium", !l.sub && "text-muted-foreground")}>
                  <AnimatedNumber value={l.total} />
                </td>
              </tr>
            ))}
            <tr className="border-t font-semibold">
              <td className="pt-2.5">Margem R$</td>
              <td className="pt-2.5 text-right whitespace-nowrap">
                <AnimatedNumber value={m.margemRS} />
              </td>
              <td className="pt-2.5 pl-3 text-right whitespace-nowrap">
                <AnimatedNumber value={r.margemRS} />
              </td>
            </tr>
          </tbody>
        </table>
        <p className="text-muted-foreground -mt-2 text-[11px]">
          Margem % sobre a receita líquida. Mensal = cada linha dividida pelos seus meses.
        </p>

        {vazio && (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
            Adicione perfis, licenças ou despesas para calcular.
          </p>
        )}

        {zoho && zoho.receitaBruta != null && !envio.alteracoesPendentes && <DiferencasZoho zoho={zoho} r={r} />}

        <div className="grid gap-2">
          <Button
            size="lg"
            className="w-full"
            onClick={envio.onEnviar}
            disabled={!envio.disponivel || envio.estado === "enviando" || (!envio.alteracoesPendentes && envio.estado === "ok")}
          >
            {envio.estado === "enviando" ? (
              <Loader2 className="animate-spin" />
            ) : !envio.alteracoesPendentes && envio.estado === "ok" ? (
              <Check />
            ) : (
              <Send />
            )}
            {envio.estado === "enviando"
              ? "Enviando…"
              : !envio.alteracoesPendentes && envio.estado === "ok"
                ? "Salvo no Zoho"
                : "Enviar para o Zoho"}
          </Button>
          {(envio.mensagem || envio.motivo) && (
            <p
              className={cn(
                "text-center text-xs",
                envio.estado === "erro" ? "text-destructive" : envio.estado === "ok" ? "text-success" : "text-muted-foreground",
              )}
            >
              {envio.mensagem ?? envio.motivo}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

const TOLERANCIA = 0.01; // R$

/** Mostra só os campos em que o Zoho calculou diferente, com a diferença em R$ (Zoho − calculadora). */
function DiferencasZoho({ zoho, r }: { zoho: PricingMeta["zoho"]; r: ResultadoPricing }) {
  const campos: [string, number | null, number][] = [
    ["Receita bruta", zoho.receitaBruta, r.receitaBruta],
    ["Custo total", zoho.custoTotal, r.custoTotal],
    ["Margem R$", zoho.margemRS, r.margemRS],
  ];
  const errados = campos
    .filter(([, z, c]) => z != null && Math.abs(z - c) > TOLERANCIA)
    .map(([label, z, c]) => ({ label, diferenca: z! - c }));

  if (errados.length === 0)
    return <p className="text-success text-center text-xs">✓ Totais iguais aos calculados pelo Zoho</p>;

  const sinal = (v: number) => `${v > 0 ? "+" : "−"} ${formatBRL(Math.abs(v))}`;
  return (
    <div className="border-warn/40 bg-warn/10 grid gap-1 rounded-lg border px-3 py-2.5 text-xs">
      <span className="text-warn font-medium">Diferença no Zoho</span>
      {errados.map((e) => (
        <div key={e.label} className="flex justify-between gap-2 tabular-nums">
          <span className="text-muted-foreground">{e.label}</span>
          <span className="text-warn font-semibold">{sinal(e.diferenca)}</span>
        </div>
      ))}
    </div>
  );
}
