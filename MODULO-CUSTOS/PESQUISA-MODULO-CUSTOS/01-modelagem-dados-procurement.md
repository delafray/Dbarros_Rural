# Modelagem de dados para o Módulo de Custos (Procurement) — VendasEventos

> Pesquisa de referência sobre como ERPs e sistemas de compras/procurement modelam o
> ciclo **requisição → RFQ → cotações de múltiplos fornecedores → pedido/contrato → recebimento/pagamento**,
> com recomendação de um modelo enxuto adaptado ao nosso caso (controle de gastos de
> evento em 3 camadas: **orçado × contratado × realizado**).
>
> Data: 01/08/2026 · Contexto: React + TypeScript + Vite + Supabase.

---

## 1. O ciclo canônico em ERPs / sistemas de procurement

Praticamente todos os grandes sistemas (SAP, Oracle Procurement, Microsoft Dynamics 365
Supply Chain, Infor LN, Odoo, ERPNext) modelam a mesma espinha dorsal, com nomes diferentes:

```
Requisição (PR)  →  RFQ / Sourcing  →  Cotações dos fornecedores  →  Pedido de Compra (PO) / Contrato  →  Fatura / Recebimento (3-way match)
   necessidade        pedido de           respostas de preço            compromisso firmado                 custo realizado
   (o que falta)      cotação             (1 por fornecedor)            (committed cost)                    (actual cost)
```

- **Purchase Requisition (PR):** documento interno que lista *o que* é necessário
  (quantidade, descrição, data). No Dynamics as tabelas são `PurchReqTable` (cabeçalho) e
  `PurchReqLine` (linhas). Uma RFQ pode nascer de uma requisição, de ordens planejadas ou
  de entrada manual.
- **RFQ (Request for Quotation):** documento enviado a **um ou mais fornecedores** pedindo
  preço/prazo. É o "caso base" a partir do qual se emite a cotação para cada vendor.
- **Cotação do fornecedor (Supplier Quotation / Quote):** a resposta de preço de **um**
  fornecedor. É comparada contra a RFQ; a melhor pode ser convertida em PO.
- **Purchase Order (PO) / Contrato:** o compromisso firmado — é o que gera o **committed cost**.
- **Fatura / Recebimento:** registro do que foi entregue e pago, conciliado com o PO e o
  recebimento no **3-way match** (pedido × recebimento × fatura).

Fontes: [Microsoft Dynamics 365 — RFQ overview](https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/request-quotations),
[Microsoft Dynamics 365 — Requisition uses RFQ](https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/tasks/create-requisition-uses-rfq),
[Oracle — Overview of Sourcing, RFQs and Quotations](https://docs.oracle.com/cd/E18727_01/doc.121/e13410/T446883T443954.htm),
[Ramp — Guide to Procurement Documents](https://ramp.com/blog/procurement-documents),
[KAISPE — Purchase Orders Data Model](https://www.kaispe.com/purchase-orders-technical-illustration-of-data-model/).

---

## 2. Entidades e relacionamentos típicos

Consolidando os modelos de referência, o conjunto de entidades recorrente é:

| Entidade | Papel | Chaves / relações típicas |
|---|---|---|
| **Requisition** (cabeçalho) | agrupa a necessidade | 1—N com Requisition Line |
| **Requisition Line** | 1 item necessário (qtd, descrição, unidade) | FK requisition_id, FK product/item |
| **RFQ** (cabeçalho) | pedido de cotação | N—N com fornecedores (via child table) |
| **RFQ Line / RFQ Item** | item pedido na RFQ | FK rfq_id, (opcional) FK requisition_line |
| **Quote / Supplier Quotation** (cabeçalho) | resposta de **1** fornecedor à RFQ | FK rfq_id, FK supplier_id |
| **Quote Line** | preço de **1** item por **1** fornecedor | FK quote_id, FK rfq_line/item |
| **PO / Contract** (cabeçalho) | compromisso firmado | FK supplier_id, (opcional) FK quote_id |
| **PO Line** | item contratado (qtd, preço) | FK po_id |
| **Invoice / Bill** + matching | custo realizado | FK po_id, 3-way match |

### Como cada ERP concretiza isso

**Odoo (módulo `purchase`)** — deliberadamente enxuto:
- `purchase.order` é **o mesmo modelo** para RFQ *e* PO confirmado; o campo `state`
  distingue: `draft` (RFQ) → `sent` → `to approve` → `purchase` (confirmado) → `done`
  → `cancel`. Campos-chave: `name`, `partner_id` (Many2one → `res.partner`, o fornecedor),
  `date_order`, `amount_total`, `invoice_status`.
- `purchase.order.line` (One2many a partir de `order_line`): produto, quantidade, preço, imposto.
- `invoice_ids` (One2many → `account.move`) liga às faturas do fornecedor; `picking_ids`
  (One2many → `stock.picking`) liga aos recebimentos.
- `purchase.requisition` (add-on) representa a necessidade agregada: tem `purchase_ids`
  (One2many → `purchase.order` via `requisition_id`) e `line_ids` (→ `purchase.requisition.line`).
  A linha da requisição carrega quantidade e data do material.

Fontes: [Dasolo — Odoo purchase.order model guide](https://www.dasolo.ai/blog/odoo-data-api-5/odoo-purchase-order-model-guide-165),
[Odoo 19 — RFQ docs](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/purchase/manage_deals/rfq.html),
[Odoo `purchase_requisition.py` (código)](https://github.com/maestrano/odoo/blob/master/addons/purchase_requisition/purchase_requisition.py).

**ERPNext (módulo `buying`)** — separa RFQ e cotação em doctypes distintos:
- `Request for Quotation` tem uma **child table de fornecedores** ("Suppliers") — é assim
  que **uma RFQ vai para N fornecedores** — e uma child table de itens (com UOM, qtd, depósito).
- Ao submeter a RFQ, o sistema cria uma `Supplier Quotation` (em rascunho) **por fornecedor**.
  Quando todos os itens da RFQ foram cotados por um fornecedor, o status vira "Received".
- A melhor cotação é convertida em `Purchase Order` "com um clique".

Fontes: [ERPNext — Request for Quotation](https://docs.frappe.io/erpnext/v13/user/manual/en/buying/request-for-quotation),
[ERPNext — Supplier Quotation](https://docs.erpnext.com/docs/v13/user/manual/en/buying/supplier-quotation),
[frappe/erpnext — request_for_quotation.py (código)](https://github.com/frappe/erpnext/blob/develop/erpnext/buying/doctype/request_for_quotation/request_for_quotation.py).

**Observação-chave dos dois modelos:** o par **(item, fornecedor)** é sempre uma linha
separada — em Odoo é uma `purchase.order.line` dentro de uma RFQ por fornecedor; em ERPNext
é uma linha da `Supplier Quotation`. É essa granularidade que permite comparar preços item
a item entre fornecedores.

---

## 3. Mesmo item cotado por vários fornecedores e seleção parcial (split award)

O caso "o mesmo conjunto de itens vai inteiro para 1 fornecedor OU fatiado entre vários" é
exatamente o **split award / partial award**, tratado nativamente por Oracle Sourcing, SAP e
PeopleSoft:

- A cotação é avaliada **no nível da linha (item)**. Cada fornecedor responde por linha, e o
  comprador **premia (award) cada linha ao fornecedor escolhido**. Fornecedor A pode levar
  parte dos itens e B outra parte.
- Também há **split dentro da mesma linha por quantidade**: ex., 100 monitores — A vende 75 a
  R$300, B vende 60 a R$250; você premia 60 a B e os 40 restantes a A. Se um fornecedor só
  cotou parte da quantidade, ele é premiado só pelo que cotou, e o restante fica "não premiado".
- Consequência de modelagem: a decisão de compra ("quem leva o quê") **não** é um atributo da
  cotação; é uma entidade/atributo próprio — uma **seleção/award por linha** (às vezes por
  fração de quantidade). É o que permite comparar cenários e depois materializar um ou mais POs.

Fontes: [Oracle — How You Award Negotiations](https://docs.oracle.com/en/cloud/saas/procurement/26b/oaprc/how-you-award-negotiations.html),
[Oracle Sourcing User Guide (split line)](https://docs.oracle.com/cd/E26401_01/doc.122/e48968/T435340T443517.htm),
[Oracle — Awarding RFQs to Suppliers (PeopleSoft)](https://docs.oracle.com/cd/E41948_01/fscm92pbh1/eng/fscm/spog/task_AwardingRFQsToSupplier.html),
[PurchaserAI — Multi-Lot RFQs / split awards](https://purchaser.ai/blog/multi-lot-rfqs-in-utility-projects-where-complexity-multiplies).

---

## 4. Preservar o baseline orçado quando cotações/contratos mudam

Vem do controle de custos de construção (Procore, Mastt) — o padrão de **três colunas**:

- **Budget baseline (orçado):** o orçamento aprovado no início; é um *snapshot* de referência.
  **Nunca é sobrescrito.**
- **Committed cost (contratado):** valor amarrado a contratos/POs assinados **+ change orders
  aprovadas**. As mudanças são **registradas em coluna/linha separada**, somando ao baseline —
  não substituindo. Assim `committed = baseline original + change orders + POs`.
- **Actual cost (realizado):** o que já foi faturado/pago (dinheiro que saiu).

Regra de ouro: se o **committed** já ultrapassa o **orçado**, o estouro existe *antes* mesmo de
a fatura chegar — por isso monitoram commit e actual em paralelo. Para o *nosso* módulo, a
lição direta é: **guardar o valor orçado como campo imutável na linha de necessidade** (ou uma
tabela de baseline versionada), e nunca recalcular esse número a partir das cotações/contratos.
Contratado e realizado são camadas *derivadas/adicionais*, não edições do orçado.

Fontes: [Mastt — Tracking Committed Costs](https://www.mastt.com/blogs/tracking-committed-costs),
[Mastt — Cost Baseline 101](https://www.mastt.com/blogs/cost-baseline),
[Procore — Construction Cost Reporting](https://www.procore.com/library/construction-cost-reporting).

---

## 5. Modelos open-source vale olhar

- **Odoo `purchase` / `purchase_requisition`** — bom por ser enxuto (reusa 1 modelo para RFQ e
  PO). Referência de código:
  [github.com/maestrano/odoo — purchase_requisition.py](https://github.com/maestrano/odoo/blob/master/addons/purchase_requisition/purchase_requisition.py).
- **ERPNext `buying`** (RFQ / Supplier Quotation / Purchase Order) — bom por separar
  explicitamente a child table de fornecedores na RFQ e a cotação por fornecedor. Código:
  [frappe/erpnext — request_for_quotation.py](https://github.com/frappe/erpnext/blob/develop/erpnext/buying/doctype/request_for_quotation/request_for_quotation.py).

---

## 6. RECOMENDAÇÃO — modelo enxuto (7 tabelas) para o nosso caso

Adaptação ao VendasEventos, mantendo a linguagem do gestor (não "requisição/PO", mas
"necessidade / pedido de orçamento / cotação / contrato"). Todas as tabelas devem ter
`evento_id` (o custo é sempre de um evento) e RLS por evento/organização.

```
evento (já existe)
  │
  ├──1:N──▶ item_necessidade        (a camada ORÇADO)
  │           id, evento_id, grupo, descricao, especificacao,
  │           quantidade, unidade,
  │           valor_orcado_unit, valor_orcado_total,   ← baseline IMUTÁVEL
  │           avulso (bool)          ← ART, bombeiros, seguro: true e não agrupa
  │
  ├──1:N──▶ pedido_orcamento         (o "RFQ": um agrupamento livre de itens p/ cotar)
  │           id, evento_id, nome, status (aberto/cotando/decidido)
  │
  │        pedido_item               (N:N item_necessidade × pedido_orcamento — permite
  │           id, pedido_id, item_necessidade_id, quantidade   fatiar/reusar o mesmo item)
  │
  ├──1:N──▶ cotacao                  (resposta de UM fornecedor a UM pedido_orcamento)
  │           id, pedido_id, fornecedor_id, data, observacao, status
  │
  │        cotacao_linha             (preço de UM item nessa cotação — base da comparação)
  │           id, cotacao_id, pedido_item_id, preco_unit, preco_total, prazo
  │
  └──1:N──▶ contrato                 (a camada CONTRATADO — o "award/PO"; committed cost)
              id, evento_id, fornecedor_id, cotacao_id (nullable), valor_contratado, status

           contrato_linha            (item contratado + o SPLIT AWARD por linha/quantidade)
              id, contrato_id, item_necessidade_id, cotacao_linha_id (nullable),
              quantidade, valor_unit, valor_total

           pagamento                 (a camada REALIZADO — actual cost)
              id, contrato_id, data, valor_pago, forma, comprovante_url, status
```

### As 7 tabelas
1. `item_necessidade` — a lista de necessidades **e** o baseline orçado (imutável).
2. `pedido_orcamento` — agrupamento livre de itens para pedir cotação (o "RFQ").
3. `pedido_item` — **junção N:N** item↔pedido; é o que permite mandar o conjunto inteiro a
   1 fornecedor ou fatiá-lo entre vários, e comparar cenários.
4. `cotacao` — cabeçalho da resposta de 1 fornecedor.
5. `cotacao_linha` — preço por item por fornecedor (granularidade da comparação).
6. `contrato` — o compromisso firmado (contratado / committed).
7. `contrato_linha` — item contratado; onde mora o **split award** (parte para A, parte para B).

`pagamento` (realizado) é a 8ª — pode entrar já ou numa 2ª fase; se quiser ficar em 7, um
campo `valor_realizado` + `data_pagamento` em `contrato_linha` resolve a versão mínima.

### Como o modelo cobre cada requisito
- **3 camadas orçado × contratado × realizado:** `valor_orcado_*` em `item_necessidade`
  (nunca sobrescrito) × soma de `contrato_linha` × soma de `pagamento`. Comparação por item
  ou por grupo é um `GROUP BY grupo`.
- **Agrupar livremente / mesmo conjunto para 1 ou N fornecedores / comparar cenários:** a
  junção `pedido_item` desacopla item de pedido; várias `cotacao` sob o mesmo `pedido_orcamento`
  são os cenários a comparar.
- **Split award (A leva parte, B leva outra):** cada `contrato_linha` aponta para um
  `item_necessidade` e opcionalmente para a `cotacao_linha` vencedora; itens diferentes (ou
  quantidades diferentes) podem ir para contratos de fornecedores diferentes.
- **Itens avulsos (ART, bombeiros, seguro):** flag `avulso` em `item_necessidade`; podem ir
  direto para um `contrato` sem passar por `pedido_orcamento`/`cotacao` (FKs nullable já
  previstas).

### Simplificações que fizemos (e por quê)
- **RFQ e PO NÃO são o mesmo registro** (ao contrário do Odoo): aqui `pedido_orcamento`
  (cotar) e `contrato` (fechar) são tabelas distintas, porque o gestor pensa nesses dois
  momentos de forma separada e queremos preservar o histórico de cotações mesmo depois de
  contratar.
- **Sem catálogo de produto:** o item é texto livre (descrição + especificação + grupo),
  espelhando a planilha Excel — não há `product_id`, evitando cadastro prévio.
- **Sem 3-way match / recebimento formal:** eventos não têm almoxarifado; "realizado" =
  pagamento. Dropamos `stock.picking`/recebimento.
- **Sem impostos/moeda/aprovação multinível:** fora do escopo (organizadora pequena, BRL,
  1 nível de decisão). Fáceis de adicionar depois como colunas.
- **Change orders → não viram tabela:** o baseline fica imutável em `item_necessidade`; a
  variação aparece naturalmente na diferença entre orçado e contratado, sem entidade extra.

---

## Fontes (URLs)
- Microsoft Dynamics 365 — RFQs overview: https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/request-quotations
- Microsoft Dynamics 365 — Requisition que usa RFQ (PurchReqTable/PurchReqLine): https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/tasks/create-requisition-uses-rfq
- Oracle — Overview of Sourcing, RFQs, and Quotations: https://docs.oracle.com/cd/E18727_01/doc.121/e13410/T446883T443954.htm
- Oracle — How You Award Negotiations (split award): https://docs.oracle.com/en/cloud/saas/procurement/26b/oaprc/how-you-award-negotiations.html
- Oracle Sourcing User Guide (split de linha): https://docs.oracle.com/cd/E26401_01/doc.122/e48968/T435340T443517.htm
- Oracle/PeopleSoft — Awarding RFQs to Suppliers: https://docs.oracle.com/cd/E41948_01/fscm92pbh1/eng/fscm/spog/task_AwardingRFQsToSupplier.html
- PurchaserAI — Multi-Lot RFQs / split awards: https://purchaser.ai/blog/multi-lot-rfqs-in-utility-projects-where-complexity-multiplies
- KAISPE — Purchase Orders Data Model: https://www.kaispe.com/purchase-orders-technical-illustration-of-data-model/
- Ramp — Guide to Procurement Documents: https://ramp.com/blog/procurement-documents
- Dasolo — Odoo purchase.order model guide: https://www.dasolo.ai/blog/odoo-data-api-5/odoo-purchase-order-model-guide-165
- Odoo 19 — RFQ docs: https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/purchase/manage_deals/rfq.html
- Odoo purchase_requisition.py (código): https://github.com/maestrano/odoo/blob/master/addons/purchase_requisition/purchase_requisition.py
- ERPNext — Request for Quotation: https://docs.frappe.io/erpnext/v13/user/manual/en/buying/request-for-quotation
- ERPNext — Supplier Quotation: https://docs.erpnext.com/docs/v13/user/manual/en/buying/supplier-quotation
- frappe/erpnext — request_for_quotation.py (código): https://github.com/frappe/erpnext/blob/develop/erpnext/buying/doctype/request_for_quotation/request_for_quotation.py
- Mastt — Tracking Committed Costs: https://www.mastt.com/blogs/tracking-committed-costs
- Mastt — Cost Baseline 101: https://www.mastt.com/blogs/cost-baseline
- Procore — Construction Cost Reporting: https://www.procore.com/library/construction-cost-reporting
