"use client";

import { motion, type Variants } from "framer-motion";
import { Briefcase, Building2, Database, FileSpreadsheet, Info, KeyRound, Loader2, Plus, Receipt, RefreshCw, TriangleAlert, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import DespesasBlock from "./DespesasBlock";
import { FieldLabel, NumberField, Segmented } from "./fields";
import LicencasBlock from "./LicencasBlock";
import PerfisBlock, { problemaPratica } from "./PerfisBlock";
import Summary, { type EstadoEnvio } from "./Summary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CATALOGO_EXEMPLO } from "@/lib/catalogo-exemplo";
import { cn } from "@/lib/utils";
import type { PricingCarregada, PricingMeta } from "@/lib/zoho/pricing-record";
import type { UsuarioPublico } from "@/lib/auth/sessao";
import { api } from "@/lib/cliente-api";
import Marca from "./Marca";
import UserMenu from "./UserMenu";
import {
  calcularPricing,
  novoUid,
  blocosHabilitados,
  inputEfetivo,
  type Catalogo,
  type LinhaDespesa,
  type LinhaLicenca,
  type LinhaPerfil,
  type PricingInput,
  type TipoOferta,
} from "@/lib/pricing";
import { BENEFICIOS_PADRAO, HORAS_MES_PADRAO, PRATICAS, praticaDaLinhaPara, TIPOS_OFERTA } from "@/lib/zoho/params";

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

// Margem inicial de cada linha (margem esperada padrão da planilha Pricing).
const MARGEM_PADRAO = {
  perfil: 0.2,
  licenca: 0.2,
  despesa: 0,
};

type Lista = "perfis" | "licencas" | "despesas";

type EstadoPricing = {
  estado: "sem-id" | "carregando" | "ok" | "erro";
  meta?: PricingMeta;
  referencias?: PricingCarregada["referencias"];
  erro?: string;
};

/** Depois de salvar, liga as linhas novas aos ids que o Zoho criou (na ordem). */
function aplicarIds<T extends { uid: string; zohoId?: string }>(enviadas: T[], relidas: { zohoId?: string }[]) {
  const conhecidos = new Set(enviadas.map((l) => l.zohoId).filter(Boolean));
  const novos = relidas.map((l) => l.zohoId).filter((id): id is string => !!id && !conhecidos.has(id));
  const mapa = new Map<string, string>();
  for (const l of enviadas) if (!l.zohoId && novos.length) mapa.set(l.uid, novos.shift()!);
  return mapa;
}

export default function PricingCalculator({ pricingId, usuario }: { pricingId?: string; usuario?: UsuarioPublico }) {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [pricing, setPricing] = useState<EstadoPricing>({ estado: pricingId ? "carregando" : "sem-id" });
  const [sincronizado, setSincronizado] = useState<string | null>(null);
  const [envio, setEnvio] = useState<{ estado: EstadoEnvio["estado"]; mensagem?: string }>({ estado: "idle" });
  const [input, setInput] = useState<PricingInput>({
    tipoOferta: "Alocação",
    tipoProposta: "",
    praticas: [],
    numMeses: 12,
    tarifaCambio: 5.5,
    perfis: [],
    licencas: [],
    despesas: [],
  });

  const carregar = useCallback(async (refresh = false) => {
    setCatalogo(null);
    try {
      setCatalogo(await api<Catalogo>(`/api/catalogo${refresh ? "?refresh=1" : ""}`));
    } catch {
      setCatalogo({ ...CATALOGO_EXEMPLO, aviso: "Não foi possível carregar o catálogo. Valores fictícios." });
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Carrega a pricing do Zoho indicada na URL
  useEffect(() => {
    if (!pricingId) return;
    let vivo = true;
    (async () => {
      try {
        const p = await api<PricingCarregada>(`/api/pricing/${encodeURIComponent(pricingId)}`);
        if (!vivo) return;
        setInput(p.input);
        setSincronizado(JSON.stringify(inputEfetivo(p.input)));
        setPricing({ estado: "ok", meta: p.meta, referencias: p.referencias });
      } catch (e) {
        if (vivo) setPricing({ estado: "erro", erro: (e as Error).message });
      }
    })();
    return () => {
      vivo = false;
    };
  }, [pricingId]);

  // Catálogo + cargos/produtos citados na pricing que não estejam no catálogo
  const cat = useMemo<Catalogo>(() => {
    const base = catalogo ?? CATALOGO_EXEMPLO;
    const refs = pricing.referencias;
    if (!refs) return base;
    const recursos = [...base.recursos];
    for (const r of refs.recursos)
      if (!recursos.some((x) => x.id === r.id))
        recursos.push({ id: r.id, nome: r.nome || "Cargo da pricing", pratica: "Da pricing", salarioNominal: 0, custoMensal: 0, taxaHora: 0 });
    const produtos = [...base.produtos];
    for (const p of refs.produtos)
      if (!produtos.some((x) => x.id === p.id))
        produtos.push({ id: p.id, nome: p.nome || "Produto da pricing", custoUnitario: 0, faturamentoNacional: true });
    return { ...base, recursos, produtos };
  }, [catalogo, pricing.referencias]);

  const habilitados = blocosHabilitados(input.tipoOferta);
  const efetivo = useMemo(() => inputEfetivo(input), [input]);
  const resultado = useMemo(() => calcularPricing(efetivo, cat), [efetivo, cat]);
  const alteracoesPendentes = pricing.estado === "ok" && sincronizado !== JSON.stringify(efetivo);

  const enviar = async () => {
    if (!pricingId || pricing.estado !== "ok") return;
    const enviado = inputEfetivo(input); // blocos desabilitados não vão (e são removidos no Zoho)
    setEnvio({ estado: "enviando" });
    try {
      const p = await api<PricingCarregada>(`/api/pricing/${encodeURIComponent(pricingId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: enviado }),
      });
      const ids = {
        perfis: aplicarIds(enviado.perfis, p.input.perfis),
        licencas: aplicarIds(enviado.licencas, p.input.licencas),
        despesas: aplicarIds(enviado.despesas, p.input.despesas),
      };
      const comIds = <T extends { uid: string; zohoId?: string }>(ls: T[], m: Map<string, string>) =>
        ls.map((l) => (m.has(l.uid) ? { ...l, zohoId: m.get(l.uid) } : l));
      const salvo: PricingInput = {
        ...enviado,
        perfis: comIds(enviado.perfis, ids.perfis),
        licencas: comIds(enviado.licencas, ids.licencas),
        despesas: comIds(enviado.despesas, ids.despesas),
      };
      // preserva o que o vendedor editou enquanto o envio acontecia
      // linhas de blocos desabilitados foram apagadas no Zoho: perdem o id
      const h = blocosHabilitados(enviado.tipoOferta);
      const semId = <T extends { zohoId?: string }>(ls: T[]) => ls.map((l) => ({ ...l, zohoId: undefined }));
      setInput((atual) => ({
        ...atual,
        perfis: h.perfis ? comIds(atual.perfis, ids.perfis) : semId(atual.perfis),
        licencas: h.licencas ? comIds(atual.licencas, ids.licencas) : semId(atual.licencas),
        despesas: comIds(atual.despesas, ids.despesas),
      }));
      setSincronizado(JSON.stringify(salvo));
      setPricing((pr) => ({ ...pr, meta: p.meta }));
      const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      setEnvio({ estado: "ok", mensagem: `Pricing ${p.meta.numero || pricingId} atualizada às ${hora}.` });
    } catch (e) {
      setEnvio({ estado: "erro", mensagem: `Não foi possível salvar: ${(e as Error).message}` });
    }
  };

  // linhas que o filtro de Cargo / Perfil do Zoho vai recusar
  const bloqueio = efetivo.perfis
    .map((l, i) => {
      const r = cat.recursos.find((x) => x.id === l.recursoId);
      const p = l.recursoId ? problemaPratica(l, r) : null;
      return p ? `Perfil ${i + 1}: ${p}` : null;
    })
    .find(Boolean);

  const estadoEnvio: EstadoEnvio = {
    disponivel: pricing.estado === "ok" && !bloqueio,
    motivo:
      pricing.estado === "sem-id"
        ? "Abra uma pricing pela URL /pricing/<id> para enviar ao Zoho."
        : pricing.estado === "carregando"
          ? "Carregando pricing…"
          : pricing.estado === "erro"
            ? "A pricing não foi carregada."
            : undefined,
    estado: pricing.estado === "ok" && bloqueio ? "erro" : envio.estado === "ok" && alteracoesPendentes ? "idle" : envio.estado,
    mensagem:
      pricing.estado === "ok" && bloqueio
        ? bloqueio
        : envio.estado === "erro"
          ? envio.mensagem
        : alteracoesPendentes
          ? "Há alterações ainda não enviadas."
          : envio.mensagem,
    alteracoesPendentes,
    onEnviar: enviar,
  };

  const set = <K extends keyof PricingInput>(k: K, v: PricingInput[K]) => setInput((p) => ({ ...p, [k]: v }));

  function atualizar<T extends { uid: string }>(lista: Lista) {
    return (uid: string, patch: Partial<T>) =>
      setInput((p) => ({
        ...p,
        [lista]: (p[lista] as unknown as T[]).map((l) => (l.uid === uid ? { ...l, ...patch } : l)),
      }));
  }
  const remover = (lista: Lista) => (uid: string) =>
    setInput((p) => ({ ...p, [lista]: (p[lista] as { uid: string }[]).filter((l) => l.uid !== uid) }));

  const addPerfil = () =>
    setInput((p) => {
      const r = cat.recursos[0];
      const nova: LinhaPerfil = {
        uid: novoUid(),
        alvo: "receita",
        pratica: r ? praticaDaLinhaPara(r.pratica) : "",
        recursoId: r && praticaDaLinhaPara(r.pratica) ? r.id : "",
        tipoAlocacao: "CLT",
        modoSalario: "mensal",
        quantidade: 1,
        meses: p.numMeses,
        horas: HORAS_MES_PADRAO,
        salarioNominal: r?.salarioNominal ?? 0,
        taxaHora: r?.taxaHora ?? 0,
        beneficios: [...BENEFICIOS_PADRAO.CLT],
        demaisBeneficios: 0,
        margem: MARGEM_PADRAO.perfil,
        receitaBruta: 0,
      };
      return { ...p, perfis: [...p.perfis, nova] };
    });
  const addLicenca = () =>
    setInput((p) => {
      const prod = cat.produtos[0];
      const nova: LinhaLicenca = {
        uid: novoUid(),
        alvo: "receita",
        produtoId: prod?.id ?? "",
        quantidade: 1,
        custoUnitario: prod?.custoUnitario ?? 0,
        faturamentoNacional: prod?.faturamentoNacional ?? true,
        margem: MARGEM_PADRAO.licenca,
        receitaBruta: 0,
      };
      return { ...p, licencas: [...p.licencas, nova] };
    });
  const addDespesa = () =>
    setInput((p) => {
      const nova: LinhaDespesa = {
        uid: novoUid(),
        alvo: "receita",
        categoria: "Despesas de Viagem",
        descricao: "",
        quantidade: 1,
        custoUnitario: 0,
        margem: MARGEM_PADRAO.despesa,
        receitaBruta: 0,
      };
      return { ...p, despesas: [...p.despesas, nova] };
    });

  // Ao mudar o prazo, perfis CLT que acompanhavam o prazo anterior seguem o novo.
  const mudarMeses = (m: number) =>
    setInput((p) => ({
      ...p,
      numMeses: m,
      perfis: p.perfis.map((l) => (l.meses === p.numMeses ? { ...l, meses: m } : l)),
    }));

  const blocos: Record<Lista, { titulo: string; descricao: string; icone: ReactNode; qtd: number; add: () => void; addLabel: string; acao?: ReactNode; el: ReactNode }> = {
    perfis: {
      titulo: "Perfis profissionais",
      descricao: "Salário mensal ou taxa hora × horas (160 h padrão). Encargos CLT e benefícios entram no custo.",
      icone: <Users />,
      qtd: input.perfis.length,
      add: addPerfil,
      addLabel: "Adicionar perfil",
      el: (
        <PerfisBlock
          linhas={input.perfis}
          recursos={cat.recursos}
          resultado={resultado}
          onUpdate={atualizar<LinhaPerfil>("perfis")}
          onRemove={remover("perfis")}
        />
      ),
    },
    licencas: {
      titulo: "Licenças",
      descricao: "Ferramentas de revenda. Importadas somam câmbio e impostos de importação.",
      icone: <KeyRound />,
      qtd: input.licencas.length,
      add: addLicenca,
      addLabel: "Adicionar licença",
      acao: (
        <NumberField
          label="Câmbio (US$ → R$)"
          prefix="R$"
          value={input.tarifaCambio}
          decimals={4}
          min={0}
          onChange={(v) => set("tarifaCambio", v)}
          className="w-36"
        />
      ),
      el: (
        <LicencasBlock
          linhas={input.licencas}
          produtos={cat.produtos}
          resultado={resultado}
          onUpdate={atualizar<LinhaLicenca>("licencas")}
          onRemove={remover("licencas")}
        />
      ),
    },
    despesas: {
      titulo: "Despesas adicionais",
      descricao: "Viagens, equipamentos e ferramentas internas.",
      icone: <Receipt />,
      qtd: input.despesas.length,
      add: addDespesa,
      addLabel: "Adicionar despesa",
      el: (
        <DespesasBlock
          linhas={input.despesas}
          resultado={resultado}
          onUpdate={atualizar<LinhaDespesa>("despesas")}
          onRemove={remover("despesas")}
        />
      ),
    },
  };
  const ordemBase: Lista[] =
    input.tipoOferta === "Licenças" ? ["licencas", "perfis", "despesas"] : ["perfis", "licencas", "despesas"];
  // blocos desabilitados pela oferta vão para o fim
  const ordem = [...ordemBase.filter((k) => habilitados[k]), ...ordemBase.filter((k) => !habilitados[k])];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <motion.div
        className={cn("grid min-w-0 gap-6", pricing.estado === "carregando" && "pointer-events-none")}
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.header variants={item} className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Marca />
            <div className="flex flex-wrap items-center gap-2">
              <FonteBadge catalogo={catalogo} onRefresh={() => carregar(true)} />
              {usuario && <UserMenu usuario={usuario} />}
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Calculadora de pricing</h1>
          <p className="text-muted-foreground max-w-2xl">
            Monte a composição da oportunidade com os custos oficiais do Zoho CRM. Em cada linha, informe dois entre
            custo, margem e receita — o terceiro é calculado.
          </p>
          <PricingHeader pricingId={pricingId} pricing={pricing} />
          {catalogo?.aviso && (
            <Alert className="border-warn/40 bg-warn/10 text-warn">
              <TriangleAlert />
              <AlertTitle>Dados de exemplo</AlertTitle>
              <AlertDescription className="text-warn/90">{catalogo.aviso}</AlertDescription>
            </Alert>
          )}
        </motion.header>

        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="text-muted-foreground size-4" /> Oportunidade
              </CardTitle>
              <CardDescription>Campos do módulo Pricings do Zoho.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-1.5">
                <FieldLabel>Tipo de oferta</FieldLabel>
                <Segmented<TipoOferta>
                  size="default"
                  value={input.tipoOferta}
                  onChange={(v) => set("tipoOferta", v)}
                  options={TIPOS_OFERTA.map((t) => ({ value: t, label: t }))}
                  className="w-full sm:w-fit"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <div className="grid min-w-0 content-start gap-1.5">
                  <FieldLabel>Tipo de proposta</FieldLabel>
                  <Input
                    readOnly
                    tabIndex={-1}
                    value={input.tipoProposta || "Não definido"}
                    className={cn("bg-muted/60 cursor-default shadow-none", !input.tipoProposta && "text-muted-foreground")}
                  />
                  <p className="text-muted-foreground text-[11px]">
                    {pricing.meta?.propostaOrigem === "negocio"
                      ? "Puxado do negócio — será gravado na pricing ao enviar."
                      : pricing.meta?.propostaOrigem === "pricing"
                        ? "Da pricing no Zoho."
                        : pricing.meta?.negocio
                          ? "Não definido no negócio nem na pricing — preencha no Zoho."
                          : "Definido pelo negócio no Zoho."}
                  </p>
                </div>
                <NumberField label="Prazo (meses)" value={input.numMeses} decimals={0} min={1} onChange={mudarMeses} />
              </div>
              <div className="grid gap-1.5">
                <FieldLabel>Práticas</FieldLabel>
                <ToggleGroup
                  type="multiple"
                  variant="outline"
                  size="sm"
                  value={input.praticas}
                  onValueChange={(v) => set("praticas", v)}
                  className="flex-wrap"
                >
                  {PRATICAS.map((p) => (
                    <ToggleGroupItem
                      key={p}
                      value={p}
                      className="data-[state=on]:bg-brand/10 data-[state=on]:text-brand px-3 text-xs"
                    >
                      {p}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {ordem.map((k) => {
          const b = blocos[k];
          const ativo = habilitados[k];
          return (
            <motion.div variants={item} key={k}>
              <Card className={cn(!ativo && "bg-muted/40 shadow-none")} aria-disabled={!ativo}>
                <CardHeader>
                  <CardTitle
                    className={cn(
                      "flex items-center gap-2 [&_svg]:size-4 [&_svg]:text-muted-foreground",
                      !ativo && "text-muted-foreground",
                    )}
                  >
                    {b.icone} {b.titulo}
                    {b.qtd > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {b.qtd}
                      </Badge>
                    )}
                    {!ativo && (
                      <Badge variant="outline" className="ml-1 font-normal">
                        Desabilitado
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {ativo ? b.descricao : `Não se aplica a ofertas de ${input.tipoOferta}.`}
                  </CardDescription>
                  {ativo && b.acao && <CardAction>{b.acao}</CardAction>}
                </CardHeader>
                {ativo ? (
                  <CardContent className="grid gap-3">
                    {b.el}
                    <Button variant="outline" className="w-full border-dashed" onClick={b.add}>
                      <Plus /> {b.addLabel}
                    </Button>
                  </CardContent>
                ) : (
                  b.qtd > 0 && (
                    <CardContent>
                      <p className="border-warn/40 bg-warn/10 text-warn rounded-lg border px-3 py-2 text-xs leading-relaxed">
                        {b.qtd === 1
                          ? `1 linha guardada não entra no cálculo${pricing.estado === "ok" ? " e será removida do Zoho ao enviar" : ""}. Para usá-la`
                          : `${b.qtd} linhas guardadas não entram no cálculo${pricing.estado === "ok" ? " e serão removidas do Zoho ao enviar" : ""}. Para usá-las`}
                        , mude o tipo de oferta para Serviços Gerenciados.
                      </p>
                    </CardContent>
                  )
                )}
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        className="lg:sticky lg:top-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <Summary input={input} resultado={resultado} envio={estadoEnvio} zoho={pricing.meta?.zoho} />
      </motion.div>
    </div>
  );
}

function PricingHeader({ pricingId, pricing }: { pricingId?: string; pricing: EstadoPricing }) {
  if (pricing.estado === "sem-id")
    return (
      <Alert>
        <Info />
        <AlertTitle>Nenhuma pricing aberta</AlertTitle>
        <AlertDescription>
          Abra uma pricing pela tela inicial — criando a partir de um negócio ou pelo id de uma existente.
        </AlertDescription>
      </Alert>
    );
  if (pricing.estado === "carregando")
    return (
      <Alert>
        <Loader2 className="animate-spin" />
        <AlertTitle>Carregando pricing {pricingId} do Zoho CRM…</AlertTitle>
      </Alert>
    );
  if (pricing.estado === "erro")
    return (
      <Alert variant="destructive">
        <TriangleAlert />
        <AlertTitle>Não foi possível carregar a pricing {pricingId}</AlertTitle>
        <AlertDescription>{pricing.erro}</AlertDescription>
      </Alert>
    );
  const m = pricing.meta!;
  return (
    <div className="bg-card flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3 text-sm shadow-xs">
      <Badge className="bg-brand text-white">Pricing {m.numero || m.id}</Badge>
      {m.nome && <span className="font-medium">{m.nome}</span>}
      {m.negocio?.name && (
        <span className="text-muted-foreground inline-flex items-center gap-1.5">
          <Briefcase className="size-3.5" /> {m.negocio.name}
        </span>
      )}
      {m.conta?.name && (
        <span className="text-muted-foreground inline-flex items-center gap-1.5">
          <Building2 className="size-3.5" /> {m.conta.name}
        </span>
      )}
      {m.status && m.status !== "-None-" && (
        <Badge variant="outline" className="ml-auto">
          {m.status}
        </Badge>
      )}
    </div>
  );
}

function FonteBadge({ catalogo, onRefresh }: { catalogo: Catalogo | null; onRefresh: () => void }) {
  if (!catalogo)
    return (
      <Badge variant="outline" className="gap-1.5 py-1">
        <RefreshCw className="animate-spin" /> Carregando Zoho CRM…
      </Badge>
    );
  const zoho = catalogo.fonte === "zoho";
  const hora = new Date(catalogo.atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onRefresh}
      title="Recarregar do Zoho"
      className={cn(zoho ? "text-success border-success/40" : "text-warn border-warn/40")}
    >
      <Database />
      {zoho ? `Zoho CRM · ${hora}` : "Dados de exemplo"}
      <RefreshCw className="opacity-60" />
    </Button>
  );
}
