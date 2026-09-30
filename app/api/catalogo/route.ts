import { NextResponse } from "next/server";
import { sessaoOu401 } from "@/lib/auth/api";
import { CATALOGO_EXEMPLO } from "@/lib/catalogo-exemplo";
import type { Catalogo } from "@/lib/pricing";
import { carregarCatalogoZoho, zohoConfigurado } from "@/lib/zoho/client";

export const dynamic = "force-dynamic";

const TTL_MS = 10 * 60 * 1000; // relê o Zoho no máximo a cada 10 min
let cache: { dados: Catalogo; em: number } | null = null;

export async function GET(req: Request) {
  // salários são sensíveis: só para quem está logado com a conta Zoho da Yaman
  const auth = await sessaoOu401();
  if ("resposta" in auth) return auth.resposta;
  if (!zohoConfigurado()) return NextResponse.json(CATALOGO_EXEMPLO);

  const forcar = new URL(req.url).searchParams.has("refresh");
  if (!forcar && cache && Date.now() - cache.em < TTL_MS) return NextResponse.json(cache.dados);

  try {
    const dados = await carregarCatalogoZoho();
    cache = { dados, em: Date.now() };
    return NextResponse.json(dados);
  } catch (e) {
    console.error("[catalogo] erro ao ler Zoho CRM:", e);
    if (cache) return NextResponse.json({ ...cache.dados, aviso: "Zoho indisponível — exibindo a última leitura." });
    return NextResponse.json(
      { ...CATALOGO_EXEMPLO, aviso: `Não foi possível ler o Zoho CRM (${(e as Error).message}). Valores fictícios.` },
      { status: 200 },
    );
  }
}
