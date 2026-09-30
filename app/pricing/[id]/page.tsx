import PricingCalculator from "@/components/PricingCalculator";
import { exigirSessaoPagina, publico } from "@/lib/auth/sessao";

export const dynamic = "force-dynamic";

export default async function PricingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await exigirSessaoPagina(`/pricing/${id}`);
  return (
    <main className="mx-auto max-w-7xl px-4 pt-10 pb-20 sm:px-6 lg:pt-14">
      <PricingCalculator pricingId={id} usuario={publico(sessao)} />
    </main>
  );
}
