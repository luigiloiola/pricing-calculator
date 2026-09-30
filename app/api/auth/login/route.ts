import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { destinoSeguro, gravarCookieOAuth } from "@/lib/auth/sessao";
import { loginConfigurado, oauthEnv, urlAutorizacao } from "@/lib/auth/zoho-oauth";

export const dynamic = "force-dynamic";

/** Inicia o "Entrar com Zoho". */
export async function GET(req: Request) {
  const base = oauthEnv().appUrl;
  if (!loginConfigurado()) return NextResponse.redirect(new URL("/login?erro=config", base));
  const state = randomBytes(16).toString("hex");
  await gravarCookieOAuth({ state, next: destinoSeguro(new URL(req.url).searchParams.get("next")) });
  return NextResponse.redirect(urlAutorizacao(state));
}
