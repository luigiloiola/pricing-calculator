// ─────────────────────────────────────────────────────────────
// Sessão do usuário logado com a conta Zoho.
// Guardada num cookie httpOnly criptografado (AES-256-GCM) com SESSION_SECRET.
// Só roda no servidor.
// ─────────────────────────────────────────────────────────────

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface Sessao {
  userId: string;
  nome: string;
  email: string;
  perfil: string;
  orgId: string;
  orgNome: string;
  refreshToken: string;
  apiDomain: string;
  accountsUrl: string;
  criadaEm: number;
}

/** O que pode ir para o navegador (sem tokens). */
export type UsuarioPublico = Pick<Sessao, "userId" | "nome" | "email" | "perfil" | "orgNome">;
export const publico = (s: Sessao): UsuarioPublico => ({
  userId: s.userId,
  nome: s.nome,
  email: s.email,
  perfil: s.perfil,
  orgNome: s.orgNome,
});

export const COOKIE_SESSAO = "yaman_sessao";
export const COOKIE_OAUTH = "yaman_oauth";
export const DURACAO_SESSAO_S = 60 * 60 * 24 * 7; // 7 dias

function chave() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET ausente ou com menos de 32 caracteres (.env.local).");
  return createHash("sha256").update(s).digest();
}

export function selar(obj: unknown): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64url");
}

export function abrir<T>(valor: string | undefined): T | null {
  if (!valor) return null;
  try {
    const buf = Buffer.from(valor, "base64url");
    const d = createDecipheriv("aes-256-gcm", chave(), buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8")) as T;
  } catch {
    return null;
  }
}

const seguro = () => (process.env.APP_URL ?? "").startsWith("https://");

export async function lerSessao(): Promise<Sessao | null> {
  const s = abrir<Sessao>((await cookies()).get(COOKIE_SESSAO)?.value);
  if (!s || Date.now() - s.criadaEm > DURACAO_SESSAO_S * 1000) return null;
  return s;
}

export async function gravarSessao(s: Sessao) {
  (await cookies()).set(COOKIE_SESSAO, selar(s), {
    httpOnly: true,
    sameSite: "lax",
    secure: seguro(),
    path: "/",
    maxAge: DURACAO_SESSAO_S,
  });
}

export async function apagarSessao() {
  (await cookies()).delete(COOKIE_SESSAO);
}

export async function gravarCookieOAuth(dados: { state: string; next: string }) {
  (await cookies()).set(COOKIE_OAUTH, selar(dados), {
    httpOnly: true,
    sameSite: "lax",
    secure: seguro(),
    path: "/",
    maxAge: 600,
  });
}

/** Para páginas: sem sessão, manda para o login e volta depois. */
export async function exigirSessaoPagina(destino: string): Promise<Sessao> {
  const s = await lerSessao();
  if (!s) redirect(`/login?next=${encodeURIComponent(destino)}`);
  return s;
}

/** Só aceita redirecionamentos internos (evita open redirect). */
export const destinoSeguro = (next: string | null | undefined) =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
