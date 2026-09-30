// ─────────────────────────────────────────────────────────────
// Conversão entre um registro do módulo Pricings do Zoho CRM e o estado
// da calculadora (PricingInput) — nos dois sentidos.
//
// Subformulários:
//   Perfis_Profissionais_Pricing → perfis
//   Custo_de_Licencas            → licenças
//   Despesas_Adicionais          → despesas
// Linhas que já existem no Zoho carregam o `id` (zohoId) e são atualizadas;
// linhas novas vão sem id; linhas removidas na calculadora são apagadas no
// Zoho (o CRM substitui o subformulário pelo que for enviado).
// ─────────────────────────────────────────────────────────────

import {
  calcularPricing,
  novoUid,
  type Alvo,
  type Catalogo,
  type LinhaDespesa,
  type LinhaLicenca,
  type LinhaPerfil,
  type PricingInput,
  type TipoOferta,
} from "../pricing";
import { HORAS_MES_PADRAO, TIPOS_OFERTA } from "./params";

type Rec = Record<string, unknown>;
type Lookup = { id: string; name?: string } | null;

export const MODULO_PRICING = "Pricings";

/** Resumo do registro para o cabeçalho e para comparar com as fórmulas do Zoho. */
export interface PricingMeta {
  id: string;
  numero: string;
  nome: string;
  status: string;
  negocio: Lookup;
  conta: Lookup;
  modificadoEm: string;
  /** De onde veio o tipo de proposta exibido. */
  propostaOrigem: "pricing" | "negocio" | null;
  /** Se a pricing já tinha tipo de oferta/proposta gravados. */
  classificacaoNaPricing: { oferta: boolean; proposta: boolean };
  zoho: {
    receitaBruta: number | null;
    receitaBrutaMensal: number | null;
    custoTotal: number | null;
    margemRS: number | null;
    margemPct: number | null;
    /** Valores calculados pelo Zoho em cada linha dos subformulários, por id da linha. */
    linhas: Record<string, ZohoLinha>;
  };
}

export interface ZohoLinha {
  custo: number | null;
  receita: number | null;
  margemPct: number | null; // como gravado no Zoho (20 = 20%)
}

export interface PricingCarregada {
  meta: PricingMeta;
  input: PricingInput;
  /** Cargos/produtos citados na pricing (para exibir mesmo se não estiverem no catálogo). */
  referencias: { recursos: { id: string; nome: string }[]; produtos: { id: string; nome: string }[] };
}

const num = (v: unknown, padrao = 0) => (typeof v === "number" && Number.isFinite(v) ? v : v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : padrao);
const numOuNull = (v: unknown) => (v == null || v === "" ? null : num(v));
const str = (v: unknown) => (typeof v === "string" ? v : "");
const lookup = (v: unknown): Lookup =>
  v && typeof v === "object" && "id" in v ? { id: String((v as Rec).id), name: str((v as Rec).name) } : null;
const lista = (v: unknown): Rec[] => (Array.isArray(v) ? (v as Rec[]) : []);
/** Campos "percent" do Zoho vêm como 20 para 20%. */
const pctParaFracao = (v: unknown, padrao: number) => (v == null || v === "" ? padrao : num(v) / 100);
const MARGEM_PADRAO = 0.2;

// ─────────────── Zoho → calculadora ───────────────

export function registroParaInput(r: Rec): PricingCarregada {
  const numMeses = num(r.Num_de_Meses, 12) || 12;
  const tipoOferta = (TIPOS_OFERTA as readonly string[]).includes(str(r.Tipo_de_Oferta))
    ? (str(r.Tipo_de_Oferta) as TipoOferta)
    : "Alocação";
  const alvo: Alvo = "receita"; // o Zoho guarda custo + margem; a receita é recalculada
  const recursos: { id: string; nome: string }[] = [];
  const produtos: { id: string; nome: string }[] = [];
  const zohoLinhas: Record<string, ZohoLinha> = {};
  const guardar = (row: Rec, campoCusto: string) => {
    if (row.id) zohoLinhas[String(row.id)] = { custo: numOuNull(row[campoCusto]), receita: numOuNull(row.Receita_Bruta), margemPct: numOuNull(row.Margem) };
  };

  const perfis: LinhaPerfil[] = lista(r.Perfis_Profissionais_Pricing).map((p) => {
    guardar(p, "TOTAL");
    const cargo = lookup(p.Cargo_Perfil);
    if (cargo) recursos.push({ id: cargo.id, nome: cargo.name ?? "" });
    const salario = numOuNull(p.Salario_Nominal);
    const taxa = numOuNull(p.Taxa_Hora);
    const tipo = str(p.Tipo_de_Aloca_o) === "PJ" ? "PJ" : "CLT";
    // Igual ao Zoho: multiselect vazio = nenhum benefício (não aplica o padrão da calculadora)
    const beneficios = Array.isArray(p.Beneficios) ? (p.Beneficios as string[]) : [];
    return {
      uid: novoUid(),
      zohoId: str(p.id) || undefined,
      alvo,
      pratica: str(p.Pratica) === "-None-" ? "" : str(p.Pratica),
      recursoId: cargo?.id ?? "",
      tipoAlocacao: tipo,
      // Mesma regra da fórmula do Zoho: sem salário nominal, usa taxa hora × horas
      modoSalario: salario == null && taxa != null ? "hora" : "mensal",
      // campos vazios no Zoho entram como 0 na fórmula de Custo Total — mantém igual
      quantidade: num(p.Quantidade, 0),
      meses: num(p.Meses, 0),
      horas: num(p.Qtde, salario == null ? 0 : HORAS_MES_PADRAO),
      salarioNominal: salario ?? 0,
      taxaHora: taxa ?? 0,
      beneficios,
      demaisBeneficios: num(p.Demais_Benef_cios),
      margem: pctParaFracao(p.Margem, MARGEM_PADRAO),
      receitaBruta: 0,
    };
  });

  const licencas: LinhaLicenca[] = lista(r.Custo_de_Licencas).map((l) => {
    guardar(l, "Custo_Total");
    const prod = lookup(l.Produto);
    if (prod) produtos.push({ id: prod.id, nome: prod.name ?? "" });
    return {
      uid: novoUid(),
      zohoId: str(l.id) || undefined,
      alvo,
      produtoId: prod?.id ?? "",
      quantidade: num(l.Qtde, 1) || 1,
      custoUnitario: num(l.Custo_Unit_rio_1),
      faturamentoNacional: l.Faturamento_Nacional !== false,
      margem: pctParaFracao(l.Margem, MARGEM_PADRAO),
      receitaBruta: 0,
    };
  });

  const despesas: LinhaDespesa[] = lista(r.Despesas_Adicionais).map((d) => (guardar(d, "TOTAL"), {
    uid: novoUid(),
    zohoId: str(d.id) || undefined,
    alvo,
    categoria: str(d.Categoria) && str(d.Categoria) !== "-None-" ? str(d.Categoria) : "Outros",
    descricao: str(d.Descri_o),
    quantidade: num(d.Qtde, 1) || 1,
    custoUnitario: num(d.Custo_Unitario),
    margem: pctParaFracao(d.Margem, 0),
    receitaBruta: 0,
  }));

  const input: PricingInput = {
    tipoOferta,
    tipoProposta: str(r.Tipo_de_Proposta) === "-None-" ? "" : str(r.Tipo_de_Proposta),
    praticas: Array.isArray(r.Produto) ? (r.Produto as string[]) : [],
    numMeses,
    tarifaCambio: num(r.Tarifa_Cambio, 5.5) || 5.5,
    perfis,
    licencas,
    despesas,
  };

  return {
    meta: {
      id: String(r.id),
      numero: str(r.Name),
      nome: str(r.Nome_Pricing),
      status: str(r.Status_Pricing),
      negocio: lookup(r.Negocio),
      conta: lookup(r.Conta_Nome),
      modificadoEm: str(r.Modified_Time),
      propostaOrigem: input.tipoProposta ? "pricing" : null,
      classificacaoNaPricing: {
        oferta: (TIPOS_OFERTA as readonly string[]).includes(str(r.Tipo_de_Oferta)),
        proposta: !!input.tipoProposta,
      },
      zoho: {
        receitaBruta: numOuNull(r.RECEITA_BRUTA_RS),
        receitaBrutaMensal: numOuNull(r.Receita_Bruta_Mensal),
        custoTotal: numOuNull(r.CUSTO_TOTAL_RS),
        margemRS: numOuNull(r.MARGEM),
        margemPct: numOuNull(r.Margem_Percentual),
        linhas: zohoLinhas,
      },
    },
    input,
    referencias: { recursos, produtos },
  };
}

// ─────────────── calculadora → Zoho ───────────────

const pct = (fracao: number) => Math.round(fracao * 10000) / 100; // 0.2 → 20
const dinheiro = (v: number) => Math.round(v * 100) / 100;
const inteiro = (v: number) => Math.round(v);

/**
 * Monta o payload de atualização. Os valores gravados são os valores
 * resolvidos pela calculadora: se o vendedor fixou a receita e calculou a
 * margem (ou o salário), é a margem/salário calculado que vai para o Zoho.
 */
export function inputParaRegistro(input: PricingInput, catalogo?: Catalogo): Rec {
  const r = calcularPricing(input, catalogo);
  const comId = (zohoId: string | undefined, dados: Rec) => (zohoId ? { id: zohoId, ...dados } : dados);

  return {
    Tipo_de_Oferta: input.tipoOferta,
    Tipo_de_Proposta: input.tipoProposta || null,
    Produto: input.praticas,
    Num_de_Meses: input.numMeses,
    Tarifa_Cambio: dinheiro(input.tarifaCambio),

    Perfis_Profissionais_Pricing: input.perfis.map((l) => {
      const x = r.linhas[l.uid];
      const porHora = l.modoSalario === "hora";
      return comId(l.zohoId, {
        Pratica: l.pratica || null,
        Cargo_Perfil: l.recursoId ? { id: l.recursoId } : null,
        Tipo_de_Aloca_o: l.tipoAlocacao,
        Quantidade: inteiro(l.quantidade),
        Meses: inteiro(l.meses),
        // Zoho: sem Salário Nominal → usa Taxa Hora × Horas
        Salario_Nominal: porHora ? null : dinheiro(x?.unitario ?? l.salarioNominal),
        Taxa_Hora: porHora ? dinheiro(x?.unitario ?? l.taxaHora) : null,
        Qtde: porHora ? inteiro(l.horas) : null,
        Beneficios: l.beneficios,
        Demais_Benef_cios: dinheiro(l.demaisBeneficios),
        Margem: pct(Number.isFinite(x?.margem) ? x!.margem : l.margem),
      });
    }),

    Custo_de_Licencas: input.licencas.map((l) => {
      const x = r.linhas[l.uid];
      return comId(l.zohoId, {
        Produto: l.produtoId ? { id: l.produtoId } : null,
        Qtde: inteiro(l.quantidade),
        Custo_Unit_rio_1: dinheiro(x?.unitario ?? l.custoUnitario),
        Faturamento_Nacional: l.faturamentoNacional,
        Margem: pct(Number.isFinite(x?.margem) ? x!.margem : l.margem),
      });
    }),

    Despesas_Adicionais: input.despesas.map((l) => {
      const x = r.linhas[l.uid];
      return comId(l.zohoId, {
        Categoria: l.categoria,
        Descri_o: l.descricao || null,
        Qtde: inteiro(l.quantidade),
        Custo_Unitario: dinheiro(x?.unitario ?? l.custoUnitario),
        Margem: pct(Number.isFinite(x?.margem) ? x!.margem : l.margem),
      });
    }),
  };
}

/** Só aceita ids numéricos do Zoho (evita injetar caminhos na URL da API). */
export const idValido = (id: string) => /^\d{5,25}$/.test(id);
