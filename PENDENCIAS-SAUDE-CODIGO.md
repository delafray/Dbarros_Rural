# Pendências — Avaliação de Saúde do Código (02/07/2026)

---

## 🆕 TESTE CEGO #2 (02/07, à noite) — achados NOVOS, ainda não corrigidos

> Segunda rodada de 6 agentes, avaliação cega (sem acesso a este arquivo). Verifiquei
> manualmente os achados principais antes de registrar. Excluído: cardápio e itens já listados abaixo.

### 🔴 Mais urgentes (bugs reais confirmados no código)

| # | Achado | Onde | Confirmação |
|---|---|---|---|
| N1 | **Datas de montagem/desmontagem malformadas**: `` `${value} T10:00:00Z` `` tem ESPAÇO antes do T → `Invalid Date`. Os 4 campos de montagem/desmontagem de edições provavelmente nunca salvam corretamente. | `pages/CadastroEvento.tsx:583,594,605,616` | ✅ verificado |
| N2 | **Histórico de adiar/reagendar atendimento sempre sem autor**: `user_id: null` hardcoded (o `user` do useAuth está disponível no componente). Todo reagendamento aparece como "Sistema". | `components/ResolucaoAtendimentoModal.tsx:59` | ✅ verificado |
| N3 | **Auto-dismiss do diálogo pode fechar o diálogo errado**: o `setTimeout` de fechar alerta não é cancelado; se o usuário fechar o alerta e abrir um confirm logo em seguida, o timer antigo fecha o confirm sozinho. | `context/DialogContext.tsx:41` | ✅ verificado |
| N4 | **Edge function de biometria (passkey) com 3 falhas**: challenge do WebAuthn aceito do próprio cliente (anula anti-replay), endpoint `login-options` sem auth expõe userId por email, CORS `*` com service_role. Corrigir exige redesign + deploy via CLI (token). | `supabase/functions/passkey-auth/index.ts:84,124,148,12` | código confere; exige CLI |

### 🟠 Novos — segurança/dados (precisam de migration ou verificação no Studio)

- **N5** `rename_opcional_item()` é SECURITY DEFINER com GRANT para qualquer autenticado — um visitante pode renomear itens opcionais de todos os eventos (migration `20260227160000`).
- **N6** Visitantes leem `cpf_responsavel` dos clientes — a policy de leitura (`20260228_visitor_read_clientes`) é anterior à coluna de CPF (`20260316`). LGPD.
- **N7** `atendimentos_historico` não aparece na migration de isolamento master (`20260310000001`) — verificar no Studio se a tabela tem RLS/policy própria.
- **N8** Senha mínima de 4 caracteres (`pages/Users.tsx:337` `minLength={4}`) — subir para 8+ (e no painel do Supabase Auth).
- **N9** `TEMP_PASSWORD_HASH` hardcoded no `backupService.ts:~365` (bcrypt de senha conhecida "GaleriaRestore2024!").
- **N10** `__GIT_COMMITS__` embutido no bundle público (`vite.config.ts`) — expõe histórico de commits a qualquer visitante do site. É usado pelo backup; avaliar trade-off.
- **N11** Sem headers de segurança no `vercel.json` (CSP, HSTS, X-Frame-Options) e scripts externos sem SRI.

### 🟡 Novos — correções fáceis e seguras (candidatas à próxima rodada "faça o que for seguro")

- **N12** `imagensService.ts:~127,~192` (`getStatusImagens`/`getRecebimentos`): `error` não extraído → tela mostra tudo como "não recebido" em falha de rede, sem aviso.
- **N13** `edicaoDocsService.remove()`: o SELECT inicial ainda não checa `error` (o upload foi corrigido, o remove não).
- **N14** `modern-screenshot` agora é SÓ um comentário (foi substituído) → `npm uninstall`; mover `@types/jszip` para devDependencies.
- **N15** `utils/handleServiceError.ts` — código morto (zero imports), deletar.
- **N16** `confirm()` nativo em `hooks/usePlanilhaData.ts:58` e `hooks/usePlanilhaStatusModal.ts:81` — trocar por `appDialog.confirm()` (PWA standalone + iOS).
- **N17** Hooks sem cleanup/cancelamento (replicar o padrão já aplicado): `useConfigData` (crítico — 14 setStates), `useControleData` (1º effect), `src/hooks/usePhotosData`, `usePlanilhaStatusModal` (race troca dados do estande errado), `useConfigOpcionais` (setTimeout), fetches externos BrasilAPI/ViaCEP do CadastroCliente sem abort.
- **N18** `pages/Tags.tsx`: `try/finally` sem catch (erro invisível), `saving` pode travar em true, duplo clique cria tag duplicada.
- **N19** Precache do PWA (4,1 MB) inclui chunks lazy — adicionar `assets/backupService-*.js`, `jspdf`, `html2canvas`, `canvg`, `jszip` ao `globIgnores` do workbox (economia ~466 KB gzip por instalação).
- **N20** `index.html`: import map do esm.sh (react/react-dom/react-router) provavelmente vestígio de scaffold — remover junto com a migração do Tailwind CDN (mesma tarefa, exige teste visual).
- **N21** Acúmulo de float em totais monetários (`TempPlanilha.tsx:~125`, `usePlanilhaData.ts:~249`, `useDashboardExportPDF.ts:~68`) — arredondar acumuladores para centavos.
- **N22** Sistema duplo de alertas: `Photos/Tags/Users` ainda usam AlertModal local em vez do `useAppDialog`; `TodosEventos` duplica o DocModal inline.
- **N23** Datas: duas formatações diferentes na MESMA página (Atendimentos) — reforça o item 4 do backlog (`utils/dateUtils.ts`).
- **N24** Resíduos: `metadata.json` (sem referência), `task-cadastro-cliente.md`, migration duplicada `20260310000004_add_opcionais_nomes_snapshot.sql` (mesmo timestamp da irmã).

### ⚪ Falsos positivos do teste cego (para registro)
- Agentes reportaram as migrations de segurança como "pendentes" — leram os avisos antigos nos cabeçalhos (já corrigidos para "APLICADA"). As 3 estão aplicadas e testadas ao vivo.
- O fluxo de login em 2 fases, o CSPRNG e o sanitizador foram elogiados às cegas — confirmação independente de que as correções são boas.

---

> Origem: avaliação com 6 agentes (arquitetura, bugs, segurança, performance, dados e débito técnico).
> As correções de baixo risco já foram aplicadas na branch **`correcoes-saude-codigo`** (ver seção final).
> **Nada foi enviado para `main` nem aplicado no banco de produção.**

---

## 🔴 SÓ VOCÊ PODE FAZER — ações no painel do Supabase (urgente)

1. **Revogar o token administrativo** `sbp_a5ab...` — ✅ já foi REMOVIDO do `.env.local` (02/07/2026),
   mas o token continua VÁLIDO até ser revogado na conta (não dá para revogar via SQL — ele pertence
   à conta Supabase, não ao banco do projeto). Um clique resolve:
   **https://supabase.com/dashboard/account/tokens** → achar o token → Revoke.
   Se um dia precisar do CLI, gere outro na mesma página e guarde fora da pasta do projeto.

2. **Verificar policy `anon` na tabela `users`** — Supabase Studio → Table Editor → `users` → RLS Policies.
   O login consulta `users` **antes** de autenticar (`authService.ts:147`), então provavelmente existe uma policy para `anon`.
   Se existir e ela liberar todas as colunas, **qualquer pessoa sem login pode ler `temp_password_plain` (senhas em texto claro!)**.
   Correção ideal: reestruturar o login para autenticar primeiro (`signInWithPassword`) e só depois buscar o perfil.

3. ~~Aplicar as 2 migrations preparadas~~ ✅ **APLICADAS em 02/07/2026** e testadas ao vivo:
   - `backup_introspect()` agora nega acesso a não-admins (testado com chave anon → "Acesso negado") ✅
   - RPC `regenerate_estandes` existe e o `generateEstandes()` do código já foi trocado para usá-la ✅
   - Teste automatizado em `scripts/test-migrations-20260702.mjs` (rodar: `node scripts/test-migrations-20260702.mjs`)

3b. ~~Vazamento na tabela `users`~~ ✅ **CORRIGIDO em 02/07/2026** (sequência completa executada):
   - Branch mergeada em `main` e deployada (verificado no bundle publicado em dbarros-rural.vercel.app)
   - Migration `20260702000002` aplicada: `anon` só lê `id, email, name, is_active, expires_at`
   - Teste final: **3/3 PASS** (`node scripts/test-migrations-20260702.mjs`) + consulta pré-auth do login confirmada funcionando
   - `temp_password_plain` não é mais legível sem autenticação

4. **Regenerar `database.types.ts`** (elimina os 4 erros atuais de tsc e vários `as any`):
   ```bash
   npx supabase gen types typescript --project-id <SEU_PROJECT_REF> > database.types.ts
   ```
   Faltam: colunas `responsavel_empresa`/`cpf_responsavel` (clientes), `retorno_cancelado_nota` (atendimentos_historico) e as tabelas `photos`, `photo_tags`, `tags`, `tag_categories`, `system_config`, `user_biometrics`, `cardapios`.

5. **Decidir sobre `temp_password_plain`** (senha em texto claro na tabela `users`).
   Recomendação: mostrar a senha UMA vez na criação para o admin copiar, e apagar a coluna. É decisão de produto — precisa de você.

6. ~~Revisar e mergear a branch~~ ✅ **MERGEADA E DEPLOYADA em 02/07/2026.** Recomendado ainda: fazer um teste manual de fumaça no app (login, criar visitante temporário, salvar configuração de vendas, gerar planilha, backup) — o build e as consultas foram verificados, mas os fluxos de UI não foram clicados por humano.

---

## 🟠 Backlog registrado (fazer nas próximas sessões, sem pressa)

| # | Item | Onde | Observação |
|---|---|---|---|
| 1 | Tailwind via CDN → bundle do Vite | `index.html` | PWA offline pode abrir SEM estilo com cache frio. Exige teste visual completo. |
| 2 | `React.lazy` nas rotas | `App.tsx` | Nenhuma rota tem code splitting. Fazer junto com a remoção do cardápio. |
| 3 | Rename de categorias por identidade (não por posição) | `hooks/useConfigSave.ts` + `CategoriaSetup` | Apliquei guardas que evitam corrupção, mas o conserto definitivo exige um `id` estável por categoria. |
| 4 | Timezone misto em datas | `eventosService.ts:77`, `Atendimentos.tsx:93` | ISO é lido como UTC, DD/MM como local — ordenação e "vencido 3h antes". Criar `utils/dateUtils.ts`. Muda datas exibidas — testar com calma. |
| 5 | ~~`formatBRL()` compartilhado~~ | ✅ FEITO 02/07 | `utils/formatCurrency.ts` criado; 7 implementações inline substituídas. |
| 6 | ~~Estados de erro nos hooks de dados~~ | ✅ FEITO 02/07 | Os 3 hooks agora expõem `error`; páginas mostram mensagem + botão recarregar. |
| 7 | ~~Race condition ao trocar edição~~ | ✅ FEITO 02/07 | Cancelamento nos useEffect de `usePlanilhaData` e `useControleData`. |
| 8 | ~~Revert otimista das observações~~ | ✅ Verificado: já mostrava erro via `showSaveError` — falso positivo do agente, sem mudança necessária. |
| 9 | Refatorar `CadastroCliente.tsx` (1.224 linhas) | `pages/` | Maior arquivo do core, importa `supabase` direto ignorando `clientesService`. Seguir o padrão do ControleImagens. O CLAUDE.md lista arquivos já refatorados — atualizar a fila. |
| 10 | Ligar `strict` no tsconfig gradualmente | `tsconfig.json` | 208 `any` em 52 arquivos; zero flags de tipo ativas. |
| 11 | ~~Primeiro teste automatizado~~ | ✅ FEITO 02/07 | Vitest instalado, `npm test` roda 23 testes (masks CPF/CNPJ + formatCurrency). Próximo alvo de teste: `atendimentosReportService`. |
| 12 | Soft delete / auditoria nas entidades principais | services | Hoje deletar evento/edição apaga tudo em cascata sem recuperação. |
| 13 | CORS `*` na Edge Function de passkey | `supabase/functions/passkey-auth/index.ts:12` | Restringir ao domínio de produção. |
| 14 | Campo `is_master` dedicado | migration | Hoje `can_manage_tags` = master por acidente semântico. |
| 15 | ~~Storage órfão em `edicaoDocsService`~~ | ✅ FEITO 02/07 | Erros verificados em todos os passos + rollback best-effort do upload. Delete de tags do photoService também corrigido. |
| 16 | Paginação/select específico nas queries | `clientesService`, `eventosService`, `planilhaVendasService`, `photoService` | `select('*')` sem limit — vai doer quando os dados crescerem. |
| 17 | ~~`GEMINI_API_KEY` no `define` do Vite~~ | ✅ FEITO 02/07 | Define removido — nenhum código usava; a brecha de vazamento no bundle não existe mais. |

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
