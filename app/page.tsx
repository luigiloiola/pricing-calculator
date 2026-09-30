import { redirect } from "next/navigation";
import Inicio from "@/components/Inicio";
import { exigirSessaoPagina, publico } from "@/lib/auth/sessao";

export const dynamic = "force-dynamic";

/** Início (requer login). Aceita também /?id=<id> e redireciona para /pricing/<id>. */
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const id = [sp.id, sp.pricing].flat().find((v): v is string => typeof v === "string" && v.length > 0);
  if (id) redirect(`/pricing/${encodeURIComponent(id)}`);
  const sessao = await exigirSessaoPagina("/");
  return (
    <main className="mx-auto max-w-7xl px-4 pt-10 pb-20 sm:px-6 lg:pt-14">
      <Inicio usuario={publico(sessao)} />
    </main>
  );
}
