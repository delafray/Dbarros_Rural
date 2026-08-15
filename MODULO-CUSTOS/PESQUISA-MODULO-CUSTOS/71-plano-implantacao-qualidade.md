# 71 — Plano de Implantação, Qualidade e Risco (REVISOR)

> Data: 04/08/2026 · Papel: revisor de qualidade e riscos do módulo "Centro de Custo do Evento".
> Objetivo: garantir que a implantação NÃO quebre o sistema vivo (~100 usuários em produção)
> e que a meta de ~90% de cobertura (RNF-014) seja REAL, não teatro.
> Método: cruzado com o repo real (package.json, vitest 4.1.9, `@vitest/coverage-v8` já
> instalado mas SEM script `coverage` nem `vitest.config.ts`; testes-molde em
> `services/authService.test.ts`, `hooks/useAreaLivreCalculations.test.ts`, `utils/money.ts`;
> RLS real em `20260310000001_rls_master_isolation.sql`) e com os rel. 39 (A-01..A-17) e 65
> (RLS furada, `evento_id` nullable, simulação).
> Modo de execução (decisão 04/08): SQL aplicado pelo usuário em **blocos unitários** no
> painel Supabase; branch `feature-modulo-custos`; IA constrói, usuário testa.

---

## 0. Fatos do repo que condicionam tudo (não são opinião)

- **Runner:** `vitest run` (script `test`). `@vitest/coverage-v8@4.1.9` está em devDeps mas
  **não há script de cobertura nem `vitest.config.ts`** — a meta de 90% (RNF-014) hoje é
  inauditável. Primeiro entregável de qualidade é tornar a cobertura MENSURÁVEL.
- **Ambiente de teste = node (default)**, não jsdom. Testes que tocam APIs de browser
  (`ClipboardEvent`, `Blob`, `FileReader`, `DataTransfer` do paste TSV) exigem `environment`
  configurado OU lógica extraída para função pura que recebe string/ArrayBuffer. Preferir a 2ª.
- **`money.ts` já existe e é testado** (`arredonda`, soma em centavos com `Number.EPSILON`).
  RNF-008 manda reusar isto — NÃO criar aritmética monetária nova. Rateio (RF-033) usa `money.ts`.
- **Nenhuma lib de xlsx/exceljs instalada.** RF-027/029/047 (escrita de Excel protegido)
  não têm dependência escolhida — é spike técnico REAL, não "já resolvido" (RNF-011).
- **RLS real NÃO isola por edição** (rel. 65 Ataque 2): `master_isolation` filtra por
  `master_user_id IS NULL` no pai; `users.edicao_id` é só rótulo, nenhuma policy o lê;
  `FOR ALL` não separa SELECT de escrita. **Copiar esse padrão vaza custos de todos os
  eventos a todo visitante** e deixa visitante escrever — viola CLAUDE.md e RNF-005.
- **`eventos_edicoes.evento_id` é NULLABLE** e não há criação atômica pai+edição (rel. 65 A1).

---

## 1. ESTRATÉGIA DE TESTES — 90% real no código NOVO

### 1.1 Pirâmide (onde o 90% mora de fato)

**Camada 1 — Funções puras (o grosso do 90%, alvo 95%+).** Entra dado, sai dado, sem rede.
Extrair para `utils/custos/` e `services/custos/*Calc.ts`:

| Alvo puro | RF | Por que testar | Casos-limite obrigatórios |
|---|---|---|---|
| `ratearCustoComposto(itens, totalCategoria)` | RF-033/034 | é o núcleo do valor do módulo e o mais fácil de errar | soma dos rateios == total (invariante); verba fechada sem qtd (Q-021 gaveta 3 → NÃO rateia por qtd); qtd zero; 1 único composto = 100%; arredondamento de centavos fecha (usar `money.ts`, distribuir o resto do último) |
| `calcularDesvio(orcado, contratado, realizado)` | RF-008 | 3 camadas + R$ e % | orçado zero (divisão por zero → % = null, não Infinity); realizado > contratado; negativos |
| `projecaoEAC(contratado[], estimativas[])` | RF-013/039 | fórmula de projeção | listas vazias; só estimativas; só contratado |
| `validarCNPJ(str)` | RF-028 | chave de dedup — CNPJ errado corrompe merge | dígito verificador; 14 dígitos; máscara; todos iguais (11111...); vazio |
| `parseColagemTSV(texto)` | RF-012/047, RNF-009 | migração do histórico | `R$ 1.234,56` BR; newline dentro de célula (aspas); data `dd/mm`; célula vazia; TSV vs CSV |
| `sugerirQuantidade(publico, regra)` | RF-015 | banheiros 1/50 etc. | arredonda pra cima; público 0; regra ausente |
| `montarBusca(termo)` → tokens/unaccent | RF-049 | typo/sinônimo | `cadera`→cadeira; acento; prefixo; sinônimo `toldo`=`tenda` |
| `distribuirParcelas(total, plano)` | Q-009 | soma das parcelas == total | 40/30/30; resto de centavo no último |

**Camada 2 — Services com Supabase mockado (alvo 90%, molde `authService.test.ts`:
`vi.mock('./supabaseClient', () => ({ supabase: {} }))`).** Testar montagem de payload,
tratamento de erro, e a **deduplicação por CNPJ** (RF-028: já existe → UPDATE; novo → INSERT).
Aqui moram os testes de que o service **não** manda coluna de valor quando o papel é projetista
(Q-026/RF-043). Mockar a cadeia `.from().select().eq()` retornando fixtures.

**Camada 3 — RLS como SQL de verificação (ver 1.3).** Não dá para cobrir RLS com vitest+mock
(o mock não tem Postgres); a prova de RLS vai como SQL executável nos blocos.

### 1.2 O que NÃO testar (e por quê — evita teatro de cobertura)

- **Telas/JSX pixel a pixel** — PADRAO seção 3: rende pouco. Páginas são orquestradores
  (RNF-007); a lógica já saiu para hooks/services testados. Cobrir a grade com 2-3 testes de
  fluxo, não 90% de linhas de render.
- **Geração binária de xlsx** (bytes do arquivo) — testar a **função pura que monta a matriz
  de células + flags de proteção** (dado→dado), não o buffer que a lib cospe. A lib é
  responsabilidade dela; nós testamos o mapa "quais células destravadas, quais fórmulas".
- **`supabaseClient.ts`, wrappers finos, tipos.** Excluir de cobertura via `coverage.exclude`
  para o denominador não mentir para cima nem para baixo.
- **Realtime/PWA/jsPDF** — fora do módulo.

### 1.3 Como MEDIR (hoje é impossível — corrigir primeiro)

Criar `vitest.config.ts` com provider v8, `include` restrito ao código NOVO do módulo e
`thresholds` que **falham o run** abaixo da meta — assim 90% deixa de ser promessa:

```ts
// vitest.config.ts (bloco de qualidade — entra ANTES da 1ª feature do módulo)
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['services/custos/**', 'hooks/custos/**', 'utils/custos/**', 'components/custos/**'],
      exclude: ['**/*.test.ts', '**/supabaseClient.ts', '**/*.d.ts'],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});
```
Adicionar script `"coverage": "vitest run --coverage"`. Rodar a cada bloco entregue.
`branches: 85` é honesto (100% de branch cobra teatro); linhas/funções 90% conforme RNF-014.
**Sem CI aqui** (não há pipeline no repo) → a trava é o script local + Definição de Pronto (§4).

### 1.4 Testes de RLS EXECUTÁVEIS (vão no bloco SQL, não no vitest)

Cada bloco que cria policy acompanha um bloco de verificação que o usuário roda logo depois:

```sql
-- Prova: visitante (edicao X) NÃO lê custo de edicao Y, e NÃO escreve em lugar nenhum.
SET request.jwt.claims TO '{"sub":"<uuid-visitante>","role":"authenticated"}';
SELECT count(*) FROM custos_itens WHERE edicao_id = '<edicao-Y>';  -- ESPERADO: 0
INSERT INTO custos_itens(edicao_id, descricao) VALUES ('<edicao-X>','x'); -- ESPERADO: erro RLS
RESET request.jwt.claims;
```
Se o `count` > 0 ou o INSERT passar, o bloco de policy está furado e o usuário NÃO avança.
Espelha o padrão do teste de segurança do PADRAO (montar o ataque e provar que falha).

---

## 2. SEGURANÇA DE PRODUÇÃO — o que cada bloco pode quebrar no sistema VIVO

Princípio-mestre (RNF-006): **migration nova NUNCA altera comportamento de tabela existente
sem flag/aditividade.** Tabelas `custos_*` são novas → risco baixo por natureza. O perigo mora
nos 2 pontos onde o módulo TOCA o que já roda: `eventos_edicoes` e as policies.

### 2.1 Ordem dos blocos (menor risco → maior), com o que cada um pode quebrar

| # | Bloco SQL | Toca produção? | O que pode quebrar | Rollback (SQL de desfazer) |
|---|---|---|---|---|
| B0 | `vitest.config.ts` + script coverage (código, não SQL) | não | nada | reverter commit |
| B1 | Helper `pode_ver_edicao(edicao_id)` `SECURITY DEFINER STABLE` | não (só cria função) | nada — função nova, ninguém chama ainda | `DROP FUNCTION pode_ver_edicao` |
| B2 | Tabelas `custos_*` (catálogo/produtos, fornecedores, compostos, itens, pedidos, cotações, pagamentos...) + `ENABLE RLS` + policies por edição usando B1, SELECT×escrita separados, visitante sem escrita | **não** altera tabela viva; cria novas | risco só se algum FK apontar errado; RLS default-deny protege | `DROP TABLE custos_* CASCADE` (ordem inversa das FKs) |
| B3 | **Verificação RLS** (§1.4) — não altera dado | não | — | n/a (é SELECT/INSERT de teste em edição de teste, com `RESET` no fim) |
| B4 | `ALTER TABLE eventos_edicoes ALTER COLUMN evento_id SET NOT NULL` | **SIM — TABELA VIVA** | **se existir 1 edição órfã hoje, o ALTER FALHA e/ou trava**; código que cria edição sem pai passa a dar erro | `ALTER COLUMN evento_id DROP NOT NULL` |
| B5 | Criação atômica pai+edição (RPC `SECURITY DEFINER` ou ajuste em `eventosService`) + estado `simulacao/rascunho` na edição | **SIM** (novo caminho de escrita) | se substituir o fluxo atual do `CadastroEvento`, pode quebrar cadastro existente | manter fluxo antigo intacto; RPC é caminho NOVO, adotado atrás de flag na UI |
| B6 | Extensões: `unaccent`, `pg_trgm` (RF-049) | **SIM — nível do banco** | extensão indisponível/sem permissão no plano Supabase; índice GIN trava tabela grande na criação | `DROP EXTENSION` (só se nada depender); criar índice com `CREATE INDEX CONCURRENTLY` |
| B7 | Seeds: catálogo de produtos + biblioteca de ~30 espaços (RF-050) | não (dados novos) | volume; nomes duplicados | `DELETE FROM custos_produtos WHERE origem='seed'` |

**Regra dura para B4:** ANTES do `SET NOT NULL`, rodar `SELECT count(*) FROM eventos_edicoes
WHERE evento_id IS NULL;`. Se > 0, PARAR — corrigir/associar os órfãos primeiro (é dado de
produção). Nunca `SET NOT NULL` às cegas em tabela viva.

**Regra dura para B6:** confirmar no painel que `unaccent`/`pg_trgm` estão na lista de
extensões disponíveis do Supabase (estão, no plano padrão — mas confirmar ANTES de desenhar a
busca em cima delas). Índices GIN/trGM em tabela de produtos vazia (nova) = risco zero; se um
dia a tabela crescer, usar `CONCURRENTLY`.

### 2.2 O achado de segurança que NÃO pode ser herdado (rel. 65 A2)

As policies `custos_*` **não podem copiar `master_isolation`** (`master_user_id IS NULL OR
is_master()` + `FOR ALL`). Elas devem:
1. filtrar por **edição de verdade** via helper `pode_ver_edicao(edicao_id)` (um único lugar —
   evita colar o join 10 vezes e dessincronizar, rel. 65 A6);
2. separar **`FOR SELECT`** (leitor/visitante) de **`FOR INSERT/UPDATE/DELETE`** (gestor) —
   visitante NUNCA escreve (CLAUDE.md, RNF-005);
3. **projetista** (RF-043/Q-026): policy/`view` que NÃO expõe colunas de valor — PADRAO §4
   "colunas sensíveis nunca em leitura ampla"; NUNCA `select('*')` em tabela com coluna de valor.

---

## 3. RISCOS TÉCNICOS ordenados por severidade × probabilidade

| # | Risco | Sev | Prob | Mitigação |
|---|---|---|---|---|
| R1 | **RLS herdada de `master_isolation` vaza custos de todos os eventos e deixa visitante escrever** | Alta | Alta | policies por edição via helper `pode_ver_edicao`, SELECT×escrita separados, teste SQL §1.4 provando isolamento ANTES de dado real |
| R2 | **`SET NOT NULL` em `eventos_edicoes` falha/trava por edição órfã em produção** | Alta | Média | pré-check `count(*) WHERE evento_id IS NULL`; corrigir órfãos; só então ALTER; rollback = `DROP NOT NULL` |
| R3 | **Rateio (RF-033) não fecha: Σ rateios ≠ total por arredondamento ou verba fechada** | Alta | Alta | invariante testada (soma == total, resto no último centavo via `money.ts`); verba fechada NÃO entra no rateio por qtd (Q-021 gaveta 3); proteção por **teste**, não trigger (trigger de rateio em cada escrita é caro e frágil; a conta é pura e determinística) |
| R4 | **Excel protegido no browser: lib não escolhida, escrita protegida não validada** | Média | Alta | spike isolado exceljs vs SheetJS (`sheet.protect()` + `locked=false`); testar só a matriz de células (dado→dado); aceitar que proteção é anti-erro, não anti-fraude (RNF-011); import valida CNPJ+estrutura, não confia na trava |
| R5 | **Paste TSV emenda/quebra em número BR, data e newline-na-célula** (dor recorrente do editor de cardápio) | Média | Alta | Papa-Parse-style em **função pura** que recebe string (não `ClipboardEvent`); suíte com os 3 casos-limite; ambiente node basta pois a lógica não depende do browser |
| R6 | **Port Next→Vite do Prosperitas** (RF-031) | Média | Média | remover `'use client'`/imports `next/*`; `next/router`→`react-router-dom` v7; `next/image`→`img`; env `process.env`→`import.meta.env`; acesso a dados via services (não `supabase` direto — RNF-007); portar `calcularTotalItem` como função pura JÁ com teste |
| R7 | **Extensão `pg_trgm`/`unaccent` indisponível ou índice GIN trava** | Média | Baixa | confirmar disponibilidade no painel antes; índice em tabela nova (vazia) é seguro; `CONCURRENTLY` se crescer; fallback FTS `'portuguese'` puro se trgm faltar |
| R8 | **Simulação (RF-046) polui série plurianual com edições abortadas** (rel. 65 A5) | Média | Média | estado `simulacao/rascunho` na edição; TODA query de série RF-046/037 filtra `status='confirmada'`; testar que agregação ignora rascunho |
| R9 | **Criação atômica pai+edição inexistente** (rel. 65 A1) → custo órfão sem onde pendurar | Média | Média | RPC transacional pai+edição; item de custo exige `edicao_id NOT NULL`; teste do service |
| R10 | **Bloco SQL grande demais quebra e é irreversível** (dor do usuário: perdeu 1 dia) | Alta | Baixa | blocos unitários (decisão 04/08); cada bloco com seu rollback escrito ANTES; usuário confirma sucesso antes do próximo (RNF-006) |
| R11 | **Item em 2 pedidos / cotação vencida** (A-06, Q-024) | Baixa | Média | permitido em cotação com aviso; contratar em um notifica o outro; vencida alerta não trava — cobrir por teste de estado |

---

## 4. DEFINIÇÃO DE PRONTO por fase (checklist objetivo)

**Fase 0 — Fundação de qualidade (antes de qualquer feature):**
- [ ] `vitest.config.ts` com thresholds 90/90/85/90 e `include` do módulo; script `coverage`.
- [ ] `npm run coverage` roda e FALHA de propósito num teste vazio (prova que a trava morde).
- [ ] Helper `pode_ver_edicao` criado (B1) e testado por SQL.

**Cada BLOCO SQL:**
- [ ] Rollback SQL escrito e colado JUNTO do bloco, ANTES de aplicar.
- [ ] Se toca tabela viva (`eventos_edicoes`): pré-check de dados rodado e ok.
- [ ] Bloco de verificação RLS (§1.4) roda e prova isolamento + visitante-sem-escrita.
- [ ] Usuário aplicou e confirmou sucesso antes do próximo bloco.

**Cada FEATURE (PADRAO §7):**
- [ ] Lógica em função pura/service, separada da tela (RNF-007).
- [ ] Teste cobrindo comportamento + casos-limite; cobertura do código novo ≥ 90%.
- [ ] Se toca dado: RLS revisada pela §4 do PADRAO (por edição, não `master_isolation`).
- [ ] `npm run build`, tipos e `npm run test` verdes localmente.
- [ ] Commit pequeno e reversível (RNF-006); `git revert` é o desfazer, não `reset --hard`.

**Encerramento do módulo v1:** snapshot imutável (RF-037), relatório orçado×realizado,
todos os blocos com rollback arquivados.

---

## 5. O QUE CORTAR da v1 sem dó (empurrar para v2)

Critério: manter na v1 só o que (a) o **schema barato agora, caro depois** exige, ou (b) é o
diferencial nuclear (grade + compostos + rateio + cotação por planilha + RLS por edição).

| Corte → v2 | RF | Por que sai da v1 |
|---|---|---|
| Envio integrado da planilha ao fornecedor (e-mail no sistema) | Q-008/A-09 | já decidido v2; v1 gera arquivo, gestor envia manual — não bloqueia o fluxo |
| Dashboard de fluxo de caixa semanal / cronograma de desembolso | Q-009/PC-06 | schema de parcelas fica na v1 (barato agora); a TELA de fluxo é v2 |
| Calculadora de carga elétrica (kVA) completa | RF-022/Q-014 | v1 = campo kVA estimado + derivados; calculadora detalhada é v2 |
| Base de custos de referência online (ECAD, prefeituras, CREA) | RF-048 | "previsão honesta basta" na v1; scraping/fonte online é v2 |
| Curva ABC, avaliação pós-evento de fornecedor, feed de atividade | RF-017/018/019 | são `pesquisa`, não `confirmado`; valor marginal; não afetam schema-raiz |
| Sugestão de fornecedores por histórico "casada" | RF-030 | v1 = matching simples por categoria+equivalência (Q-019); ranking sofisticado v2 |
| Kit de sinalização de compliance auto-gerado (RF-041) completo | RF-041 | v1 pode nascer como itens de checklist ticáveis; a geração automática por gatilho é refinamento v2 |
| Saídas de precificação avançadas (break-even, coef. localização) | RF-040 | v1 entrega custo-base do composto (RF-034); os derivados de precificação são v2 |

**NÃO cortar (é o núcleo e/ou schema caro-depois):** grade portada do Prosperitas (RF-031),
compostos+rateio (RF-032/033/034), cotação por planilha bloqueada (RF-027/029), RLS por edição
(RNF-005), 3 camadas orçado×contratado×realizado (RF-008), parcelas no schema (Q-009),
estado simulação (RF-046), snapshot de encerramento (RF-037).

---

## RESPOSTA FINAL (resumo para o usuário)

**Top 5 riscos (mitigação em 1 linha):**
1. RLS herdada de `master_isolation` vaza custos de todos os eventos e deixa visitante escrever → policies por edição via helper `pode_ver_edicao`, SELECT×escrita separados, teste SQL provando isolamento antes de dado real.
2. `SET NOT NULL` em `eventos_edicoes` (tabela viva) falha por edição órfã → pré-check `count WHERE evento_id IS NULL`, corrigir órfãos, só então ALTER; rollback = `DROP NOT NULL`.
3. Rateio (RF-033) não fecha por arredondamento/verba fechada → invariante testada (Σ==total via `money.ts`), verba fora do rateio por qtd; proteção por teste, não trigger.
4. Excel protegido no browser não validado (lib nem escolhida) → spike exceljs/SheetJS isolado, testar só a matriz de células, tratar proteção como anti-erro e revalidar no import.
5. Bloco SQL grande e irreversível quebra produção → blocos unitários com rollback escrito antes, usuário confirma sucesso antes do próximo.

**Estratégia de cobertura (2 linhas):** o 90% real vem da arquitetura — lógica (rateio, desvio, CNPJ, parse TSV, projeção) em funções puras testadas a 95%+ e services com Supabase mockado a 90%; UI só 2-3 testes de fluxo, RLS provada por SQL de verificação. Hoje é inauditável: criar `vitest.config.ts` com thresholds que FALHAM o run abaixo de 90% e um script `coverage` — sem isso a meta é promessa, não trava.

**Cortes recomendados (v2):** envio integrado de planilha ao fornecedor (Q-008); dashboard de fluxo de caixa semanal (o schema de parcelas fica, a tela sai); calculadora de kVA (v1 = campo estimado); base de custos online ECAD/CREA (v1 = previsão honesta); curva ABC, avaliação de fornecedor e feed de atividade (RF-017/018/019, status `pesquisa`); ranking sofisticado de sugestão de fornecedor (v1 = match por categoria+equivalência); geração automática do kit de compliance por gatilho (v1 = itens ticáveis no checklist); saídas de precificação avançada (v1 entrega custo-base do composto). Núcleo intocável: grade portada do Prosperitas, compostos+rateio, cotação por planilha bloqueada, RLS por edição, 3 camadas orçado×contratado×realizado, parcelas no schema, estado simulação e snapshot de encerramento.
