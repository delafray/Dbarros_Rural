-- Adiciona tipo_padrao em itens_opcionais
-- Indica se o item e do tipo imagem (com dimensoes) ou logo
-- Usado para pre-preencher o formulario de imagens no ConfiguracaoVendas

ALTER TABLE public.itens_opcionais
ADD COLUMN IF NOT EXISTS tipo_padrao TEXT
    CHECK (tipo_padrao IN ('imagem', 'logo'))
    DEFAULT NULL;
