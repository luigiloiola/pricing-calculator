import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { abrir, COOKIE_OAUTH, destinoSeguro, gravarSessao } from "@/lib/auth/sessao";
import { accountsValido, apiDomainValido, identificar, oauthEnv, trocarCodigo } from "@/lib/auth/zoho-oauth";
import { chamarZoho } from "@/lib/zoho/client";

export const dynamic = "force-dynamic";

/** Volta do Zoho com o código de autorização. */
export async function GET(req: Request) {
  const env = oauthEnv();
  const url = new URL(req.url);
  const erro = (msg: string) => NextResponse.redirect(new URL(`/login?erro=${encodeURIComponent(msg)}`, env.appUrl));

  const jar = await cookies();
  const oauth = abrir<{ state: string; next: string }>(jar.get(COOKIE_OAUTH)?.value);
  jar.delete(COOKIE_OAUTH);

  if (url.searchParams.get("error")) return erro(`Login cancelado no Zoho (${url.searchParams.get("error")}).`);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !oauth || state !== oauth.state) return erro("Sessão de login expirada. Tente de novo.");

  const accountsUrl = url.searchParams.get("accounts-server") ?? env.accountsUrl;
  if (!accountsValido(accountsUrl)) return erro("Servidor de contas do Zoho inválido.");

  try {
    const tokens = await trocarCodigo(code, accountsUrl);
    if (!tokens.refresh_token) return erro("O Zoho não devolveu o refresh token. Tente entrar de novo.");
    const apiDomain = tokens.api_domain ?? env.apiDomain;
    if (!apiDomainValido(apiDomain)) return erro("Domínio de API do Zoho inválido.");

    const quem = await identificar(tokens.access_token!, apiDomain);

    // Só usuários da organização Yaman
    if (env.orgId) {
      if (quem.orgId !== env.orgId) return erro("Esta conta Zoho não pertence à organização da Yaman.");
    } else {
      // Sem ZOHO_ORG_ID: exige que a organização tenha o módulo Pricings
      try {
        await chamarZoho(apiDomain, tokens.access_token!, "Pricings?fields=Name&per_page=1");
      } catch {
        return erro("Esta conta Zoho não tem acesso ao módulo Pricings da Yaman.");
      }
      console.info(`[auth] ${quem.email} entrou — org ${quem.orgNome} (${quem.orgId}). Defina ZOHO_ORG_ID=${quem.orgId} no .env.local para restringir.`);
    }

    await gravarSessao({ ...quem, refreshToken: tokens.refresh_token, apiDomain, accountsUrl, criadaEm: Date.now() });
    return NextResponse.redirect(new URL(destinoSeguro(oauth.next), env.appUrl));
  } catch (e) {
    console.error("[auth] callback:", e);
    return erro((e as Error).message);
  }
}
