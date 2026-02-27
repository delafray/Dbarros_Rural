-- Create Tarefas (Tasks) system tables

CREATE TABLE IF NOT EXISTS public.tarefas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edicao_id UUID NOT NULL REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT,
    status TEXT NOT NULL DEFAULT 'pendente',
    prioridade TEXT NOT NULL DEFAULT 'media',
    data_prazo TIMESTAMP WITH TIME ZONE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ultima_obs TEXT,
    ultima_obs_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tarefas_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarefa_id UUID NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    status_anterior TEXT,
    status_novo TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS tarefas_edicao_idx ON public.tarefas(edicao_id);
CREATE INDEX IF NOT EXISTS tarefas_historico_tarefa_idx ON public.tarefas_historico(tarefa_id);

-- Enable RLS
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas_historico ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can manage tarefas" ON public.tarefas
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage tarefas_historico" ON public.tarefas_historico
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
