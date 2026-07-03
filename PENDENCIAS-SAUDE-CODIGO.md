# Pendências — Avaliação de Saúde do Código (02/07/2026)

> Origem: avaliação com 6 agentes (arquitetura, bugs, segurança, performance, dados e débito técnico).
> As correções de baixo risco já foram aplicadas na branch **`correcoes-saude-codigo`** (ver seção final).
> **Nada foi enviado para `main` nem aplicado no banco de produção.**

---

## 🔴 SÓ VOCÊ PODE FAZER — ações no painel do Supabase (urgente)

1. **Revogar o token administrativo** `sbp_a5ab...` que está no `.env.local` (linha `SUPABASE_ACCESS_TOKEN`).
   Painel Supabase → Account → Access Tokens → Revoke. Se precisar do CLI, gere outro e guarde **fora** da pasta do projeto.

2. **Verificar policy `anon` na tabela `users`** — Supabase Studio → Table Editor → `users` → RLS Policies.
   O login consulta `users` **antes** de autenticar (`authService.ts:147`), então provavelmente existe uma policy para `anon`.
   Se existir e ela liberar todas as colunas, **qualquer pessoa sem login pode ler `temp_password_plain` (senhas em texto claro!)**.
   Correção ideal: reestruturar o login para autenticar primeiro (`signInWithPassword`) e só depois buscar o perfil.

3. ~~Aplicar as 2 migrations preparadas~~ ✅ **APLICADAS em 02/07/2026** e testadas ao vivo:
   - `backup_introspect()` agora nega acesso a não-admins (testado com chave anon → "Acesso negado") ✅
   - RPC `regenerate_estandes` existe e o `generateEstandes()` do código já foi trocado para usá-la ✅
   - Teste automatizado em `scripts/test-migrations-20260702.mjs` (rodar: `node scripts/test-migrations-20260702.mjs`)

3b. **🔴 NOVA — CONFIRMADO vazamento na tabela `users`**: teste ao vivo em 02/07/2026 provou que
   **qualquer pessoa SEM login lê a tabela `users`, incluindo a coluna `temp_password_plain`**
   (a policy é `TO public`, por isso o diagnóstico de `anon` veio vazio). Enquanto não corrigir,
   a senha de qualquer visitante temporário criado fica pública.
   Correção pronta em `supabase/migrations/20260702000002_restrict_anon_users_columns.sql`, MAS a ordem importa:
   1. Mergear a branch `correcoes-saude-codigo` e fazer o deploy (o login novo busca só as colunas mínimas antes de autenticar)
   2. SÓ DEPOIS aplicar a migration `20260702000002` (aplicar antes do deploy QUEBRA O LOGIN em produção)
   3. Rodar `node scripts/test-migrations-20260702.mjs` — os 3 testes devem passar
   Mitigação imediata enquanto isso: evitar criar visitantes temporários, ou apagar o valor de `temp_password_plain` logo após repassar a senha.

4. **Regenerar `database.types.ts`** (elimina os 4 erros atuais de tsc e vários `as any`):
   ```bash
   npx supabase gen types typescript --project-id <SEU_PROJECT_REF> > database.types.ts
   ```
   Faltam: colunas `responsavel_empresa`/`cpf_responsavel` (clientes), `retorno_cancelado_nota` (atendimentos_historico) e as tabelas `photos`, `photo_tags`, `tags`, `tag_categories`, `system_config`, `user_biometrics`, `cardapios`.

5. **Decidir sobre `temp_password_plain`** (senha em texto claro na tabela `users`).
   Recomendação: mostrar a senha UMA vez na criação para o admin copiar, e apagar a coluna. É decisão de produto — precisa de você.

6. **Revisar e mergear a branch `correcoes-saude-codigo`** — testar login, criação de visitante temporário, salvar configuração de vendas, remover atendimento e gerar backup antes de ir para produção.

---

## 🟠 Backlog registrado (fazer nas próximas sessões, sem pressa)

| # | Item | Onde | Observação |
|---|---|---|---|
| 1 | Tailwind via CDN → bundle do Vite | `index.html` | PWA offline pode abrir SEM estilo com cache frio. Exige teste visual completo. |
| 2 | `React.lazy` nas rotas | `App.tsx` | Nenhuma rota tem code splitting. Fazer junto com a remoção do cardápio. |
| 3 | Rename de categorias por identidade (não por posição) | `hooks/useConfigSave.ts` + `CategoriaSetup` | Apliquei guardas que evitam corrupção, mas o conserto definitivo exige um `id` estável por categoria. |
| 4 | Timezone misto em datas | `eventosService.ts:77`, `Atendimentos.tsx:93` | ISO é lido como UTC, DD/MM como local — ordenação e "vencido 3h antes". Criar `utils/dateUtils.ts`. |
| 5 | `formatBRL()` compartilhado | criar `utils/formatCurrency.ts` | Moeda formatada inline em 8 lugares diferentes. |
| 6 | Estados de erro nos hooks de dados | `usePlanilhaData`, `useControleData`, `useConfigData` | Erro de carregamento hoje = tela vazia sem mensagem ("a planilha sumiu"). |
| 7 | Race condition ao trocar edição | `hooks/usePlanilhaData.ts:36` | useEffect sem abort/cleanup pode misturar dados de duas edições. |
| 8 | Revert otimista das observações | `hooks/usePlanilhaEditing.ts:88` | Único campo que não reverte em falha de save. |
| 9 | Refatorar `CadastroCliente.tsx` (1.224 linhas) | `pages/` | Maior arquivo do core, importa `supabase` direto ignorando `clientesService`. Seguir o padrão do ControleImagens. O CLAUDE.md lista arquivos já refatorados — atualizar a fila. |
| 10 | Ligar `strict` no tsconfig gradualmente | `tsconfig.json` | 208 `any` em 52 arquivos; zero flags de tipo ativas. |
| 11 | Primeiro teste automatizado | — | Zero testes. Começar por `utils/masks.ts` (CPF/CNPJ). Deletar `services/__mocks__/mockService.ts` (órfão). |
| 12 | Soft delete / auditoria nas entidades principais | services | Hoje deletar evento/edição apaga tudo em cascata sem recuperação. |
| 13 | CORS `*` na Edge Function de passkey | `supabase/functions/passkey-auth/index.ts:12` | Restringir ao domínio de produção. |
| 14 | Campo `is_master` dedicado | migration | Hoje `can_manage_tags` = master por acidente semântico. |
| 15 | Storage órfão em `edicaoDocsService` | `edicaoDocsService.ts` | Upload/remove sem verificação deixa arquivos órfãos no Storage. |
| 16 | Paginação/select específico nas queries | `clientesService`, `eventosService`, `planilhaVendasService`, `photoService` | `select('*')` sem limit — vai doer quando os dados crescerem. |
| 17 | `GEMINI_API_KEY` no `define` do Vite | `vite.config.ts:85-86` | Hoje é placeholder, mas se um dia colocar chave real ela vaza no bundle. Remover o `define` se não usa Gemini. |

## 🍽️ Cardápio (gambiarra assumida — quando decidir remover)

Remoção é **limpa**: 21 arquivos / ~4.489 linhas, nenhum módulo core depende dele.
Passos: remover 7 rotas do `App.tsx` + 2 links do `Layout.tsx` + deletar `pages/Cardapio*`, `A3Preview*`, `PainelDuplo.tsx`, `components/{cardapio,cardapioA4,a3Duplo,painelDuplo}/`, `services/{cardapioService,menuA4Service,cardapiosExportService}.ts`, `utils/cardapioParser.ts`.
Antes: verificar se a tabela `cardapios` tem FK com CASCADE para `eventos_edicoes` (para não deixar linhas órfãs) e se quer exportar os cardápios existentes. O pacote `modern-screenshot` só é usado pelo cardápio — remover do `package.json` junto.

---

## ✅ O que já foi feito na branch `correcoes-saude-codigo` (02/07/2026)

1. **Login**: sanitizador agora bloqueia curingas `%` e `*` (enumeração/bypass via `ilike`) — `authService.ts`.
2. **Senha de visitante temporário** gerada com `crypto.getRandomValues()` em vez de `Math.random()` — `authService.ts`.
3. **Validação antes do sync de estandes**: falha de banco agora BLOQUEIA o save em vez de prosseguir e poder deletar estandes com vendas — `hooks/useConfigSave.ts`.
4. **Guardas no rename de categorias**: não renomeia refs de imagens quando o pareamento posicional é ambíguo — `hooks/useConfigSave.ts`.
5. **Inserts de histórico verificados** (importação de atendimentos e criação de tarefas) — antes falhavam em silêncio.
6. **`handleDelete` de atendimento com try/catch** e alerta de erro — antes o erro era invisível.
7. **Bundle inicial: 2.065 KB → 669 KB**: `backupService` (com código-fonte embutido) e `JSZip` agora carregam sob demanda; import morto de jsPDF removido de `imageUtils.ts`; jsPDF do export de fotos virou import dinâmico.
8. **`chancela.png` (1,56 MB) fora do precache do PWA** — `vite.config.ts`.
9. **`AuthContext` memoizado** (useCallback + useMemo) — elimina re-renders em cascata.
10. **Limpeza**: deletados `DIREITA.png`/`ESQUERDA.png` (25 MB, duplicatas de `public/`), `diff.txt`, `output_teste_al.txt`, `walkthrough.md`, `tsc*.log`; `BAR 52X/` e `_manual_/` saíram do git mas continuam no disco; `.gitignore` atualizado.
11. **2 migrations preparadas** (NÃO aplicadas) — ver seção vermelha acima.

Validação: `npm run build` OK; `npx tsc --noEmit` com os mesmos 4 erros pré-existentes (todos por `database.types.ts` desatualizado — item 4 acima).
