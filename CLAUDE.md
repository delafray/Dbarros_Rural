# Instruções para a IA — VendasEventos

## ⚠️ IMPORTANTE: Não tome iniciativas não solicitadas

Apenas execute o que o usuário pedir explicitamente. Não proponha refatorações, melhorias ou limpezas a menos que o usuário peça diretamente.

---

## Fila de Refatoração (NÃO agir — apenas referência)

> Esta seção é uma **lista de memória**. Só atuar aqui quando o usuário disser explicitamente:
> **"quero refatorar [nome do arquivo]"** ou **"iniciar refatoração de [nome do arquivo]"**

| Arquivo | Linhas | Problema |
|---|---|---|
| `pages/Photos.tsx` | 1.782 | UI + gestures + PDF export + galeria misturados |
| `pages/TempPlanilha.tsx` | 1.778 | Tabela + imagens + atendimentos + recebimentos |
| `pages/ConfiguracaoVendas.tsx` | 1.694 | Lógica de preços + UI misturados |
| `pages/ControleImagens.tsx` | 1.429 | Config imagens + drive + avulsas + recebimentos |

**Arquivos aceitáveis (não refatorar):**
- `pages/Atendimentos.tsx` (1.043) — focado, só tem muitos states
- `services/backupService.ts` (1.047) — serviço puro, bem estruturado

---

## Padrão de Refatoração (referência do Dashboard)

Quando o usuário pedir para refatorar, seguir o mesmo padrão aplicado no Dashboard:
1. Criar branch isolada: `git checkout -b refactor-[nome]`
2. Extrair lógica pesada para hooks em `hooks/`
3. Extrair componentes visuais para `components/[modulo]/`
4. O arquivo `pages/` vira orquestrador limpo
5. Documentar progresso caso a sessão seja interrompida
