import { NextResponse } from "next/server";
import { respostaDeErro, sessaoOu401 } from "@/lib/auth/api";
import { zohoComoUsuario } from "@/lib/auth/zoho-oauth";
import type { NegocioResumo } from "@/lib/negocios";

export const dynamic = "force-dynamic";

type Rec = Record<string, unknown>;
const CAMPOS = "Deal_Name,Account_Name,Stage,Amount,Closing_Date,Owner,Modified_Time";
const nomeDe = (v: unknown) => (v && typeof v === "object" && "name" in v ? String((v as Rec).name ?? "") : "");

function resumir(d: Rec): NegocioResumo {
  const dono = d.Owner && typeof d.Owner === "object" ? (d.Owner as Rec) : null;
  return {
    id: String(d.id),
    nome: String(d.Deal_Name ?? ""),
    conta: nomeDe(d.Account_Name),
    estagio: String(d.Stage ?? ""),
    valor: typeof d.Amount === "number" ? d.Amount : null,
    fechamento: String(d.Closing_Date ?? ""),
    dono: dono ? { id: String(dono.id), nome: String(dono.name ?? "") } : null,
  };
}

/**
 * Negócios que o vendedor enxerga no Zoho.
 *   ?q=texto   pesquisa por palavra
 *   ?todos=1   inclui negócios de outros donos (padrão: só os do usuário)
 */
export async function GET(req: Request) {
  const auth = await sessaoOu401();
  if ("resposta" in auth) return auth.resposta;
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const todos = url.searchParams.get("todos") === "1";

  try {
    const registros: Rec[] = [];
    if (q.length >= 2) {
      const { body } = await zohoComoUsuario<{ data?: Rec[] }>(
        auth.sessao,
        `Deals/search?word=${encodeURIComponent(q)}&fields=${CAMPOS}&per_page=100`,
      );
      registros.push(...(body?.data ?? []));
    } else {
      for (let page = 1; page <= 3; page++) {
        const { body } = await zohoComoUsuario<{ data?: Rec[]; info?: { more_records?: boolean } }>(
          auth.sessao,
          `Deals?fields=${CAMPOS}&per_page=200&page=${page}&sort_by=Modified_Time&sort_order=desc`,
        );
        registros.push(...(body?.data ?? []));
        if (!body?.info?.more_records) break;
      }
    }
    const negocios = registros.map(resumir).filter((n) => todos || n.dono?.id === auth.sessao.userId);
    return NextResponse.json({ negocios });
  } catch (e) {
    return respostaDeErro(e, "deals");
  }
}
