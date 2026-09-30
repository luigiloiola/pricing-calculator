"use client";

import { motion } from "framer-motion";
import { ANNUAL_DISCOUNT, type BillingCycle } from "@/lib/pricing";

const OPTIONS: { id: BillingCycle; label: string }[] = [
  { id: "monthly", label: "Mensal" },
  { id: "annual", label: "Anual" },
];

export default function BillingToggle({
  value,
  onChange,
}: {
  value: BillingCycle;
  onChange: (v: BillingCycle) => void;
}) {
  return (
    <div className="toggle" role="radiogroup" aria-label="Ciclo de cobrança">
      {OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            role="radio"
            aria-checked={active}
            className={`toggle-btn ${active ? "is-active" : ""}`}
            onClick={() => onChange(opt.id)}
          >
            {active && (
              <motion.span
                layoutId="billing-pill"
                className="toggle-pill"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="toggle-label">
              {opt.label}
              {opt.id === "annual" && (
                <span className="toggle-badge">−{Math.round(ANNUAL_DISCOUNT * 100)}%</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
