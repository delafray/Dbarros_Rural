-- Create Event Management System tables

-- Core Event Metadata
CREATE TABLE IF NOT EXISTS public.eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    promotor_nome TEXT,
    promotor_email TEXT,
    promotor_telefone TEXT,
    promotor_endereco TEXT,
    promotor_redes_sociais JSONB DEFAULT '[]'::jsonb,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Specific Yearly Editions
CREATE TABLE IF NOT EXISTS public.eventos_edicoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE,
    ano INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    local_completo TEXT,
    local_resumido TEXT,
    data_inicio TIMESTAMP WITH TIME ZONE,
    data_fim TIMESTAMP WITH TIME ZONE,
    montagem_inicio TIMESTAMP WITH TIME ZONE,
    montagem_fim TIMESTAMP WITH TIME ZONE,
    desmontagem_inicio TIMESTAMP WITH TIME ZONE,
    desmontagem_fim TIMESTAMP WITH TIME ZONE,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_edicoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for eventos
CREATE POLICY "Users can manage their own events" ON public.eventos
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for eventos_edicoes
CREATE POLICY "Users can manage editions of their events" ON public.eventos_edicoes
    FOR ALL USING (auth.uid() = user_id);
