# Mapa de Cotação / Quadro Comparativo de Cotações
## Pesquisa: conceito, ferramentas e recomendação de tela para o módulo de gastos

**Data:** 2026-08-01  
**Contexto:** Módulo de controle de gastos de eventos rurais — React + TS + Supabase. Itens de necessidade (piso, tenda, elétrica, mesas etc.) são agrupados em pedidos de orçamento para N fornecedores, com comparação de cenários antes da decisão de compra.

---

## 1. O que é o Mapa de Cotação?

O **mapa de cotação** (também chamado de **quadro comparativo de cotações**, **mapa comparativo de preços** ou **comparativo de propostas**) é o documento/tela central do processo de compras que consolida, em uma única visão, as respostas recebidas de múltiplos fornecedores para o mesmo conjunto de itens, permitindo comparação lado a lado antes da decisão de adjudicação.

É o equivalente a "pegar todas as propostas recebidas e colocar numa mesma tabela".

No setor público brasileiro o uso é regulamentado pela **IN nº 65/2021** (compras federais) e pelo **TCU Súmula 247**, que torna obrigatória a adjudicação por item (não por lote global) em objetos divisíveis, consolidando juridicamente o conceito de split award.

---

## 2. Como a comparação é apresentada visualmente

### 2.1 Estrutura padrão: matriz Item × Fornecedor

Todas as ferramentas pesquisadas convergem para a mesma estrutura fundamental:

```
                 | Fornecedor A  | Fornecedor B  | Fornecedor C  | MELHOR
-----------------+---------------+---------------+---------------+-------
Item 1 – Tenda   | R$ 4.500      | R$ 4.200 ★    | —             | B
Item 2 – Piso    | R$ 3.100 ★    | R$ 3.400      | R$ 3.050 ★    | C
Item 3 – Elétrica| R$ 2.800      | —             | R$ 2.600 ★    | C
Item 4 – Mesas   | R$ 1.200 ★    | R$ 1.350      | R$ 1.180 ★    | C
-----------------+---------------+---------------+---------------+-------
TOTAL PACOTE     | R$ 11.600     | R$ 8.950 (2 it)| R$ 6.830 (3 it)| —
TOTAL SPLIT      |               |               |               | R$ 10.830
```

- **Linhas** = itens de necessidade  
- **Colunas** = fornecedores participantes  
- **Célula** = preço unitário + quantidade + valor total por item  
- **Coluna extra à direita** = fornecedor vencedor por item (após decisão)

**Fontes que confirmam essa estrutura:**
- ERP Senior (F410NQC): *"items in rows and suppliers in columns"*, com campos Qtd. Cotada, Qtd. Aprov. e Preço Cotado por célula ([documentação Senior](https://documentacao.senior.com.br/goup/5.10.4/menu_suprimentos/f410nqc.htm))
- Odoo 18: *"The Compare Order Lines page groups by Product. Each product is displayed in its own nested drop-down list"* ([docs Odoo](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/purchase/manage_deals/calls_for_tenders.html))
- Dynamics 365 Supply Chain: grade comparativa com Quantity, Net Amount e Deviation lado a lado por fornecedor ([Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/tasks/enter-compare-rfq-bids-award-contracts))

### 2.2 Variações de visualização

O **Mercado Eletrônico (ME)** — maior plataforma de e-procurement B2B do Brasil — oferece dois modos complementares:

- **Modo sintético**: comparação horizontal de todos os fornecedores (visão condensada)
- **Modo card**: expansão de cada proposta com detalhamento de impostos e condições

([Blog Mercado Eletrônico](https://blog.mercadoe.com/conheca-o-novo-mapa-comparativo-do-me/))

### 2.3 Destaque visual de menor preço

Todas as ferramentas maduras destacam o menor preço por item com cor (verde / negrito / ★). O ERP Senior usa **vermelho** para coberturas incompletas e **azul** para cobertura total. Planilhas Excel destacam o menor com verde automático via formatação condicional.

---

## 3. Como tratam fornecedor que não cotou todos os itens

### 3.1 O problema

Um fornecedor pode responder apenas parte dos itens — ex.: A cotou tenda + elétrica mas não cotou piso. Isso quebra a comparação de pacote total mas não invalida o fornecedor para os itens que ele cotou.

### 3.2 Abordagens encontradas

**ERP Senior (mais explícito):**
O campo "Quantidade de itens atendidos" mostra `X de Y` por fornecedor. Quando incompleto, exibe em **vermelho**; quando completo, em **azul**. O sistema pergunta: *"Deseja eliminar as cotações sem preço informado?"* — o usuário escolhe se descarta o fornecedor inteiro ou mantém apenas os itens cotados.
([documentação Senior F410NQC](https://documentacao.senior.com.br/goup/5.10.4/menu_suprimentos/f410nqc.htm))

**Odoo 18:**
Produtos não cotados por um fornecedor simplesmente não aparecem na coluna daquele fornecedor. A lacuna é visual (célula vazia ou traço "—"), sem eliminação automática do fornecedor.
([docs Odoo](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/purchase/manage_deals/calls_for_tenders.html))

**Dynamics 365:**
A comparação exibe todos os fornecedores independentemente da cobertura. O comprador marca manualmente quais linhas quer aceitar de cada fornecedor.
([Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/tasks/enter-compare-rfq-bids-award-contracts))

**AuraVMS (plataforma SaaS de procurement):**
Recomenda validar completude ANTES da comparação e solicitar resubmissão quando incompleto: *"Do not compare incomplete quotes to complete ones"*. Para inclusão mesmo assim, exige checklist visual com campos faltantes sinalizados.
([AuraVMS Blog](https://www.auravms.com/blogs/quotation-comparison-procurement-guide-supplier-quotes))

**Equalização de propostas (Sienge/construção civil):**
Checklist pré-comparação: toda proposta deve ter unidade de medida, especificações técnicas, quantidades mínimas, frete, impostos, prazos e validade antes de entrar no mapa. Itens sem preço são considerados "não elegíveis" para aquele fornecedor.
([Sienge Blog](https://sienge.com.br/blog/equalizacao-de-propostas-como-comparar-fornecedores-de-forma-justa/))

### 3.3 Padrão recomendado pela indústria

- Célula sem cotação = exibida como "—" ou campo vazio com cor cinza
- Badge "Cobertura parcial: X/Y itens" na coluna do fornecedor
- Total da coluna só soma os itens cotados (não extrapola)
- O sistema NÃO elimina o fornecedor automaticamente — o gestor decide

---

## 4. Split Award — adjudicação por item a fornecedores diferentes

### 4.1 Definição

Split award (adjudicação dividida) é o ato de comprar itens diferentes de fornecedores diferentes no mesmo processo de cotação. Ex.: tenda com A, piso com C, elétrica com B.

### 4.2 Suporte nas ferramentas

**Odoo 18 — suporte nativo explícito:**
O botão **"Choose"** aparece no final de cada linha de produto individualmente. O usuário escolhe o fornecedor item a item na tela de comparação, não uma escolha global. O sistema gera ordens de compra separadas por fornecedor ao final.
([docs Odoo Call for Tenders](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/purchase/manage_deals/calls_for_tenders.html))

**ERP Senior — suporte via "Qtd. Aprov.":**
O campo "Qtd. Aprov." por linha/fornecedor permite alocação parcial. Ao clicar em "Gerar OC", o sistema cria ordens de compra agrupadas por fornecedor apenas com os itens aprovados daquele fornecedor.
([documentação Senior F410NQC](https://documentacao.senior.com.br/goup/5.10.4/menu_suprimentos/f410nqc.htm))

**Dynamics 365 — suporte via mark + accept:**
O comprador marca checkboxes por linha (não por cabeçalho do fornecedor). Aceitar linhas específicas gera PO parcial. A documentação é explícita: *"you can accept one vendor's bid for some lines of an RFQ and then award other RFQ lines to a different vendor"*.
([Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/tasks/enter-compare-rfq-bids-award-contracts))

**AuraVMS:**
Descreve consolidação estratégica: *"Consolidated 60% of volume to the second bidder while maintaining the incumbent as backup"*. Recomenda visualização de volumes atribuídos por fornecedor com drag-and-drop de itens entre colunas.
([AuraVMS Blog](https://www.auravms.com/blogs/quotation-comparison-procurement-guide-supplier-quotes))

**Compras públicas — obrigatório por lei:**
O TCU Súmula 247 torna a adjudicação por item obrigatória para objetos divisíveis, consolidando juridicamente que o gestor público DEVE fazer split award quando favorável ao erário.

### 4.3 Cálculo automático do cenário ótimo

Nenhuma das ferramentas encontradas calcula automaticamente a combinação ótima (problema de otimização combinatória). O padrão é:
- Destacar automaticamente o **menor preço por item** (cor verde / ★)
- Deixar a decisão final com o gestor (que pode preferir concentrar em 1 fornecedor por praticidade)
- Botão "Recalcular" (Senior) que recalcula totais quando quantidades ou preços mudam

O ERP Senior identifica a melhor cotação por três critérios configuráveis: menor valor presente, menor preço cotado, ou prazo de entrega mais curto — mas não combina todos automaticamente.

---

## 5. Condições além do preço que afetam a comparação

### 5.1 Campos monitorados pelos sistemas pesquisados

| Campo | Senior | Odoo | Dynamics 365 | ME |
|-------|--------|------|------|-----|
| Preço unitário | ✓ | ✓ | ✓ | ✓ |
| Desconto | ✓ | ✓ | ✓ | ✓ |
| Tipo de frete (CIF/FOB) | ✓ | parcial | ✓ | ✓ |
| Valor do frete | ✓ | — | ✓ | ✓ |
| Prazo de entrega | ✓ | ✓ (lead time) | ✓ (Deviation) | ✓ |
| Condição de pagamento | ✓ | — | — | ✓ |
| Moeda | ✓ | ✓ | ✓ | — |
| Validade da cotação | parcial | — | data expiração | — |
| Impostos (IPI, ICMS) | — | — | — | ✓ (modo card) |

### 5.2 Como impactam na comparação

**Frete:** O Sienge/Construcompras destaca que *"o fornecedor mais barato raramente representa o menor custo na prática"* quando o frete é FOB. A equalização correta soma `preço + frete` em um custo total comparável. O Mercado Eletrônico inclui valor do frete nos filtros do mapa e calcula "saving" considerando frete.

**Prazo:** O Dynamics 365 calcula "Deviation" — diferença em dias entre o prazo pedido e o prazo ofertado. O Odoo calcula Expected Arrival com base em lead times pré-configurados por fornecedor.

**Validade da cotação:** O Sienge alerta que cotações com validade curta *"aumentam a pressão por decisões rápidas"*. Nenhuma ferramenta encontrada exibe um countdown de validade proeminente, mas é campo registrado.

**Condição de pagamento:** Afeta o fluxo de caixa mas não é convertido automaticamente em preço equivalente por nenhuma das ferramentas analisadas (AuraVMS recomenda "convert to present value", mas não descreve implementação).

---

## 6. Resumo das Ferramentas Pesquisadas

| Ferramenta | Tipo | Matriz I×F | Cobertura parcial | Split award | Ótimo automático |
|------------|------|------------|-------------------|-------------|------------------|
| ERP Senior | ERP nacional | ✓ | sinaliza em vermelho | ✓ via Qtd.Aprov. | parcial (3 critérios) |
| Odoo 18 | ERP open-source | ✓ | célula vazia | ✓ Choose por linha | destaca menor |
| Dynamics 365 | ERP enterprise | ✓ | não elimina | ✓ mark por linha | rank manual |
| Mercado Eletrônico | e-procurement B2B | ✓ sintético/card | não descrito | não descrito | saving vs. estimativa |
| Planilhas Excel | template | ✓ | célula vazia | manual | destaca verde |
| Compras.gov.br / LICITAWEB | portal público | ✓ | não descrito | obrigatório por lei | não |

---

## 7. Recomendação de Tela para o Módulo de Gastos de Eventos Rurais

### 7.1 Premissas do contexto

- Usuário é gestor rural, **não é profissional de compras**
- Itens heterogêneos (tenda, piso, elétrica, mesas) que podem ser fatiados entre fornecedores
- Decisão precisa ser rápida e compreensível por leigos
- Volume pequeno: tipicamente 5–20 itens, 2–5 fornecedores

### 7.2 Layout recomendado: Matriz Item × Fornecedor com painel de resumo

```
TELA: COMPARATIVO DE COTAÇÕES — Evento "Aniversário da Fazenda 2026"

[Legenda visual: ★ Melhor preço  |  — Não cotado  |  ✓ Selecionado]

ITEM                    | Qtd | Fornecedor A     | Fornecedor B     | Fornecedor C     | SELECIONADO
------------------------|-----|------------------|------------------|------------------|------------
Tenda 10×30             |  1  | R$ 4.500         | R$ 4.200 ★       | —                | [B] ▼
Piso vinílico 300m²     |  1  | R$ 3.100         | R$ 3.400         | R$ 3.050 ★       | [C] ▼
Instalação elétrica     |  1  | R$ 2.800         | —                | R$ 2.600 ★       | [C] ▼
40 mesas + cadeiras     | 40  | R$ 1.200 ★       | R$ 1.350         | R$ 1.180 ★       | [A] ▼

COBERTURA               |     | 4/4 itens ✓      | 2/4 ⚠️ (parcial) | 3/4 ⚠️ (parcial) |
TOTAL SE FECHAR TUDO    |     | R$ 11.600        | R$ 4.200 (2 it)  | R$ 6.830 (3 it)  |
PRAZO DE ENTREGA        |     | 5 dias           | 7 dias           | 3 dias           |
FRETE INCLUÍDO?         |     | CIF ✓            | FOB ⚠️           | CIF ✓            |
VALIDADE COTAÇÃO        |     | 10/08            | 12/08            | 09/08 ⚠️         |
OBSERVAÇÕES             |     | [ver]            | [ver]            | [ver]            |

------- RESUMO DA DECISÃO -------
Itens selecionados: A(1), B(1), C(2)
Total estimado: R$ 11.030
Economia vs. fechar tudo com A: R$ 570 (4,9%)

[Botão] Registrar Decisão    [Botão] Exportar PDF/Planilha
```

### 7.3 Regras de UX para leigos

1. **Destacar o menor preço por item automaticamente** com ★ e cor verde. Não exigir que o gestor "olhe" manualmente.

2. **Células sem cotação = "—" em cinza claro**, nunca célula em branco (confunde com "ainda não preenchido"). Tooltip: *"Este fornecedor não cotou este item"*.

3. **Badge de cobertura parcial na coluna do fornecedor** (ex.: "2 de 4 itens"). Cor neutra (amarelo), não vermelha — não é erro, é informação.

4. **Seleção por item via dropdown** (não checkbox multi-nível). O dropdown lista os fornecedores que cotaram aquele item, não todos. Default = fornecedor com menor preço pré-selecionado.

5. **Painel fixo na base da tela** mostrando: total dos itens já selecionados, economia vs. cenário de pagar tudo pelo mais caro, e fornecedores envolvidos. Atualiza em tempo real ao mudar seleções.

6. **Frete FOB = alerta visual** (ícone ⚠️). Se o usuário não souber o que é FOB, tooltip explica: *"O frete não está incluso neste preço — você paga o transporte separado"*.

7. **Validade próxima = alerta de data**. Quando faltam ≤ 3 dias para expirar, destacar a data em laranja.

8. **Campos de condição em linha extra abaixo dos itens**, não em tela separada. O gestor vê tudo de uma vez, sem navegar.

9. **NÃO exibir "cenário ótimo automático" como decisão**. Exibir como sugestão: *"Se selecionar o menor por item, total seria R$ 11.030"* — mas deixar o gestor confirmar ou alterar. Concentrar num único fornecedor por praticidade é uma decisão legítima.

10. **Botão "Fechar tudo com [fornecedor X]"** — atalho para quando o gestor decide simplificar e comprar tudo de um só. Mostra o custo adicional em relação ao split ótimo.

### 7.4 Fluxo de tela sugerido

```
[1] Tela de Necessidades → gestor lista itens do evento
        ↓
[2] Tela de Pedidos de Orçamento → cria orçamentos e envia (ou registra respostas recebidas)
        ↓
[3] TELA DE COMPARATIVO (esta recomendação) → visualiza, compara, seleciona por item
        ↓
[4] Tela de Confirmação → resumo final com totais por fornecedor + botão gerar pedido/compromisso
```

---

## 8. Fontes e Referências

1. Mercado Eletrônico — Mapa Comparativo de e-Procurement: https://blog.mercadoe.com/conheca-o-novo-mapa-comparativo-do-me/
2. Mercado Eletrônico — versão em inglês: https://blog.mercadoe.com/en/conheca-o-mapa-comparativo-do-mercado-eletronico/
3. ERP Senior — F410NQC Novo Quadro Comparativo de Propostas de Cotações: https://documentacao.senior.com.br/goup/5.10.4/menu_suprimentos/f410nqc.htm
4. ERP Senior — Suporte: alterações no quadro comparativo: https://suporte.senior.com.br/hc/pt-br/articles/4408638413460
5. Odoo 18 — Call for Tenders (RFQ com split award): https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/purchase/manage_deals/calls_for_tenders.html
6. Odoo 18 — Requests for Quotation: https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/purchase/manage_deals/rfq.html
7. Microsoft Dynamics 365 — Enter and compare RFQ bids and award contracts: https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/tasks/enter-compare-rfq-bids-award-contracts
8. Sienge — Equalização de propostas: como comparar fornecedores de forma justa: https://sienge.com.br/blog/equalizacao-de-propostas-como-comparar-fornecedores-de-forma-justa/
9. AuraVMS — Quotation Comparison in Procurement: The Complete Guide: https://www.auravms.com/blogs/quotation-comparison-procurement-guide-supplier-quotes
10. AuraVMS — How to Evaluate RFQ Responses: https://www.auravms.com/blogs/how-to-evaluate-rfq-responses-scoring-supplier-quotes
11. UFRB — Mapa Comparativo de Preços (compras públicas): https://ufrb.edu.br/clc/orientacao-para-aquisicoes/mapa-comparativo-de-precos
12. TCU Súmula 247 — Adjudicação por item em objetos divisíveis: https://jurisprudencia.tc.df.gov.br/wp-content/uploads/2018/07/Objeto-divis%C3%ADvel.-Adjudica%C3%A7%C3%A3o-por-item.-S%C3%BAmula-TCU-247.pdf
13. FAQ Portal Compras Ceará — Mapa de Preços: https://sites.google.com/view/faqportalcompras/mapa-de-pre%C3%A7os
14. Planilha de Cotação de Preços — Smart Planilhas: https://smartplanilhas.com.br/planilha-gratuita/planilha-de-cotacao-de-precos-gratis/
15. Planilha de Cotação Excel Online: https://www.planilhaexcelonline.com.br/products/planilha-cotacao-de-precos-de-produtos-para-compras-excel
16. Planilha Cotação — SEBRAE SP (modelo oficial): https://sebrae.com.br/Sebrae/Portal%20Sebrae/UFs/SP/Transpar%C3%AAncia/Normas%20e%20Manuais/8_Anexo_VIII_Planilha_Cotacao_Precos_para_Compras_Contratacoes.xls
17. RFQ Process Explained (Simfoni): https://simfoni.com/rfq-process/
18. RFI, RFP, RFQ e RFx — Guelcos Internacional: https://guelcos.com.br/conteudo/estudo-de-mercado/rfi-rfp-rfq-rfx-o-que-sao-e-para-o-que-servem-essas-requests/
