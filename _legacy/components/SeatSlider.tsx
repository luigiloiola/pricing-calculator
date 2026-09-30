"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SEAT_LIMITS, VOLUME_TIERS } from "@/lib/pricing";

export default function SeatSlider({
  value,
  onChange,
  discountRate,
}: {
  value: number;
  onChange: (v: number) => void;
  discountRate: number;
}) {
  const { min, max } = SEAT_LIMITS;
  const pct = ((value - min) / (max - min)) * 100;
  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  return (
    <div className="seats">
      <div className="seats-head">
        <div className="stepper">
          <motion.button
            whileTap={{ scale: 0.85 }}
            aria-label="Remover usuário"
            onClick={() => onChange(clamp(value - 1))}
          >
            −
          </motion.button>
          <div className="stepper-value" aria-live="polite">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={value}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {value}
              </motion.span>
            </AnimatePresence>
          </div>
          <motion.button
            whileTap={{ scale: 0.85 }}
            aria-label="Adicionar usuário"
            onClick={() => onChange(clamp(value + 1))}
          >
            +
          </motion.button>
        </div>
        <AnimatePresence>
          {discountRate > 0 && (
            <motion.span
              key={discountRate}
              className="chip chip-success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              −{Math.round(discountRate * 100)}% em usuários extras
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="range-wrap">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          aria-label="Número de usuários"
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ ["--pct" as string]: `${pct}%` }}
        />
        <div className="range-ticks">
          {VOLUME_TIERS.filter((t) => t.discount > 0).map((t) => (
            <button
              key={t.minSeats}
              className={`tick ${value >= t.minSeats ? "is-on" : ""}`}
              style={{ left: `${((t.minSeats - min) / (max - min)) * 100}%` }}
              onClick={() => onChange(t.minSeats)}
            >
              {t.minSeats}+
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
