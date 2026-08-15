# Instruções para a IA — VendasEventos

## ⚠️ IMPORTANTE: Não tome iniciativas não solicitadas

Apenas execute o que o usuário pedir explicitamente. Não proponha refatorações, melhorias ou limpezas a menos que o usuário peça diretamente.

---

## Padrão de qualidade (em vigor a partir de 01/08/2026)

Este sistema segue o **`PADRAO-NOVOS-SISTEMAS.md`** (na raiz). Ao implementar qualquer
mudança que o usuário pedir, a feature só está "pronta" com **teste cobrindo a lógica
nova** e, se tocar em dado, com a **RLS/segurança revisada** (checklist da seção 4 do guia).
Nunca deixar teste ou RLS "para depois". Isto NÃO significa sair testando o sistema
inteiro sem pedido — significa que o que for feito daqui pra frente já sai com teste + RLS.

---

## Módulo de Custos do Evento — EM PLANEJAMENTO (não implementar)

> **🔄 GATILHO DE RETOMADA**: se o usuário disser "vamos voltar ao nosso novo
> módulo" / "módulo de custos" / "centro de custo", ler PRIMEIRO
> **`MODULO-CUSTOS/LEIA-PRIMEIRO-RETOMADA.md`** e seguir o protocolo de lá
> (carrega os 7 docs inteiros + mapa da pesquisa sob demanda) ANTES de
> responder qualquer conteúdo.

O novo módulo de custos (orçado × contratado × realizado) está em fase de
**levantamento de requisitos que durará várias sessões**. Tudo vive na pasta
**`MODULO-CUSTOS/`**. Fonte única da verdade:
**`MODULO-CUSTOS/DOC-MODULO-CUSTOS/`** (00-índice, 01-visão, 02-domínio,
03-requisitos, 04-perguntas/decisões, 05-checklist, 06-pontos-cegos). Regras:

1. **Todo requisito que o usuário mencionar** entra em `.../03-REQUISITOS.md`
   numerado, com data e status. Toda dúvida vira Q-nnn em `04-PERGUNTAS-E-DECISOES.md`;
   respostas migram para o log de decisões. Nada fica só na conversa.
2. **Nenhuma implementação** até o usuário autorizar explicitamente. O rascunho
   técnico `MODULO-CUSTOS/PLANO-MODULO-CUSTOS-EVENTO.md` é subordinado à
   documentação e será revisado quando o levantamento fechar.
3. Pesquisa de referência (40 relatórios): `MODULO-CUSTOS/PESQUISA-MODULO-CUSTOS/`.

---

## Versionamento (automático — não editar à mão)

Formato `0.AAAA.MM.NNNN`, onde `NNNN` é o **contador do mês** (commits do mês corrente,
reinicia na virada do mês; exibido no app como `V0.AAAA.MM.NNNN`). A versão é atualizada
sozinha a cada commit pelo hook `.githooks/pre-commit`, que grava em `version.ts` e
`package.json`. **Não bumpe a versão manualmente** — deixe o hook fazer.
Detalhes e setup (`git config core.hooksPath .githooks`) em **VERSIONING.md**.
**Regra permanente (pedido do usuário, 14/08/2026): todo `git push` deve ser reportado
na resposta com o hash do commit E a versão** (ex.: `d5c61ab → V0.2026.08.0097`), para
ele conferir o deploy sem abrir a Vercel.

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
