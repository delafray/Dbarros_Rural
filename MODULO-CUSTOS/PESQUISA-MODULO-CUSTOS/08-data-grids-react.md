# Pesquisa: Data Grids React para Módulo de Gastos

**Data:** agosto de 2026  
**Contexto:** Módulo de gastos estilo planilha em React + TypeScript + Vite + Supabase.  
**Requisitos:** edição inline, Tab/Enter/setas, colar blocos do Excel (multi-célula), undo,
agrupamento por categoria, colunas calculadas (qtd × unitário), formatação BRL,
~200–500 linhas (sem necessidade de virtualização pesada), licença gratuita/open-source.

---

## 1. AG Grid Community

**Licença:** MIT (Community). Enterprise a partir de **US$999/dev** (perpétua + 1 ano de suporte).

**O que a Community cobre:**
- Sorting, filtering, paginação, renderização customizada de células
- Edição inline básica de células
- Ctrl+C / Ctrl+V via teclado — funciona na versão Community para operações simples
- CSV export

**O que é EXCLUSIVO do Enterprise (pago):**
- Range selection (selecionar bloco de células com o mouse) — **Enterprise**
- Clipboard avançado (copiar/colar multi-célula estilo Excel) — **Enterprise**
- Row Grouping — **Enterprise**
- Excel export (.xlsx) — **Enterprise**
- Master/Detail, pivot, tool panels — **Enterprise**

**Paste multi-célula do Excel:** requer Enterprise ou implementação customizada com `onPaste`.

**Bundle size:** ~338 kB gzipped (pesado — maior entre os comparados).

**Manutenção:** extremamente ativa, empresa dedicada, documentação excelente.

**Integração React controlada:** API bem definida, curva de aprendizado razoável.

**Veredicto para nosso caso:** Community cobre edição e navegação básicas, mas clipboard
multi-célula e row grouping exigem Enterprise (~US$999+/dev). Não recomendado para
sistema interno pequeno sem orçamento de licença.

**Fontes:**
- https://www.ag-grid.com/react-data-grid/community-vs-enterprise/
- https://www.ag-grid.com/react-data-grid/clipboard/
- https://www.simple-table.com/blog/ag-grid-pricing-license-breakdown-2026

---

## 2. Handsontable

**Licença:** **Comercial** (versão open-source MIT encerrou na v6.2.2 em dezembro de 2018).  
Planos pagos:
- **Standard:** a partir de US$999/dev (acesso total a features, suporte por e-mail)
- **Priority:** a partir de US$1.299/dev
- **Enterprise:** preço sob consulta
- **Hobby:** gratuito apenas para projetos pessoais não-comerciais

**Paste multi-célula do Excel:** sim, nativo e muito bom — é o ponto forte histórico da lib.

**Edição por teclado:** excelente, estilo planilha.

**Row Grouping:** não tem suporte nativo de row grouping (não é um data grid genérico,
é mais um spreadsheet embeddable).

**Bundle size:** ~286 kB gzipped.

**Manutenção:** ativa, mas empresa pequena; mudança de licença gerou abandono parcial da
comunidade open-source em 2019 (ver Hacker News).

**Integração React controlada:** wrapper oficial disponível, mas o modelo de dados é
imperativo — integrar com estado React controlado exige esforço.

**Veredicto para nosso caso:** excelente clipboard, mas licença comercial cara (US$999+/dev)
e ausência de row grouping descartam para sistema interno pequeno.

**Fontes:**
- https://handsontable.com/pricing
- https://news.ycombinator.com/item?id=19488642

---

## 3. Glide Data Grid

**Licença:** MIT — gratuito para uso comercial.

**Arquitetura:** renderização por Canvas (WebGL), fora do DOM HTML convencional.

**Pontos fortes:**
- Performance extrema (projetado para milhões de linhas, 60fps)
- Edição nativa por célula com tipos variados (text, number, image, etc.)
- Multi-select de células e linhas
- Suporte a React 16–19
- Pequeno bundle

**Clipboard paste multi-célula:** suportado via evento `onPaste`, que dispara
`onCellEdited` para cada célula afetada. A implementação funciona, mas a integração
com estado React controlado exige lógica cuidadosa (loop de updates por célula pode
gerar N chamadas de update em vez de uma batch update).

**Row Grouping:** não documentado nativamente — a arquitetura canvas dificulta UX
de agrupamento estilo árvore.

**Undo:** não embutido — precisa implementar manualmente com pilha de estados.

**Desvantagem crítica para nosso caso:** a renderização canvas significa que estilização
CSS padrão não funciona. Customização visual (BRL formatting, classes condicionais, cores
de categoria) exige `drawCell` customizado em canvas, elevando significativamente a
complexidade de manutenção.

**Manutenção:** ativa (Glide Apps), mas foco em casos de uso de alta performance.

**Veredicto para nosso caso:** overkill em performance para 200–500 linhas; a barreira
canvas torna manutenção custosa para sistema interno sem dev especializado em canvas.

**Fontes:**
- https://github.com/glideapps/glide-data-grid
- https://best-of-web.builder.io/library/glideapps/glide-data-grid

---

## 4. TanStack Table (ex-React Table)

**Licença:** MIT — gratuito para uso comercial.

**Arquitetura:** headless — zero DOM/CSS embutido; você constrói o markup inteiro.

**Bundle size:** ~14,6 kB gzipped (o menor da categoria).

**O que a lib faz:**
- Lógica de sorting, filtering, paginação, agrupamento, expansão de linhas
- API de estado controlado muito limpa para TypeScript
- Row grouping com `getGroupedRowModel()` — bom suporte nativo

**O que você PRECISA construir do zero:**
- Renderização das células e da tabela HTML
- Edição inline (célula focada → input ativo) com gestão de foco/blur
- Navegação Tab/Enter/setas entre células editáveis
- Paste multi-célula do Excel (interceptar `onPaste`, parsear TSV, mapear para linhas/cols)
- Undo/Redo (pilha de estados)
- Formatação BRL

**Esforço estimado para nosso caso:** 2–4 semanas de dev para implementar edição inline
robusta + clipboard + undo + navegação por teclado do zero com qualidade de produção.

**Manutenção:** excelente — Tanner Linsley, comunidade grande, releases frequentes.

**Veredicto para nosso caso:** máxima flexibilidade, mas o "trabalho de grade" todo recai
sobre o time. Adequado apenas se o time quer controle total e tem disponibilidade.
Muito próximo de "construir do zero" — ver seção 9.

**Fontes:**
- https://tanstack.com/table/v8/docs/framework/react/examples/editable-data
- https://dev.to/stacknotice/tanstack-table-v8-complete-react-data-table-guide-2026-4chg

---

## 5. react-data-grid (adazzle / Comcast)

**Licença:** MIT — gratuito para uso comercial.

**NPM:** `react-data-grid` — versão 7.0.0-beta.61 (agosto 2026, atualizado 17 dias atrás).

**Stars:** ~7,7k. **Forks:** ~2,2k. **Zero dependências externas.**

**Bundle size:** ~39 kB gzipped (estimativa baseada em comparações publicadas; lib leve).

**O que funciona nativamente:**
- Edição inline por célula com editor customizável
- Navegação Tab/Enter/setas — nativo, Excel-like
- Cópia de células (Ctrl+C) — suportado
- `TreeDataGrid` para hierarquia/agrupamento de linhas
- Virtualização de linhas e colunas
- React 19 suportado

**Clipboard paste multi-célula do Excel:** aqui está o ponto fraco. Issues #906 e #2736
no GitHub documentam que paste multi-célula não é nativo. O handler `onPaste` existe,
mas colar bloco do Excel exige implementação customizada: interceptar o evento paste,
parsear o TSV (clipboard do Excel usa tab como separador), e iterar pelas células afetadas.
É factível em ~200–400 linhas de código, mas não vem pronto.

**Undo:** não embutido — precisa pilha externa.

**Manutenção:** ativa, com commits recentes. Ainda em beta série 7 há bastante tempo —
ponto de atenção para projetos que exigem estabilidade de API.

**Integração React controlada:** excelente — padrão `rows` + `onRowsChange`.

**Veredicto para nosso caso:** boa base; edição e navegação nativas; clipboard multi-célula
exige +100–300 linhas de código customizado mas é straightforward; row grouping via
`TreeDataGrid`. Candidato forte.

**Fontes:**
- https://github.com/adazzle/react-data-grid
- https://github.com/adazzle/react-data-grid/issues/2736

---

## 6. Univer

**Licença:** Apache-2.0 — gratuito para uso comercial. Univer Pro é opcional.

**O que é:** framework completo de planilha/documento no browser — pensa Google Sheets
embeddable. Canvas rendering.

**Funcionalidades:**
- Fórmulas Excel (compatibilidade crescente), formatação condicional, pivot tables
- Colaboração em tempo real (opcional)
- Integração React, Vue, Web Components
- Import/Export XLSX

**Para nosso caso:** é um canhão para matar moscas. A curva de integração é alta
(sistema de plugins próprio), o bundle é substancial, e as necessidades do módulo de gastos
(200–500 linhas, agrupamento por categoria, cálculo qtd × unitário) não justificam
a complexidade de um framework de spreadsheet completo.

**Manutenção:** ativa (empresa chinesa dream-num), repositório vigoroso no GitHub.

**Veredicto para nosso caso:** não recomendado — excesso de complexidade para o escopo.

**Fontes:**
- https://github.com/dream-num/univer
- https://blog.univer.ai/posts/10-best-spreadsheet-components-for-developers-in-2025/

---

## 7. Jspreadsheet CE

**Licença:** MIT (CE = Community Edition) — gratuito para uso comercial.

**Stars:** ~7,2k. **Forks:** ~891.

**Funcionalidades CE:**
- Paste direto do Excel (Ctrl+C no Excel → Ctrl+V na grade) — nativo e bem implementado
- Fórmulas básicas
- Tipos de coluna: dropdown, checkbox, numérico, date picker, color picker
- Merge de células, headers aninhados
- Wrappers dedicados para React e Vue

**Limitações CE vs Pro:**
- Fórmulas avançadas, XLSX handling, virtual rendering, performance em datasets grandes
  — apenas na versão Pro (comercial)

**Row grouping:** não documentado no CE — foco é planilha, não data grid com hierarquia.

**Bundle size:** não documentado claramente; integra via DOM mount (não componente React puro).

**Desvantagem:** a integração React é via wrapper DOM (monta em um `div ref`) — menos idiomática
que libs que usam JSX/state nativo React. Pode gerar friction com SSR ou testes.

**Manutenção:** ativa, mas comunidade menor que adazzle/rdg.

**Veredicto para nosso caso:** clipboard Excel é o ponto forte. Row grouping ausente é
limitação relevante. A integração DOM-wrapper é menos elegante no stack React/TypeScript.
Candidato secundário se clipboard for o critério absoluto.

**Fontes:**
- https://github.com/jspreadsheet/ce
- https://bossanova.uk/jspreadsheet/blog/open-source-javascript-spreadsheet

---

## 8. MUI DataGrid

**Licença e preços:**
- **Community (MIT):** gratuito — sorting, filtering, paginação, edição inline, navegação teclado
- **Pro:** US$299/dev/ano — column pinning, reordering, tree data
- **Premium:** US$599/dev/ano — row grouping, aggregation, Excel export, **clipboard paste (Ctrl+V)**
- **Enterprise:** US$1.399/dev/ano

**Clipboard paste multi-célula:** exclusivo do tier **Premium** (US$599/dev/ano).

**Row Grouping:** exclusivo do **Premium**.

**Edição inline:** disponível na Community.

**Navegação por teclado:** disponível na Community.

**Bundle size:** ~90–95 kB gzipped.

**Integração React controlada:** excelente — padrão MUI, TypeScript first, bem documentado.

**Manutenção:** excelente — equipe MUI, releases frequentes, docs impecáveis.

**Veredicto para nosso caso:** para obter clipboard paste + row grouping precisaria
do tier Premium (US$599/dev/ano). Para sistema interno pequeno, custo-benefício é ruim.
A Community cobre edição e navegação, mas as features-chave ficam atrás do paywall.

**Fontes:**
- https://mui.com/x/react-data-grid/
- https://mui.com/pricing/
- https://mui.com/x/react-data-grid/clipboard/

---

## 9. react-spreadsheet (nadbm / Iddan)

**Licença:** MIT.

**NPM:** `react-spreadsheet`

**Funcionalidades:**
- Interface estilo planilha pura, foco em UX de entrada de dados
- Paste multi-célula do Excel — nativo e bem implementado
- Undo/Redo — embutido
- Drag-to-fill — embutido
- Estado controlado ou não-controlado

**Limitações:**
- Não tem virtualização (problemático acima de ~1.000 linhas, ok para 200–500)
- Row grouping não nativo
- Formatação customizada de célula exige custom cell renderers

**Bundle size:** pequeno (sem virtualização, sem canvas).

**Manutenção:** ativa, mas menor tração que adazzle/rdg.

**Veredicto para nosso caso:** forte candidato se undo + clipboard out-of-the-box forem
prioridade absoluta. Limitação: sem row grouping nativo.

---

## 10. Alternativa: Grade própria com tabela HTML controlada

Esta é a abordagem atual do sistema em outras telas (ver `pages/TempPlanilha.tsx`,
`ConfiguracaoVendas.tsx`, `ControleImagens.tsx`) e é consistente com o padrão
hooks + orquestrador elogiado na avaliação do parque.

**Quando é suficiente:**
- Número de linhas previsível e pequeno (< 300) sem necessidade futura de virtualização
- Layout já estabelecido no sistema (consistência visual)
- Células editáveis são relativamente simples (inputs de texto e número)
- Time conhece o código e pode manter sem depender de breaking changes de terceiros

**O que precisa ser construído:**
- Hook `useGridNavigation` (Tab/Enter/setas) — ~80–120 linhas, padrão conhecido
- Hook `useGridClipboard` (interceptar paste, parsear TSV do Excel) — ~60–100 linhas
- Hook `useUndo` (pilha de estados com `useReducer`) — ~40–60 linhas
- Lógica de agrupamento por categoria — ~30–50 linhas com `Array.reduce`
- Formatação BRL — `Intl.NumberFormat` nativo, já provavelmente em uso no sistema

**Esforço total estimado:** 3–6 dias de dev para implementação inicial sólida;
depois disso, custo zero de licença e máximo controle.

**Vantagem estratégica:** o código mora no repo, segue o mesmo padrão de testes e RLS
que o `PADRAO-NOVOS-SISTEMAS.md` exige, sem risco de breaking changes de lib externa.

**Quando NÃO é suficiente:**
- Se a grade precisar crescer para > 1.000 linhas (falta virtualização)
- Se precisar de features avançadas (fórmulas cross-célula, freeze columns, resizable cols)
- Se o time não tiver disponibilidade para construir e manter a infraestrutura de grade

---

## Tabela Resumo Comparativa

| Biblioteca | Licença/Custo | Clipboard Excel multi-célula | Row Grouping | Undo embutido | Bundle gzip | Manutenção |
|---|---|---|---|---|---|---|
| AG Grid Community | MIT / grátis | Não nativo (Enterprise) | Enterprise | Não | ~338 kB | Excelente |
| AG Grid Enterprise | US$999+/dev | Sim | Sim | Não | ~338 kB | Excelente |
| Handsontable | US$999+/dev | Sim (nativo) | Não | Não | ~286 kB | Ativa |
| Glide Data Grid | MIT / grátis | Via onPaste (canvas) | Não nativo | Não | Pequeno | Ativa |
| TanStack Table | MIT / grátis | Manual (headless) | Sim (lógica) | Manual | ~14,6 kB | Excelente |
| react-data-grid (adazzle) | MIT / grátis | Manual (~200 linhas) | Sim (TreeDataGrid) | Não | ~39 kB | Ativa |
| Univer | Apache-2.0 / grátis | Sim (framework) | Sim | Sim | Grande | Ativa |
| Jspreadsheet CE | MIT / grátis | Sim (nativo) | Não nativo | Não | N/D | Ativa |
| MUI DataGrid Community | MIT / grátis | Não (Premium) | Premium | Não | ~90–95 kB | Excelente |
| MUI DataGrid Premium | US$599/dev/ano | Sim | Sim | Não | ~90–95 kB | Excelente |
| react-spreadsheet | MIT / grátis | Sim (nativo) | Não nativo | Sim | Pequeno | Ativa |
| Grade HTML própria | grátis / sem dep | Manual (~80 linhas) | Manual (~40 linhas) | Manual (~50 linhas) | Zero | Você |

---

## Recomendação

### 1ª Opção: react-data-grid (adazzle) + clipboard customizado

**Por quê:**
- MIT, zero custo, zero dependências externas
- Edição inline e navegação Tab/Enter/setas nativos e bem testados
- `TreeDataGrid` cobre agrupamento por categoria
- Estado controlado (`rows` + `onRowsChange`) se encaixa perfeitamente no padrão de
  hooks do sistema
- Bundle leve (~39 kB)
- O único gap — clipboard paste multi-célula do Excel — exige ~150–250 linhas de código
  customizado (interceptar `paste`, parsear TSV tab-delimitado, mapear para `rows`).
  Esse hook pode ser testado unitariamente, seguindo o `PADRAO-NOVOS-SISTEMAS.md`.
- Undo pode ser implementado com `useReducer` + pilha de snapshots de `rows` (~50 linhas)

**Ressalva:** lib ainda em beta série 7 — testar versão específica e fixar no package.json.

### 2ª Opção: Grade própria com tabela HTML controlada

**Por quê:**
- Segue o exato padrão já elogiado no parque (`TempPlanilha.tsx`, `ConfiguracaoVendas.tsx`)
- Zero dependência de terceiro, zero breaking changes, zero custo de licença
- Para 200–500 linhas sem virtualização a performance é totalmente adequada
- O código de clipboard, navegação e undo pode ser extraído como hooks reutilizáveis
  (`useGridNav`, `useGridClipboard`, `useUndo`) — investimento que serve para futuras
  telas de grade no sistema
- Integração com formatação BRL, cores de categoria e layout existente é trivial

**Quando preferir a 2ª opção sobre a 1ª:**
- Se o time prefere não adicionar dependências externas (filosofia do projeto)
- Se as células tiverem lógica de renderização muito customizada (merge visual, ícones, etc.)
- Se a grade não precisar crescer além de 500 linhas

**Quando preferir a 1ª opção sobre a 2ª:**
- Se houver chance de crescer para > 500 linhas (virtualização já embutida no adazzle/rdg)
- Se o time quiser uma API de grade pronta com menos código inicial a manter
- Se row grouping precisar de interações ricas (expand/collapse aninhado)

### Descartar:

- **AG Grid Enterprise, Handsontable, MUI Premium:** custo de licença injustificável para sistema interno
- **Glide Data Grid:** canvas = barreira alta de manutenção e customização CSS
- **Univer:** framework completo de spreadsheet, excesso de complexidade
- **TanStack Table puro:** equivale a construir do zero, sem nem o DOM da grade pronto
- **react-datasheet:** oficialmente deprecated

---

## Próximos Passos Sugeridos

1. Validar com o usuário: prefere depender de biblioteca externa (opção 1) ou manter
   padrão sem dependências (opção 2)?
2. Se opção 1: instalar `react-data-grid@7.0.0-beta.61`, montar POC com edição inline
   e `TreeDataGrid` para agrupamento por categoria
3. Se opção 2: criar `hooks/useGridClipboard.ts`, `hooks/useGridNavigation.ts`,
   `hooks/useUndo.ts` e tabela HTML semântica em `components/custos/GradeCustos.tsx`
4. Em qualquer caso: implementar `formatBRL()` se ainda não existir em utils
5. Cobrir o hook de clipboard com teste unitário (mock de `ClipboardEvent` com TSV)

---

## Fontes Consultadas

- AG Grid Community vs Enterprise: https://www.ag-grid.com/react-data-grid/community-vs-enterprise/
- AG Grid Clipboard docs: https://www.ag-grid.com/react-data-grid/clipboard/
- AG Grid Pricing 2026: https://www.simple-table.com/blog/ag-grid-pricing-license-breakdown-2026
- Handsontable Pricing: https://handsontable.com/pricing
- Handsontable license history (HN): https://news.ycombinator.com/item?id=19488642
- Glide Data Grid GitHub: https://github.com/glideapps/glide-data-grid
- Glide Data Grid overview 2025: https://best-of-web.builder.io/library/glideapps/glide-data-grid
- TanStack Table editable example: https://tanstack.com/table/v8/docs/framework/react/examples/editable-data
- TanStack Table 2026 guide: https://dev.to/stacknotice/tanstack-table-v8-complete-react-data-table-guide-2026-4chg
- adazzle react-data-grid GitHub: https://github.com/adazzle/react-data-grid
- adazzle clipboard issue: https://github.com/adazzle/react-data-grid/issues/2736
- Univer GitHub: https://github.com/dream-num/univer
- Univer blog 2025: https://blog.univer.ai/posts/10-best-spreadsheet-components-for-developers-in-2025/
- Jspreadsheet CE GitHub: https://github.com/jspreadsheet/ce
- MUI DataGrid docs: https://mui.com/x/react-data-grid/
- MUI Pricing: https://mui.com/pricing/
- MUI Clipboard (Premium): https://mui.com/x/react-data-grid/clipboard/
- react-spreadsheet vs react-data-grid comparison: https://npm-compare.com/react-data-grid,react-datasheet,react-spreadsheet
- Bundle size comparison 2025: https://www.simple-table.com/blog/react-data-grid-bundle-size-comparison
- Syncfusion Top 5 React Data Grids 2026: https://www.syncfusion.com/blogs/post/top-react-data-grid-libraries
- Top AG Grid alternatives: https://svar.dev/blog/top-react-alternatives-to-ag-grid/
