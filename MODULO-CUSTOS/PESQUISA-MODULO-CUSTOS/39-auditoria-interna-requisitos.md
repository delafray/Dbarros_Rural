# 39 — Auditoria Interna de Requisitos: Módulo de Custos do Evento

> Elaborado em 01/08/2026. Auditor: Claude Sonnet (modo local, sem internet).
> Fontes analisadas: DOC-MODULO-CUSTOS/00…06 + PLANO-MODULO-CUSTOS-EVENTO.md.
> Método: (1) ciclo de vida pós-contratação; (2) contradições RF×RF, RF×Plano,
> checklist×RF; (3) casos de borda; (4) perguntas bloqueantes; (5) lacunas do
> modelo de 9 tabelas. Achados ordenados por gravidade (CRÍTICO → ALTO → MÉDIO).

---

## ACHADOS CRÍTICOS

### A-01 [CRÍTICO] — Ciclo de vida para depois do "Contratado": sem cancelamento, aditivo nem inadimplência do fornecedor

**Onde aparece:** O plano (seção 3) define 4 estados: Rascunho → Cotado → Contratado → Pago.
Os RFs cobrem criar itens (RF-001), cotar (RF-011), contratar via split award (RF-011/PLANO 2.2) e pagar (RF-008). Após o contrato, o ciclo some.

**O que falta (e nenhum documento menciona):**

| Situação pós-contrato | Impacto no modelo |
|---|---|
| **Cancelamento de contratação** pelo organizador | O `vencedor bool` em `custos_cotacao_itens` vira `false`? O item volta para "cotado"? Sem estado nem trigger definido. |
| **Desistência do fornecedor após contratado** (PC-03 menciona "no-show de artista/multa", mas só como ponto cego sem modelagem) | Quem registra? O item retorna ao mapa de cotação? O 2º classificado é chamado? Nenhum RF cobre. |
| **Aditivo / mudança de escopo após contratado** (ex.: cliente pede mais 50 m² de piso já com a empresa contratada) | O baseline é imutável (RNF-010). O novo valor fica onde? Um novo item? Uma linha de aditivo na cotação? Não modelado. |
| **Item contratado que o fornecedor não entregou** (inadimplência parcial) | Realizado < Contratado. O sistema aceita, mas não há estado "entrega parcial", nem alerta, nem mecanismo de retenção de pagamento. |
| **Encerramento/fechamento formal do evento** | Nenhum estado "encerrado" no evento ou nos itens. O usuário nunca sabe que o custo do evento está "fechado". |

**Por que é crítico:** Um módulo de custos que não modela o que acontece quando algo dá errado após a assinatura é incompleto para o caso de uso principal (eventos de 3 dias com dezenas de fornecedores). O modelo de 9 tabelas não tem campos, estados nem triggers para nenhuma dessas situações.

---

### A-02 [CRÍTICO] — Rateio (RF-033) é matematicamente indefinido para itens sem quantidade comum ou de verba fechada — e Q-021 está aberta bloqueando o modelo de dados

**Onde aparece:** RF-033 define rateio proporcional à quantidade (bar tem 100 m de 1.000 m total → 10% do custo). Q-021 pergunta: "itens sem quantidade comum (verba fechada) entram no rateio como?" — aberta e sem resposta.

**O problema:** Vários itens típicos do evento rural NÃO têm quantidade comum comparável:
- Frete de montagem: cobrado por viagem/caminhão — como ratear entre composto Arena e composto Bar?
- Mobilização do fornecedor: verba fechada de R$ 5.000 para montar tenda — a Arena usa 60% da tenda e o Bar 40%, mas a tenda é uma só.
- Cachê de artista: R$ 100.000 — não tem quantidade, não tem m².
- Honorários de engenheiro: verba fechada.

**Impacto no modelo de dados:** A tabela `custos_cotacao_itens` não tem campos de `criterio_rateio` (proporcional/percentual/manual/não-ratear) nem `percentual_manual`. A coluna calculada `GENERATED ALWAYS AS (quantidade * valor_unit)` pressupõe que toda linha tem quantidade × unitário, o que é falso para verbas fechadas.

**Por que é crítico:** RF-033 e RF-034 (custo base do composto) dependem do rateio. Se o rateio não está definido para verbas, o custo do composto (estande, bar) será sempre errado. Q-021 precisa ser respondida ANTES de projetar o schema da fase 0.

---

### A-03 [CRÍTICO] — RF-032 (compostos) não tem representação no modelo de 9 tabelas — tabela `custos_compostos` inexistente

**Onde aparece:** RF-032/033/034 foram confirmados pelo usuário em 01/08. O modelo de dados do PLANO (seção 3) lista 9 tabelas — nenhuma é `custos_compostos` ou equivalente. A tabela `custos_itens` tem apenas `categoria_id` e `avulso bool`. Não há campo `composto_id`, `percentual_rateio`, nem vínculo item→composto.

**O que falta no schema:**
- Tabela `custos_compostos` (id, edicao_id, nome, descricao, ativo)
- Campo `composto_id FK` em `custos_itens` (ou tabela associativa N:N se um item pode pertencer a mais de um composto — o que ainda não está definido)
- Campo `percentual_rateio NUMERIC(5,4)` ou mecanismo equivalente
- Q-022 (compostos reutilizáveis entre eventos) está aberta — se a resposta for "template", precisa de tabela adicional

**Por que é crítico:** A fase 0 do plano é a migration. Começar a migration sem modelar compostos significa reescrever o schema desde a raiz na fase 4 ou 5, quebrando a premissa de "commits pequenos e reversíveis".

---

### A-04 [CRÍTICO] — Q-001 (edição vs. evento-pai) está aberta e bloqueia a chave primária de TODAS as 9 tabelas

**Onde aparece:** Q-001 diz "define a chave de todas as tabelas" e permanece aberta.

**O problema:** As 9 tabelas usam `edicao_id → eventos_edicoes` como chave de vínculo. Se a resposta for "custo é pelo evento-pai", todas as tabelas precisam de `evento_id → eventos` em vez de `edicao_id`. Não é uma mudança pontual — é a coluna de particionamento de todo o módulo.

**Perguntas derivadas que também ficam bloqueadas:**
- RF-016 (histórico de preços entre eventos): se o vínculo é por edição, comparar entre edições da mesma série de evento é trivial; se for pelo evento-pai, é a mesma coisa — mas comparar com eventos de outro tipo fica diferente.
- RF-030 (sugestão de fornecedores por histórico): o histórico de casamento fornecedor×itens é por edição ou por evento-pai?

**Por que é crítico:** Nenhuma linha de SQL pode ser escrita para a fase 0 enquanto Q-001 não for respondida.

---

### A-05 [CRÍTICO] — Contradiction direta: RF-004 diz "ART não se cota", nota do RF-004 diz "ART tem fornecedor e vira RF-029", mas RF-014/checklist ainda listam ART como "trâmite direto com prazo"

**Onde aparece:**
- RF-004 (texto original): "ART — item avulso que não se agrupa nem se cota".
- Nota no próprio RF-004 (01/08, mesma sessão): "ART tem fornecedor (engenheiro/empresa) e vira item cotável simples via RF-029".
- RF-014: "checklist automático de obrigações legais com prazos — bombeiros, ART, alvará, seguro..."
- Checklist 05 (Bloco 1): lista "ART eng. civil" e "ART eng. eletricista" com prazo-alerta como se fossem trâmite de órgão, igual ao Corpo de Bombeiros.
- PLANO seção 2.4: lista "ART estruturas (CREA)" como item avulso legal com prazo fixo.

**A contradição:**
1. ART é "avulso sem cotação" (RF-004 original + PLANO 2.4 + RF-014 + checklist 05)
2. ART é "item cotável com 1–2 fornecedores via planilha bloqueada" (nota RF-004 + RF-029)

O comportamento do sistema diverge: gera prazo de órgão ou abre pedido de orçamento?

**Por que é crítico:** Implementar RF-021 (item gerado pelo checklist) e RF-029 (cotação via planilha) para a ART produz dois comportamentos incompatíveis no código se a contradição não for resolvida antes.

---

## ACHADOS ALTOS

### A-06 [ALTO] — Ciclo de vida de um pedido de orçamento: nenhum RF define o que acontece com a cotação vencida ou com o item em dois pedidos ao mesmo tempo

**Onde aparece:** RF-002/003 permitem agrupar/desmontar pedidos livremente. A tabela `custos_pedido_itens` é N:N (pedido × item).

**Casos de borda não tratados:**
- **Item em dois pedidos ativos ao mesmo tempo:** Um item de piso está no Pedido A (tenda + piso com Fornecedor 1) e no Pedido B (só piso com Fornecedor 2 para comparar). O sistema permite? Qual pedido "vence"? RF-003 diz que é possível "comparar cenários" mas não define como dois vencedores do mesmo item convivem no mapa de cotação.
- **Cotação com validade vencida:** `custos_cotacoes.validade` existe no schema, mas nenhum RF define o que acontece quando a data vence: alerta? O vencedor some do mapa? O item volta para "cotado"? Nenhum estado de "cotação expirada" está definido.
- **Pedido de orçamento cancelado:** Sem estado "cancelado" em `custos_pedidos`.

**Por que é alto:** RF-036 (modal de seleção de itens por categoria) depende de saber quais itens estão "disponíveis" para agrupamento. Sem regra sobre itens em múltiplos pedidos, a UI não sabe o que mostrar.

---

### A-07 [ALTO] — Relatório final orçado×realizado e comparação ENTRE eventos: mencionados como objetivo central mas sem RF nem modelo

**Onde aparece:**
- Visão (01) diz que "o valor do módulo está na comparação entre as camadas (desvio em R$ e %)".
- RF-013 define "projeção final" (contratado + estimativas).
- RF-016 define "histórico de preços por item/fornecedor entre eventos".
- PLANO seção 1 diz "dashboard de desvio" com semáforo.

**O que falta:**
- Nenhum RF define um **relatório de encerramento** (snapshot imutável do custo final do evento quando ele fecha): "Evento Festa do Boi 2025 custou R$ X, orçado era R$ Y, desvio foi Z%".
- Nenhum RF define **comparação ENTRE eventos** (ex.: "Arena do Boi 2024 vs. 2025 vs. 2026 — o que ficou mais caro?"). RF-016 cobre preço de item/fornecedor, não comparação de custo total de evento.
- O dashboard de desvio (PLANO) é ao vivo (evento em andamento). Um relatório pós-evento é diferente e não está modelado.

**Por que é alto:** Sem relatório final e comparação inter-eventos, o critério de sucesso (memória entre eventos, comparações automáticas) fica incompleto.

---

### A-08 [ALTO] — Composto excluído com itens já contratados: comportamento indefinido

**Onde aparece:** RF-032 define compostos; RF-003 diz "editar/excluir trivial" (RNF-003). O PLANO cita trigger de baseline imutável mas só para `custos_itens`.

**O problema:** Se o gestor exclui o composto "Bar" após os itens de piso do bar já terem sido contratados (e o custo rateado computado), o que acontece?
- Os itens de custo (piso, balcão) são excluídos também? Isso desfaz contratos já assinados.
- Os itens ficam "soltos" sem composto? O rateio fica incoerente.
- Há trigger de proteção? Nenhum RF menciona.

O mesmo vale para "item contratado deletado diretamente da grade": RNF-003 diz "excluir trivial", mas um item contratado tem obrigação financeira real.

**Por que é alto:** A premissa "errar é barato" (filosofia do produto) colide com a irreversibilidade de um contrato. O ponto de corte — a partir de qual estado o item/composto não pode mais ser excluído sem confirmação — não está definido em nenhum RF ou RNF.

---

### A-09 [ALTO] — RF-027/028 (planilha Excel bloqueada para fornecedor): biblioteca não validada e fluxo de retorno não modelado

**Onde aparece:** RNF-011 admite que "a pesquisa cobriu LEITURA de xlsx, não escrita protegida" e pede "validar em spike técnico". RF-028 define importação de volta com CNPJ como chave.

**Lacunas não tratadas em nenhum documento:**
- **Quem envia a planilha ao fornecedor?** RF-008/027 geram o arquivo, mas o envio é por e-mail interno ao sistema (Q-008 ainda aberta sobre envio de pedidos de orçamento), ou o gestor baixa e manda manualmente?
- **Como o fornecedor devolve?** Upload no sistema? Por e-mail do gestor? Nenhum RF define.
- **Planilha corrompida ou modificada pelo fornecedor:** A proteção de Excel é contornável (RNF-011 admite). O que o parser faz com uma planilha onde o fornecedor desbloqueou e alterou os itens? Nenhum RF de validação de importação além do CNPJ.
- **Mesmo fornecedor respondendo cotações de múltiplos pedidos:** O CNPJ como chave deduplicação (RF-028) é para cadastro; na cotação, o mesmo fornecedor pode ter múltiplas linhas em `custos_cotacoes` — sem conflito, mas o fluxo de merge não está descrito.

**Por que é alto:** RF-027 e RF-029 são o diferencial do produto (substituem o PDF manual). Se o fluxo de envio e retorno não for especificado, a fase 1 (fornecedores) e fase 4 (pedidos) não sabem o que construir.

---

### A-10 [ALTO] — Plano técnico desatualizado em 3 pontos materiais além dos já marcados (compostos, rateio, port do Prosperitas)

**Onde aparece:** PLANO (seção 3, 5) foi escrito antes de RF-031…036 e de várias decisões de 01/08.

**Itens desatualizados não marcados no plano:**

| Item do Plano | RF que o contradiz/supera | Status no plano |
|---|---|---|
| "Grade própria em HTML controlado, padrão TempPlanilha.tsx" (seção 2.1 item 1 — tachado no texto) | RF-031: port do Prosperitas | Tachado ✓ (já marcado) |
| Fases de construção (Fase 0: migration 9 tabelas) | RF-032/033: faltam tabelas de compostos → a migration da Fase 0 está incompleta | **NÃO marcado** |
| Fase 1 = Fornecedores, Fase 2 = Grade | RF-035 define fluxo 3 etapas; RF-036 define modal de seleção — nenhuma dessas fases está no plano | **NÃO marcado** |
| Hooks previstos (`useCustosData`, `useCustosGrid`...) | RF-031 manda portar hooks do Prosperitas (`ProjetoDescritivoTab`, `ProdutoAutocomplete`) — os hooks previstos do plano são provavelmente descartados | **NÃO marcado** |
| "Contrato = linhas vencedoras da cotação (sem entidade contrato separada na v1)" | Sem modelagem de cancelamento/aditivo (A-01) essa decisão cria dead end | **NÃO marcado** |
| Fase 7 (itens avulsos legais auto-gerados) | RF-035 coloca os governamentais na 1ª tela do fluxo de criação — é Fase 0 ou 1 no UX, não Fase 7 | **NÃO marcado** |

---

## ACHADOS MÉDIOS

### A-11 [MÉDIO] — Rateio quando a quantidade muda depois de contratado: comportamento indefinido

**Onde aparece:** RF-033 define rateio proporcional à quantidade. O baseline de `quantidade` é congelado (RNF-010, trigger) mas apenas para `valor_orcado_unit`. O campo `baseline_qtd` existe, mas se a quantidade REAL difere da orçada (ex.: o bar precisou de 120 m de piso, não 100 m), o percentual de rateio muda. Quem recalcula? O rateio do contratado usa a quantidade do contrato ou a quantidade atualizada do item? Não está definido.

---

### A-12 [MÉDIO] — Cópia de evento anterior como base do próximo: não há RF

**Onde aparece:** RF-016 cobre histórico de preços. RF-022 pergunta sobre compostos reutilizáveis (templates). Nenhum RF cobre "clonar o plano de custos do evento X como ponto de partida do evento Y" — que é o fluxo mais natural de quem faz eventos recorrentes.

**Impacto:** Sem clone/cópia, o usuário refaz o checklist, os compostos e os itens do zero a cada edição — contradiz o critério de sucesso "mais rápido que o Excel".

---

### A-13 [MÉDIO] — Q-009 (pagamentos parcelados) aberta bloqueia modelo de `custos_pagamentos`

**Onde aparece:** `custos_pagamentos` tem apenas `valor, data, forma` — sem campo de parcelas, vencimento ou status de pagamento. Se o fornecedor foi pago em 3 parcelas (40% sinal + 30% na montagem + 30% pós-evento), o modelo atual registra 3 linhas avulsas sem vínculo entre elas nem alerta de vencimento. PC-06 (custo do dinheiro/cronograma de desembolso) também depende disso.

---

### A-14 [MÉDIO] — Checklist gerado na criação vs. itens editáveis depois: regra de convivência ausente

**Onde aparece:** RF-021 diz que "questionário pode ser reaberto depois e nada é travado". RF-035 define 3 telas no fluxo de criação. Mas: se o gestor reabre o questionário e desmarca um item que já foi contratado (ex.: desmarca "Terá julgadores?" quando o julgador já foi contratado), o item some da grade? Aparece alerta? O RF não define o comportamento.

---

### A-15 [MÉDIO] — RF-025 (porte G/M/P) sem representação no schema: campo `porte` inexistente em `custos_itens`

**Onde aparece:** RF-025 define porte como atributo de itens (palco grande/médio/pequeno, cantor grande/médio/pequeno). A tabela `custos_itens` no plano não tem campo `porte` (nem `enum`, nem `text`). O porte "muda a faixa de custo e a estrutura derivada (palco grande → mais kVA, mais segurança)" — sem campo, não há como filtrar nem sugerir derivados por porte.

---

### A-16 [MÉDIO] — Orçado original imutável × RF-021 (questionário reaberto gera novos itens): conflito com baseline congelado

**Onde aparece:** RNF-010 diz "baseline imutável após congelamento; revisões são aditivas". O trigger congela `baseline_*` "na 1ª transição para cotado". RF-021 permite reabrir questionário e ticar novos itens — esses itens novos são adicionados DEPOIS que o evento já tem itens cotados. O baseline do evento como um todo (total orçado) muda a cada novo item adicionado tardio, mesmo que os itens antigos estejam congelados. O plano não define como tratar o orçado total do evento quando itens são acrescentados após o início da cotação.

---

### A-17 [MÉDIO] — Itens do kit logístico (RF-023) são por pessoa-chave: sem entidade "pessoa-chave" no schema

**Onde aparece:** RF-023 define kit logístico gerado automaticamente por "pessoa importante" (jurado, locutor, artista). A tabela `custos_itens` tem `descricao` mas não há entidade `pessoa_chave` nem vínculo `item_id → pessoa_chave_id`. Os itens do kit ficam soltos na grade sem identificação de a quem pertencem. Se o julgador desiste, o gestor precisa encontrar manualmente todos os itens do kit dele e excluir.

---

## Resumo de Bloqueios por Prioridade

| Gravidade | # | Achado | Bloqueia |
|---|---|---|---|
| CRÍTICO | A-01 | Ciclo pós-contrato ausente (cancelamento/aditivo/inadimplência/encerramento) | Fases 5 e 6 |
| CRÍTICO | A-02 | Rateio indefinido para verbas fechadas (Q-021 aberta) | Schema Fase 0, RF-033/034 |
| CRÍTICO | A-03 | `custos_compostos` não existe no modelo de 9 tabelas | Schema Fase 0 inteiro |
| CRÍTICO | A-04 | Q-001 aberta (edição vs. evento-pai) = FK de todas as tabelas indefinida | Fase 0 |
| CRÍTICO | A-05 | Contradição ART: "avulso sem cotação" vs. "item cotável" em 4 documentos | RF-004, RF-014, RF-021, RF-029 |
| ALTO | A-06 | Item em dois pedidos simultâneos + cotação vencida: comportamento indefinido | RF-002/003/011, Fase 4/5 |
| ALTO | A-07 | Relatório de encerramento e comparação inter-eventos: sem RF nem modelo | Critério de sucesso |
| ALTO | A-08 | Composto/item excluído após contratado: sem regra de proteção | RF-032, RNF-003 |
| ALTO | A-09 | Fluxo de envio/retorno da planilha bloqueada não modelado | RF-027/028/029, Fases 1 e 4 |
| ALTO | A-10 | Plano técnico desatualizado em 6 pontos além dos já marcados | Plano como referência de fases |
| MÉDIO | A-11 | Rateio quando quantidade muda pós-contrato | RF-033 |
| MÉDIO | A-12 | Cópia de evento anterior como base: sem RF | Critério de sucesso |
| MÉDIO | A-13 | Q-009 aberta bloqueia modelo de parcelas e cronograma de desembolso | Schema `custos_pagamentos` |
| MÉDIO | A-14 | Questionário reaberto + item já contratado: comportamento indefinido | RF-021 |
| MÉDIO | A-15 | Campo `porte` ausente no schema de `custos_itens` | RF-025 |
| MÉDIO | A-16 | Orçado total do evento muda com itens tardios (baseline por item vs. baseline do evento) | RNF-010 vs. RF-021 |
| MÉDIO | A-17 | Kit logístico sem entidade "pessoa-chave" no schema | RF-023 |

---

## Perguntas que precisam ser respondidas ANTES do schema (Fase 0)

Ordenadas por criticidade para o schema:

1. **Q-001** — custo por edição ou evento-pai? (define todas as FKs)
2. **Q-021** — rateio de verbas fechadas: proporcional / percentual manual / excluído? (define campo em `custos_itens`)
3. **Q-022** — compostos reutilizáveis entre eventos? (define se existe tabela de templates)
4. Novo **Q-024** (não registrado): ciclo pós-contrato — cancelamento, aditivo, inadimplência, encerramento do evento têm estados ou são apenas notas? (define estados em `custos_itens` e `custos_pedidos`)
5. Novo **Q-025** (não registrado): item pode pertencer a mais de um composto (N:N), ou cada item tem exatamente um composto? (define estrutura da tabela `custos_compostos`)
6. **Q-009** — pagamentos parcelados com vencimento? (define `custos_pagamentos`)

---

*Fim do relatório. Achados graves totalizam 5 críticos, 5 altos e 7 médios.*
