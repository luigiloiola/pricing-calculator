"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <div className={`field ${className ?? ""}`} role="group" aria-label={label}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

export function NumberInput({
  value,
  onChange,
  step = 1,
  min = 0,
  prefix,
  suffix,
  readOnly,
}: {
  value: number;
  onChange?: (v: number) => void;
  step?: number;
  min?: number;
  prefix?: string;
  suffix?: string;
  readOnly?: boolean;
}) {
  return (
    <span className={`input ${readOnly ? "is-readonly" : ""}`}>
      {prefix && <em>{prefix}</em>}
      <input
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        step={step}
        min={min}
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : undefined}
        onChange={(e) => onChange?.(e.target.value === "" ? 0 : Number(e.target.value))}
      />
      {suffix && <em>{suffix}</em>}
    </span>
  );
}

/** Percentual guardado como fração (0.42) e exibido como 42. */
export function PercentInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return <NumberInput value={value * 100} step={1} suffix="%" onChange={(v) => onChange(v / 100)} />;
}

export interface Opcao {
  value: string;
  label: string;
  group?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Opcao[];
  placeholder?: string;
}) {
  const grupos = [...new Set(options.map((o) => o.group).filter(Boolean))] as string[];
  const render = (os: Opcao[]) =>
    os.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ));
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {grupos.length
        ? grupos.map((g) => (
            <optgroup key={g} label={g}>
              {render(options.filter((o) => o.group === g))}
            </optgroup>
          ))
        : render(options)}
    </select>
  );
}

export function Segmented<T extends string>({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="toggle" role="radiogroup">
      {options.map((o) => {
        const ativo = o.value === value;
        return (
          <button
            type="button"
            key={o.value}
            role="radio"
            aria-checked={ativo}
            className={`toggle-btn ${ativo ? "is-active" : ""}`}
            onClick={() => onChange(o.value)}
          >
            {ativo && (
              <motion.span
                layoutId={`seg-${id}`}
                className="toggle-pill"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="toggle-label">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function RowShell({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <motion.div
      layout
      className="row"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, marginTop: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
      <button type="button" className="icon-btn row-remove" onClick={onRemove} aria-label="Remover linha">
        Remover
      </button>
    </motion.div>
  );
}
