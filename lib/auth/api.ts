import { NextResponse } from "next/server";
import { ZohoErro } from "../zoho/client";
import { lerSessao, type Sessao } from "./sessao";
import { SessaoExpirada } from "./zoho-oauth";

/** Em rotas de API: devolve a sessão ou uma resposta 401. */
export async function sessaoOu401(): Promise<{ sessao: Sessao } | { resposta: NextResponse }> {
  const sessao = await lerSessao();
  if (!sessao) return { resposta: NextResponse.json({ erro: "Faça login com sua conta Zoho." }, { status: 401 }) };
  return { sessao };
}

const SUBFORMS: Record<string, string> = {
  Perfis_Profissionais_Pricing: "Perfil",
  Custo_de_Licencas: "Licença",
  Despesas_Adicionais: "Despesa",
};
const CAMPOS: Record<string, string> = {
  Cargo_Perfil: "Cargo / Perfil",
  Produto: "Produto",
  Negocio: "Negócio",
  Conta_Nome: "Conta",
  Proprietario_do_Negocio: "Proprietário do Negócio",
  Tipo_de_Proposta: "Tipo de proposta",
  Tipo_de_Oferta: "Tipo de oferta",
};

/** "$.data[0].Perfis_Profissionais_Pricing[1].Cargo_Perfil" → "Perfil 2 — Cargo / Perfil". */
export function ondeFoiOErro(detalhes: unknown): string {
  const d = (detalhes as { details?: { json_path?: string; api_name?: string } } | null)?.details;
  const caminho = d?.json_path ?? "";
  const m = caminho.match(/\.(\w+)\[(\d+)\]\.(\w+)$/);
  if (m && SUBFORMS[m[1]]) return `${SUBFORMS[m[1]]} ${Number(m[2]) + 1} — ${CAMPOS[m[3]] ?? m[3]}`;
  const campo = d?.api_name ?? caminho.split(".").pop();
  return campo ? `campo ${CAMPOS[campo] ?? campo}` : "";
}

const TRADUCOES: Record<string, string> = {
  FILTER_CRITERIA_NOT_SATISFIED: "o registro escolhido não passa no filtro de pesquisa (lookup filter) configurado no Zoho",
  MANDATORY_NOT_FOUND: "campo obrigatório não preenchido",
  INVALID_DATA: "valor inválido",
  RECORD_LOCKED: "a pricing está bloqueada (aprovação ou bloqueio de registro)",
};

/** Converte erros do Zoho/sessão em respostas HTTP com mensagem em português. */
export function respostaDeErro(e: unknown, contexto: string) {
  if (e instanceof SessaoExpirada) return NextResponse.json({ erro: e.message }, { status: 401 });
  if (e instanceof ZohoErro) {
    const semPermissao = e.status === 403 || e.codigo === "NO_PERMISSION";
    const status = e.status === 404 ? 404 : semPermissao ? 403 : e.status === 401 ? 401 : e.status === 400 ? 422 : 502;
    const onde = ondeFoiOErro(e.detalhes);
    const traducao = e.codigo ? TRADUCOES[e.codigo] : undefined;
    const msg = semPermissao
      ? "Seu usuário do Zoho não tem permissão para esta operação."
      : traducao
        ? `${onde ? `${onde}: ` : ""}${traducao} (${e.codigo}).`
        : `${e.message}${onde ? ` — ${onde}` : ""}`;
    return NextResponse.json({ erro: msg, detalhes: e.detalhes }, { status });
  }
  console.error(`[${contexto}]`, e);
  return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
}
