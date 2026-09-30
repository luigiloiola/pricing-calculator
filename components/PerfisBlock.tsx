"use client";

import { AnimatePresence } from "framer-motion";
import { FieldLabel, NumberField, Segmented } from "./fields";
import CustoPerfil from "./CustoPerfil";
import LinhaShell, { Stat } from "./LinhaShell";
import RecursoCombobox from "./RecursoCombobox";
import Trio, { congelar } from "./Trio";
import { formatBRL, formatPct, type LinhaPerfil, type Recurso, type ResultadoPricing } from "@/lib/pricing";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BENEFICIOS_PADRAO, HORAS_MES_PADRAO, PRATICAS, praticaCompativel, praticaDaLinhaPara } from "@/lib/zoho/params";

const mesmos = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Mensagem quando a linha não vai passar no filtro de Cargo / Perfil do Zoho. */
export function problemaPratica(l: LinhaPerfil, recurso: Recurso | undefined): string | null {
  if (!l.recursoId) return l.pratica ? null : "Escolha a prática e o cargo.";
  if (!l.pratica) return "Escolha a prática da linha — o Zoho filtra o cargo por ela.";
  if (recurso && !praticaCompativel(recurso.pratica, l.pratica))
    return `O cargo é da prática ${recurso.pratica}, diferente de ${l.pratica} — o Zoho vai recusar.`;
  return null;
}

export default function PerfisBlock({
  linhas,
  recursos,
  resultado,
  onUpdate,
  onRemove,
}: {
  linhas: LinhaPerfil[];
  recursos: Recurso[];
  resultado: ResultadoPricing;
  onUpdate: (uid: string, patch: Partial<LinhaPerfil>) => void;
  onRemove: (uid: string) => void;
}) {
  return (
    <AnimatePresence initial={false}>
      {linhas.map((l, i) => {
        const res = resultado.linhas[l.uid];
        const recurso = recursos.find((r) => r.id === l.recursoId);
        const porHora = l.modoSalario === "hora";
        return (
          <LinhaShell
            key={l.uid}
            indice={i + 1}
            titulo={recurso?.nome ?? "Perfil"}
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
            <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <div className="grid min-w-0 content-start gap-1.5">
                <FieldLabel>Prática</FieldLabel>
                <Select
                  value={l.pratica || undefined}
                  onValueChange={(v) =>
                    onUpdate(l.uid, {
                      pratica: v,
                      // cargo de outra prática não passa no filtro do Zoho
                      ...(recurso && !praticaCompativel(recurso.pratica, v) ? { recursoId: "" } : {}),
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRATICAS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid min-w-0 content-start gap-1.5">
                <FieldLabel>Cargo / Perfil</FieldLabel>
                <RecursoCombobox
                  recursos={recursos}
                  pratica={l.pratica}
                  value={l.recursoId}
                  onChange={(id) => {
                    const r = recursos.find((x) => x.id === id);
                    onUpdate(l.uid, {
                      recursoId: id,
                      ...(r && !l.pratica ? { pratica: praticaDaLinhaPara(r.pratica) } : {}),
                      salarioNominal: r?.salarioNominal ?? l.salarioNominal,
                      taxaHora: r?.taxaHora ?? l.taxaHora,
                    });
                  }}
                />
                {problemaPratica(l, recurso) && (
                  <p className="text-warn text-[11px] leading-tight">{problemaPratica(l, recurso)}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-start">
              <div className="col-span-2 grid content-start gap-1.5 sm:col-span-1">
                <FieldLabel>Contratação</FieldLabel>
                <Segmented
                  size="default"
                  value={l.tipoAlocacao}
                  onChange={(v) =>
                    onUpdate(l.uid, {
                      tipoAlocacao: v,
                      // troca os benefícios padrão junto, se o vendedor não tiver mexido neles
                      ...(mesmos(l.beneficios, BENEFICIOS_PADRAO[l.tipoAlocacao])
                        ? { beneficios: [...BENEFICIOS_PADRAO[v]] }
                        : {}),
                    })
                  }
                  options={[
                    { value: "CLT", label: "CLT" },
                    { value: "PJ", label: "PJ" },
                  ]}
                />
              </div>
              <div className="col-span-2 grid content-start gap-1.5 sm:col-span-1">
                <FieldLabel>Salário informado</FieldLabel>
                <Segmented
                  size="default"
                  value={l.modoSalario}
                  onChange={(v) =>
                    onUpdate(l.uid, {
                      modoSalario: v,
                      // mantém o mesmo salário ao trocar a forma de informar
                      ...(v === "hora"
                        ? { horas: l.horas || HORAS_MES_PADRAO, taxaHora: (res?.detalhe?.base ?? 0) / (l.horas || HORAS_MES_PADRAO) }
                        : { salarioNominal: res?.detalhe?.base ?? l.salarioNominal }),
                    })
                  }
                  options={[
                    { value: "mensal", label: "Mensal" },
                    { value: "hora", label: "Taxa × horas" },
                  ]}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:w-fit sm:grid-cols-[5rem_5rem_6rem]">
              <NumberField label="Qtd." value={l.quantidade} decimals={0} min={0} onChange={(v) => onUpdate(l.uid, { quantidade: v })} />
              <NumberField label="Meses" value={l.meses} decimals={1} min={0} onChange={(v) => onUpdate(l.uid, { meses: v })} />
              {porHora && (
                <NumberField label="Horas/mês" value={l.horas} decimals={0} min={0} onChange={(v) => onUpdate(l.uid, { horas: v })} />
              )}
            </div>

            <CustoPerfil linha={l} detalhe={res?.detalhe} onUpdate={(patch) => onUpdate(l.uid, patch)} />

            <Trio
              alvo={l.alvo}
              res={res}
              margem={l.margem}
              receita={l.receitaBruta}
              unitario={porHora ? l.taxaHora : l.salarioNominal}
              custoLabel={porHora ? `Taxa hora (× ${l.horas} h)` : "Salário mensal"}
              custoCurto={porHora ? "Taxa hora" : "Salário"}
              custoHint={(() => {
                const extras = l.tipoAlocacao === "CLT" ? "+ encargos e benefícios" : "+ benefícios";
                if (porHora) return `Salário = taxa × ${l.horas} h · ${extras}`;
                if (recurso?.salarioNominal && l.alvo !== "custo")
                  return `Zoho: ${formatBRL(recurso.salarioNominal)} · ${extras}`;
                return extras;
              })()}
              onAlvo={(alvo, atual) =>
                onUpdate(l.uid, {
                  alvo,
                  ...congelar(atual),
                  ...(atual ? (porHora ? { taxaHora: atual.unitario } : { salarioNominal: atual.unitario }) : {}),
                })
              }
              onUnitario={(v) => onUpdate(l.uid, porHora ? { taxaHora: v } : { salarioNominal: v })}
              onMargem={(v) => onUpdate(l.uid, { margem: v })}
              onReceita={(v) => onUpdate(l.uid, { receitaBruta: v })}
            />
          </LinhaShell>
        );
      })}
    </AnimatePresence>
  );
}
