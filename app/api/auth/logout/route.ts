import { NextResponse } from "next/server";
import { apagarSessao } from "@/lib/auth/sessao";
import { oauthEnv } from "@/lib/auth/zoho-oauth";

export const dynamic = "force-dynamic";

export async function POST() {
  await apagarSessao();
  return NextResponse.redirect(new URL("/login?saiu=1", oauthEnv().appUrl), 303);
}
