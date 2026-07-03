# Instruções para a IA — VendasEventos

## ⚠️ IMPORTANTE: Não tome iniciativas não solicitadas

Apenas execute o que o usuário pedir explicitamente. Não proponha refatorações, melhorias ou limpezas a menos que o usuário peça diretamente.

---

## Fila de Refatoração (NÃO agir — apenas referência)

> Esta seção é uma **lista de memória**. Só atuar aqui quando o usuário disser explicitamente:
> **"quero refatorar [nome do arquivo]"** ou **"iniciar refatoração de [nome do arquivo]"**

> Atualizada em 02/07/2026 — Photos, TempPlanilha, ConfiguracaoVendas e ControleImagens
> já foram refatorados (padrão hooks + components). Fila atual:

| Arquivo | Linhas | Problema |
|---|---|---|
| `pages/CadastroCliente.tsx` | 1.326 | Maior arquivo do core; importa `supabase` direto ignorando `clientesService`; PF/PJ + abas + validação misturados |
| `pages/Users.tsx` | 966 | 3 responsabilidades: usuários permanentes + visitantes temporários + link/WhatsApp |
| `pages/CadastroEvento.tsx` | 794 | Crescendo; avaliar quando passar de 1.000 |

**Arquivos aceitáveis (não refatorar):**
- `pages/Atendimentos.tsx` (1.088) — focado, só tem muitos states
- `services/backupService.ts` (~970) — serviço puro, bem estruturado

---

## Padrão de Refatoração (referência do Dashboard)

Quando o usuário pedir para refatorar, seguir o mesmo padrão aplicado no Dashboard:
1. Criar branch isolada: `git checkout -b refactor-[nome]`
2. Extrair lógica pesada para hooks em `hooks/`
3. Extrair componentes visuais para `components/[modulo]/`
4. O arquivo `pages/` vira orquestrador limpo
5. Documentar progresso caso a sessão seja interrompida
