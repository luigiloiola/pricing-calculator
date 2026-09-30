"use client";

import { motion } from "framer-motion";
import { ADDONS, formatBRL } from "@/lib/pricing";

export default function AddonList({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="addons">
      {ADDONS.map((addon) => {
        const on = selected.includes(addon.id);
        return (
          <motion.button
            key={addon.id}
            role="switch"
            aria-checked={on}
            className={`addon ${on ? "is-on" : ""}`}
            onClick={() => onToggle(addon.id)}
            whileTap={{ scale: 0.985 }}
          >
            <span className="addon-text">
              <span className="addon-name">{addon.name}</span>
              <span className="addon-desc">{addon.description}</span>
            </span>
            <span className="addon-price">
              {formatBRL(addon.price)}
              <small>{addon.unit === "seat" ? "/usuário" : "/mês"}</small>
            </span>
            <span className="switch" data-on={on}>
              <motion.span
                layout
                className="switch-knob"
                transition={{ type: "spring", stiffness: 700, damping: 35 }}
              />
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
