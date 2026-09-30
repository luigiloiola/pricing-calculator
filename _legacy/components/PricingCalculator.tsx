"use client";

import { motion, type Variants } from "framer-motion";
import { useMemo, useState } from "react";
import AddonList from "./AddonList";
import BillingToggle from "./BillingToggle";
import PlanSelector from "./PlanSelector";
import SeatSlider from "./SeatSlider";
import Summary from "./Summary";
import { calculateQuote, PLANS, type BillingCycle } from "@/lib/pricing";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function PricingCalculator() {
  const [planId, setPlanId] = useState(PLANS.find((p) => p.popular)?.id ?? PLANS[0].id);
  const [seats, setSeats] = useState(5);
  const [addonIds, setAddonIds] = useState<string[]>(["whatsapp"]);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  const quote = useMemo(
    () => calculateQuote({ planId, seats, addonIds, cycle }),
    [planId, seats, addonIds, cycle],
  );

  const toggleAddon = (id: string) =>
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  return (
    <div className="layout">
      <motion.div className="config" variants={container} initial="hidden" animate="show">
        <motion.header className="hero" variants={item}>
          <p className="eyebrow">Calculadora de preços</p>
          <h1>Monte o plano ideal para sua equipe</h1>
          <p className="lead">Ajuste plano, usuários e adicionais. O valor atualiza em tempo real.</p>
        </motion.header>

        <motion.section className="block" variants={item}>
          <div className="block-head">
            <h2>
              <span className="step">1</span> Escolha o plano
            </h2>
            <BillingToggle value={cycle} onChange={setCycle} />
          </div>
          <PlanSelector value={planId} onChange={setPlanId} />
        </motion.section>

        <motion.section className="block" variants={item}>
          <div className="block-head">
            <h2>
              <span className="step">2</span> Quantos usuários?
            </h2>
            <span className="hint">{quote.plan.includedSeats} inclusos no plano</span>
          </div>
          <SeatSlider value={seats} onChange={setSeats} discountRate={quote.volumeDiscountRate} />
        </motion.section>

        <motion.section className="block" variants={item}>
          <div className="block-head">
            <h2>
              <span className="step">3</span> Adicionais
            </h2>
          </div>
          <AddonList selected={addonIds} onToggle={toggleAddon} />
        </motion.section>
      </motion.div>

      <div className="summary-col">
        <Summary
          quote={quote}
          cycle={cycle}
          seats={seats}
          onSwitchAnnual={() => setCycle("annual")}
        />
      </div>
    </div>
  );
}
