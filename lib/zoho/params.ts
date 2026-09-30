// ─────────────────────────────────────────────────────────────
// Parâmetros de cálculo espelhados do módulo "Pricings" do Zoho CRM.
// Cada valor aponta para o campo de origem (API name) no CRM.
// Se Finanças/Sales Ops mudar alguma regra no Zoho, atualize aqui.
// ─────────────────────────────────────────────────────────────

export const ZOHO_PARAMS = {
  /** Pricings.Impostos1 — tooltip "10.15%" (impostos sobre a receita bruta). */
  impostosSobreReceita: 0.1015,

  /**
   * Custo_de_Licencas.Impostos_Exporta_o ("Impostos Importação") —
   * tooltip "IOF 0.35% | IR 17.65% | PIS 1.65% | COFINS 7.60%".
   * Aplicado sobre o custo de licenças com faturamento internacional.
   */
  impostosImportacao: { IOF: 0.0035, IR: 0.1765, PIS: 0.0165, COFINS: 0.076 },

} as const;

export const ALIQUOTA_IMPORTACAO = Object.values(ZOHO_PARAMS.impostosImportacao).reduce(
  (s, v) => s + v,
  0,
);

// Picklists do módulo Pricings e subformulários (valores idênticos ao CRM).
export const TIPOS_OFERTA = ["Alocação", "Licenças", "Serviços Gerenciados"] as const; // Pricings.Tipo_de_Oferta
export const TIPOS_PROPOSTA = [
  "TSM PERFIL UNICO",
  "TSM RATECARD",
  "TSM SQUAD ESPECIALIZADA",
  "TSM SQUAD GERENCIADA",
  "TDV FERRAMENTAS",
  "TDV SERVIÇO GERENCIADO",
] as const; // Pricings.Tipo_de_Proposta
export const PRATICAS = ["APPSEC", "APM", "DEV", "DEVOPS", "QA", "Reseller"] as const; // Pricings.Produto ("Práticas")
export const CATEGORIAS_DESPESA = [
  "Equipamentos",
  "Despesas de Viagem",
  "Ferramentas Internas",
  "Outros",
] as const; // Despesas_Adicionais.Categoria

// ─────────────────────────────────────────────────────────────
// Custo de perfis — fórmulas do subformulário Perfis_Profissionais_Pricing
// ─────────────────────────────────────────────────────────────

/**
 * Encargos CLT — composição da planilha "Pricing - Quebra Galho" + multa do FGTS:
 *   13º Salário   = Salário / 12
 *   Férias + 1/3  = Salário × (4/3) / 12
 *   INSS 20%, INSS Terceiros 5,8% e FGTS 8% sobre (Salário + 13º + Férias + 1/3)
 *   Multa FGTS    = 40% do FGTS
 * Total = 63,6389% do salário — o mesmo fator do campo "Encargo" do Zoho.
 */
export const ENCARGOS_CLT_DETALHE = {
  provisoes: [
    { nome: "13º Salário", fator: 1 / 12 },
    { nome: "Férias + 1/3", fator: 4 / 3 / 12 },
  ],
  sobreSalarioMaisProvisoes: [
    { nome: "INSS", fator: 0.2 },
    { nome: "INSS Terceiros", fator: 0.058 },
    { nome: "FGTS", fator: 0.08 },
  ],
  /** Multa rescisória: 40% sobre o FGTS. */
  multaFgts: 0.4,
} as const;

/** Fator usado pelo Zoho no campo "Encargo" — número fixo, igual ao da fórmula do CRM. */
export const ENCARGOS_CLT = 0.636389;

/**
 * Cada encargo como fração do salário (ex.: INSS = 20% × (1 + 13º + férias)),
 * ajustados para somar exatamente o fator do Zoho.
 */
export const ENCARGOS_CLT_ITENS: readonly { nome: string; fator: number }[] = (() => {
  const d = ENCARGOS_CLT_DETALHE;
  const prov = d.provisoes.reduce((s, e) => s + e.fator, 0);
  const sobre = d.sobreSalarioMaisProvisoes.map((e) => ({ nome: e.nome, fator: e.fator * (1 + prov) }));
  const fgts = sobre.find((e) => e.nome === "FGTS")!.fator;
  const itens = [...d.provisoes, ...sobre, { nome: "Multa FGTS", fator: fgts * d.multaFgts }];
  const soma = itens.reduce((s, e) => s + e.fator, 0);
  return itens.map((e) => ({ nome: e.nome, fator: (e.fator * ENCARGOS_CLT) / soma }));
})();

/** Horas/mês padrão quando o salário é informado como taxa hora × horas. */
export const HORAS_MES_PADRAO = 160;

/**
 * R_Beneficios ("R$ Benefícios") — soma dos benefícios marcados no multiselect
 * Beneficios. Valores mensais fixos; "Seguro Vida" é 0,2% da Base.
 */
export const BENEFICIOS: readonly { nome: string; valor: number; pctBase?: number }[] = [
  { nome: "Vale Refeição", valor: 839 },
  { nome: "Aux Home", valor: 120 },
  { nome: "Odonto Titular", valor: 14.3 },
  { nome: "Odonto Dep.", valor: 14.3 },
  { nome: "Totalpass", valor: 10 },
  { nome: "Assist. Méd. Titular", valor: 382.87 },
  { nome: "BYOUD", valor: 150 },
  { nome: "Aniversário", valor: 8.33 },
  { nome: "Prêmio 5 Anos", valor: 83.33 },
  { nome: "Máquina Yaman", valor: 250 },
  { nome: "Licenças TI", valor: 50 },
  { nome: "Seguro Vida", valor: 0, pctBase: 0.002 },
];

/** Benefícios pré-marcados ao adicionar um perfil — os marcados na planilha "Pricing - Quebra Galho" (vale para CLT e PJ). */
export const BENEFICIOS_PADRAO: Record<"CLT" | "PJ", string[]> = {
  CLT: BENEFICIOS.map((b) => b.nome),
  PJ: BENEFICIOS.map((b) => b.nome),
};

/**
 * Filtro do lookup "Cargo / Perfil" no Zoho: Recursos_e_Funcoes.Prática = Pratica da linha.
 * As picklists dos dois lados têm grafias diferentes (Dev × DEV, DevOps × DEVOPS),
 * então comparamos sem acento e sem diferenciar maiúsculas.
 */
export const normalizarPratica = (s: string) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

export const praticaCompativel = (praticaRecurso: string, praticaLinha: string) =>
  !!praticaLinha && normalizarPratica(praticaRecurso) === normalizarPratica(praticaLinha);

/** Prática da linha (picklist do subformulário) correspondente à prática do cargo, ou "" se não houver. */
export const praticaDaLinhaPara = (praticaRecurso: string) =>
  PRATICAS.find((p) => normalizarPratica(p) === normalizarPratica(praticaRecurso)) ?? "";
