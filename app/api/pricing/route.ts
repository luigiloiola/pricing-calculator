import { NextResponse } from "next/server";
import { respostaDeErro, sessaoOu401 } from "@/lib/auth/api";
import { zohoComoUsuario } from "@/lib/auth/zoho-oauth";
import { classificacaoDoNegocio } from "@/lib/zoho/negocio";
import { MODULO_PRICING, idValido } from "@/lib/zoho/pricing-record";

export const dynamic = "force-dynamic";

type Rec = Record<string, unknown>;
const lookupId = (v: unknown) => (v && typeof v === "object" && "id" in v ? { id: String((v as Rec).id) } : undefined);

/** Cria uma pricing nova a partir de um negócio (Deal), como o vendedor logado. */
export async function POST(req: Request) {
  const auth = await sessaoOu401();
  if ("resposta" in auth) return auth.resposta;

  let dealId = "";
  try {
    dealId = String(((await req.json()) as { dealId?: string }).dealId ?? "");
  } catch {
    /* corpo inválido */
  }
  if (!idValido(dealId)) return NextResponse.json({ erro: "Negócio inválido." }, { status: 400 });

  try {
    const { body: dealResp } = await zohoComoUsuario<{ data?: Rec[] }>(auth.sessao, `Deals/${dealId}`);
    const deal = dealResp?.data?.[0];
    if (!deal) return NextResponse.json({ erro: "Negócio não encontrado ou sem acesso." }, { status: 404 });

    const classe = classificacaoDoNegocio(deal);
    const registro: Rec = {
      Nome_Pricing: String(deal.Deal_Name ?? "Nova pricing"),
      ...(classe.tipoOferta ? { Tipo_de_Oferta: classe.tipoOferta } : {}),
      ...(classe.tipoProposta ? { Tipo_de_Proposta: classe.tipoProposta } : {}),
      Negocio: { id: dealId },
      Conta_Nome: lookupId(deal.Account_Name),
      Proprietario_do_Negocio: lookupId(deal.Owner),
      Status_Pricing: "Criada",
      Num_de_Meses: 12,
    };
    const { body } = await zohoComoUsuario<{ data?: { status?: string; code?: string; message?: string; details?: { id?: string } }[] }>(
      auth.sessao,
      MODULO_PRICING,
      { method: "POST", body: JSON.stringify({ data: [registro] }) },
    );
    const r = body?.data?.[0];
    if (r?.status !== "success" || !r.details?.id) {
      return NextResponse.json(
        { erro: `${r?.code ?? "ERRO"}: ${r?.message ?? "o Zoho recusou a criação"}`, detalhes: r?.details },
        { status: 422 },
      );
    }
    return NextResponse.json({ id: String(r.details.id) }, { status: 201 });
  } catch (e) {
    return respostaDeErro(e, "pricing POST");
  }
}
