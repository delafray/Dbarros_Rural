# Analogia de Domínio: Orçamento de Obra → Módulo de Custos de Eventos Rurais

> Pesquisa para o módulo de controle de GASTOS de eventos rurais (rodeios, exposições
> agropecuárias) no VendasEventos. Objetivo: entender como a construção civil resolve
> "decompor projeto → cotar fornecedores → acompanhar previsto vs realizado" e definir
> o que transferir (e em que forma simplificada) para eventos.
>
> Data: 01/08/2026 · Camadas do nosso módulo: **orçado × contratado × realizado**

---

## 1. EAP/WBS e Composição de Custos (SINAPI / TCPO)

### 1.1 EAP / WBS (Estrutura Analítica do Projeto)
A **EAP** (em inglês, *Work Breakdown Structure* — WBS) é a decomposição hierárquica do
escopo da obra em entregas cada vez menores e controláveis. O fluxo canônico do orçamento
analítico é:

1. **Definição do escopo** — o que será construído.
2. **EAP** — quebra em etapas → fases → pacotes de trabalho.
3. **Levantamento de quantidades** — quanto de cada serviço (m², m³, un…).
4. **Composição de custos unitários** — para cada serviço, os insumos que o formam.

A hierarquia típica é: **Obra → Etapa (ex.: fundação) → Serviço (ex.: concretagem) →
Insumos (aço, concreto, mão de obra)**.

### 1.2 SINAPI e TCPO (bases de referência de preço)
- **SINAPI** (Caixa + IBGE): base pública, atualizada **mensalmente**, com preços médios
  **regionalizados por estado**. Tem dois grandes grupos:
  - **Insumos** — elemento básico (material, mão de obra por categoria, equipamento),
    cada um com **código único, descrição, unidade de medida e preço médio**.
  - **Composições** — "receita" de um serviço: lista de insumos + **consumo unitário**
    (coeficiente) + produtividade + custo total por unidade executada.
- **TCPO** (editora PINI): tabela de **composições** (a "receita" técnica de cada serviço:
  coeficientes de consumo de material/mão de obra/equipamento e produtividades), **sem**
  trazer preço de mercado — o preço o orçamentista aplica. O diferencial do SINAPI é
  justamente trazer a pesquisa de preços mensal por estado.

### 1.3 Conceito-chave transferível
O que importa é a **estrutura de dados**:
`Projeto → Categorias/Etapas → Itens (com unidade de medida) → preço unitário × quantidade`.
A "composição analítica" (quebrar 1 serviço em N insumos com coeficientes) é o nível de
detalhe mais profundo — e é exatamente o que **não** precisamos em eventos (ver seção 5).

---

## 2. Curva ABC de Insumos (Princípio de Pareto / 80-20)

A **Curva ABC** aplica a Lei de Pareto ao orçamento: **~20% dos itens respondem por ~80%
do custo**. Serve para dizer onde vale gastar energia de gestão e negociação.

Classificação usual (percentuais aproximados, ajustáveis por obra):

| Classe | % dos itens | % do custo | Exemplos (obra) | Tratamento |
|---|---|---|---|---|
| **A** | ~20% | ~80% (às vezes citado ~50%) | aço, concreto, argamassa, estruturas | negociação detalhada, comparar fornecedores, contrato rígido, acompanhamento rigoroso |
| **B** | ~30% | ~15% | itens intermediários | atenção moderada |
| **C** | ~50% | ~5% | acabamentos pontuais, itens auxiliares | controle leve, não justifica esforço analítico |

**Uso prático:** numa obra com 1.000 insumos, foca-se nos ~200 itens da classe A. Para
eles: cotação com múltiplos fornecedores, contratos melhores, controle de entrega.

**Transferência para eventos:** altíssimo valor e **baixo custo de implementação** — é só
ordenar os itens do evento por custo decrescente e marcar A/B/C. Em um rodeio, os itens A
tendem a ser **estrutura (piso/deck, tenda, elétrica) e programação/atrações**; os itens C
são os avulsos baratos. Direciona o esforço de cotação do organizador para o que importa.

---

## 3. Acompanhamento Físico-Financeiro: Previsto × Comprometido × Medido × Pago

A obra acompanha o orçamento em **estágios de compromisso do dinheiro**, não só "gastou/não
gastou". Os estágios (adaptados à nomenclatura de eventos):

| Estágio (obra) | Significado | Equivalente no nosso módulo |
|---|---|---|
| **Previsto / Orçado** | estimativa inicial no orçamento | **Orçado** |
| **Comprometido / Contratado** | valor "travado" ao fechar com fornecedor (pedido/contrato) | **Contratado** |
| **Medido / Realizado** | o que efetivamente foi executado/entregue (avanço físico) | **Realizado** |
| **Pago** | desembolso de caixa efetivo | (pode virar um flag/parcela do Realizado) |

### 3.1 Ferramentas visuais
- **Cronograma físico-financeiro** — cruza etapas × investimento previsto por fase.
- **Curva S** — progresso acumulado no tempo; compara **planejado vs realizado** e revela
  desvios cedo.
- **Análise de Valor Agregado (EVA/GVA)** — índices IDP (prazo) e IDC (custo). *Overkill
  para eventos.*

### 3.2 Relatório de desvio
Compara planejado × executado e destaca **onde estourou**. Padrão prático muito útil:
**semáforo de cores** — ex.: quando o **comprometido excede o orçado** em um limite, a
célula fica **vermelha** na coluna de comparação "Orçado × Comprometido". É simples e
comunica na hora.

**Transferência:** as 3 camadas (orçado/contratado/realizado) já implementam o núcleo do
acompanhamento físico-financeiro. Basta somar as colunas de desvio (contratado − orçado,
realizado − contratado) com semáforo de cor.

---

## 4. Softwares BR de Orçamento de Obra — Telas e Conceitos

| Software | Perfil | Conceitos/telas relevantes |
|---|---|---|
| **Sienge** | ERP robusto (grandes construtoras); licença mensal | gestão de custos, planejamento e controle, **relatório de "Acompanhamento de Apropriações"** (previsto × realizado por item), curva S, cronograma físico-financeiro |
| **OrçaFascio** | 100% online, ágil, cobra por usuário | monta orçamento com **17 bases de composição**, importa Excel, **reajuste automático de preço**, curva ABC, relatórios customizados |
| **90/Compor** | orçamentista clássico desktop | composições SINAPI/TCPO, BDI, curva ABC — foco pesado em orçamento analítico |
| **Vobi** | PMEs, moderno, com IA | integra **orçamento + cronograma + indicadores + fluxo de caixa** na mesma tela; foco em previsto vs realizado e caixa |

**Padrões de tela recorrentes** (que valem inspirar nossa UI):
- Planilha hierárquica: etapa → item, com colunas **qtd × unidade × preço unit. × total**.
- Coluna dupla/tripla **orçado | contratado | realizado** lado a lado + coluna de **desvio**.
- **Curva ABC** como visão/filtro de priorização dos itens.
- Dashboard de **fluxo de caixa** e curva S (o forte da Vobi).

---

## 5. O que NÃO Transferir (evitar overkill)

Conceitos da construção civil que existem por exigência técnica/legal e **não fazem sentido**
num módulo de eventos:

- **Composição analítica de insumos (SINAPI/TCPO)** — quebrar cada serviço em coeficientes
  de material/mão de obra/produtividade. Em eventos, o fornecedor já entrega **preço fechado
  do pacote** (ex.: "tenda 10×20 montada = R$ X"). Não decompomos a tenda em lona + estrutura.
- **BDI** (Benefícios e Despesas Indiretas, 10–20%) — margem/custo indireto embutido pela
  construtora. Nós somos o **comprador** dos serviços, não quem compõe o BDI; o BDI do
  fornecedor já vem no preço que ele cobra.
- **Encargos sociais / desoneração** — cálculo de mão de obra próprio de obra.
- **Medições complexas / avanço físico percentual por serviço** — em obra mede-se "40% da
  alvenaria". Em evento o item é **binário/simples**: contratado e entregue, ou não. Não há
  necessidade de medição percentual granular.
- **Análise de Valor Agregado (EVA, IDP, IDC)** e curva S sofisticada — indicadores de
  gestão de projeto de longa duração; um evento dura dias.
- **Bases de preço regionalizadas mensais (SINAPI)** — o preço vem da cotação real com o
  fornecedor daquele evento, não de tabela pública.

---

## 6. RECOMENDAÇÃO — O que adotar no módulo de eventos e em que forma

### ADOTAR (forma simplificada)

1. **Estrutura EAP simplificada (2 níveis):**
   `Evento → Categoria de gasto → Item`. Categorias = os fornecedores/frentes já citados
   (piso/deck, tenda, elétrica, mobiliário, programação visual, alimentação, hospedagem,
   banheiros químicos, segurança, limpeza) + grupo "**Obrigatórios/Avulsos**" (ART, corpo
   de bombeiros, seguro). **Sem** terceiro nível de "insumos/composição".

2. **Item com poucos campos:** descrição, **categoria**, **fornecedor** (opcional),
   **unidade** (un/diária/verba), **quantidade**, e as **3 camadas de valor**:
   `valor_orcado`, `valor_contratado`, `valor_realizado`. Preço já é fechado (sem coeficientes).

3. **3 estágios de compromisso** (= as 3 camadas), com **coluna de desvio automática**:
   - Desvio de cotação = contratado − orçado
   - Desvio de execução = realizado − contratado
   - **Semáforo de cor** quando o desvio ultrapassa um limite (verde/amarelo/vermelho).

4. **Curva ABC como visão de priorização** — ordenar itens por valor (usar o orçado, ou o
   contratado quando existir) decrescente, marcar A/B/C automaticamente (corte ~80/95%),
   e destacar a classe A para o organizador focar cotação/negociação. **Alto valor, baixo
   custo de código.**

5. **Relatório de desvio + totalizadores** por categoria e do evento inteiro
   (orçado total × contratado total × realizado total + % de desvio). Opcional: mini fluxo
   de caixa por data prevista de pagamento (inspiração Vobi), se o usuário pedir.

### NÃO adotar
Composição analítica de insumos, BDI, encargos sociais, medições percentuais, EVA/IDP/IDC,
bases SINAPI/TCPO regionalizadas. Tudo isso adicionaria complexidade sem retorno para a
realidade de eventos, onde o gasto é um **pacote de preço fechado com fornecedor**.

### Resumo em uma frase
Transferir **a espinha dorsal** do orçamento de obra (decompor → cotar → acompanhar
previsto/comprometido/realizado com desvio) e a **curva ABC**, mas parar **antes** da
composição analítica de insumos e dos índices de engenharia — que são o "peso morto" para
o domínio de eventos.

---

## Fontes

- [Modelo EAP na construção civil — OrçaFascio](https://www.orcafascio.com/papodeengenheiro/modelo-eap-na-construcao-civil)
- [Tabela SINAPI da Caixa: como usar no orçamento — Sienge](https://sienge.com.br/blog/tabela-sinapi-no-orcamento-da-obra/)
- [Orçamento de Obra Detalhado: composição analítica e insumos — Vigha](https://blog.vighapp.com/orcamento-obra-composicao-analitica-base-propria/)
- [TCPO: o que é e como usar no orçamento — Diário de Obra](https://diariodeobras.net/tcpo-o-que-e-e-como-usar-no-orcamento/)
- [Estudo comparativo SINAPI × TCPO — UTFPR (PDF)](https://repositorio.utfpr.edu.br/jspui/bitstream/1/32640/1/comparativosinapitcpoorcamento.pdf)
- [Curva ABC na construção civil — OrçaFascio](https://www.orcafascio.com/papodeengenheiro/curva-abc)
- [O que é a curva ABC e como implementá-la na obra — Mapa da Obra](https://www.mapadaobra.com.br/gestao/o-que-e-a-curva-abc-e-como-implementa-la-na-obra/)
- [Curva ABC na construção civil — Obra Prima](https://blog.obraprima.eng.br/curva-abc-na-construcao-civil/)
- [Acompanhamento de obra: etapas — Sienge](https://sienge.com.br/blog/acompanhamento-de-obra/)
- [Cronograma físico-financeiro de obras — Mais Controle ERP](https://maiscontroleerp.com.br/cronograma-fisico-financeiro-de-obras/)
- [Como gerar o relatório Acompanhamento de Apropriações — Sienge (ajuda)](https://ajuda.sienge.com.br/support/solutions/articles/153000200860-como-gerar-o-relat%C3%B3rio-acompanhamento-de-apropriac%C3%B5es-de-obra-)
- [Orçamento de Obra da Vobi](https://www.vobi.com.br/funcionalidades/orcamento-de-obra)
- [Software para Orçamento de Obras — OrçaFascio](https://www.orcafascio.com/modulos-e-plugins/orcamento-de-obras)
- [BDI na Construção Civil: o que é e como usar — Sienge](https://sienge.com.br/blog/bdi-na-construcao-civil/)
- [O que é BDI e como calcular — TOTVS](https://www.totvs.com/blog/gestao-para-construcao/bdi/)
