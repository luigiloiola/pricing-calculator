"use client";

import { Home, LogOut } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { UsuarioPublico } from "@/lib/auth/sessao";

const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

/** Usuário logado (conta Zoho) + atalhos para o início e sair. */
export default function UserMenu({ usuario, mostrarInicio = true }: { usuario: UsuarioPublico; mostrarInicio?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {mostrarInicio && (
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <Home /> Início
          </Link>
        </Button>
      )}
      <div className="flex items-center gap-2 px-2" title={`${usuario.email} · ${usuario.perfil} · ${usuario.orgNome}`}>
        <span className="bg-brand/15 text-brand inline-grid size-7 place-items-center rounded-full text-[11px] font-semibold">
          {iniciais(usuario.nome)}
        </span>
        <span className="hidden text-sm leading-tight sm:grid">
          <span className="font-medium">{usuario.nome}</span>
          {usuario.perfil && <span className="text-muted-foreground text-[11px]">{usuario.perfil}</span>}
        </span>
      </div>
      <form action="/api/auth/logout" method="post">
        <Button variant="ghost" size="icon" className="size-8" type="submit" aria-label="Sair" title="Sair">
          <LogOut className="size-4" />
        </Button>
      </form>
    </div>
  );
}
