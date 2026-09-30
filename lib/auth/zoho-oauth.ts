// ─────────────────────────────────────────────────────────────
// Login "Entrar com Zoho" (OAuth 2.0, authorization code) e chamadas ao
// Zoho CRM com o token do próprio vendedor.
// Cliente do tipo "Server-based Application" em https://api-console.zoho.com
// ─────────────────────────────────────────────────────────────

import { chamarZoho, ZohoErro } from "../zoho/client";
import type { Sessao } from "./sessao";

export const ESCOPOS_USUARIO = [
  "ZohoCRM.modules.custom.ALL", // Pricings (ler, criar, atualizar)
  "ZohoCRM.modules.deals.READ", // Negócios do vendedor
  "ZohoCRM.users.READ", // quem é o usuário
  "ZohoCRM.org.READ", // de qual organização ele é
].join(",");

export const oauthEnv = () => ({
  clientId: process.env.ZOHO_OAUTH_CLIENT_ID,
  clientSecret: process.env.ZOHO_OAUTH_CLIENT_SECRET,
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  accountsUrl: (process.env.ZOHO_ACCOUNTS_URL ?? "https://accounts.zoho.com").replace(/\/$/, ""),
  apiDomain: (process.env.ZOHO_API_DOMAIN ?? "https://www.zohoapis.com").replace(/\/$/, ""),
  orgId: process.env.ZOHO_ORG_ID,
});

export const loginConfigurado = () => {
  const e = oauthEnv();
  return Boolean(e.clientId && e.clientSecret && (process.env.SESSION_SECRET ?? "").length >= 32);
};

export const redirectUri = () => `${oauthEnv().appUrl}/api/auth/callback`;

// Data centers do Zoho — só aceitamos devolver/buscar tokens nesses domínios.
const ACCOUNTS_ZOHO = /^https:\/\/accounts\.zoho\.(com|eu|in|com\.au|jp|com\.cn|ca|sa|uk)$/;
const API_ZOHO = /^https:\/\/(www\.)?zohoapis\.(com|eu|in|com\.au|jp|com\.cn|ca|sa|uk)$/;
export const accountsValido = (u: string | null) => !!u && (ACCOUNTS_ZOHO.test(u) || u === oauthEnv().accountsUrl);
export const apiDomainValido = (u: string | null | undefined) => !!u && (API_ZOHO.test(u) || u === oauthEnv().apiDomain);

export function urlAutorizacao(state: string) {
  const e = oauthEnv();
  const q = new URLSearchParams({
    scope: ESCOPOS_USUARIO,
    client_id: e.clientId!,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    redirect_uri: redirectUri(),
    state,
  });
  return `${e.accountsUrl}/oauth/v2/auth?${q}`;
}

interface TokenResp {
  access_token?: string;
  refresh_token?: string;
  api_domain?: string;
  expires_in?: number;
  error?: string;
}

export async function trocarCodigo(code: string, accountsUrl: string) {
  const e = oauthEnv();
  const q = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: e.clientId!,
    client_secret: e.clientSecret!,
    redirect_uri: redirectUri(),
    code,
  });
  const res = await fetch(`${accountsUrl}/oauth/v2/token?${q}`, { method: "POST", cache: "no-store" });
  const body = (await res.json()) as TokenResp;
  if (!res.ok || !body.access_token) throw new Error(`Zoho recusou o login (${body.error ?? res.status}).`);
  return body;
}

export class SessaoExpirada extends Error {
  constructor() {
    super("Sessão do Zoho expirada ou revogada. Entre novamente.");
  }
}

// access tokens em memória, por usuário (válidos ~1h)
const tokens = new Map<string, { valor: string; expira: number }>();
const chaveCache = (s: Sessao) => `${s.userId}:${s.refreshToken.slice(-12)}`;

export async function tokenDoUsuario(s: Sessao, forcar = false): Promise<string> {
  const k = chaveCache(s);
  const t = tokens.get(k);
  if (!forcar && t && Date.now() < t.expira) return t.valor;
  const e = oauthEnv();
  const q = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: e.clientId!,
    client_secret: e.clientSecret!,
    refresh_token: s.refreshToken,
  });
  const res = await fetch(`${s.accountsUrl}/oauth/v2/token?${q}`, { method: "POST", cache: "no-store" });
  const body = (await res.json()) as TokenResp;
  if (!res.ok || !body.access_token) throw new SessaoExpirada();
  tokens.set(k, { valor: body.access_token, expira: Date.now() + ((body.expires_in ?? 3600) - 120) * 1000 });
  return body.access_token;
}

/** Chamada ao Zoho CRM como o vendedor logado (respeita as permissões dele no CRM). */
export async function zohoComoUsuario<T = unknown>(s: Sessao, caminho: string, init: RequestInit = {}) {
  try {
    return await chamarZoho<T>(s.apiDomain, await tokenDoUsuario(s), caminho, init);
  } catch (e) {
    if (e instanceof ZohoErro && e.status === 401) {
      // token recusado: renova uma vez e tenta de novo
      return chamarZoho<T>(s.apiDomain, await tokenDoUsuario(s, true), caminho, init);
    }
    throw e;
  }
}

/** Identidade e organização do usuário recém-logado. */
export async function identificar(accessToken: string, apiDomain: string) {
  const u = await chamarZoho<{ users?: { id: string; full_name?: string; email?: string; profile?: { name?: string } }[] }>(
    apiDomain,
    accessToken,
    "users?type=CurrentUser",
  );
  const usuario = u.body?.users?.[0];
  if (!usuario) throw new Error("Não foi possível identificar o usuário no Zoho CRM.");
  const o = await chamarZoho<{ org?: { id: string; company_name?: string }[] }>(apiDomain, accessToken, "org");
  const org = o.body?.org?.[0];
  return {
    userId: String(usuario.id),
    nome: usuario.full_name ?? usuario.email ?? "Usuário",
    email: usuario.email ?? "",
    perfil: usuario.profile?.name ?? "",
    orgId: org ? String(org.id) : "",
    orgNome: org?.company_name ?? "",
  };
}
