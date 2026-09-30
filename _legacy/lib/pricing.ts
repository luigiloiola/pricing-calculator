// ─────────────────────────────────────────────────────────────
// Configuração de preços — edite aqui para refletir o seu produto.
// Todos os valores são mensais, em BRL.
// ─────────────────────────────────────────────────────────────

export type BillingCycle = "monthly" | "annual";

export interface Plan {
  id: string;
  name: string;
  tagline: string;
  baseFee: number; // taxa fixa mensal da plataforma
  seatPrice: number; // preço por usuário adicional
  includedSeats: number; // usuários já inclusos na taxa fixa
  features: string[];
  popular?: boolean;
}

export interface Addon {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: "flat" | "seat"; // valor fixo ou por usuário
}

export interface VolumeTier {
  minSeats: number;
  discount: number; // aplicado sobre o custo de usuários adicionais
}

export const ANNUAL_DISCOUNT = 0.2;

export const SEAT_LIMITS = { min: 1, max: 100 };

export const VOLUME_TIERS: VolumeTier[] = [
  { minSeats: 1, discount: 0 },
  { minSeats: 10, discount: 0.05 },
  { minSeats: 25, discount: 0.1 },
  { minSeats: 50, discount: 0.15 },
];

export const PLANS: Plan[] = [
  {
    id: "essencial",
    name: "Essencial",
    tagline: "Para quem está começando",
    baseFee: 49,
    seatPrice: 29,
    includedSeats: 1,
    features: ["1 usuário incluso", "Agenda e cadastros", "Suporte por e-mail"],
  },
  {
    id: "profissional",
    name: "Profissional",
    tagline: "Para equipes em crescimento",
    baseFee: 99,
    seatPrice: 24,
    includedSeats: 3,
    popular: true,
    features: ["3 usuários inclusos", "Relatórios financeiros", "Automações"],
  },
  {
    id: "empresarial",
    name: "Empresarial",
    tagline: "Para operações maiores",
    baseFee: 249,
    seatPrice: 19,
    includedSeats: 10,
    features: ["10 usuários inclusos", "Multiunidades", "Gerente de conta"],
  },
];

export const ADDONS: Addon[] = [
  {
    id: "whatsapp",
    name: "Integração WhatsApp",
    description: "Lembretes e confirmações automáticas",
    price: 59,
    unit: "flat",
  },
  {
    id: "reports",
    name: "Relatórios avançados",
    description: "Dashboards e exportações personalizadas",
    price: 39,
    unit: "flat",
  },
  {
    id: "storage",
    name: "Armazenamento extra",
    description: "+50 GB por usuário",
    price: 5,
    unit: "seat",
  },
  {
    id: "support",
    name: "Suporte prioritário",
    description: "Atendimento em até 1h útil",
    price: 79,
    unit: "flat",
  },
];

// ─────────────────────────────────────────────────────────────
// Cálculo
// ─────────────────────────────────────────────────────────────

export type LineKind = "base" | "seats" | "addon" | "discount";

export interface QuoteLine {
  id: string;
  label: string;
  amount: number;
  kind: LineKind;
}

export interface Quote {
  plan: Plan;
  lines: QuoteLine[];
  composition: { base: number; seats: number; addons: number };
  volumeDiscountRate: number;
  monthlyTotal: number; // valor mensal efetivo (já com descontos)
  billedTotal: number; // valor cobrado por ciclo
  perSeat: number;
  annualSavings: number; // economia anual do plano anual vs. mensal
}

export interface QuoteInput {
  planId: string;
  seats: number;
  addonIds: string[];
  cycle: BillingCycle;
}

export function getVolumeDiscount(seats: number): number {
  let rate = 0;
  for (const tier of VOLUME_TIERS) if (seats >= tier.minSeats) rate = tier.discount;
  return rate;
}

export function calculateQuote({ planId, seats, addonIds, cycle }: QuoteInput): Quote {
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0];
  const extraSeats = Math.max(0, seats - plan.includedSeats);
  const seatsCost = extraSeats * plan.seatPrice;

  const volumeDiscountRate = getVolumeDiscount(seats);
  const volumeDiscount = seatsCost * volumeDiscountRate;

  const addonLines: QuoteLine[] = ADDONS.filter((a) => addonIds.includes(a.id)).map((a) => ({
    id: `addon-${a.id}`,
    label: a.unit === "seat" ? `${a.name} (${seats}×)` : a.name,
    amount: a.unit === "seat" ? a.price * seats : a.price,
    kind: "addon",
  }));
  const addonsCost = addonLines.reduce((s, l) => s + l.amount, 0);

  const beforeCycle = plan.baseFee + seatsCost - volumeDiscount + addonsCost;
  const annualDiscount = cycle === "annual" ? beforeCycle * ANNUAL_DISCOUNT : 0;
  const monthlyTotal = beforeCycle - annualDiscount;

  const lines: QuoteLine[] = [
    { id: "base", label: `Plano ${plan.name}`, amount: plan.baseFee, kind: "base" },
  ];
  if (extraSeats > 0) {
    lines.push({
      id: "seats",
      label: `${extraSeats} ${extraSeats === 1 ? "usuário adicional" : "usuários adicionais"}`,
      amount: seatsCost,
      kind: "seats",
    });
  }
  lines.push(...addonLines);
  if (volumeDiscount > 0) {
    lines.push({
      id: "volume",
      label: `Desconto por volume (${Math.round(volumeDiscountRate * 100)}%)`,
      amount: -volumeDiscount,
      kind: "discount",
    });
  }
  if (annualDiscount > 0) {
    lines.push({
      id: "annual",
      label: `Plano anual (${Math.round(ANNUAL_DISCOUNT * 100)}%)`,
      amount: -annualDiscount,
      kind: "discount",
    });
  }

  return {
    plan,
    lines,
    composition: { base: plan.baseFee, seats: seatsCost, addons: addonsCost },
    volumeDiscountRate,
    monthlyTotal,
    billedTotal: cycle === "annual" ? monthlyTotal * 12 : monthlyTotal,
    perSeat: monthlyTotal / Math.max(1, seats),
    annualSavings: beforeCycle * ANNUAL_DISCOUNT * 12,
  };
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatBRL = (v: number) => brl.format(v);
