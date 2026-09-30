// ─────────────────────────────────────────────────────────────
// Cliente Zoho CRM (roda só no servidor — credenciais nunca vão ao navegador).
// • Catálogo de custos: Recursos_e_Funcoes (salário por cargo) e Products
// A conta de serviço lê o catálogo de custos. Pricings e Deals são lidos e
// gravados com o token do vendedor logado (ver lib/auth).
// Configuração em .env.local (ver .env.example).
// ─────────────────────────────────────────────────────────────

import type { Catalogo, Produto, Recurso } from "../pricing";

type ZohoRecord = Record<string, unknown>;

const env = () => ({
  clientId: process.env.ZOHO_CLIENT_ID,
  clientSecret: process.env.ZOHO_CLIENT_SECRET,
  refreshToken: process.env.ZOHO_REFRESH_TOKEN,
  accountsUrl: process.env.ZOHO_ACCOUNTS_URL ?? "https://accounts.zoho.com",
  apiDomain: process.env.ZOHO_API_DOMAIN ?? "https://www.zohoapis.com",
});

export const zohoConfigurado = () => {
  const e = env();
  return Boolean(e.clientId && e.clientSecret && e.refreshToken);
};

let token: { valor: string; expira: number } | null = null;

async function accessToken(): Promise<string> {
  if (token && Date.now() < token.expira) return token.valor;
  const e = env();
  const params = new URLSearchParams({
    refresh_token: e.refreshToken!,
    client_id: e.clientId!,
    client_secret: e.clientSecret!,
    grant_type: "refresh_token",
  });
  const res = await fetch(`${e.accountsUrl}/oauth/v2/token?${params}`, { method: "POST", cache: "no-store" });
  const body = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !body.access_token) {
    const dicas: Record<string, string> = {
      invalid_client:
        "ZOHO_CLIENT_ID ou ZOHO_CLIENT_SECRET não conferem — copie os dois da aba Client Secret do mesmo Self Client que gerou o refresh token",
      invalid_code:
        "ZOHO_REFRESH_TOKEN inválido ou revogado — use o campo refresh_token da troca do código (não o código do Generate Code)",
      invalid_redirect_uri: "Self Client não precisa de redirect_uri — confira se o client é do tipo Self Client",
    };
    const codigo = body.error ?? String(res.status);
    throw new Error(`Falha ao autenticar no Zoho (${codigo})${dicas[codigo] ? `: ${dicas[codigo]}` : ""}. Reinicie o servidor após editar o .env.local.`);
  }
  token = { valor: body.access_token, expira: Date.now() + ((body.expires_in ?? 3600) - 120) * 1000 };
  return token.valor;
}

/** Chamada à API v8 do Zoho CRM com um access token qualquer (conta de serviço ou usuário). */
export async function chamarZoho<T = unknown>(
  apiDomain: string,
  token: string,
  caminho: string,
  init: RequestInit = {},
): Promise<{ status: number; body: T }> {
  const res = await fetch(`${apiDomain}/crm/v8/${caminho}`, {
    ...init,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });
  const texto = await res.text();
  let body: T;
  try {
    body = (texto ? JSON.parse(texto) : null) as T;
  } catch {
    body = null as T;
  }
  if (!res.ok) {
    const b = body as { message?: string; code?: string; data?: { message?: string; code?: string; details?: unknown }[] } | null;
    const det = b?.data?.[0] ?? b;
    throw new ZohoErro(res.status, `${det?.code ?? res.status}: ${det?.message ?? texto.slice(0, 300)}`, det, det?.code);
  }
  return { status: res.status, body };
}

/** Chamada com a conta de serviço (Self Client do .env.local) — usada para o catálogo de custos. */
export async function zohoApi<T = unknown>(caminho: string, init: RequestInit = {}): Promise<{ status: number; body: T }> {
  return chamarZoho<T>(env().apiDomain, await accessToken(), caminho, init);
}

export class ZohoErro extends Error {
  constructor(
    public status: number,
    mensagem: string,
    public detalhes?: unknown,
    public codigo?: string,
  ) {
    super(mensagem);
  }
}

async function listarRegistros(modulo: string, campos: string[]): Promise<ZohoRecord[]> {
  const { apiDomain } = env();
  const registros: ZohoRecord[] = [];
  for (let page = 1; page <= 20; page++) {
    const url = `${apiDomain}/crm/v8/${modulo}?fields=${campos.join(",")}&per_page=200&page=${page}`;
    const res = await fetch(url, {
      headers: { Authorization: `Zoho-oauthtoken ${await accessToken()}` },
      cache: "no-store",
    });
    if (res.status === 204) break; // módulo vazio
    if (!res.ok) throw new Error(`Zoho ${modulo}: HTTP ${res.status} — ${await res.text()}`);
    const body = (await res.json()) as { data?: ZohoRecord[]; info?: { more_records?: boolean } };
    registros.push(...(body.data ?? []));
    if (!body.info?.more_records) break;
  }
  return registros;
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const str = (v: unknown) => (typeof v === "string" ? v : "");

export async function carregarCatalogoZoho(): Promise<Catalogo> {
  const [recursosRaw, produtosRaw] = await Promise.all([
    listarRegistros("Recursos_e_Funcoes", ["Name", "Pratica", "Salario_Nominal", "Custo_Mensal", "Taxa_Hora"]),
    listarRegistros("Products", ["Product_Name", "Unit_Price", "Faturamento_Nacional", "Product_Active"]),
  ]);

  const recursos: Recurso[] = recursosRaw
    .map((r) => ({
      id: String(r.id),
      nome: str(r.Name),
      pratica: str(r.Pratica) || "Outros",
      salarioNominal: num(r.Salario_Nominal),
      custoMensal: num(r.Custo_Mensal),
      taxaHora: num(r.Taxa_Hora),
    }))
    .filter((r) => r.nome)
    .sort((a, b) => a.pratica.localeCompare(b.pratica) || a.nome.localeCompare(b.nome));

  const produtos: Produto[] = produtosRaw
    .filter((p) => p.Product_Active !== false)
    .map((p) => ({
      id: String(p.id),
      nome: str(p.Product_Name),
      custoUnitario: num(p.Unit_Price),
      faturamentoNacional: p.Faturamento_Nacional !== false,
    }))
    .filter((p) => p.nome)
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return { fonte: "zoho", atualizadoEm: new Date().toISOString(), recursos, produtos };
}
