-- ⚠️⚠️ NÃO APLICAR AINDA — só depois que a branch correcoes-saude-codigo estiver
-- MERGEADA E DEPLOYADA em produção. O código antigo do login faz select('*') na
-- tabela users antes de autenticar; aplicar isto antes do deploy QUEBRA O LOGIN.
--
-- SEGURANÇA (confirmado por teste em 02/07/2026): a tabela users é legível pelo
-- role anon (policy TO public), incluindo a coluna temp_password_plain — ou seja,
-- a senha em texto claro de qualquer visitante temporário fica exposta a qualquer
-- pessoa na internet, sem login.
--
-- Correção: privilégio de SELECT em nível de COLUNA para o anon. O login
-- pré-auth só precisa de: id, email, name, is_active, expires_at (o código novo
-- em authService.login já busca exatamente estas). Usuários autenticados não
-- são afetados.

REVOKE SELECT ON public.users FROM anon;

GRANT SELECT (id, email, name, is_active, expires_at) ON public.users TO anon;

-- Verificação (opcional): rodar depois de aplicar. Deve dar erro de permissão:
--   SET LOCAL ROLE anon; SELECT temp_password_plain FROM public.users LIMIT 1;
