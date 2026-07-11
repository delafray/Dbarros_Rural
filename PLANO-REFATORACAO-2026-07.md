# Plano de Refatoração — julho/2026

> ## ✅ EXECUTADO em 11/07/2026 (branch `refactor-legibilidade-2026-07`, 11 commits)
> Resultados (linhas antes → depois): CadastroCliente 1.327→242 · Atendimentos
> 1.091→375 · Users 966→652 · Tarefas 688→232 · Tags 722→357 · Photos 734→476 ·
> PlanilhaAreaLivre 767→630 · ClienteSelectorWidget 535→122 · A3DuploCanvas
> 662→411 · CardapioCanvas (356 linhas mortas) deletado. Nenhuma página importa
> mais `supabase` direto (exceto services). tsc/80 testes/build verdes em cada commit.
> **Não executado:** `usePaginatedSearch` (Clientes/Eventos — risco/benefício
> baixo, padrões divergem) e modal de edição de usuário permanente no Users
> (10+ estados entrelaçados — próximo candidato). Itens "Menores" do fim do
> documento continuam válidos para o futuro.

> Gerado em 11/07/2026 a partir de avaliação por 8 agentes em 4 duplas (cada
> dupla leu a mesma área de forma independente; ✔✔ = os dois leitores
> apontaram o mesmo problema = alta confiança). Substitui a fila antiga do
> CLAUDE.md (02/07). Objetivo: legibilidade nível "dev pleno dá manutenção
> sem susto". Padrão de execução: branch `refactor-[nome]`, commits pequenos
> verificados (build+tsc+testes), lógica → `hooks/`, visual → `components/[modulo]/`,
> page vira orquestrador.

## Fase 0 — Quick wins transversais (1 branch só, ~1 sessão) ✔✔

Baratos, seguros e reduzem duplicação em vários arquivos de uma vez:

1. `utils/canvasHelpers.ts`: unificar `wrapText()` + `loadImage()` (duplicados
   em CardapioRenderer, CardapioA4Renderer e PainelDuploRenderer) e
   `drawScrew()` parametrizado (duplicado nos 2 renderers).
2. Fonte única para constantes de layout do banner: `CardapioCanvas.tsx`
   duplica CANVAS_W/H, cores e `calcHeaderH`/`calcEmpresaFs` do
   `CardapioRenderer.ts` (divergência silenciosa preview × export).
3. `utils/formatPeriodo.ts`: função duplicada em TempPlanilha e
   PlanilhaAreaLivre.
4. Cores de probabilidade (`probBgColor`/`probTextColor`) saem do
   `atendimentosService` (visual em service) para `utils/constants`.
5. `hooks/usePaginatedSearch.ts`: padrão de paginação+busca idêntico em
   Clientes.tsx e Eventos.tsx.

## Fase 1 — `pages/CadastroCliente.tsx` (1.326 linhas) ✔✔ 🔴

O maior ofensor do core. Achados das duplas:
- Acessa `supabase` direto (fetch em ~99-190 e save de ~180 linhas em
  ~402-582) ignorando o `clientesService` → mover para o service.
- Fetch inicial: 5 queries SEQUENCIAIS → `Promise.all` (ganho real de load).
- 3 handlers de validação quase idênticos (CPF/CNPJ/CPF-responsável) →
  `hooks/useDocumentValidation`.
- Lookups externos (BrasilAPI/ViaCEP) → `useCNPJLookup` / `useCEPLookup`.
- UI: abas Dados PF/PJ, Endereços, Contatos, Contratos →
  `components/cadastroCliente/` (page vira orquestrador ~400 linhas).
- `id.length > 10` para detectar registro novo é frágil → helper
  `isTemporaryId()`.

## Fase 2 — `pages/Atendimentos.tsx` (1.091 linhas) ✔✔ 🔴

REVOGA o "aceitável" da fila antiga: as duplas acharam 3 componentes internos
que somam ~700 linhas extraíveis baratas:
- `AtendimentoForm` (~400 linhas!), `HistoricoPopup` (~230), `ProbBadge` (~50)
  → `components/atendimentos/`.
- Filtro+sort de 60 linhas num useMemo → `useAtendimentosFilter`.
- Page final: ~300 linhas de lista + toolbar.

## Fase 3 — `pages/Users.tsx` (966 linhas) ✔✔ 🟠

- `TempUserModal` (~250-300 linhas) + `useTempUserFlow` (geração/cópia/link
  WhatsApp) → separa as 3 personas do arquivo.

## Fase 4 — Modais das páginas de mídia ✔✔ 🟠

Mesmo padrão nas três, dá para fazer em série na mesma branch:
- `Photos.tsx` (734): PhotoFormModal (~200 linhas) + PhotoPreviewModal.
- `Tags.tsx` (722): 5 modais inline (criar/editar categoria, criar/editar tag,
  colisão) → `components/tags/`.
- `Tarefas.tsx` (688): TarefaDetailModal + NovaTarefaModal + TarefaCard →
  `components/tarefas/`.

## Fase 5 — `components/ClienteSelectorWidget.tsx` (535 linhas) ✔✔ 🟠

- Acessa `supabase` direto (violação) → `clientesService`.
- 3 modos de UI no mesmo render (busca / nome livre / novo cliente) →
  subcomponentes por modo + `useClienteSearch`.

## Fase 6 — `pages/PlanilhaAreaLivre.tsx` (767 linhas) ✔ 🟡

- `supabase` direto em ~5 pontos (linhas ~12, 154-159, 396-407, 426-429,
  475-478) → service.
- `M2Field` local → `components/inputs/`.
- Cálculos (calcTotal/calcCombo) → `useAreaLivreCalculations`.
- Conferir interface dupla do `useDirtyState` (guardNavigation × safeNavigate).

## Fase 7 — `components/a3Duplo/A3DuploCanvas.tsx` (662 linhas) ✔✔ 🟡

Nosso, de 10/07 — separar enquanto está fresco:
- `EmpresaBlock` → arquivo próprio.
- Painel de fontes/cores/zoom/topo → `A3ControlPanel.tsx`.
- Canvas vira orquestrador (medição + páginas).

## Continuam aceitáveis (não mexer)

- `services/backupService.ts` (1.154) — serviço puro, bem estruturado.
- `pages/TempPlanilha.tsx`, `ConfiguracaoVendas.tsx`, `ControleImagens.tsx` —
  elogiados pelas duplas como bons exemplos do padrão hooks+orquestrador.
- `pages/CadastroEvento.tsx` (795) — reavaliar se passar de 1.000.

## Menores (aproveitar quando estiver no arquivo)

- SVGs inline repetidos entre páginas → `components/icons/`.
- `useDashboardExportPDF.ts` (493): desenho jsPDF → funções puras em utils.
- localStorage direto em Photos/Tags → `useLocalStorage`.
- Tipos inline no topo do CadastroCliente → `types/`.
