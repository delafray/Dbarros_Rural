-- Adiciona campos de responsável para PJ
ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS responsavel_empresa TEXT,
    ADD COLUMN IF NOT EXISTS cpf_responsavel TEXT;
