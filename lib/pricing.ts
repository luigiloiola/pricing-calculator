// ─────────────────────────────────────────────────────────────
// Cálculo do pricing — mesma estrutura do módulo Pricings do Zoho:
// Perfis Profissionais + Custo de Licenças + Despesas Adicionais.
//
// Cada linha tem três variáveis — Custo (salário nominal ou taxa hora, já com
// encargos e benefícios; ou custo unitário × qtd), Margem % e Receita Bruta. O vendedor informa
// duas e a terceira é calculada (ver `resolverTrio`):
//
//   Receita Bruta   = Custo / (1 − Margem) / (1 − 10,15%)   (planilha "Pricing - Quebra Galho")
//   Impostos        = Receita Bruta × 10,15%
//   Receita Líquida = Receita Bruta − Impostos
//   Margem R$       = Receita Líquida − Custo
//   Margem %        = Margem R$ / Receita Líquida
//
// ⚠ As expressões das fórmulas do Zoho não são expostas pela API; se o CRM
// calcular diferente, ajuste apenas `resolverTrio` e `fechaBloco`.
// ─────────────────────────────────────────────────────────────

import { ALIQUOTA_IMPORTACAO, BENEFICIOS, ENCARGOS_CLT, ENCARGOS_CLT_ITENS, ZOHO_PARAMS, type TIPOS_OFERTA } from "./zoho/params";

export type TipoOferta = (typeof TIPOS_OFERTA)[number];

/** Registro do módulo Recursos_e_Funcoes (custo por cargo). */
export interface Recurso {
  id: string;
  nome: string;
  pratica: string;
  salarioNominal: number; // Recursos_e_Funcoes.Salario_Nominal
  custoMensal: number; // Recursos_e_Funcoes.Custo_Mensal (referência, já com encargos e benefícios)
  taxaHora: number; // Recursos_e_Funcoes.Taxa_Hora ("Taxa Hora REAL")
}

/** Registro do módulo Products. */
export interface Produto {
  id: string;
  nome: string;
  custoUnitario: number; // Products.Unit_Price
  faturamentoNacional: boolean; // Products.Faturamento_Nacional
}

export interface Catalogo {
  fonte: "zoho" | "exemplo";
  atualizadoEm: string;
  recursos: Recurso[];
  produtos: Produto[];
  aviso?: string;
}

/** Qual das três variáveis da linha é calculada a partir das outras duas. */
export type Alvo = "custo" | "margem" | "receita";

interface LinhaBase {
  uid: string;
  zohoId?: string; // id da linha no subformulário do Zoho (para atualizar em vez de recriar)
  alvo: Alvo;
  margem: number; // fração (0.45 = 45%) — usada quando alvo ≠ "margem"
  receitaBruta: number; // total da linha — usada quando alvo ≠ "receita"
}

export interface LinhaPerfil extends LinhaBase {
  pratica: string; // Pratica do subformulário (filtra o lookup Cargo / Perfil no Zoho)
  recursoId: string;
  tipoAlocacao: "CLT" | "PJ";
  quantidade: number;
  meses: number;
  modoSalario: "mensal" | "hora"; // salário informado como valor mensal ou taxa hora × horas
  horas: number; // horas/mês (padrão 160)
  salarioNominal: number;
  taxaHora: number;
  beneficios: string[]; // multiselect Beneficios do subformulário
  demaisBeneficios: number; // Demais_Benef_cios (R$/mês)
}

/** Composição do custo mensal de um perfil (por pessoa). */
export interface DetalhePerfil {
  base: number; // salário mensal ou taxa hora × horas
  encargos: number;
  encargosItens: { nome: string; valor: number }[];
  beneficios: number; // R$ Benefícios + Demais Benefícios
  custoMensal: number;
  pessoasMes: number; // quantidade × meses
}

export interface LinhaLicenca extends LinhaBase {
  produtoId: string;
  quantidade: number;
  custoUnitario: number; // em R$ se nacional, na moeda do fabricante se importado
  faturamentoNacional: boolean;
}

export interface LinhaDespesa extends LinhaBase {
  categoria: string;
  descricao: string;
  quantidade: number;
  custoUnitario: number;
}

export interface PricingInput {
  tipoOferta: TipoOferta;
  tipoProposta: string;
  praticas: string[];
  numMeses: number;
  tarifaCambio: number; // Pricings.Tarifa_Cambio
  perfis: LinhaPerfil[];
  licencas: LinhaLicenca[];
  despesas: LinhaDespesa[];
}

export interface ResultadoLinha {
  custo: number; // custo total da linha
  margem: number; // fração; NaN quando indefinida (receita zero)
  receitaBruta: number;
  unitario: number; // salário mensal / taxa hora / custo unitário (informado ou calculado)
  impostosImportacao: number;
  meses: number; // meses da linha (perfil: próprio; licença/despesa: prazo do pricing)
  receitaMensal: number;
  detalhe?: DetalhePerfil;
}

export interface Bloco {
  custo: number;
  receitaBruta: number;
  impostos: number;
  margemRS: number;
  margemPct: number;
}

/** Valores por mês (cada linha dividida pelos seus meses). */
export interface Mensal {
  receitaBruta: number;
  impostos: number;
  receitaLiquida: number;
  custo: number;
  margemRS: number;
  encargos: number;
  beneficios: number;
  importacao: number;
}

export interface ResultadoPricing {
  linhas: Record<string, ResultadoLinha>;
  perfis: Bloco;
  licencas: Bloco;
  despesas: Bloco;
  custoTotal: number;
  impostosImportacao: number;
  encargosPerfis: number;
  beneficiosPerfis: number;
  receitaBruta: number;
  impostos: number;
  receitaLiquida: number;
  margemRS: number;
  margemPct: number;
  receitaMensal: number;
  margemMensal: number;
  mensal: Mensal;
}

export const MARGEM_MAX = 0.85;

const clampMargem = (m: number) => Math.min(MARGEM_MAX, Math.max(-1, m || 0));
const n = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);
const T = () => ZOHO_PARAMS.impostosSobreReceita;

/**
 * Resolve o trio Custo × Margem × Receita: com dois valores, calcula o terceiro.
 * Mesma conta da planilha "Pricing - Quebra Galho" — a margem é sobre a
 * receita líquida (receita bruta menos 10,15% de impostos):
 *   receita = custo / (1 − margem) / (1 − impostos)
 *   margem  = 1 − custo / (receita × (1 − impostos))
 *   custo   = receita × (1 − impostos) × (1 − margem)
 */
export function resolverTrio(alvo: Alvo, custo: number, margem: number, receita: number) {
  const liq = 1 - T();
  if (alvo === "margem") {
    const r = n(receita);
    return { custo: n(custo), receitaBruta: r, margem: r > 0 ? 1 - n(custo) / (r * liq) : NaN };
  }
  const m = clampMargem(margem);
  if (alvo === "custo") return { custo: Math.max(0, n(receita) * liq * (1 - m)), receitaBruta: n(receita), margem: m };
  const c = n(custo);
  return { custo: c, receitaBruta: c > 0 ? c / (1 - m) / liq : 0, margem: m };
}

export const receitaParaMargem = (custo: number, margem: number) => resolverTrio("receita", custo, margem, 0).receitaBruta;

/** `fator` converte o valor unitário em custo total da linha (ex.: qtd × meses). */
function resolverLinha(l: LinhaBase, unitario: number, fator: number): ResultadoLinha {
  const r = resolverTrio(l.alvo, n(unitario) * fator, l.margem, l.receitaBruta);
  const unit = l.alvo === "custo" ? (fator > 0 ? r.custo / fator : 0) : n(unitario);
  return { ...r, unitario: unit, impostosImportacao: 0, meses: 1, receitaMensal: r.receitaBruta };
}

/**
 * Custo mensal por pessoa = Base + Encargos + Benefícios, onde (fórmulas do Zoho / planilha):
 *   Base       = Salário mensal, ou Taxa Hora × Horas (padrão 160 h)
 *   Encargos   = Base × 59,8167% (só CLT — 13º, férias + 1/3, INSS, INSS Terceiros, FGTS)
 *   Benefícios = soma dos fixos marcados + Seguro Vida (0,2% da Base) + Demais Benefícios
 * É linear na Base: custoMensal = a × Base + b — o que permite calcular o
 * salário de volta quando o custo é o valor calculado.
 */
export function coeficientesPerfil(l: LinhaPerfil) {
  const marcados = BENEFICIOS.filter((b) => l.beneficios.includes(b.nome));
  const pctBase = marcados.reduce((s, b) => s + (b.pctBase ?? 0), 0);
  const fixos = marcados.reduce((s, b) => s + b.valor, 0) + n(l.demaisBeneficios);
  const enc = l.tipoAlocacao === "CLT" ? ENCARGOS_CLT : 0; // encargos só para CLT
  return { a: 1 + enc + pctBase, b: fixos, enc, pctBase };
}

export function detalharPerfil(l: LinhaPerfil, base: number): DetalhePerfil {
  const { a, b, enc } = coeficientesPerfil(l);
  const encargos = base * enc;
  const custoMensal = a * base + b;
  return {
    base,
    encargos,
    encargosItens:
      l.tipoAlocacao === "CLT" ? ENCARGOS_CLT_ITENS.map((e) => ({ nome: e.nome, valor: base * e.fator })) : [],
    beneficios: custoMensal - base - encargos,
    custoMensal,
    pessoasMes: n(l.quantidade) * n(l.meses),
  };
}

function resolverPerfil(l: LinhaPerfil): ResultadoLinha {
  const porHora = l.modoSalario === "hora";
  const pessoasMes = n(l.quantidade) * n(l.meses);
  const { a, b } = coeficientesPerfil(l);
  const baseInformada = porHora ? n(l.taxaHora) * n(l.horas) : n(l.salarioNominal);
  const custoInformado = pessoasMes * (a * baseInformada + b);

  const r = resolverTrio(l.alvo, custoInformado, l.margem, l.receitaBruta);
  let base = baseInformada;
  if (l.alvo === "custo") {
    base = pessoasMes > 0 ? Math.max(0, (r.custo / pessoasMes - b) / a) : 0;
  }
  const unitario = porHora ? (n(l.horas) > 0 ? base / n(l.horas) : 0) : base;
  const meses = n(l.meses) || 1;
  return { ...r, unitario, impostosImportacao: 0, meses, receitaMensal: r.receitaBruta / meses, detalhe: detalharPerfil(l, base) };
}

function fechaBloco(itens: ResultadoLinha[]): Bloco {
  const custo = itens.reduce((s, l) => s + l.custo, 0);
  const receitaBruta = itens.reduce((s, l) => s + l.receitaBruta, 0);
  const impostos = receitaBruta * T();
  const margemRS = receitaBruta - impostos - custo;
  const receitaLiquida = receitaBruta - impostos;
  // margem % sobre a receita líquida, como na planilha
  return { custo, receitaBruta, impostos, margemRS, margemPct: receitaLiquida ? margemRS / receitaLiquida : 0 };
}

export const fatorLicenca = (l: LinhaLicenca, cambio: number) =>
  n(l.quantidade) * (l.faturamentoNacional ? 1 : (n(cambio) || 1) * (1 + ALIQUOTA_IMPORTACAO));

export function calcularPricing(input: PricingInput, _catalogo?: Catalogo): ResultadoPricing {
  const linhas: Record<string, ResultadoLinha> = {};

  const perfis = input.perfis.map((l) => (linhas[l.uid] = resolverPerfil(l)));

  const licencas = input.licencas.map((l) => {
    const r = resolverLinha(l, l.custoUnitario, fatorLicenca(l, input.tarifaCambio));
    r.impostosImportacao = l.faturamentoNacional ? 0 : (r.custo * ALIQUOTA_IMPORTACAO) / (1 + ALIQUOTA_IMPORTACAO);
    return (linhas[l.uid] = r);
  });

  const despesas = input.despesas.map((l) => (linhas[l.uid] = resolverLinha(l, l.custoUnitario, n(l.quantidade))));

  const bPerfis = fechaBloco(perfis);
  const bLicencas = fechaBloco(licencas);
  const bDespesas = fechaBloco(despesas);
  const total = fechaBloco([...perfis, ...licencas, ...despesas]);

  const meses = Math.max(1, n(input.numMeses));
  // licenças e despesas se distribuem pelo prazo do pricing
  for (const l of [...licencas, ...despesas]) {
    l.meses = meses;
    l.receitaMensal = l.receitaBruta / meses;
  }
  const todas = [...perfis, ...licencas, ...despesas];
  const receitaMes = todas.reduce((s, l) => s + l.receitaMensal, 0);
  const custoMes = todas.reduce((s, l) => s + l.custo / l.meses, 0);
  const impostosMes = receitaMes * T();
  const mensal: Mensal = {
    receitaBruta: receitaMes,
    impostos: impostosMes,
    receitaLiquida: receitaMes - impostosMes,
    custo: custoMes,
    margemRS: receitaMes - impostosMes - custoMes,
    encargos: perfis.reduce((s, l) => s + (l.detalhe ? l.detalhe.encargos * n(l.detalhe.pessoasMes / l.meses) : 0), 0),
    beneficios: perfis.reduce((s, l) => s + (l.detalhe ? l.detalhe.beneficios * n(l.detalhe.pessoasMes / l.meses) : 0), 0),
    importacao: licencas.reduce((s, l) => s + l.impostosImportacao, 0) / meses,
  };
  return {
    linhas,
    perfis: bPerfis,
    licencas: bLicencas,
    despesas: bDespesas,
    custoTotal: total.custo,
    impostosImportacao: licencas.reduce((s, l) => s + l.impostosImportacao, 0),
    encargosPerfis: perfis.reduce((s, l) => s + (l.detalhe ? l.detalhe.encargos * l.detalhe.pessoasMes : 0), 0),
    beneficiosPerfis: perfis.reduce((s, l) => s + (l.detalhe ? l.detalhe.beneficios * l.detalhe.pessoasMes : 0), 0),
    receitaBruta: total.receitaBruta,
    impostos: total.impostos,
    receitaLiquida: total.receitaBruta - total.impostos,
    margemRS: total.margemRS,
    margemPct: total.margemPct,
    receitaMensal: receitaMes,
    margemMensal: mensal.margemRS,
    mensal,
  };
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const pctFmt = new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const formatBRL = (v: number) => brl.format(Number.isFinite(v) ? v : 0);
export const formatPct = (v: number) => pctFmt.format(Number.isFinite(v) ? v : 0);
const pctFino = new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatPctFino = (v: number) => pctFino.format(Number.isFinite(v) ? v : 0);

let seq = 0;
export const novoUid = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;

// ─────────────────────────────────────────────────────────────
// Tipo de oferta → blocos habilitados
//   Alocação             → perfis (licenças desabilitadas)
//   Licenças             → licenças (perfis desabilitados)
//   Serviços Gerenciados → perfis e licenças
// Despesas adicionais valem para qualquer oferta.
// ─────────────────────────────────────────────────────────────
export function blocosHabilitados(tipoOferta: TipoOferta) {
  return { perfis: tipoOferta !== "Licenças", licencas: tipoOferta !== "Alocação", despesas: true };
}

/** O que entra no cálculo e no envio ao Zoho: linhas de blocos desabilitados ficam de fora. */
export function inputEfetivo(input: PricingInput): PricingInput {
  const h = blocosHabilitados(input.tipoOferta);
  return { ...input, perfis: h.perfis ? input.perfis : [], licencas: h.licencas ? input.licencas : [] };
}
