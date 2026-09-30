"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatBRL, type Recurso } from "@/lib/pricing";
import { praticaCompativel } from "@/lib/zoho/params";

/** Sem acento e minúsculo: "Automação" → "automacao". */
const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Todas as palavras digitadas precisam aparecer no nome ou na prática. */
function filtrar(_valor: string, busca: string, palavrasChave?: string[]) {
  const alvo = normalizar((palavrasChave ?? []).join(" "));
  const termos = normalizar(busca).split(/\s+/).filter(Boolean);
  return termos.every((t) => alvo.includes(t)) ? 1 : 0;
}

/** Seletor de Cargo / Perfil com campo de pesquisa (shadcn Combobox). */
export default function RecursoCombobox({
  recursos: todos,
  value,
  onChange,
  pratica,
}: {
  recursos: Recurso[];
  value: string;
  onChange: (id: string) => void;
  /** Prática da linha: só lista cargos dessa prática (mesmo filtro do Zoho). */
  pratica?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const selecionado = todos.find((r) => r.id === value);
  const recursos = pratica ? todos.filter((r) => praticaCompativel(r.pratica, pratica)) : todos;
  const praticas = [...new Set(recursos.map((r) => r.pratica))];

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          aria-label="Cargo / Perfil"
          className="dark:bg-input/30 w-full justify-between px-3 font-normal"
        >
          <span className={cn("truncate", !selecionado && "text-muted-foreground")}>
            {selecionado?.nome ?? "Selecione o cargo"}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        <Command filter={filtrar}>
          <CommandInput placeholder="Pesquisar cargo ou prática…" />
          <CommandList>
            <CommandEmpty>{pratica ? `Nenhum cargo da prática ${pratica}.` : "Nenhum cargo encontrado."}</CommandEmpty>
            {praticas.map((p) => (
              <CommandGroup key={p} heading={p}>
                {recursos
                  .filter((r) => r.pratica === p)
                  .map((r) => (
                    <CommandItem
                      key={r.id}
                      value={r.id}
                      keywords={[r.nome, r.pratica]}
                      onSelect={() => {
                        onChange(r.id);
                        setAberto(false);
                      }}
                    >
                      <Check className={cn("size-4", r.id === value ? "opacity-100" : "opacity-0")} />
                      <span className="flex-1 truncate">{r.nome}</span>
                      {r.salarioNominal > 0 && (
                        <span className="text-muted-foreground text-xs tabular-nums">{formatBRL(r.salarioNominal)}</span>
                      )}
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
