# Refatoração — fila e padrão

> Só atuar quando o usuário disser explicitamente: **"quero refatorar [arquivo]"**
> ou **"iniciar refatoração de [arquivo]"**. Esta é uma lista de memória, não uma
> autorização para agir.

## Regra permanente (arquitetura)

- Páginas **NÃO** importam `supabase` direto — sempre via `services/`.
- Páginas são orquestradores: lógica em `hooks/`, visual em `components/[modulo]/`.

## Fila atual (residual)

| Alvo | Linhas | Problema |
|---|---|---|
| `pages/CadastroEvento.tsx` | 795 | Reavaliar se passar de 1.000 |
| `pages/Users.tsx` (modal edição) | 652 | Modal permanente com 10+ estados entrelaçados — extração futura |
| `hooks/useDashboardExportPDF.ts` | 493 | Desenho jsPDF → funções puras em utils (baixa prioridade) |

## Aceitáveis (não refatorar)

- `services/backupService.ts` — serviço puro, bem estruturado.
- `pages/TempPlanilha.tsx`, `ConfiguracaoVendas.tsx`, `ControleImagens.tsx` —
  padrão hooks+orquestrador elogiado na avaliação.

## Padrão de refatoração (referência: Dashboard)

1. Branch isolada: `git checkout -b refactor-[nome]`.
2. Extrair lógica pesada para `hooks/`.
3. Extrair componentes visuais para `components/[modulo]/`.
4. A página vira orquestrador limpo.
5. Documentar progresso caso a sessão seja interrompida.

> Plano de 11/07/2026 EXECUTADO (fases 0-7, branch `refactor-legibilidade-2026-07`,
> 11 commits). Resultados e pendências: **PLANO-REFATORACAO-2026-07.md** (raiz).
