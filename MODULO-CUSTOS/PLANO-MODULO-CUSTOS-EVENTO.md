# PLANO — Módulo de Custos do Evento (Orçado × Contratado × Realizado)

> **Status: AGUARDANDO APROVAÇÃO DO USUÁRIO — nada implementado ainda.**
> Elaborado em 01/08/2026 pelo Fable, consolidando 20 relatórios de pesquisa
> em `PESQUISA-MODULO-CUSTOS/` (01–20). Segue `PADRAO-NOVOS-SISTEMAS.md`:
> teste + RLS desde o primeiro commit, commits pequenos e reversíveis.

---

## 1. O que o módulo é

Controle **puramente de gastos** de um evento rural, em três camadas:

| Camada | O que é | De onde vem |
|---|---|---|
| **Orçado** | estimativa planejada antes de cotar | gestor lança na grade |
| **Contratado** | cotações fechadas / contratos assinados | vencedores do mapa de cotação |
| **Realizado** | efetivamente pago | lançamentos de pagamento |

Mais a **Projeção Final** (relatório 10):
`Projeção = Σ contratado + Σ estimativa dos itens ainda não contratados`
com **Desvio R$ / Desvio %** contra o orçado, por categoria e total, com semáforo
(verde/amarelo ≥80%/vermelho ≥100% — relatórios 03 e 13).

Fluxo completo:
**itens de necessidade** (300m² piso, tenda 10x30, 40 mesas…) → **agrupar
livremente em pedidos de orçamento** (tudo com 1 fornecedor OU fatiado) →
**registrar cotações** → **mapa de comparação item × fornecedor** → **contratar
(split award por linha)** → **lançar pagamentos** → dashboard de desvio.

Itens **avulsos** (bombeiros, alvará, ECAD, GTA) não entram em pedido de
orçamento: são providências diretas com órgãos, com **prazo de antecedência**
que vira alerta (relatório 06). *(Atualização 01/08: a ART foi reclassificada
pelo usuário — TEM fornecedor (1–2 engenheiros) e é cotável via planilha
bloqueada; seguro também se cota com corretoras. Ver RF-004/RF-029.)*

---

## 2. Decisões de produto (fundamentadas na pesquisa)

### 2.1 UX — "planilha com superpoderes" (relatórios 02, 08, 09, 17, 20)
1. ~~Grade própria em HTML controlado, padrão `TempPlanilha.tsx`~~
   **SUPERSEDIDO em 01/08/2026 (decisão do usuário — RF-031): a grade de itens
   será o PORT do módulo de descritivo do Prosperitas** (`ProjetoDescritivoTab`
   + `ProdutoAutocomplete` + cálculos puros testados), adaptado para
   Vite/React, services deste repo, RLS e categorias rurais. Os hooks de
   clipboard/teclado continuam sendo construídos por cima do port.
2. **Digitou-salvou** — sem botão Salvar. Tab/Enter/setas navegam. Undo confiável.
3. **Aceitar entrada suja, sinalizar depois** — nunca bloquear o Enter.
   Obrigatório só descrição + um valor; categoria pode vir depois (rel. 02).
4. **Colar do Excel**: `text/plain` TSV parseado com **Papa Parse**
   (`delimiter: '\t'`) — resolve a armadilha de newline dentro de célula
   (a cicatriz do URGENTE-COLAR-TABELA-IA). Fluxo: colar → preview →
   mapear colunas → confirmar (rel. 09 e 20). Números BR (`R$ 1.234,56`)
   convertidos no parse. HTML do clipboard só para detectar merges, sanitizado
   com DOMPurify se um dia for usado.
5. **Nomes de coluna que o povo de planilha já conhece** (rel. 17):
   Descrição, Categoria, Qtd, Unid, Valor Unit., Orçado, Contratado,
   Realizado, Diferença, Fornecedor, Status, Obs.
6. **Taxonomia pré-populada de evento rural** (rel. 07): ~10 categorias
   (Arena/Estruturas, Elétrica/Energia, Som/Luz/Telão, Companhia de rodeio,
   Pessoal especializado, Peões/Competidores, Animais, Apoio/Sanitário,
   Hospedagem/Transporte, Taxas/Legais) com itens típicos e unidades
   (m², m linear, kVA×diária, und×diária, km). Usuário pode ignorar tudo
   e digitar livre.
7. **Curva ABC** (rel. 03): marcar automaticamente os itens A (80% do custo)
   para priorizar cotação. Custo de implementação ínfimo, valor alto.

### 2.2 Mapa de cotação (rel. 05)
- Matriz **item × fornecedor**, menor preço por item destacado.
- Fornecedor que não cotou tudo: célula "—" + badge "cotou 5/8 itens".
- **Split award por linha** (dropdown de vencedor por item, pré-selecionado
  no menor preço) + atalho "fechar tudo com fornecedor X".
- Rodapé fixo com total do cenário em tempo real e a sugestão
  "menor por item daria R$ X" (sugestão, não imposição).
- Condições além do preço (frete, prazo, validade) em linha própria da matriz.

### 2.3 Controle sem burocracia (rel. 13)
- Ciclo de vida com **4 estados**: Rascunho → Cotado → Contratado → Pago.
- **Sem aprovação bloqueante** (empresa pequena, dono presente): controle por
  **visibilidade** — feed narrativo ("Fulano contratou Tenda com X por R$ Y")
  + alertas de 80%/100% do orçado da categoria.
- Auditoria técnica por trigger (seção 3), invisível ao usuário.

### 2.4 Obrigações legais viram checklist com prazos (rel. 06, 19)
Ao criar o plano de custos de um evento, gerar automaticamente os itens avulsos
com prazo-alerta retroativo da data do evento:
| Item | Antecedência | Custo típico |
|---|---|---|
| AVCB/PTOT Bombeiros | 60 dias | R$ 500–3.000 |
| ART estruturas (CREA) | 30–60 dias | taxa R$ 100–300 + honorários R$ 1.900–5.000 |
| Alvará prefeitura | 15–40 dias | variável |
| Seguro Lei 10.519/2002 (peões, juízes, locutores — R$ 100k/pessoa) | antes do evento | R$ 500–1.000+ |
| Comunicação à defesa agropecuária + veterinário RT | 30 dias | — |
| GTA / cadastro de recinto | 15–30 dias | por animal |
| ECAD | antes | ~5% da bilheteria |

### 2.5 Sugestões por público (rel. 18)
Informado o público esperado, sugerir quantidades: banheiros (1/50, +5% PCD),
ambulância (1 até 5k, 2 até 15k), brigadistas (norma estadual), gerador (kVA
por porte, +20% margem). Sugestão preenche a grade — o usuário edita.

### 2.6 Fornecedores (rel. 11)
Cadastro mínimo (razão social, CNPJ com autopreenchimento, contato/WhatsApp,
cidade), **N:N com categorias**, histórico automático de preços por item
("ano passado a tenda 10x30 custou X" no momento da cotação), avaliação
pós-evento opcional (4 notas 1–5 + "contrataria de novo?").

---

## 3. Modelo de dados (rel. 01, 12)

Prefixo `custos_`. Vínculo com **`eventos_edicoes`** (custo é por edição do
evento — confirmar com o usuário). 9 tabelas:

```
fornecedores            id, razao_social, cnpj, contato, telefone, cidade, ativo, obs
fornecedor_categorias   fornecedor_id ↔ categoria (N:N)
custos_categorias       id, nome, ordem (pré-populada, editável pelo admin)

custos_itens            id, edicao_id → eventos_edicoes, categoria_id?, descricao,
                        quantidade, unidade, especificacao, avulso bool,
                        valor_orcado_unit NUMERIC(12,2),          -- editável até congelar
                        baseline_orcado_unit, baseline_qtd,       -- IMUTÁVEIS (trigger congela
                        baseline_congelado_em,                    --  na 1ª vez; nunca sobrescreve)
                        prazo_limite date?,                       -- p/ avulsos legais
                        status (rascunho|cotado|contratado|pago), ordem

custos_pedidos          id, edicao_id, nome, status, criado_por     -- o "pedido de orçamento" (RFQ)
custos_pedido_itens     pedido_id ↔ item_id (N:N — permite agrupar/fatiar/remontar)

custos_cotacoes         id, pedido_id, fornecedor_id, frete, prazo_entrega,
                        validade, cond_pagamento, obs
custos_cotacao_itens    id, cotacao_id, item_id, valor_unit NUMERIC(12,2),
                        vencedor bool          -- split award: vencedor por LINHA
                        contratado_em, contratado_por   -- quando vencedor vira contrato

custos_pagamentos       id, item_id, valor NUMERIC(12,2), data, forma, obs, criado_por
```

Decisões de schema (rel. 12):
- **`NUMERIC(12,2)` + `CHECK (valor >= 0)`** em todo dinheiro (não centavos-int:
  o client devolve string de qualquer jeito). Totais de linha como
  `GENERATED ALWAYS AS (quantidade * valor_unit) STORED` onde couber.
- **Baseline imutável por trigger**: congela `baseline_*` na primeira transição
  para "cotado"; trigger rejeita UPDATE em baseline já congelado. O orçado
  original NUNCA muda (rel. 01, 10); revisão futura, se precisar, é aditivo.
- **RLS desde a migration 1**: policies separadas por operação; papel via
  função `SECURITY DEFINER` cacheada; `(select auth.uid())` (não `auth.uid()`
  nu); **visitante: zero policies de escrita** (padrão já vigente no sistema).
  Escrita: admin + gestores; leitura: qualquer autenticado não-visitante
  (confirmar se vendedor deve ver custos — default: não vê).
- **Auditoria**: trigger genérico gravando em `custos_audit`
  (dados_antes/depois JSONB, campos_mudados, usuario) — alimenta também o
  feed narrativo da UI.

Realizado = pagamentos (sem recebimento/3-way match — evento não tem
almoxarifado; rel. 01). Contrato = linhas vencedoras da cotação (sem entidade
contrato separada na v1 — menos tabelas, mesmo poder).

---

## 4. Arquitetura frontend (padrão do sistema)

Páginas orquestradoras; lógica em `hooks/`; visual em `components/custos/`;
**páginas não importam supabase** — tudo via `services/custosService.ts` (+
`fornecedoresService.ts`). Rotas novas: `pages/CustosEvento.tsx` (grade +
dashboard do evento) e `pages/Fornecedores.tsx`.

Hooks previstos: `useCustosData`, `useCustosGrid` (edição/teclado),
`useClipboardPaste` (Papa Parse, genérico — pode até curar o problema do
cardápio depois), `useMapaCotacao`, `useCustosDashboard`.

Cálculos financeiros em `utils/custosCalc.ts` — **funções puras testadas**
(espelho do `orcamento-calc.ts` do Prosperitas): totais, projeção final,
desvios, curva ABC, parse de número BR.

---

## 5. Fases de construção (cada uma = branch única, commits pequenos, teste + RLS)

Branch: `feature-modulo-custos`.

| Fase | Entrega | Teste que sai junto |
|---|---|---|
| **0** | Migration completa (9 tabelas + RLS + triggers baseline/audit) + `database.types.ts` + seed de categorias | testes de RLS (visitante não escreve; vendedor não lê) via service |
| **1** | `fornecedoresService` + página Fornecedores (CRUD simples, N:N categorias, busca CNPJ) | service testado |
| **2** | Grade de itens: `custosService` + `CustosEvento.tsx` com edição inline, Tab/Enter, digitou-salvou, categorias, curva ABC | `custosCalc` + hook de edição |
| **3** | Colar do Excel: `useClipboardPaste` + preview/mapeamento de colunas + números BR | parser coberto de testes (inclui newline em célula) |
| **4** | Pedidos de orçamento: selecionar itens → agrupar → registrar cotações por fornecedor | service + regras de agrupamento |
| **5** | Mapa de cotação item × fornecedor + split award + "fechar tudo com X" → contratado | cálculo de cenários testado |
| **6** | Realizado (pagamentos) + dashboard Orçado × Contratado × Realizado × Projeção × Desvio com semáforo | fórmulas de projeção/desvio |
| **7** | Itens avulsos legais auto-gerados com prazos + alertas + sugestões por público | geração de checklist testada |
| **8** | Feed de atividade (da audit), avaliação de fornecedor, histórico de preços na cotação | — |

Cada fase termina com commit verificado e funcional isoladamente — o usuário
pode testar e mandar parar/ajustar em qualquer ponto (Fases 0–2 já entregam
valor: a "planilha estruturada" sozinha já substitui o Excel).

---

## 6. Perguntas em aberto

> **Movidas para a documentação viva**: `DOC-MODULO-CUSTOS/04-PERGUNTAS-E-DECISOES.md`
> (fonte única — perguntas Q-001 em diante, com log de decisões).
>
> Este plano é **subordinado** ao levantamento em `DOC-MODULO-CUSTOS/` e será
> revisado quando a documentação de requisitos fechar. Nenhuma fase começa sem
> autorização explícita do usuário.

---

## 7. Fontes

Relatórios completos com URLs em `PESQUISA-MODULO-CUSTOS/01…20-*.md`.
Destaques: 01 (modelo procurement/split award), 02 (10 princípios UX Excel),
03 (orçamento de obra: o que transferir), 05 (mapa de cotação), 06/19 (legal BR),
07 (taxonomia rural com base em licitações reais), 09 (paste TSV/Papa Parse),
10 (fórmulas projeção/desvio), 12 (schema/RLS), 13 (controle sem burocracia).
Lacuna de mercado confirmada (04, 16): nenhum SaaS BR cobre custos de evento rural.
