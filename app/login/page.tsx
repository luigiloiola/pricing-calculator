import { LogIn, TriangleAlert } from "lucide-react";
import { redirect } from "next/navigation";
import Marca from "@/components/Marca";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { destinoSeguro, lerSessao } from "@/lib/auth/sessao";
import { loginConfigurado } from "@/lib/auth/zoho-oauth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const next = destinoSeguro(sp.next);
  if (await lerSessao()) redirect(next);

  const configurado = loginConfigurado();
  const erro = sp.erro === "config" ? null : sp.erro;

  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center gap-6 px-4 py-10">
      <Marca />
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Calculadora de pricing</CardTitle>
          <CardDescription>Entre com a sua conta Zoho da Yaman para abrir, criar e salvar pricings.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {erro && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>Não foi possível entrar</AlertTitle>
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}
          {sp.saiu && !erro && <p className="text-muted-foreground text-sm">Você saiu da calculadora.</p>}
          {!configurado ? (
            <Alert>
              <TriangleAlert />
              <AlertTitle>Login com Zoho não configurado</AlertTitle>
              <AlertDescription>
                Preencha ZOHO_OAUTH_CLIENT_ID, ZOHO_OAUTH_CLIENT_SECRET, APP_URL e SESSION_SECRET no .env.local e reinicie
                o servidor.
              </AlertDescription>
            </Alert>
          ) : (
            <Button size="lg" asChild>
              <a href={`/api/auth/login?next=${encodeURIComponent(next)}`}>
                <LogIn /> Entrar com Zoho
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
