# Instruções para a IA — VendasEventos

## ⚠️ IMPORTANTE: Não tome iniciativas não solicitadas

Apenas execute o que o usuário pedir explicitamente. Não proponha refatorações, melhorias ou limpezas a menos que o usuário peça diretamente.

---

## Fila de Refatoração (NÃO agir — apenas referência)

> Esta seção é uma **lista de memória**. Só atuar aqui quando o usuário disser explicitamente:
> **"quero refatorar [nome do arquivo]"** ou **"iniciar refatoração de [nome do arquivo]"**

> ✅ **Plano de 11/07/2026 EXECUTADO** (fases 0-7, branch `refactor-legibilidade-2026-07`,
> 11 commits verificados). Resultados e pendências residuais: **PLANO-REFATORACAO-2026-07.md**.
> Regra permanente: páginas NÃO importam `supabase` direto (usar services);
> páginas são orquestradores (lógica em hooks/, visual em components/[modulo]/).

**Fila atual (residual):**

| Alvo | Linhas | Problema |
|---|---|---|
| `pages/CadastroEvento.tsx` | 795 | Reavaliar se passar de 1.000 |
| `pages/Users.tsx` (modal edição) | 652 | Modal de usuário permanente com 10+ estados entrelaçados — extração futura |
| `hooks/useDashboardExportPDF.ts` | 493 | Desenho jsPDF → funções puras em utils (baixa prioridade) |

**Arquivos aceitáveis (não refatorar):**
- `services/backupService.ts` (1.154) — serviço puro, bem estruturado
- `pages/TempPlanilha.tsx`, `ConfiguracaoVendas.tsx`, `ControleImagens.tsx` — padrão hooks+orquestrador elogiado na avaliação

---

## Padrão de Refatoração (referência do Dashboard)

Quando o usuário pedir para refatorar, seguir o mesmo padrão aplicado no Dashboard:
1. Criar branch isolada: `git checkout -b refactor-[nome]`
2. Extrair lógica pesada para hooks em `hooks/`
3. Extrair componentes visuais para `components/[modulo]/`
4. O arquivo `pages/` vira orquestrador limpo
5. Documentar progresso caso a sessão seja interrompida
