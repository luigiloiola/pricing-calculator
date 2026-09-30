"use client";

import { Calculator } from "lucide-react";
import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

const exibir = (v: number, dec: number) =>
  Number.isFinite(v) ? v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: dec }) : "—";
const editavel = (v: number, dec: number) =>
  Number.isFinite(v) ? String(Math.round(v * 10 ** dec) / 10 ** dec).replace(".", ",") : "";

/** Aceita "1234,56", "1.234,56" e "1234.56". */
function ler(s: string): number | null {
  const t = s.trim().replace(/\s|R\$/g, "");
  if (!t || t === "-") return 0;
  const norm = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const v = Number(norm);
  return Number.isFinite(v) ? v : null;
}

export function FieldLabel({ htmlFor, children, extra }: { htmlFor?: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <Label htmlFor={htmlFor} className="text-muted-foreground text-xs font-medium">
      {children}
      {extra}
    </Label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  decimals = 2,
  min,
  computed,
  hint,
  tone,
  className,
}: {
  label: string;
  value: number;
  onChange?: (v: number) => void;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  min?: number;
  computed?: boolean;
  hint?: ReactNode;
  tone?: "warn";
  className?: string;
}) {
  const id = useId();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const mostrado = computed || !editando ? exibir(value, decimals) : texto;

  return (
    <div className={cn("grid min-w-0 content-start gap-1.5", className)}>
      <FieldLabel
        htmlFor={id}
        extra={
          computed ? (
            <span className="text-brand ml-auto inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase">
              <Calculator className="size-3" /> calculado
            </span>
          ) : null
        }
      >
        {label}
      </FieldLabel>
      <div className="relative">
        {prefix && (
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs">
            {prefix}
          </span>
        )}
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          readOnly={computed}
          tabIndex={computed ? -1 : undefined}
          aria-readonly={computed}
          value={mostrado}
          className={cn(
            "tabular-nums",
            prefix && (prefix.length > 2 ? "pl-11" : "pl-9"),
            suffix && "pr-8",
            computed &&
              "border-brand/30 bg-brand/5 text-brand dark:bg-brand/10 cursor-default font-semibold shadow-none focus-visible:ring-0",
            tone === "warn" && "text-warn border-warn/40",
          )}
          onFocus={() => {
            if (computed) return;
            setTexto(editavel(value, decimals));
            setEditando(true);
          }}
          onBlur={() => setEditando(false)}
          onChange={(e) => {
            setTexto(e.target.value);
            const v = ler(e.target.value);
            if (v !== null) onChange?.(min !== undefined ? Math.max(min, v) : v);
          }}
        />
        {suffix && (
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-muted-foreground text-[11px] leading-tight">{hint}</p>}
    </div>
  );
}

/** Percentual guardado como fração (0,42) e exibido como 42. */
export function PercentField(props: Omit<ComponentProps<typeof NumberField>, "suffix" | "value" | "onChange"> & {
  value: number;
  onChange?: (v: number) => void;
}) {
  const { value, onChange, ...rest } = props;
  return (
    <NumberField {...rest} value={value * 100} suffix="%" onChange={onChange ? (v) => onChange(v / 100) : undefined} />
  );
}

/** Segmented control (shadcn ToggleGroup) com estado ativo bem visível. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "sm",
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  size?: "sm" | "default";
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size={size}
      value={value}
      aria-label={ariaLabel}
      onValueChange={(v) => v && onChange(v as T)}
      className={className}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground min-w-fit px-3"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
