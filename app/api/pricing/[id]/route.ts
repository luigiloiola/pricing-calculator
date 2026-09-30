import { NextResponse } from "next/server";
import { ondeFoiOErro, respostaDeErro, sessaoOu401 } from "@/lib/auth/api";
import type { Sessao } from "@/lib/auth/sessao";
import { zohoComoUsuario } from "@/lib/auth/zoho-oauth";
import type { PricingInput } from "@/lib/pricing";
import { ZohoErro } from "@/lib/zoho/client";
import { CAMPOS_CLASSIFICACAO_NEGOCIO, classificacaoDoNegocio } from "@/lib/zoho/negocio";
import { MODULO_PRICING, idValido, inputParaRegistro, registroParaInput } from "@/lib/zoho/pricing-record";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function lerPricing(sessao: Sessao, id: string) {
  const { status, body } = await zohoComoUsuario<{ data?: Record<string, unknown>[] }>(sessao, `${MODULO_PRICING}/${id}`);
  const registro = body?.data?.[0];
  if (status === 204 || !registro)
    throw new ZohoErro(404, `Pricing ${id} não encontrada no Zoho CRM (ou você não tem acesso a ela).`);
  const carregada = registroParaInput(registro);

  // Tipo de oferta/proposta vazios na pricing → puxa do negócio vinculado
  const { meta, input } = carregada;
  if (meta.negocio && (!meta.classificacaoNaPricing.oferta || !meta.classificacaoNaPricing.proposta)) {
    try {
      const { body: d } = await zohoComoUsuario<{ data?: Record<string, unknown>[] }>(
        sessao,
        `Deals/${meta.negocio.id}?fields=${CAMPOS_CLASSIFICACAO_NEGOCIO}`,
      );
      const deal = d?.data?.[0];
      if (deal) {
        const c = classificacaoDoNegocio(deal);
        if (!meta.classificacaoNaPricing.oferta && c.tipoOferta) input.tipoOferta = c.tipoOferta;
        if (!meta.classificacaoNaPricing.proposta && c.tipoProposta) {
          input.tipoProposta = c.tipoProposta;
          meta.propostaOrigem = "negocio";
        }
      }
    } catch {
      /* sem acesso ao negócio: segue com o que a pricing tem */
    }
  }
  return carregada;
}

/** Lê a pricing com o login do vendedor e devolve a calculadora preenchida. */
export async function GET(_req: Request, { params }: Ctx) {
  const auth = await sessaoOu401();
  if ("resposta" in auth) return auth.resposta;
  const { id } = await params;
  if (!idValido(id)) return NextResponse.json({ erro: "Id de pricing inválido." }, { status: 400 });
  try {
    return NextResponse.json(await lerPricing(auth.sessao, id));
  } catch (e) {
    return respostaDeErro(e, "pricing GET");
  }
}

/** Grava na pricing como o vendedor logado (o Zoho registra ele como autor) e relê. */
export async function PUT(req: Request, { params }: Ctx) {
  const auth = await sessaoOu401();
  if ("resposta" in auth) return auth.resposta;
  const { id } = await params;
  if (!idValido(id)) return NextResponse.json({ erro: "Id de pricing inválido." }, { status: 400 });

  let input: PricingInput;
  try {
    input = ((await req.json()) as { input: PricingInput }).input;
    if (!input || !Array.isArray(input.perfis)) throw new Error();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  try {
    const { body } = await zohoComoUsuario<{ data?: { code?: string; status?: string; message?: string; details?: unknown }[] }>(
      auth.sessao,
      `${MODULO_PRICING}/${id}`,
      { method: "PUT", body: JSON.stringify({ data: [inputParaRegistro(input)] }) },
    );
    const r = body?.data?.[0];
    if (r?.status !== "success") {
      const onde = ondeFoiOErro(r);
      return NextResponse.json(
        { erro: `${onde ? `${onde}: ` : ""}${r?.code ?? "ERRO"} — ${r?.message ?? "o Zoho recusou a gravação"}`, detalhes: r?.details },
        { status: 422 },
      );
    }
    return NextResponse.json(await lerPricing(auth.sessao, id));
  } catch (e) {
    return respostaDeErro(e, "pricing PUT");
  }
}
