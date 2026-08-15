# 70 — Plano de Implantação e Entrega (Centro de Custo do Evento)

> **Autor:** engenheiro de entrega (Opus, 04/08/2026). Consolida os 7 docs
> (`DOC-MODULO-CUSTOS/00–06`), os rel. 09/15/49, a arquitetura REAL deste repo e
> o módulo de origem no Prosperitas. É o plano de EXECUÇÃO (implementação
> autorizada em 04/08 — ver log de decisões do `04-PERGUNTAS-E-DECISOES.md`).
>
> **Premissa:** o BANCO vem de outro agente. Aqui as tabelas são assumidas
> prontas; onde este plano depende de forma/coluna, isso está marcado
> `⟶ contrato de tabela` para casar com o agente de schema. **Nada de "arquivo
> monstro" de SQL** — se surgir SQL (índice de busca, seed, RPC de rateio), sai
> em BLOCO UNITÁRIO pequeno para o usuário aplicar (regra do 00-INDICE §Status).

---

## 0. A arquitetura real deste repo (o que o port tem de respeitar)

Verificado nos arquivos, não presumido:

| Assunto | Realidade do DBARROS-RURAL | Consequência para o módulo |
|---|---|---|
| Estrutura | Sem `src/`: `pages/`, `services/`, `hooks/`, `components/`, `utils/` na RAIZ | Novos arquivos caem nessas pastas raiz |
| Alias | `@` → raiz do repo (`vite.config.ts`) | `import { supabase } from '@/services/supabaseClient'` |
| Supabase | `services/supabaseClient.ts` exporta `supabase` (singleton, tipado por `database.types.ts`) | Prosperitas usa `createClient()` do Next → **trocar por import do singleton** |
| Dados | Páginas NUNCA importam `supabase` direto — só via `services/*` (CLAUDE.md + RNF-007) | Prosperitas grava no componente → **mover I/O para `custosService.ts`** |
| Página | Orquestrador: estado em `hooks/`, visual em `components/[modulo]/` (ex.: `TempPlanilha.tsx`) | `pages/CentroCusto.tsx` fino; lógica em `hooks/`, UI em `components/custos/` |
| Testes | `vitest run` (`npm test`); `@vitest/coverage-v8`; specs `*.test.ts` ao lado do alvo | Funções puras em `utils/*.test.ts`; services com supabase mockado |
| Rotas | `App.tsx` HashRouter, todas as páginas `lazy()` + `ProtectedRoute` | Somar rotas do módulo, lazy |
| Menu | `components/Layout.tsx`: `<SectionLabel>` + `<NavItem>`; gating por `user?.isAdmin` | Nova seção "Custos"; item some para `isVendedor`/`isVisitor` |
| Papéis | `users`: `is_admin`, `is_projetista`, `is_visitor`, `can_manage_tags` (=master), `edicao_id` | Projetista já existe (RF-043); vendedor não vê custos (Q-002) |
| RLS | `is_master()` (SECURITY DEFINER lê `can_manage_tags`); policy `master_isolation`. **Falha conhecida (rel. 65): não lê `users.edicao_id`** | NÃO copiar cru — policies por edição REAIS; visitante nunca escreve (RNF-005) |
| Migrations | `supabase/migrations/*.sql`, idempotentes (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`), aplicadas à mão no SQL Editor | Blocos unitários idempotentes, um de cada vez |
| Estilo Prosperitas | Bootstrap inline + `@/styles/theme` + `react-hot-toast` + `useConfirm` | **Cortar**: reescrever em Tailwind; toasts → `AlertModal`/`DialogContext` daqui |

**Grupos fixos do Prosperitas → categorias rurais configuráveis** (Q-020↗): o
`GRUPOS: Record<number,string>` hard-coded vira tabela `custos_categorias`
(admin edita) — as "7 faces" (RF-051) e as áreas do checklist `05` semeiam essa
tabela.

---

## 1. FASES DE CONSTRUÇÃO (ordem de dependência, valor cedo)

Princípio (RF/RNF): **grade de itens utilizável primeiro** (o operador de Excel
abandona a planilha já na Fase 2), o resto encaixa. Cada fase = branch já é
`feature-modulo-custos`; commits pequenos verificados (RNF-006); cada fase só
fecha com **teste da lógica nova + RLS revisada** (CLAUDE.md, RNF-005/014, ~90%).

### Fase 0 — Fundação (deps, tipos, catálogo, busca) — **habilita tudo**
Depende de: tabelas prontas (assumidas). Objetivo: o alicerce sem UI de valor.
- Adicionar deps: `papaparse` + `@types/papaparse`, `dompurify` + `@types/dompurify`, e a lib xlsx (ver §3 e decisão final).
- `database.types.ts`: regenerar/estender com as `custos_*` (o agente de schema entrega o DDL; aqui só o tipo).
- `utils/custosCalc.ts` — PORT de `orcamento-calc.ts` (funções puras `r2`, `calcularTotalItem`) + `custosCalc.test.ts` (port dos 22 testes).
- `services/custosService.ts` — esqueleto (CRUD catálogo de produtos RF-044, categorias, unidades) + `custosService.test.ts` (supabase mockado).
- `services/produtosBuscaService.ts` — busca "Mercado Livre" (RF-049): chama a RPC/`ilike` de busca; ranking por `uso`.
- **SQL BLOCO** (se o schema não trouxer): índice de busca `unaccent + pg_trgm` + coluna/materialização de `uso` (freq. de seleção). Entregar isolado.
- **Pronto quando:** `npm test` verde; catálogo lê/escreve via service com RLS; busca retorna com typo-tolerância num teste.

### Fase 1 — Grade de itens (PORT do descritivo) — **primeiro valor**
Depende de: Fase 0. É o coração (RF-001/031/044); entrega a "planilha".
- `components/custos/GradeDescritivo.tsx` — PORT de `ProjetoDescritivoTab.tsx` (Tailwind, service, sem toast/next).
- `components/custos/ProdutoAutocomplete.tsx` — PORT de `ProdutoAutocomplete.tsx` (ordena por frequência; RF-031).
- `hooks/useGradeCustos.ts` — estado dos itens, dirty, save via service (extraído do componente Prosperitas).
- `pages/CentroCusto.tsx` (orquestrador mínimo) + rota + item no menu (Fase 5 formaliza; aqui só o mínimo para navegar e testar).
- **Pronto quando:** dá para lançar item (qtd/produto/formato/valor), Tab/Enter, digitou-salvou, autocomplete por frequência; `useGradeCustos` testado; RLS revisada (item pertence à edição).

### Fase 2 — Camadas orçado × contratado × realizado + import por paste
Depende de: Fase 1. Entrega o valor único que a planilha não dá (RF-008, VISÃO).
- `utils/custosCalc.ts` (+): desvio R$/%, consolidação por item/categoria/evento (RF-008), projeção EAC (RF-013/039).
- `hooks/useComparativoCustos.ts` — monta orçado/contratado/realizado + desvios.
- `components/custos/ComparativoView.tsx` — colunas do rel. 10 (RF-039), semáforo por cor.
- `utils/tsvPaste.ts` — Papa Parse + `parseBRNumber`/`parseBRDate` + DOMPurify (rel. 09) + `tsvPaste.test.ts`.
- `components/custos/PastePreviewModal.tsx` — PASTE→PARSE→PREVIEW→MAP→VALIDATE→CONFIRM (RF-012/047).
- **Pronto quando:** comparativo aparece sem o usuário montar fórmula; colar bloco de Excel BR vira lançamentos com preview; parsers testados (newline-in-cell, "R$ 1.234,56", dd/mm).

### Fase 3 — Fluxo de criação em 5 camadas + checklist condicional (RF-035/042)
Depende de: Fase 1 (grade recebe os itens gerados). É o "cadastro em 15 min" (RNF-013).
- `utils/checklistCustos.ts` — dados do checklist `05` como estrutura (Bloco 1/2/3, condições de ativação por perfil RF-042, prazos-alerta) + teste das regras de ativação.
- `hooks/useCriacaoEvento.ts` — máquina das 5 camadas: Perfil → Governamental → Estrutura → Composição → Detalhes (RF-035).
- `components/custos/wizard/` — `Camada0Perfil.tsx`, `Camada1Obrigatorios.tsx`, `Camada2Estrutura.tsx`, `Camada3Composicao.tsx`, `Camada4Detalhes.tsx`.
- Ticar item → gera item de custo na grade e/ou providência com prazo-alerta retroativo (RF-021).
- **Pronto quando:** perfil "fazenda com agrônomos" mostra meia dúzia de itens e "Avenida Paulista" mostra tudo (RF-042); ticar gera linha na grade; regras de ativação testadas.

### Fase 4 — Compostos, rateio e modal de agrupamento (RF-032/033/036)
Depende de: Fases 1–3. Entrega custo do bar/estande e o pedido de cotação.
- `utils/rateioCustos.ts` — item em 2 dimensões (composto × categoria); rateio por quantidade (RF-033); custo-base do composto (RF-034) + teste denso (é o cálculo mais arriscado).
- `hooks/useCompostos.ts` — biblioteca de ~30 espaços-template (RF-050); incluir/excluir.
- `components/custos/CompostoBuilder.tsx` — montar composto (mais fácil que Prosperitas, RNF-012).
- `components/custos/AgrupamentoModal.tsx` — clicar na categoria → modal com itens de todos os compostos → desmarcar (RF-036/002/003).
- **Pronto quando:** "quanto custa 1 estande" aparece somando parcelas rateadas; modal de piso lista itens de todos os compostos e o pedido sai só com os marcados; rateio testado (bar 100 m de 1.000 m = 10%).

### Fase 5 — Cotação, fornecedores e planilhas xlsx protegidas (RF-010/027/029)
Depende de: Fase 4 (pedido de orçamento). Elimina a re-digitação de PDF.
- `services/fornecedoresService.ts` — CRUD + dedup por CNPJ (RF-028) + de-para/equivalência (RF-045).
- `services/cotacoesService.ts` — cotação por fornecedor sobre pedido; mapa comparativo (RF-011); exclusões/all-in (RF-052).
- `utils/xlsxProtegido.ts` — GERA xlsx bloqueado (só campos liberados) p/ cadastro (RF-027) e cotação (RF-029, auto-soma) + `utils/xlsxImport.ts` (lê de volta, valida CNPJ/dígitos).
- `components/custos/MapaCotacao.tsx` — item × fornecedor, menor preço destacado, split award (RF-011).
- `hooks/useSugestaoFornecedores.ts` — por categoria + histórico/equivalência (RF-030, Q-019).
- **Pronto quando:** gera xlsx que abre travado no Excel com só a coluna de valor editável e auto-soma; importa de volta deduplicando por CNPJ; mapa destaca menor preço; geração/parse testados.

### Fase 6 — Dashboard, histórico e encerramento (RF-016/037/039/046)
Depende de: Fases 2–5. Fecha "memória entre eventos" e a conversa comercial.
- `hooks/useDashboardCustos.ts` + `components/custos/DashboardCustos.tsx` — colunas rel. 10, curva ABC (RF-017), feed de atividade (RF-019), alertas 80/100% (RF-019).
- `services/custosService.ts` (+): encerrar edição → snapshot imutável (RF-037); comparar edições; copiar como base.
- `hooks/usePrevisaoHistorica.ts` — "0,75 → 1 → 1,25" (RF-046).
- Export xlsx/TXT de toda grade (RF-047, reusa `utils/xlsxProtegido`/Papa).
- **Pronto quando:** dashboard consolida desvios por cor; encerrar gera snapshot; previsão histórica abre com tendência; export sai.

**Total: 7 fases (Fase 0 a Fase 6).**

---

## 2. PORT DO PROSPERITAS — arquivo a arquivo

| Origem (Prosperitas) | Destino (este repo) | COPIAR | ADAPTAR | CORTAR |
|---|---|---|---|---|
| `lib/orcamento-calc.ts` | `utils/custosCalc.ts` | `r2`, `grossUp`, `calcularTotalItem` (puras, sem React) | comentários/JSDoc p/ contexto custos; estender c/ desvio/EAC/rateio | nada (é ouro) |
| `lib/orcamento-calc.test.ts` | `utils/custosCalc.test.ts` | os 22 testes | `describe`/imports p/ o novo caminho | — |
| `components/projetos/types.ts` | `components/custos/types.ts` | shape do `Item` (grupo/ordem/qtd/produto/formato/valores + flags `_dirty/_new`) | `grupo:number` → `categoria_id`; ids `number`→`uuid` (padrão do repo) | — |
| `ProdutoAutocomplete.tsx` | `components/custos/ProdutoAutocomplete.tsx` | lógica teclado (↑↓/Enter/Tab/Esc), ranking por `uso`, dropdown | `@/styles/theme` → Tailwind; navegação por `document.getElementById` → refs/callbacks | estilos inline Bootstrap |
| `ProjetoDescritivoTab.tsx` | `components/custos/GradeDescritivo.tsx` + `hooks/useGradeCustos.ts` | padrão da grade (linha de inclusão, dirty-save por linha, Tab/Enter, seção "não cadastrados") | `createClient()`→`supabase` singleton; **I/O → `custosService`** (RNF-007); `GRUPOS` const → `custos_categorias` | `react-hot-toast`→dialogs daqui; `useConfirm`→`ConfirmModal`/`DialogContext`; `<table class="table">` Bootstrap→Tailwind; `invalidarPdfDescritivo` (conceito do Prosperitas, não existe aqui) |
| `OrcarProjetoForm.tsx` | (referência p/ Fase 6) | a cascata de precificação como MODELO | só o necessário p/ break-even/custo-base (RF-034/040) | markup/venda (RF-009 fora do escopo); a UI inteira |
| `OrcarTable.tsx`, `ProjetoForm.tsx`, `ProjetosTable.tsx`, `gerarPdf/`, filtros | — | — | — | **não portar** (específicos do Prosperitas/PDF) |

**Regra de ouro do port (Next→Vite):** todo `import { createClient } from '@/lib/supabase/client'` some; nasce `import { supabase } from '@/services/supabaseClient'` e **o componente não fala com o supabase** — chama `custosService`. Isso satisfaz RNF-007 e a revisão de RLS (o service é o ponto único de I/O testável).

**Onde cada peça cai:** `components/custos/` (visual), `hooks/` (estado), `services/custosService.ts` + irmãos (dados), `utils/custosCalc.ts`/`rateioCustos.ts`/`tsvPaste.ts`/`xlsx*.ts` (puro/infra), `pages/CentroCusto.tsx` (orquestrador).

---

## 3. PEÇAS NOVAS (não existem no Prosperitas)

- **Fluxo 5 camadas (RF-035):** `hooks/useCriacaoEvento.ts` + `components/custos/wizard/Camada0..4`. Cada camada lê o perfil (RF-042) e esconde o irrelevante. Meta 15 min (RNF-013) é teste de aceitação.
- **Grade com compostos + modal (RF-036):** `utils/rateioCustos.ts` (2 dimensões e rateio), `components/custos/CompostoBuilder.tsx`, `AgrupamentoModal.tsx`.
- **xlsx protegido (RF-027/029):** `utils/xlsxProtegido.ts` (escrita travada) + `utils/xlsxImport.ts` (leitura/validação CNPJ).
- **Paste TSV (rel. 09):** `utils/tsvPaste.ts` + `components/custos/PastePreviewModal.tsx`. Papa Parse + `parseBRNumber`/`parseBRDate` + DOMPurify no `text/html`.
- **Mapa de cotação (RF-011):** `components/custos/MapaCotacao.tsx` + `services/cotacoesService.ts`.
- **Dashboard (RF-039):** `components/custos/DashboardCustos.tsx` + `hooks/useDashboardCustos.ts`.
- **Busca "Mercado Livre" (RF-049):** `services/produtosBuscaService.ts` sobre `unaccent+pg_trgm+FTS` (SQL em bloco unitário; sem NLP).

### DECISÃO xlsx: **ExcelJS** (para a ESCRITA protegida). O repo aceita a dep nova.
Racional (rel. 15 + RNF-011):
- **Precisamos de ESCRITA protegida** — o rel. 15 cobriu só LEITURA. ExcelJS faz `sheet.protect(senha, opts)` com `cell.protection = { locked: false }` por célula: exatamente o RF-027/029 (trava tudo, libera só os campos de dados / a coluna de valor) e escreve fórmulas de auto-soma. SheetJS CE tem `'!protect'`, mas a proteção por-célula/fórmulas é mais pobre e a distribuição saiu do npm p/ CDN próprio (atrito de build/PWA e de auditoria de licença/CVE — rel. 15 §1).
- ExcelJS é **MIT, instala do npm, roda no browser** — casa com o `manualChunks` do `vite.config.ts` (vira chunk lazy só no export, como jspdf hoje). Contra: "inativo desde 2023" (rel. 15 §2) — aceitável: usamos um subconjunto estável (protect + write) e a proteção de Excel é anti-erro, não anti-fraude (RNF-011), então bug de borda não é risco de segurança.
- **Papa Parse** fica para o PASTE/CSV/TSV (rel. 09) — não lê xlsx, e não precisa. **DOMPurify** para o `text/html` do clipboard.
- Rejeitado SheetJS CE (distribuição/CDN + escrita protegida mais fraca) e `@office-kit/xlsx` (adoção ainda pequena; sem prova de proteção por-célula). Se num spike o ExcelJS falhar a proteção no Excel-alvo, o fallback é SheetJS CE via CDN — mas o default é ExcelJS.

---

## 4. ESTRUTURA DE TESTES (meta ~90% do código NOVO — RNF-014)

O repo já usa **Vitest** (`npm test` = `vitest run`) com `@vitest/coverage-v8`, e o
padrão é spec `*.test.ts` colada ao alvo (ex.: `planilhaCalc.test.ts`,
`authService.test.ts`). Como chegar a ~90% no código NOVO:
- **Funções puras (a maior fatia da cobertura):** `custosCalc.test.ts`, `rateioCustos.test.ts`, `tsvPaste.test.ts`, `checklistCustos.test.ts`, `xlsxProtegido`/`xlsxImport` (gerar buffer e reler → round-trip). Alvo 100% de linhas — barato e onde mora o "bug bobo" que o usuário quer evitar.
- **Services (supabase mockado):** `custosService.test.ts`, `cotacoesService.test.ts`, `fornecedoresService.test.ts` — mockar `@/services/supabaseClient` com `vi.mock`, asseverar a query montada e o tratamento de erro (padrão do `authService.test.ts`).
- **Hooks testáveis:** manter a lógica de estado FORA do JSX (em funções puras chamadas pelo hook), testar essas funções direto; o hook fica fino. Onde precisar renderizar, usar `@testing-library/react` (dep de teste nova, isolada em devDeps).
- **Test IDs:** todo elemento interativo do módulo com `data-testid="custos-<area>-<elemento>"` (ex.: `custos-grade-add-btn`, `custos-paste-confirmar`, `custos-cotacao-menor-preco`, `custos-wizard-camada-2`) — habilita testes de UI e é a convenção que o usuário pode cobrar.
- **Config:** se a cobertura precisar de gate, adicionar `vitest.config.ts` com `coverage.thresholds` só para `**/custos*/**` e os `utils/custos*`/`rateio*`/`tsvPaste*` — não travar o repo inteiro.
- **Regra de fase:** nenhuma fase fecha sem seus testes verdes (CLAUDE.md: "nunca deixar teste para depois").

---

## 5. INTEGRAÇÃO (rota, menu, papéis, versão)

- **Rotas (`App.tsx`):** `const CentroCusto = lazy(() => import('./pages/CentroCusto'))` e rotas sob `ProtectedRoute`:
  - `/custos` (lista de edições com centro de custo), `/custos/:edicaoId` (grade/dashboard da edição), `/custos/:edicaoId/novo` (wizard 5 camadas), `/custos/:edicaoId/cotacao/:pedidoId` (mapa). HashRouter, todas `lazy`.
- **Menu (`components/Layout.tsx`):** nova `<SectionLabel label="Custos" />` + `<NavItem to="/custos" label="Centro de Custo" icon={...} />`. Gating: esconder para `user?.isVendedor` (Q-002 — vendedor não vê custos) e para `isVisitor`; projetista vê SEM valores (Q-026) — o gate fino de valores é no componente/service, não só no menu.
- **Papéis:** reusar `is_projetista` (RF-043) e `is_admin` (edita `custos_categorias`, Q-020↗). "Vendedor não vê custos" (Q-002): se não houver flag de vendedor, o default é "quem não é admin/projetista/dono não vê" — confirmar a flag com o agente de schema/`users`.
- **RLS (revisão obrigatória, não copiar a falha do rel. 65):** policies das `custos_*` por EDIÇÃO real (via `edicao_id` do registro cruzado com o vínculo do usuário), não o `master_isolation` que ignora `users.edicao_id`. Visitante NUNCA escreve (RNF-005). Cada migration sai em bloco unitário idempotente.
- **Versão:** nada a fazer à mão — o hook `.githooks/pre-commit` grava `version.ts`/`package.json` a cada commit (CLAUDE.md/VERSIONING.md). O rodapé do `Layout` já mostra `APP_VERSION`.

---

## RESPOSTA FINAL

**Nº de fases: 7** (Fase 0 a Fase 6).

1. **Fase 0 – Fundação:** deps (Papa/DOMPurify/ExcelJS), tipos `custos_*`, `custosCalc` (port puro), `custosService` + catálogo (RF-044), busca Mercado Livre (RF-049).
2. **Fase 1 – Grade (port do descritivo):** `GradeDescritivo` + `ProdutoAutocomplete` + `useGradeCustos` — primeiro valor: lançar itens estilo planilha (RF-001/031).
3. **Fase 2 – Camadas + paste:** orçado×contratado×realizado com desvio/EAC (RF-008/039) e import por colagem TSV BR (RF-012, rel. 09).
4. **Fase 3 – Wizard 5 camadas + checklist:** Perfil→Governamental→Estrutura→Composição→Detalhes, condicional por perfil, cadastro em ~15 min (RF-035/042/RNF-013).
5. **Fase 4 – Compostos + rateio + modal:** custo do bar/estande rateado e pedido de cotação por modal de categoria (RF-032/033/034/036).
6. **Fase 5 – Cotação + fornecedores + xlsx protegido:** dedup CNPJ, mapa comparativo, xlsx travado com auto-soma e import de volta (RF-010/011/027/028/029/052).
7. **Fase 6 – Dashboard + histórico + encerramento:** colunas rel. 10, curva ABC, feed, snapshot imutável, previsão 0,75→1→1,25, export xlsx/TXT (RF-016/017/019/037/046/047).

**Decisão xlsx: ExcelJS** (MIT, npm, browser) para a ESCRITA protegida por-célula + fórmulas de auto-soma (RF-027/029) — o repo aceita a dep nova (vira chunk lazy no `manualChunks`). Papa Parse para paste/CSV/TSV; DOMPurify para o HTML do clipboard. SheetJS CE fica como fallback só se um spike reprovar o ExcelJS.

**3 maiores riscos de entrega:**
1. **RLS por edição (não copiar a falha do rel. 65):** o `master_isolation` atual ignora `users.edicao_id`; se o módulo herdar esse padrão, um usuário de uma edição enxerga custos de outra. Mitigação: policies por edição REAIS + visitante nunca escreve + teste de isolamento por edição na Fase 0/1.
2. **Rateio de compostos (RF-033/034):** é a matemática mais frágil (item em 2 dimensões, soma por categoria/fornecedor e devolução proporcional); erro aqui corrompe o custo-base de venda. Mitigação: `rateioCustos.ts` puro com teste denso (casos de borda: quantidade zero, composto sem item na categoria, fornecedor fatiado) antes de qualquer UI.
3. **xlsx protegido ida-e-volta (RF-027/029):** proteção por-célula + auto-soma que ABRA travada no Excel do fornecedor e reimporte deduplicando por CNPJ é o elo com maior superfície de bug entre versões de Excel/lib. Mitigação: spike de round-trip na Fase 5 (gera→abre→edita só o liberado→reimporta) com teste de buffer; fallback SheetJS CE documentado.
