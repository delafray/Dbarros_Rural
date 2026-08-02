# 01 — Visão e Escopo

> Registrado em 01/08/2026 a partir das definições do usuário. Atualizar
> conforme o levantamento avançar (sempre com data).

## O que o módulo é

Acompanhamento de **orçamento, previsão e resultado** dos **GASTOS** de um
evento rural, em três camadas:

| Camada | Significado |
|---|---|
| **Orçado** | o que os gestores planejaram gastar antes de cotar ("dar o preço do evento, uma previsão de orçamento") |
| **Contratado / Previsão** | o que está fechando com fornecedores (cotações aceitas, contratos) |
| **Realizado** | o que foi efetivamente pago |

O valor do módulo está na **comparação entre as camadas** (desvio em R$ e %),
por categoria e consolidado, e em dar estrutura ao processo que hoje vive em
**planilhas Excel desorganizadas**.

## O que o módulo NÃO é (decisões explícitas do usuário)

- **NÃO cruza com faturamento/receita.** "Não quero organizar e bater o
  faturamento com os gastos, aqui vai ser puramente gastos." (01/08/2026)
- **NÃO é um ERP burocrático.** Quem opera vive de planilha; se o sistema
  exigir disciplina de formulário, será abandonado. A disciplina é do software,
  invisível ao usuário.

## Para quem

- **Gestores** da organizadora de eventos: precificam o evento (previsão de
  orçamento), montam pedidos de orçamento, decidem contratações.
- Perfil dos operadores: **pessoas que usam planilhas, todas desorganizadas**
  (definição do usuário, 01/08/2026). O sistema deve parecer uma
  "planilha super bem estruturada", não um formulário.

## Filosofia de produto ("planilha com superpoderes")

Acordado com o usuário em 01/08/2026:

1. A tela parece planilha, não formulário — edição inline, Tab/Enter,
   digitou-salvou.
2. Tolerância à bagunça na entrada, organização na saída — mínimo de campos
   obrigatórios; categorizar pode vir depois.
3. Colar da planilha existente tem que funcionar (migração dos dados históricos).
4. O sistema organiza sozinho — o comparativo orçado × contratado × realizado
   aparece pronto, sem o usuário montar fórmula.
5. Errar é barato — editar/excluir trivial, sem fluxo de aprovação travando.

## Critério de sucesso

O operador de Excel abandona a planilha porque o módulo é **mais rápido e mais
barato de usar** que abrir o Excel — e ganha de graça o que a planilha não dá:
comparação de fornecedores, desvios automáticos, memória entre eventos e
checklist do que é obrigatório.

**Baseline registrado (usuário, 01/08/2026): hoje UM evento são ~40 planilhas
desconectadas.** A métrica do módulo é substituí-las por um único lugar, com
cadastro completo em ~15 minutos (RNF-013) e o front operável por leigo — "tudo
tem de acontecer por trás" (RF-042). Os riscos apontados no veredito da IA
(escopo de construção, desenho do rateio, manutenção do conteúdo legal,
importação defensiva) são todos do lado de QUEM CONSTRÓI — o preço de cumprir
essa promessa — e se mitigam com entrega em fases usando o sistema desde cedo.
