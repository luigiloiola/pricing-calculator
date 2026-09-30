# Calculadora de Pricing · Yaman

Ferramenta **interna** do time comercial da Yaman (não é produto à venda).
O vendedor monta a composição da oportunidade e vê receita, impostos, custo e
margem — mensal e total — **antes** de lançar o registro no módulo
**Pricings** do Zoho CRM.

Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui + Framer Motion.

## Rodar
```bash
npm install
cp .env.example .env.local   # preencha as credenciais do Zoho
npm run dev                  # http://localhost:3000
```
Sem `.env.local` a calculadora funciona com **dados de exemplo** (fictícios),
sinalizados em laranja no topo da tela.

## Login com Zoho, negócios e pricings
- **Login obrigatório** com a conta Zoho da Yaman ("Entrar com Zoho", OAuth).
  Só entram usuários da organização `ZOHO_ORG_ID`. A sessão fica num cookie
  httpOnly criptografado (`SESSION_SECRET`), válido por 7 dias.
- **Início (`/`)**: lista os negócios (Deals) do vendedor — "Meus negócios" ou
  "Todos" os que ele enxerga, com pesquisa — e cria uma pricing nova a partir
  de um deles (vinculada ao negócio, à conta e ao dono do negócio). Também dá
  para abrir uma pricing existente pelo id ou link.
- **`/pricing/<id>`** (ou `/?id=<id>`): calculadora pré-preenchida com a
  pricing. **Enviar para o Zoho** grava nela: linhas existentes são
  atualizadas, novas são criadas e **removidas são apagadas no Zoho**.

### Quem acessa o quê
| Dado | Conta usada | Por quê |
|---|---|---|
| Pricings (ler, criar, gravar) e Deals | **vendedor logado** | respeita as permissões dele no CRM e o Zoho registra ele como autor |
| Cargos/salários (Recursos e Funções) e Products | conta de serviço (Self Client) | o vendedor sempre tem os custos para calcular, mesmo sem ver esses campos no CRM |

Escopos pedidos no login: `ZohoCRM.modules.custom.ALL`,
`ZohoCRM.modules.deals.READ`, `ZohoCRM.users.READ`, `ZohoCRM.org.READ`.

Notas:
- O Zoho guarda a margem com 2 casas; a receita recalculada pelo CRM pode
  diferir alguns reais quando o vendedor fixa a receita.
- O quadro "Diferença no Zoho" mostra só os totais que divergem, em R$.
- Sugestão: botão/link no módulo Pricings apontando para
  `<APP_URL>/pricing/${Pricings.ID do registro}`.

Mapeamento de campos: `lib/zoho/pricing-record.ts`.

## De onde vêm os números

| O quê | Origem no Zoho CRM |
|---|---|
| Custo mensal e taxa hora por cargo | módulo `Recursos_e_Funcoes` (`Custo_Mensal`, `Taxa_Hora`) — lido ao vivo |
| Custo de licenças e faturamento nacional/importado | módulo `Products` (`Unit_Price`, `Faturamento_Nacional`) — lido ao vivo |
| Impostos sobre receita (10,15%) | `Pricings.Impostos1` |
| Impostos de importação (IOF+IR+PIS+COFINS = 27,25%) | `Custo_de_Licencas.Impostos_Exporta_o` |
| Picklists (tipo de oferta, tipo de proposta, práticas, categorias) | campos do módulo `Pricings` e subformulários |

Os parâmetros fixos ficam em `lib/zoho/params.ts`; a leitura ao vivo em
`lib/zoho/client.ts` (servidor, credenciais nunca chegam ao navegador) exposta
em `GET /api/catalogo` com cache de 10 min (`?refresh=1` força releitura; o
selo no topo da tela também recarrega).

## Fórmula de preço — informe 2, calcule 1
Cada linha (perfil, licença ou despesa) tem três variáveis:

- **Custo** — perfis: salário nominal (CLT) ou taxa hora (PJ), somados encargos e benefícios; licenças/despesas: custo unitário × qtd
- **Margem %**
- **Receita bruta** (total da linha)

O vendedor escolhe qual delas é calculada e digita as outras duas. A conta é a
mesma da planilha "Pricing - Quebra Galho" (margem sobre a receita líquida):

```
Receita bruta = Custo / (1 − Margem) / (1 − 10,15%)
Margem %      = 1 − Custo / Receita líquida
Custo         = Receita bruta × (1 − 10,15%) × (1 − Margem)   → salário / taxa hora / custo unitário
```
Ao trocar o valor calculado, os números atuais são mantidos (nada "pula").
Conferido contra as 8 colunas da planilha (diferença de centavos por arredondamento).

### Custo de perfis (fórmulas do subformulário Perfis Profissionais)
```
Base       = Salário mensal  ou  Taxa Hora × Horas/mês (padrão 160 h) — vale para CLT e PJ
Encargos   = Base × 63,6389% (só CLT) = 13º (1/12) + Férias + 1/3 (4/3 ÷ 12)
             + INSS 20% + INSS Terceiros 5,8% + FGTS 8% sobre (Base + 13º + Férias)
             + Multa FGTS (40% do FGTS)
Benefícios = soma dos marcados + Seguro Vida (0,2% da Base) + Demais Benefícios   ("R$ Benefícios")
Custo      = (Base + Encargos + Benefícios) × meses × quantidade
```
Valores dos benefícios e o fator de encargos ficam em `lib/zoho/params.ts`
(`BENEFICIOS`, `ENCARGOS_CLT_DETALHE`, `BENEFICIOS_PADRAO`, `HORAS_MES_PADRAO`). Quando o custo é o valor
calculado, a calculadora resolve a Base de volta (a fórmula é linear na Base).
As expressões das fórmulas do Zoho não são expostas pela API; se o CRM
calcular diferente, ajuste `resolverTrio` / `fechaBloco` em `lib/pricing.ts`.

## Credenciais Zoho (.env.local)
Veja `.env.example`. São dois clientes no https://api-console.zoho.com:

1. **Self Client** (conta de serviço, catálogo de custos): escopo
   `ZohoCRM.modules.READ,ZohoCRM.modules.custom.ALL`; gere o código, troque
   pelo `refresh_token` e preencha `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`,
   `ZOHO_REFRESH_TOKEN` — os três do **mesmo** Self Client.
2. **Server-based Application** (login dos vendedores): Redirect URI
   `<APP_URL>/api/auth/callback`; preencha `ZOHO_OAUTH_CLIENT_ID`,
   `ZOHO_OAUTH_CLIENT_SECRET`, `APP_URL` e `SESSION_SECRET` (32+ caracteres).
   No primeiro login o servidor mostra o id da organização — copie para
   `ZOHO_ORG_ID`.

Reinicie o servidor depois de editar o `.env.local`.

## Estrutura
- `lib/pricing.ts` — tipos e cálculo
- `lib/zoho/params.ts` — parâmetros e picklists espelhados do CRM
- `lib/zoho/client.ts` — leitura do Zoho CRM (OAuth refresh token)
- `app/api/catalogo/route.ts` — catálogo de custos para a tela
- `lib/auth/` — sessão (cookie criptografado) e OAuth do Zoho por usuário
- `app/api/auth/*` — login, callback e logout
- `app/api/deals/route.ts` — negócios do vendedor
- `app/api/pricing/route.ts` — cria pricing a partir de um negócio
- `app/api/pricing/[id]/route.ts` — lê (GET) e grava (PUT) a pricing no Zoho
- `components/Inicio.tsx` — tela inicial (negócios e abrir pricing)
- `lib/zoho/pricing-record.ts` — conversão registro Pricings ⇄ calculadora
- `app/pricing/[id]/page.tsx` — página da calculadora para uma pricing
- `components/ui/` — componentes shadcn/ui (adicione outros com `npx shadcn@latest add <nome>`)
- `components/Trio.tsx` — as três variáveis da linha (informe 2, calcule 1)
- `components/fields.tsx` — campos numéricos pt-BR, percentual e segmented
- `components/PricingCalculator.tsx` — estado e layout
- `components/PerfisBlock.tsx`, `LicencasBlock.tsx`, `DespesasBlock.tsx` — espelham os subformulários
- `components/Summary.tsx` — resultado mensal e total, e "copiar resumo para o Zoho"
- `_legacy/` — versões anteriores, fora do build
