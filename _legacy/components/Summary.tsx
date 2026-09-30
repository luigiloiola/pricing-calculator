"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import AnimatedNumber from "./AnimatedNumber";
import { formatBRL, type BillingCycle, type Quote } from "@/lib/pricing";

const SEGMENTS = [
  { key: "base", label: "Plano", color: "var(--c-base)" },
  { key: "seats", label: "Usuários", color: "var(--c-seats)" },
  { key: "addons", label: "Adicionais", color: "var(--c-addons)" },
] as const;

export default function Summary({
  quote,
  cycle,
  seats,
  onSwitchAnnual,
}: {
  quote: Quote;
  cycle: BillingCycle;
  seats: number;
  onSwitchAnnual: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const gross = quote.composition.base + quote.composition.seats + quote.composition.addons;

  const copy = async () => {
    const text = [
      `Orçamento — Plano ${quote.plan.name} (${seats} usuários, ${cycle === "annual" ? "anual" : "mensal"})`,
      ...quote.lines.map((l) => `• ${l.label}: ${formatBRL(l.amount)}`),
      `Total mensal: ${formatBRL(quote.monthlyTotal)}`,
      cycle === "annual" ? `Cobrado anualmente: ${formatBRL(quote.billedTotal)}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard indisponível */
    }
  };

  return (
    <motion.aside
      className="summary"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <p className="eyebrow">Seu orçamento</p>

      <div className="total">
        <AnimatedNumber value={quote.monthlyTotal} className="total-value" />
        <span className="total-unit">/mês</span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={cycle}
          className="total-sub"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {cycle === "annual" ? (
            <>
              <AnimatedNumber value={quote.billedTotal} /> cobrados por ano
            </>
          ) : (
            "Cobrança mensal, cancele quando quiser"
          )}
        </motion.p>
      </AnimatePresence>

      <div className="per-seat">
        <AnimatedNumber value={quote.perSeat} /> por usuário/mês
      </div>

      {/* Composição do custo */}
      <div className="bar" aria-hidden>
        {SEGMENTS.map((s) => (
          <motion.span
            key={s.key}
            style={{ background: s.color }}
            animate={{ width: `${gross ? (quote.composition[s.key] / gross) * 100 : 0}%` }}
            transition={{ type: "spring", stiffness: 180, damping: 26 }}
          />
        ))}
      </div>
      <div className="legend">
        {SEGMENTS.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      {/* Linhas do orçamento */}
      <motion.ul className="lines" layout>
        <AnimatePresence initial={false}>
          {quote.lines.map((line) => (
            <motion.li
              key={line.id}
              layout
              className={line.kind === "discount" ? "is-discount" : ""}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="line-inner">
                <span>{line.label}</span>
                <AnimatedNumber value={line.amount} />
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      <AnimatePresence initial={false}>
        {cycle === "monthly" && quote.annualSavings > 0 && (
          <motion.button
            className="nudge"
            onClick={onSwitchAnnual}
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="nudge-inner">
              Economize <AnimatedNumber value={quote.annualSavings} /> por ano no plano anual →
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <motion.button
        className="cta"
        onClick={copy}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={copied ? "ok" : "copy"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {copied ? "✓ Orçamento copiado" : "Copiar orçamento"}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </motion.aside>
  );
}
