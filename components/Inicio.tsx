"use client";

import { ArrowRight, Briefcase, Building2, CalendarDays, FilePlus2, Loader2, Search, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Segmented } from "./fields";
import Marca from "./Marca";
import UserMenu from "./UserMenu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { UsuarioPublico } from "@/lib/auth/sessao";
import { api } from "@/lib/cliente-api";
import type { NegocioResumo } from "@/lib/negocios";
import { formatBRL } from "@/lib/pricing";

const data = (iso: string) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR") : "");

/** Tela inicial: criar uma pricing a partir de um negócio ou abrir uma existente. */
export default function Inicio({ usuario }: { usuario: UsuarioPublico }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [escopo, setEscopo] = useState<"meus" | "todos">("meus");
  const [negocios, setNegocios] = useState<NegocioResumo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState<string | null>(null);
  const [idExistente, setIdExistente] = useState("");

  useEffect(() => {
    let vivo = true;
    const t = setTimeout(async () => {
      setNegocios(null);
      setErro(null);
      try {
        const q = new URLSearchParams();
        if (busca.trim().length >= 2) q.set("q", busca.trim());
        if (escopo === "todos") q.set("todos", "1");
        const r = await api<{ negocios: NegocioResumo[] }>(`/api/deals?${q}`);
        if (vivo) setNegocios(r.negocios);
      } catch (e) {
        if (vivo) {
          setErro((e as Error).message);
          setNegocios([]);
        }
      }
    }, 300);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [busca, escopo]);

  const criar = async (n: NegocioResumo) => {
    setCriando(n.id);
    setErro(null);
    try {
      const r = await api<{ id: string }>("/api/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: n.id }),
      });
      router.push(`/pricing/${r.id}`);
    } catch (e) {
      setErro(`Não foi possível criar a pricing: ${(e as Error).message}`);
      setCriando(null);
    }
  };

  const abrirExistente = () => {
    const m = idExistente.match(/(\d{10,25})/);
    if (m) router.push(`/pricing/${m[1]}`);
  };

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Marca />
        <UserMenu usuario={usuario} mostrarInicio={false} />
      </header>

      <div className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Olá, {usuario.nome.split(" ")[0]}</h1>
        <p className="text-muted-foreground">Crie uma pricing a partir de um negócio seu ou abra uma pricing existente.</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FilePlus2 className="text-muted-foreground size-4" /> Nova pricing a partir de um negócio
            </CardTitle>
            <CardDescription>A pricing é criada no Zoho já vinculada ao negócio e à conta.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-56 flex-1">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Pesquisar negócio ou conta…"
                  className="pl-9"
                  aria-label="Pesquisar negócio"
                />
              </div>
              <Segmented
                value={escopo}
                onChange={setEscopo}
                ariaLabel="Quais negócios"
                options={[
                  { value: "meus", label: "Meus negócios" },
                  { value: "todos", label: "Todos" },
                ]}
              />
            </div>

            {erro && (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}

            {negocios === null ? (
              <p className="text-muted-foreground inline-flex items-center gap-2 py-6 text-sm">
                <Loader2 className="size-4 animate-spin" /> Buscando negócios no Zoho…
              </p>
            ) : negocios.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                Nenhum negócio encontrado
                {escopo === "meus" ? " entre os seus. Tente “Todos”." : "."}
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {negocios.map((n) => (
                  <li key={n.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <div className="grid min-w-0 flex-1 gap-1">
                      <span className="truncate font-medium">{n.nome}</span>
                      <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        {n.conta && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="size-3" /> {n.conta}
                          </span>
                        )}
                        {n.fechamento && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3" /> {data(n.fechamento)}
                          </span>
                        )}
                        {escopo === "todos" && n.dono && (
                          <span className="inline-flex items-center gap-1">
                            <Briefcase className="size-3" /> {n.dono.nome}
                          </span>
                        )}
                      </span>
                    </div>
                    {n.estagio && <Badge variant="secondary">{n.estagio}</Badge>}
                    {n.valor != null && <span className="text-sm tabular-nums">{formatBRL(n.valor)}</span>}
                    <Button size="sm" onClick={() => criar(n)} disabled={criando !== null}>
                      {criando === n.id ? <Loader2 className="animate-spin" /> : <FilePlus2 />}
                      {criando === n.id ? "Criando…" : "Criar pricing"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Abrir pricing existente</CardTitle>
            <CardDescription>Cole o id ou o link da pricing no Zoho.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                abrirExistente();
              }}
            >
              <Input
                value={idExistente}
                onChange={(e) => setIdExistente(e.target.value)}
                placeholder="Ex.: 6290672000029924016"
                aria-label="Id da pricing"
              />
              <Button type="submit" variant="outline" disabled={!/\d{10,25}/.test(idExistente)}>
                Abrir <ArrowRight />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
