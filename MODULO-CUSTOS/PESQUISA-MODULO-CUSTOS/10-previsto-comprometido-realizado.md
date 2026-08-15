# Pesquisa: Previsto × Comprometido × Realizado — Controle de Custos de Eventos

**Data:** 2026-08-01  
**Módulo:** Controle de Gastos de Eventos (React + TypeScript + Supabase)  
**Objetivo:** Embasar o design das colunas e indicadores do dashboard de custos de evento

---

## 1. Conceitos Fundamentais de Controle de Custos de Projetos

### 1.1 Definições Canônicas (PMI / PMBOK)

| Termo | Sigla | Definição |
|---|---|---|
| Budget at Completion | BAC | Orçamento total aprovado para o projeto — o que foi planejado gastar no início |
| Actual Cost | AC | Custos efetivamente incorridos até hoje (faturas pagas, despesas realizadas) |
| Committed Cost | — | Custos formalmente assumidos via contrato ou ordem de compra, porém ainda não faturados nem pagos |
| Estimate to Complete | ETC | Custo estimado restante para concluir tudo que ainda não está contratado ou realizado |
| Estimate at Completion | EAC | Projeção do custo total final = AC + ETC (ou variantes) |
| Variance at Completion | VAC | Desvio previsto ao final = BAC − EAC |

**Nota sobre Committed Cost:**  
Segundo o Procore (referência da indústria de construção): *"Committed costs are project expenses formally agreed through a contract or purchase order but not yet invoiced or paid."* Eles são registrados no momento da assinatura do contrato, antes de qualquer pagamento. Isso cria três camadas distintas:
1. **Orçado (BAC):** estimativa antes de qualquer negociação
2. **Comprometido:** valor dos contratos/cotações fechadas (obrigação legal)
3. **Realizado (AC):** pagamentos efetivamente desembolsados

Fontes:
- [Procore: The role of committed costs in construction accounting](https://www.procore.com/en-au/library/committed-costs)
- [ProjectManagementAcademy: The EAC Formula](https://projectmanagementacademy.net/resources/blog/forecasting-projects-in-progress-with-eac/)

---

### 1.2 A Fórmula Central de Projeção Final

A fórmula mais direta e usada em controle de projetos de construção e eventos é:

```
EAC = AC + Comprometido_restante + ETC_não_comprometido
```

Onde:
- **AC** = já pago (realizado)
- **Comprometido_restante** = valor dos contratos assinados que ainda não foi faturado/pago
- **ETC_não_comprometido** = estimativa para itens ainda sem contrato

Esta decomposição é mais prática para eventos do que a fórmula EVM pura (AC + ETC calculado por CPI), pois não requer medir "progresso físico".

Fórmulas alternativas de EAC do PMI (aplicáveis quando há histórico de desempenho):

| Cenário | Fórmula |
|---|---|
| Re-estimativa do zero | AC + ETC (novo) |
| Desvios foram pontuais, futuro será normal | AC + BAC − EV |
| Desempenho passado se repetirá | BAC / CPI |
| Considerando custo e cronograma | AC + (BAC−EV) / (CPI × SPI) |

Fonte: [ProjectManager: Calculating EAC](https://www.projectmanager.com/blog/calculating-estimate-at-completion)

---

## 2. Como Ferramentas de Project Cost Control Exibem Essas Colunas

### 2.1 Procore (construção civil — referência de mercado)

O **Budget Forecast Report** do Procore organiza os custos em três seções, com as seguintes colunas:

**Seção Budget (Orçamento):**
- `Original Budget` — orçamento inicial (imutável como baseline)
- `Approved Change Orders` — aditivos aprovados
- `Revised Budget` = Original + Aprovados
- `Pending Change Orders` — mudanças pendentes de aprovação
- `Projected Budget` = Revised + Pendentes

**Seção Commitments (Compromissos):**
- `Committed Costs` — contratos assinados (POs e subcontratos)
- `Uncommitted Costs` = Orçado − Comprometido
- `Pending Commitments` — em negociação
- `Projected Costs` = Committed + Direct Costs + Pending

**Seção Forecast (Previsão):**
- `Modification` — campo editável (ajuste manual do gestor)
- `Projected Over/Under` = Projected Budget − Projected Costs
- `Anticipated Over/Under` (variante que inclui rascunhos)

**Fórmulas derivadas do Procore:**
```
Revised Budget = Original Budget + Approved Change Orders
Projected Budget = Revised Budget + Pending Change Orders
Projected Costs = Committed + Direct Costs + Pending Changes
Projected Over/Under = Projected Budget − Estimated Cost at Completion
```

Fontes:
- [Procore: Budget Forecast Report](https://support.procore.com/faq/how-does-the-budget-forecast-report)
- [Procore: Construction Cost Reporting](https://www.procore.com/library/construction-cost-reporting)

---

### 2.2 Oracle Primavera P6 / Cloud

Primavera trabalha com campos nomeados de forma similar ao PMBOK:

- `Total Budgeted Cost` — baseline de custo
- `Confirmed Actuals` / `Pending Actuals` — dois níveis de custo realizado
- `Committed Costs` — total de compromissos aprovados
- `EV` / `PV` / `AC` — campos de Earned Value
- `Estimate to Complete (ETC)` e `Estimate at Completion (EAC)` — calculados automaticamente

Primavera distingue entre "Pending Actuals" (registros em aprovação) e "Confirmed Actuals" (homologados), o que é relevante para fluxos de aprovação de pagamento.

Fonte: [Oracle Primavera Cloud: Actuals Overview](https://primavera.oraclecloud.com/help/en/user/102185.htm)

---

### 2.3 MS Project

MS Project usa os campos:
- `Baseline Cost` (BAC)
- `Actual Cost` (AC)
- `Remaining Cost` (ETC simplificado)
- `Cost` = AC + Remaining (equivale ao EAC)
- `Cost Variance` = Baseline − Cost

Não tem campo nativo de "Committed", mas permite campos personalizados para isso.

---

### 2.4 Ferramentas Mais Leves (Planejamento de Eventos)

**Planning Pod:**
Rastreia três valores por item: `Estimated` (orçado) → `Negotiated` (cotação fechada) → `Actual` (pago). Exibe variância total no dashboard.

**ClearEvent:**
Dashboard em tempo real com: Total Budget, Total Committed, Total Spent, Remaining Budget, e alertas de desvio por categoria.

**Smartsheet + Anaplan:**
Planilhas com lógica de driver-based forecasting: cada linha tem Planned / Committed / Actual / Forecast, e o dashboard consolida por categoria e evento.

**Event Budget Spreadsheet (prática comum):**
Colunas típicas de planilhas profissionais:
`Categoria | Orçado | Cotado/Negociado | Contratado | Realizado | Projeção Final | Desvio (R$) | Desvio (%)`

Fontes:
- [Planning Pod: Event Budget Planner](https://planningpod.com/budgeting)
- [ClearEvent: Event Budget Software](https://clearevent.com/features/event-budget/)
- [Financial AHA: Event Budget Template](https://www.financialaha.com/essentials-spreadsheet-templates/special-purpose/event-budget/)

---

## 3. Earned Value Simplificado: O que Faz Sentido para Eventos

### 3.1 O Problema do EVM Clássico em Eventos

O Earned Value Management clássico (EV = BAC × % físico completo) foi projetado para projetos com avanço físico mensurável (obras, desenvolvimento de software com story points, etc.). Em eventos, o "% completo" é difuso — um buffet não está "70% pronto" antes do dia do evento.

O PMI reconhece isso e recomenda métodos alternativos para projetos sem avanço físico claro:

| Método Alternativo | Aplicação em Eventos |
|---|---|
| **0/100** | Item só conta como "entregue" quando 100% pago e recebido |
| **50/50** | 50% do valor ao assinar o contrato, 50% ao pagar final |
| **Milestone** | Ex.: contrato assinado = 30%, sinal pago = 60%, saldo = 100% |

Para um módulo de controle de gastos de eventos, **a abordagem 0/100 por status** é a mais simples e menos propensa a erros:
- Item `orçado` = 0% comprometido
- Item `contratado` = 100% comprometido (mas 0% pago)
- Item `pago` = 100% realizado

### 3.2 Indicador Prático para Eventos: Projeção Final por Status

Em vez de CPI/SPI, o que tem sentido para gestores de evento é:

```
Projeção Final = Σ(itens realizados) + Σ(comprometido restante) + Σ(estimativas não contratadas)
```

Onde "comprometido restante" = valor_contratado − valor_já_pago.

Isso responde à pergunta real do gestor: **"Quanto o evento vai custar no total, combinando o que já gastei com o que ainda tenho que pagar?"**

Fontes:
- [PMI: Earned Value Method](https://www.pmi.org/learning/library/earned-value-method-revenue-calculation-5073)
- [Wrike: How to calculate Earned Value](https://www.wrike.com/project-management-guide/faq/how-to-calculate-earned-value-in-project-management/)
- [Planyard: Cost-to-Complete Forecasting](https://planyard.com/blog/cost-to-complete-forecasting-construction)

---

## 4. Tratamento de Mudanças de Escopo / Aditivos

### 4.1 O Orçamento Original Deve Ser Preservado

A prática universal em project cost control é **nunca alterar o orçamento original (baseline)**. Em vez disso, cria-se um campo separado para o orçamento revisado:

```
Orçado Original (imutável)
+ Aditivos Aprovados
= Orçamento Revisado (atual)
+ Mudanças Pendentes (em aprovação)
= Orçamento Projetado
```

Isso preserva a capacidade de comparar o que foi originalmente planejado com o que foi aprovado ao longo do projeto. O desvio do original (`Revisado − Original`) revela o "scope creep" total.

### 4.2 Tipos de Mudança

| Tipo | Tratamento |
|---|---|
| Aditivo de contrato (ex.: buffet ampliado) | Novo item ou incremento no contrato existente, aprovado formalmente |
| Novo item não previsto | Acréscimo ao orçamento revisado com justificativa |
| Redução de escopo | Crédito no contrato ou exclusão de item |
| Contingência usada | Mover valor da linha de contingência para o item que originou o gasto |

### 4.3 Fluxo de Aprovação

O Procore implementa um fluxo bem documentado:
1. Evento de mudança identificado → status `pendente`
2. Revisão e aprovação pelo gestor → status `aprovado`
3. Atualização do Revised Budget
4. Formalização em contrato (aditivo) → vira Committed Cost

Para eventos, esse fluxo pode ser simplificado mas o princípio de manter o original intacto é inegociável.

Fontes:
- [Procore: Budget](https://support.procore.com/products/online/user-guide/project-level/budget)
- [Monday: Scope Change Management 2026](https://monday.com/blog/project-management/scope-change/)

---

## 5. Contingência e Reserva: Como Orçamentos Profissionais Tratam Imprevistos

### 5.1 Dois Tipos de Reserva (PMI)

O PMI distingue dois tipos de reserva orçamentária:

| Tipo | Controle | Finalidade | Percentual Típico |
|---|---|---|---|
| **Contingency Reserve** | Gerente do projeto | Riscos identificados e quantificados | 3% a 10% do orçamento |
| **Management Reserve** | Patrocinador / diretoria | Imprevistos não identificados (unknowns) | 5% a 10% do orçamento |

- A **Contingency Reserve** faz parte do cost baseline — o gerente pode usá-la sem aprovação superior
- A **Management Reserve** fica fora do baseline — exige aprovação para uso

### 5.2 Percentuais para Eventos

Para eventos, a referência específica é:
- **10% do orçamento total** como contingência mínima (prática do setor de eventos)
- **15% a 20%** para eventos de alto risco ou novos (sem histórico comparável)
- **3% a 5%** para eventos repetitivos e bem conhecidos

### 5.3 Como Registrar no Dashboard

Abordagem recomendada:
```
Contingência = linha separada no orçamento, visível no dashboard
Contingência usada → move para o item específico que gerou o gasto
Contingência disponível = Contingência total − Contingência usada
```

O saldo da contingência deve aparecer no dashboard para o gestor saber quanto de "almofada" ainda tem.

Fontes:
- [DeepRojectManager: Contingency vs Management Reserves](https://deeprojectmanager.com/contingency-reserves-vs-management-reserves/)
- [ProjectManager: Contingency Reserve](https://www.projectmanager.com/blog/contingency-reserve)
- [KnowledgeHut: Reserve Analysis](https://www.knowledgehut.com/blog/project-management/reserve-analysis)
- [Engineerica: Mastering Event Budgeting 2026](https://www.engineerica.com/conferences-and-events/post/event-budgeting/)

---

## 6. Recomendação: Conjunto Mínimo de Colunas e Indicadores

Com base na pesquisa acima, eis o conjunto mínimo recomendado para o dashboard de evento do sistema VendasEventos:

### 6.1 Colunas por Item de Custo

| # | Coluna | Nome Sugerido na UI | Obrigatória | Fórmula / Origem |
|---|---|---|---|---|
| 1 | Orçado Original | `Orçado` | Sim | Estimativa pré-evento, imutável após baseline |
| 2 | Orçado Revisado | `Orçado Revisado` | Sim | `Orçado + Σ aditivos aprovados` |
| 3 | Valor Contratado | `Contratado` | Sim | Valor do contrato assinado / cotação fechada |
| 4 | Valor Pago | `Realizado` | Sim | Soma de pagamentos efetivos |
| 5 | Comprometido Restante | `A Pagar (contratos)` | Derivada | `Contratado − Realizado` |
| 6 | Estimativa Restante | `Estimativa s/ contrato` | Sim (se item não contratado) | Campo manual para itens orçados mas não contratados |
| 7 | Projeção Final | `Projeção Final` | Derivada | `Realizado + A Pagar + Estimativa s/ contrato` |
| 8 | Desvio do Orçado | `Desvio (R$)` | Derivada | `Projeção Final − Orçado Revisado` |
| 9 | Desvio Percentual | `Desvio (%)` | Derivada | `(Projeção Final / Orçado Revisado − 1) × 100` |
| 10 | Contingência | `Contingência` | Sim (linha separada) | % do orçamento (10% como default) |

### 6.2 Indicadores Consolidados no Topo do Dashboard

| Indicador | Fórmula | Interpretação |
|---|---|---|
| **Total Orçado** | `Σ Orçado Revisado` | Baseline atual aprovado |
| **Total Contratado** | `Σ Contratado` | Obrigações legais assumidas |
| **Total Realizado** | `Σ Realizado` | Caixa desembolsado |
| **Projeção Final (EAC)** | `Σ Realizado + Σ A Pagar + Σ Estimativa` | "Quanto vai custar no fim?" |
| **Desvio Total** | `Projeção Final − Total Orçado` | Positivo = estouro; Negativo = economia |
| **Desvio %** | `(EAC / Orçado − 1) × 100` | Percentual de desvio |
| **Comprometimento** | `Contratado / Orçado × 100` | % do orçamento já fechado em contrato |
| **Contingência Disponível** | `Contingência − Contingência Usada` | "Almofada" restante |

### 6.3 Fórmulas Exatas

```
// Projeção Final (EAC) — fórmula central do módulo
EAC = Σ(Realizado_i) + Σ(Contratado_i - Realizado_i) + Σ(Estimativa_nao_contratada_i)
    = Σ(Contratado_i) + Σ(Estimativa_nao_contratada_i)

// Simplificação: para itens sem contrato, Contratado = 0 e usa-se a Estimativa
// Para itens com contrato, a Estimativa se torna 0 (o contrato substituiu a estimativa)

EAC_simplificado = Σ max(Contratado_i, Estimativa_i)  // onde cada item usa o melhor dado disponível

// Desvio
Desvio_R = EAC - Orçado_Revisado
Desvio_% = ((EAC / Orçado_Revisado) - 1) * 100

// Comprometido Restante (A Pagar via contratos)
A_Pagar_i = Contratado_i - Realizado_i   // sempre >= 0

// Contingência Disponível
Contingência_Disponível = Contingência_Total - Contingência_Usada
```

### 6.4 Status por Item (para filtros e cores visuais)

| Status | Condição | Cor Sugerida |
|---|---|---|
| `orçado` | Contratado = 0 e Realizado = 0 | Cinza |
| `contratado` | Contratado > 0 e Realizado < Contratado | Azul |
| `parcialmente_pago` | 0 < Realizado < Contratado | Amarelo |
| `pago` | Realizado >= Contratado | Verde |
| `em_alerta` | Projeção > Orçado Revisado | Vermelho |

---

## 7. Decisões de Design para o Sistema VendasEventos

### 7.1 O Orçamento Original Nunca Muda
Seguindo o padrão do Procore e do PMBOK: o campo `Orçado` é imutável após o evento ser iniciado. Mudanças de escopo são registradas como aditivos que alimentam o `Orçado Revisado`.

### 7.2 Itens Sem Contrato Usam a Estimativa como Projeção
Enquanto não há contrato, `Projeção_i = Estimativa_i`. Quando o contrato é fechado, `Projeção_i = Contratado_i`. O gestor pode ainda ajustar manualmente se souber de extras esperados.

### 7.3 Contingência Como Linha Separada
A contingência não deve ser distribuída nos itens. Ela aparece como linha especial no orçamento, visível no dashboard. Quando usada, é "transferida" para o item que gerou o imprevisto.

### 7.4 EVM Não é Recomendado para Eventos
Dada a ausência de "% físico" mensurável em eventos, as métricas EVM (CPI, SPI, EV) não agregam valor e criariam complexidade desnecessária. A abordagem de **status por item (0/100 ou milestones)** é suficiente e mais compreensível para gestores de eventos.

### 7.5 Desvio Deve Ser Calculado Sempre Contra o Orçado Revisado
O desvio = EAC − Orçado Revisado (não contra o Original). O desvio contra o Original é um dado secundário útil para auditoria ("quanto o escopo cresceu"), mas o indicador primário compara contra o que foi aprovado para o evento como ele está hoje.

---

## 8. Referências Consolidadas

| Fonte | URL |
|---|---|
| Procore: Committed Costs | https://www.procore.com/en-au/library/committed-costs |
| Procore: Budget Forecast Report | https://support.procore.com/faq/how-does-the-budget-forecast-report |
| Procore: Cost Reporting | https://www.procore.com/library/construction-cost-reporting |
| Procore: Budget | https://support.procore.com/products/online/user-guide/project-level/budget |
| Planyard: Cost-to-Complete Forecasting | https://planyard.com/blog/cost-to-complete-forecasting-construction |
| Project Management Academy: EAC Formula | https://projectmanagementacademy.net/resources/blog/forecasting-projects-in-progress-with-eac/ |
| ProjectManager: Calculating EAC | https://www.projectmanager.com/blog/calculating-estimate-at-completion |
| Wrike: EAC in Project Management | https://www.wrike.com/project-management-guide/faq/what-is-eac-in-project-management/ |
| DeepRojectManager: Contingency vs Management Reserves | https://deeprojectmanager.com/contingency-reserves-vs-management-reserves/ |
| ProjectManager: Contingency Reserve | https://www.projectmanager.com/blog/contingency-reserve |
| KnowledgeHut: Reserve Analysis | https://www.knowledgehut.com/blog/project-management/reserve-analysis |
| Monday: Scope Change 2026 | https://monday.com/blog/project-management/scope-change/ |
| Oracle Primavera: Actuals Overview | https://primavera.oraclecloud.com/help/en/user/102185.htm |
| PMI: Earned Value Method | https://www.pmi.org/learning/library/earned-value-method-revenue-calculation-5073 |
| Engineerica: Event Budgeting 2026 | https://www.engineerica.com/conferences-and-events/post/event-budgeting/ |
| ClearEvent: Event Budget Software | https://clearevent.com/features/event-budget/ |
| Planning Pod: Event Budget Planner | https://planningpod.com/budgeting |
| Runrun.it: Orçado x Realizado | https://blog.runrun.it/orcado-x-realizado/ |
