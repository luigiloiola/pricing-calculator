"use client";

import { motion } from "framer-motion";
import { formatBRL, PLANS } from "@/lib/pricing";

export default function PlanSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="plans" role="radiogroup" aria-label="Plano">
      {PLANS.map((plan) => {
        const active = plan.id === value;
        return (
          <motion.button
            key={plan.id}
            role="radio"
            aria-checked={active}
            className={`plan ${active ? "is-active" : ""}`}
            onClick={() => onChange(plan.id)}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          >
            {active && (
              <motion.span
                layoutId="plan-ring"
                className="plan-ring"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            {plan.popular && <span className="plan-popular">Mais escolhido</span>}
            <span className="plan-name">{plan.name}</span>
            <span className="plan-tagline">{plan.tagline}</span>
            <span className="plan-price">
              {formatBRL(plan.baseFee)}
              <small>/mês</small>
            </span>
            <span className="plan-seat">+ {formatBRL(plan.seatPrice)} por usuário extra</span>
            <ul className="plan-features">
              {plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </motion.button>
        );
      })}
    </div>
  );
}
