# Instruções para a IA — VendasEventos

## ⚠️ IMPORTANTE: Não tome iniciativas não solicitadas

Apenas execute o que o usuário pedir explicitamente. Não proponha refatorações, melhorias ou limpezas a menos que o usuário peça diretamente.

---

## Fila de Refatoração (NÃO agir — apenas referência)

> Esta seção é uma **lista de memória**. Só atuar aqui quando o usuário disser explicitamente:
> **"quero refatorar [nome do arquivo]"** ou **"iniciar refatoração de [nome do arquivo]"**

> Atualizada em 11/07/2026 — plano novo gerado por avaliação de 8 agentes em duplas
> (checagem cruzada). Detalhes completos por fase: **PLANO-REFATORACAO-2026-07.md** na raiz.

| Fase | Alvo | Linhas | Resumo |
|---|---|---|---|
| 0 | Quick wins transversais | — | wrapText/loadImage/drawScrew duplicados nos renderers; formatPeriodo; cores de probabilidade; usePaginatedSearch |
| 1 | `pages/CadastroCliente.tsx` | 1.326 | supabase direto, save de 180 linhas, 5 queries sequenciais, validação triplicada, abas → components |
| 2 | `pages/Atendimentos.tsx` | 1.091 | REVOGADO o "aceitável": AtendimentoForm (~400) + HistoricoPopup (~230) + ProbBadge internos |
| 3 | `pages/Users.tsx` | 966 | TempUserModal (~300) + useTempUserFlow |
| 4 | Photos / Tags / Tarefas | 734/722/688 | Modais inline → components/[modulo]/ |
| 5 | `components/ClienteSelectorWidget.tsx` | 535 | supabase direto + 3 modos de UI num render |
| 6 | `pages/PlanilhaAreaLivre.tsx` | 767 | supabase direto em 5 pontos, M2Field local, cálculos → hook |
| 7 | `components/a3Duplo/A3DuploCanvas.tsx` | 662 | EmpresaBlock + painel de controles → arquivos próprios |

**Arquivos aceitáveis (não refatorar):**
- `services/backupService.ts` (1.154) — serviço puro, bem estruturado
- `pages/TempPlanilha.tsx`, `ConfiguracaoVendas.tsx`, `ControleImagens.tsx` — padrão hooks+orquestrador elogiado na avaliação
- `pages/CadastroEvento.tsx` (795) — reavaliar se passar de 1.000

---

## Padrão de Refatoração (referência do Dashboard)

Quando o usuário pedir para refatorar, seguir o mesmo padrão aplicado no Dashboard:
1. Criar branch isolada: `git checkout -b refactor-[nome]`
2. Extrair lógica pesada para hooks em `hooks/`
3. Extrair componentes visuais para `components/[modulo]/`
4. O arquivo `pages/` vira orquestrador limpo
5. Documentar progresso caso a sessão seja interrompida
