/** Resumo de um registro do módulo Deals (Negócios) para a tela inicial. */
export interface NegocioResumo {
  id: string;
  nome: string;
  conta: string;
  estagio: string;
  valor: number | null;
  fechamento: string;
  dono: { id: string; nome: string } | null;
}
