# Ações no Supabase — só você pode fazer (01/08/2026)

> Origem: auditoria de 6 subagentes (ver memória `seguranca-e-testes-2026-08`).
> O que dava para corrigir em código já foi feito na branch `seguranca-e-testes-2026-08`.
> Este arquivo é o que depende do **painel do Supabase (SQL Editor)** ou da **CLI** — não dá para fazer por código.
>
> **Como usar:** rode primeiro os blocos de DIAGNÓSTICO (só leitura, não mudam nada).
> Só rode os blocos de CORREÇÃO depois de ver o resultado do diagnóstico correspondente.
> Faça um por vez e confira. Nada aqui altera senha de usuário existente.

---

## ✅ JÁ APLICADO EM PRODUÇÃO (01/08/2026, nesta sessão)

- **View `clientes_visitante` criada** (item 1, passo 1). Falta só o `DROP POLICY` do item 1
  (rodar APÓS o deploy da branch `seguranca-e-testes-2026-08`).
- **`atendimentos_historico`**: removida a policy permissiva `Authenticated access atendimentos_historico`
  (liberava tudo para qualquer autenticado, anulando o `master_isolation`). Sobrou só `master_isolation`.
- **`stand_imagem_recebimentos`, `stand_imagens_status`, `tarefas_historico`**: mesmo caso — removidas as
  policies `Authenticated access ...`. Cada uma ficou só com `master_isolation`. Furos de isolamento fechados.
- **RPC `get_temp_password` criada** (item 3, passo 1). Falta o `REVOKE` das colunas (pós-deploy).
- **`rename_opcional_item`** substituída pela versão que bloqueia visitantes (item 4 aplicado).
- **`itens_opcionais`**: policy permissiva trocada por `read_all_authenticated` (SELECT) +
  `write_non_visitors` (ALL) — visitante virou read-only na tabela (item 4b aplicado).

### ⏳ Ainda pendente (não rodar ao vivo sem o item correspondente abaixo)
- **`users` — `temp_password_plain`/`password_hash` legíveis por QUALQUER autenticado** (achado grave desta sessão):
  a policy `Public profiles are viewable by everyone` (`public`/`true`) + grant de todas as colunas ao role
  `authenticated` deixam um visitante ler a senha de todos. **NÃO revogar a coluna ao vivo:** o app faz
  `select('*')` em `users` em ~9 pontos e um REVOKE de coluna faz o `select('*')` dar "permission denied".
  Correção coordenada (código+banco): trocar os `select('*')` por colunas explícitas, criar RPC
  `SECURITY DEFINER` com `is_admin()` para o admin ler a senha do visitante, e só então revogar. Fazer na branch.
- **`cardapios`, `menus_a4`, `cardapio_projetos`**: só têm policy permissiva (`true`) — qualquer autenticado
  (incl. visitante) lê/escreve. Módulo cardápio é "gambiarra assumida" (candidato a remoção). Opção de
  hardening = mesmo padrão do `itens_opcionais` (read-all + write-non-visitors), OU deixar como está se o
  módulo for removido. Decisão do usuário — pendente.

---

## 🔴 1. Visitante consegue ler o CPF dos clientes (LGPD)

A policy `Visitantes podem ler clientes` (migration `20260228_visitor_read_clientes`) foi criada
**antes** da coluna `cpf_responsavel` (`20260316`). Como RLS filtra linha, não coluna, o visitante
passou a ler o CPF junto. O código agrava usando `select('*')` em `clientesService`.

### Diagnóstico (só leitura)
```sql
-- Ver as policies atuais da tabela clientes:
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'clientes'
ORDER BY policyname;
```

### Correção — decidida: VIEW sem PII (o visitante PRECISA dos nomes, mas não do CPF)
Verificado no código: a planilha do visitante mostra o **nome** do cliente
(`nome_fantasia`/`razao_social`/`nome_completo`), então não dá para simplesmente cortar o acesso.
A solução é servir os nomes por uma VIEW sem colunas sensíveis e negar o acesso direto à tabela crua.
O lado do código já foi feito (commit `feat(seguranca): visitante le nomes ... por view sem PII`):
o visitante passa a ler `clientes_visitante` via `getClientesComContatosVisitante`.

**PASSO 1 — rodar AGORA (aditivo, não quebra nada):**
```sql
CREATE OR REPLACE VIEW public.clientes_visitante AS
SELECT id, nome_completo, razao_social, nome_fantasia, tipo_pessoa
FROM public.clientes;

GRANT SELECT ON public.clientes_visitante TO authenticated;
```

**PASSO 2 — rodar SÓ DEPOIS que a branch `seguranca-e-testes-2026-08` estiver deployada**
(antes disso, o visitante ainda lê `clientes` direto; dropar a policy antes deixaria os nomes em branco):
```sql
DROP POLICY IF EXISTS "Visitantes podem ler clientes" ON public.clientes;
DROP POLICY IF EXISTS "Visitantes podem ler contatos" ON public.contatos;
```

---

## 🔴 2. `atendimentos_historico` provavelmente sem RLS

Essa tabela **não aparece** na migration de isolamento master (`20260310000001`). Se o RLS estiver
desligado, qualquer autenticado (inclusive visitante) lê/escreve o histórico de atendimentos de
**todos os eventos**.

### Diagnóstico (só leitura)
```sql
SELECT relrowsecurity AS rls_ligado
FROM pg_class WHERE relname = 'atendimentos_historico';

SELECT policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'atendimentos_historico';
```
Se `rls_ligado = false` ou não aparecer policy, aplique a correção.

### Correção (espelha o padrão de `atendimentos`, join por `atendimento_id`)
```sql
ALTER TABLE public.atendimentos_historico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "master_isolation" ON public.atendimentos_historico;

CREATE POLICY "master_isolation" ON public.atendimentos_historico
  FOR ALL TO authenticated
  USING (
    public.is_master() OR
    (SELECT e.master_user_id
     FROM public.eventos e
     JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
     JOIN public.atendimentos a ON a.edicao_id = ee.id
     WHERE a.id = atendimento_id) IS NULL
  )
  WITH CHECK (
    public.is_master() OR
    (SELECT e.master_user_id
     FROM public.eventos e
     JOIN public.eventos_edicoes ee ON ee.evento_id = e.id
     JOIN public.atendimentos a ON a.edicao_id = ee.id
     WHERE a.id = atendimento_id) IS NULL
  );
```

---

## 🔴 3. `temp_password_plain`/`password_hash` legíveis por QUALQUER autenticado

Confirmado nesta sessão: o role `authenticated` tem SELECT em TODAS as colunas de `users`, e a policy
`Public profiles are viewable by everyone` (role `public`, `true`) libera as linhas. Resultado: um
**visitante logado pode ler `temp_password_plain` (senha em claro) e `password_hash` de todos** via
chamada direta à API. Não dá para revogar a coluna sem antes tirar os `select('*')` do código
(o código já foi ajustado na branch — usa colunas explícitas + RPC para o admin).

**PASSO 1 — rodar AGORA (aditivo): RPC que só o admin usa para ler a senha do visitante:**
```sql
CREATE OR REPLACE FUNCTION public.get_temp_password(target_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT temp_password_plain FROM public.users
  WHERE id = target_user_id AND public.is_admin()
$$;

GRANT EXECUTE ON FUNCTION public.get_temp_password(uuid) TO authenticated;
```
(Se não for admin, `is_admin()` é falso → o WHERE não casa → retorna NULL.)

**PASSO 2 — rodar SÓ DEPOIS do deploy da branch** (antes disso o código ainda faz `select('*')` em
`users`; revogar a coluna antes quebraria login e listagem de usuários):
```sql
REVOKE SELECT (temp_password_plain, password_hash) ON public.users FROM authenticated;
```

### Bônus (só leitura) — confirmar que o `anon` também segue restrito
```sql
SELECT grantee, privilege_type, column_name
FROM information_schema.column_privileges
WHERE table_name = 'users' AND grantee = 'anon'
ORDER BY column_name;
```
Esperado: só `id, email, name, is_active, expires_at`. Se aparecer `temp_password_plain` (ou tudo), reaplique:
```sql
REVOKE SELECT ON public.users FROM anon;
GRANT SELECT (id, email, name, is_active, expires_at) ON public.users TO anon;
```

---

## 🟠 4. Aplicar a migration pronta que bloqueia visitante de renomear opcionais

O arquivo `supabase/migrations/20260702000003_block_visitors_rename_opcional.sql` está pronto mas
**nunca foi colado**. Enquanto isso, um visitante pode renomear itens opcionais de todos os eventos.
Cole o conteúdo desse arquivo no SQL Editor (ele já está no repositório, íntegro).

### Verificar depois (só leitura)
```sql
-- Deve dar erro "Acesso negado" se você testar logado como visitante.
-- Confirmação de que a função é SECURITY DEFINER e existe:
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'rename_opcional_item';
```

---

## 🟡 5. Tabelas criadas fora das migrations — confirmar RLS

`cardapios`, `menus_a4`, `itens_opcionais`, `photos`, `photo_tags`, `tags`, `tag_categories`,
`system_config` foram criadas direto no Studio (não há `CREATE TABLE` no repositório), então não dá
para saber pelos arquivos se têm RLS.

### Diagnóstico geral (só leitura) — pega QUALQUER tabela pública sem RLS
```sql
SELECT c.relname AS tabela_sem_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false
ORDER BY c.relname;
```
Para cada tabela que aparecer e tiver dado sensível, habilite RLS e crie a policy adequada
(as de cardápio podem seguir o modelo `master_isolation` acima, ajustando o join).

---

## 🟡 6. `cardapio_projetos` aberto a qualquer autenticado

A policy `auth_all_cardapio_projetos` usa `USING(true)` — um visitante pode alterar/apagar projetos
de qualquer evento. Se cardápio deve respeitar o isolamento por evento, troque por `master_isolation`.
Baixo teor de PII, então é prioridade menor. Diagnóstico:
```sql
SELECT policyname, cmd, qual FROM pg_policies
WHERE tablename = 'cardapio_projetos';
```

---

## 🔧 7. Regenerar `database.types.ts` (some com 4 erros de tsc e ~80 `as any`)

Faltam nos tipos: tabelas `cardapios`, `menus_a4`, `cardapio_projetos`, `photos`, `photo_tags`,
`tags`, `tag_categories`, `system_config`, `user_biometrics` e colunas `responsavel_empresa`/
`cpf_responsavel` (clientes) e `retorno_cancelado_nota` (atendimentos_historico).

```bash
# precisa do Supabase CLI logado; <PROJECT_REF> é o ref do projeto (no dashboard → Settings → General)
npx supabase gen types typescript --project-id <PROJECT_REF> --schema public > database.types.ts
```
Depois disso me avise: eu removo os `// @ts-nocheck` de `cardapioService`/`menuA4Service`/
`cardapioProjetosService` e limpo os `as any` que não forem mais necessários.

---

## 🔧 8. Edge Function `passkey-auth` — avaliar deletar

O app **não usa** essa function (usa a RPC `sign_in_with_passkey`). Ela tem 3 falhas
(challenge do WebAuthn aceito do cliente = bypass; `login-options` sem auth expõe userId;
CORS `*` com service_role). Se confirmar que nada a chama, o mais seguro e barato é removê-la:

```bash
# CLI logada; confirma que existe e apaga
supabase functions list
supabase functions delete passkey-auth
```
Se algum dia quiser reativar biometria por edge function, ela precisa ser reescrita para o servidor
**gerar e guardar** o challenge (não aceitar do cliente). Não reimplante como está.

---

### Ordem sugerida
1 e 2 (LGPD e isolamento) → 3 e 4 (senha e opcionais) → 5 (varredura de RLS) → 7 (tipos) →
8 (edge function) → 6 (cardápio, sem pressa).
