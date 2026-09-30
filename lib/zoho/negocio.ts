// ─────────────────────────────────────────────────────────────
// Tipo de oferta e tipo de proposta a partir do Negócio (Deals).
// No Deals a proposta fica em dois campos, conforme a oferta:
//   tipo_de_Proposta_Aloca_o  → TSM Perfil Único | TSM Squad Especializada | TSM Ratecard
//   Tipo_de_Proposta_Servi_o  → TSM Squad Gerenciada | TDV Serviços Gerenciados
// e Tipo_de_Oferta pode trazer também valores TDV/TSM. Os valores do Deals
// são convertidos para a picklist Tipo_de_Proposta do Pricings.
// ─────────────────────────────────────────────────────────────

import type { TipoOferta } from "../pricing";
import { TIPOS_OFERTA, TIPOS_PROPOSTA } from "./params";

type Rec = Record<string, unknown>;

export const CAMPOS_CLASSIFICACAO_NEGOCIO = "Tipo_de_Oferta,tipo_de_Proposta_Aloca_o,Tipo_de_Proposta_Servi_o";

const str = (v: unknown) => (typeof v === "string" && v !== "-None-" ? v : "");
const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

/** "TSM Perfil Único" → "TSM PERFIL UNICO"; "TDV Serviços Gerenciados" → "TDV SERVIÇO GERENCIADO". */
export function paraPropostaPricing(valor: string): string {
  if (!valor) return "";
  const n = normalizar(valor);
  const direto = TIPOS_PROPOSTA.find((p) => normalizar(p) === n);
  if (direto) return direto;
  if (n.startsWith("TDV SERVICO")) return "TDV SERVIÇO GERENCIADO";
  if (n.startsWith("TDV FERRAMENTA")) return "TDV FERRAMENTAS";
  return "";
}

const ofertaDaProposta = (p: string): TipoOferta =>
  p === "TDV FERRAMENTAS" ? "Licenças" : p === "TDV SERVIÇO GERENCIADO" || p === "TSM SQUAD GERENCIADA" ? "Serviços Gerenciados" : "Alocação";

export function classificacaoDoNegocio(deal: Rec): { tipoOferta?: TipoOferta; tipoProposta: string } {
  const oferta = str(deal.Tipo_de_Oferta);
  const aloc = paraPropostaPricing(str(deal.tipo_de_Proposta_Aloca_o));
  const serv = paraPropostaPricing(str(deal.Tipo_de_Proposta_Servi_o));

  let tipoOferta: TipoOferta | undefined;
  let tipoProposta = "";
  if ((TIPOS_OFERTA as readonly string[]).includes(oferta)) {
    tipoOferta = oferta as TipoOferta;
  } else {
    // Tipo_de_Oferta do negócio com valor de proposta (ex.: "TDV FERRAMENTAS")
    tipoProposta = paraPropostaPricing(oferta);
    if (tipoProposta) tipoOferta = ofertaDaProposta(tipoProposta);
  }
  if (!tipoProposta) {
    tipoProposta =
      tipoOferta === "Alocação"
        ? aloc
        : tipoOferta === "Serviços Gerenciados"
          ? serv
          : tipoOferta === "Licenças"
            ? "TDV FERRAMENTAS"
            : aloc || serv;
  }
  if (!tipoOferta && tipoProposta) tipoOferta = ofertaDaProposta(tipoProposta);
  return { tipoOferta, tipoProposta };
}
