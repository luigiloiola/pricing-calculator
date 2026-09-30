// Catálogo de EXEMPLO — usado só quando o Zoho CRM não está configurado
// (desenvolvimento local). Os valores são fictícios e não devem ir para proposta.
import type { Catalogo } from "./pricing";

export const CATALOGO_EXEMPLO: Catalogo = {
  fonte: "exemplo",
  atualizadoEm: new Date(0).toISOString(),
  aviso:
    "Zoho CRM não configurado — usando valores fictícios. Preencha o .env.local para ler os custos reais do módulo Recursos e Funções.",
  recursos: [
    { id: "ex-dev-jr", nome: "Desenvolvedor Júnior (exemplo)", pratica: "Dev", salarioNominal: 5000, custoMensal: 9000, taxaHora: 56 },
    { id: "ex-dev-pl", nome: "Desenvolvedor Pleno (exemplo)", pratica: "Dev", salarioNominal: 9000, custoMensal: 15000, taxaHora: 94 },
    { id: "ex-dev-sr", nome: "Desenvolvedor Sênior (exemplo)", pratica: "Dev", salarioNominal: 13500, custoMensal: 22000, taxaHora: 138 },
    { id: "ex-qa-pl", nome: "Analista de QA Pleno (exemplo)", pratica: "QA", salarioNominal: 7500, custoMensal: 12500, taxaHora: 78 },
    { id: "ex-devops-sr", nome: "Engenheiro DevOps Sênior (exemplo)", pratica: "DevOps", salarioNominal: 14500, custoMensal: 24000, taxaHora: 150 },
    { id: "ex-appsec", nome: "Especialista AppSec (exemplo)", pratica: "Cyber", salarioNominal: 16000, custoMensal: 26000, taxaHora: 163 },
  ],
  produtos: [
    { id: "ex-lic-nac", nome: "Licença nacional (exemplo)", custoUnitario: 1200, faturamentoNacional: true },
    { id: "ex-lic-imp", nome: "Licença importada (exemplo, US$)", custoUnitario: 300, faturamentoNacional: false },
  ],
};
