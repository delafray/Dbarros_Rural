-- Fix: change tarefas user_id and responsavel_id FKs from auth.users to public.users
-- so PostgREST can resolve the joins in the schema cache

ALTER TABLE public.tarefas DROP CONSTRAINT IF EXISTS tarefas_user_id_fkey;
ALTER TABLE public.tarefas DROP CONSTRAINT IF EXISTS tarefas_responsavel_id_fkey;

ALTER TABLE public.tarefas
    ADD CONSTRAINT tarefas_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.tarefas
    ADD CONSTRAINT tarefas_responsavel_id_fkey
    FOREIGN KEY (responsavel_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Same fix for historico
ALTER TABLE public.tarefas_historico DROP CONSTRAINT IF EXISTS tarefas_historico_user_id_fkey;

ALTER TABLE public.tarefas_historico
    ADD CONSTRAINT tarefas_historico_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
