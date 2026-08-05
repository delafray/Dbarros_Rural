-- Import do catálogo Prosperitas (340 produtos, 13 grupos, 5 unidades)
-- Gerado automaticamente por gerar-import-prosperitas.mjs
-- Data: 2026-08-05
-- Spec: MODULO-CUSTOS/IMPORT-CATALOGO-PROSPERITAS.md
-- Idempotente: pode rodar 2x sem duplicar (ON CONFLICT + WHERE NOT EXISTS)

BEGIN;

-- ============================================================================
-- 1. CREATE TABLE custos_unidades (com RLS padrão EMPRESA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS custos_unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  sigla text NOT NULL UNIQUE,
  prosperitas_id int UNIQUE,
  ativo bool DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE custos_unidades ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. CREATE TABLE custos_produto_grupos (com RLS padrão EMPRESA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS custos_produto_grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ordem int,
  prosperitas_id int UNIQUE,
  ativo bool DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE custos_produto_grupos ENABLE ROW LEVEL SECURITY;

-- RLS padrão EMPRESA — idêntico ao Bloco 13a da fase 0
-- (sel: admin/gestor/projetista · ins/upd: gestor · del: admin)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['custos_unidades','custos_produto_grupos'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %1$s_sel ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_sel ON public.%1$s FOR SELECT TO authenticated
                    USING (public.custos_papel() IN (''admin'',''gestor'',''projetista''))', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_ins ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_ins ON public.%1$s FOR INSERT TO authenticated
                    WITH CHECK (public.custos_eh_gestor())', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_upd ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_upd ON public.%1$s FOR UPDATE TO authenticated
                    USING (public.custos_eh_gestor()) WITH CHECK (public.custos_eh_gestor())', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_del ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_del ON public.%1$s FOR DELETE TO authenticated
                    USING (public.custos_papel() = ''admin'')', t);
  END LOOP;
END $$;

-- ============================================================================
-- 3. ALTER TABLE custos_produtos (adiciona colunas novas)
-- ============================================================================

ALTER TABLE custos_produtos
  ADD COLUMN IF NOT EXISTS grupo_id uuid REFERENCES custos_produto_grupos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES custos_unidades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preco_locacao numeric(12,2) CHECK (preco_locacao >= 0),
  ADD COLUMN IF NOT EXISTS preco_custo numeric(12,2) CHECK (preco_custo >= 0),
  ADD COLUMN IF NOT EXISTS consumo_kva numeric(10,2) CHECK (consumo_kva >= 0),
  ADD COLUMN IF NOT EXISTS observacao text,
  ADD COLUMN IF NOT EXISTS prosperitas_id int UNIQUE,
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual';

-- ============================================================================
-- 4. SEEDS: custos_unidades (5 do Prosperitas + 8 do seed atual para consistência)
-- ============================================================================

INSERT INTO custos_unidades (nome, sigla, prosperitas_id) VALUES
  ('Unidade', 'un', 1),
  ('Metro quadrado', 'm2', 2),
  ('Metro', 'm', 3),
  ('Segundo', 's', 4),
  ('Metro cúbico', 'm3', 5),
  ('Diária', 'diaria', NULL),
  ('Evento', 'evento', NULL),
  ('Verba', 'vb', NULL),
  ('Kit', 'kit', NULL),
  ('Saco', 'saco', NULL),
  ('Fardo', 'fardo', NULL),
  ('Quilômetro', 'km', NULL),
  ('Semana', 'semana', NULL)
ON CONFLICT (sigla) DO NOTHING;

INSERT INTO custos_produto_grupos (nome, ordem, prosperitas_id) VALUES
  ('Tenda / Telhado', 1, 1),
  ('Piso / Revestimento', 2, 2),
  ('Montagem', 3, 3),
  ('Marcenaria', 4, 4),
  ('Mobiliário', 5, 5),
  ('Eletro / Eletrônico', 6, 6),
  ('Paisagismo', 7, 7),
  ('Box Truss', 8, 8),
  ('Tecido', 9, 9),
  ('Serralheria', 10, 10),
  ('Impressão Digital', 11, 11),
  ('Elétrica', 12, 12),
  ('Outros', 13, 13)
ON CONFLICT (prosperitas_id) DO NOTHING;

-- Insert dos produtos (idempotente via ON CONFLICT + WHERE NOT EXISTS para backup)
INSERT INTO custos_produtos
  (nome, descricao, categoria_id, unidade, frequencia_uso, ativo,
   grupo_id, unidade_id, preco_locacao, preco_custo, consumo_kva,
   observacao, prosperitas_id, origem)
SELECT
  p.nome,
  NULL, -- descricao: no Prosperitas o nome É a descrição completa
  COALESCE(cc.id, (SELECT id FROM custos_categorias WHERE slug = 'outros')) AS categoria_id,
  p.unidade_slug,
  p.freq_uso,
  true,
  pg.id AS grupo_id,
  cu.id AS unidade_id,
  NULLIF(p.preco_locacao, 0),
  NULLIF(p.preco_custo, 0),
  NULLIF(p.consumo_kva, 0),
  NULLIF(p.observacao, ''),
  p.id,
  'prosperitas'
FROM (
  VALUES
    (1, 'Tenda piramidal 3,00x3,00m', 1, 'un', 3, NULL, 340, NULL, ''),
    (2, 'Tenda piramidal 4,00x4,00m', 1, 'un', 13, NULL, 605, NULL, ''),
    (3, 'Tenda piramidal 5,00x5,00m', 1, 'un', 85, NULL, 1350, NULL, ''),
    (4, 'Tenda piramidal 6,00x6,00m', 1, 'un', 6, NULL, 1020, NULL, ''),
    (5, 'Tenda piramidal 7,00x7,00m', 1, 'un', 6, NULL, 1385, NULL, ''),
    (6, 'Tenda piramidal 8,00x8,00m', 1, 'un', 7, NULL, 1450, NULL, ''),
    (7, 'Tenda piramidal 10,00x5,00m', 1, 'un', 9, NULL, 1600, NULL, ''),
    (8, 'Tenda piramidal 10,00x10,00m', 1, 'un', 70, NULL, 2700, NULL, ''),
    (9, 'Tenda piramidal 15,00x10,00m', 1, 'un', 0, NULL, 3200, NULL, ''),
    (10, 'Avancê em estrutura de metalon', 1, 'm2', 12, NULL, 28, NULL, ''),
    (11, 'Fechamento lateral em lona com ilhós para tenda 5x5', 1, 'un', 19, NULL, 500, NULL, ''),
    (12, 'Estrutura de telhado em madeira com telhas de zinco, com calhas para escoamento, com 06 canos para vazão de água, embutidos', 1, 'm2', 12, NULL, 300, NULL, ''),
    (13, 'Estrutura de telhado em madeira com telhas de PVC com calhas para escoamento, com 06 canos para vazão de água, embutidos', 1, 'm2', 3, NULL, 300, NULL, ''),
    (14, 'Vidro Inteiro 2,18 x 0,48', 3, 'un', 5, NULL, 150, NULL, ''),
    (15, 'Piso elevado e chapeado em tablado de madeira com 0,09m/h, com rampa de acesso para portadores de necessidades especiais', 2, 'm2', 2292, NULL, 50, NULL, ''),
    (16, 'Acabamento do piso em cantoneira de alumínio', 2, 'm', 1087, NULL, 20, NULL, ''),
    (17, 'Rodapé de madeira, pintado', 2, 'm', 737, NULL, 20, NULL, ''),
    (18, 'Revestimento do piso em carpete', 2, 'm2', 4020, NULL, 45, NULL, ''),
    (19, 'Revestimento do piso em Deck', 2, 'm2', 104, NULL, 180, NULL, ''),
    (20, 'Revestimento do piso em Decorflex', 2, 'm2', 229, NULL, 200, NULL, ''),
    (22, 'Revestimento do piso em Grama Sintética', 2, 'm2', 59, NULL, 75, NULL, ''),
    (23, 'Revestimento do piso em MDF com 0,03m/h', 2, 'm2', 1372, NULL, 225, NULL, ''),
    (24, 'Revestimento do piso em OSB', 2, 'm2', 2, NULL, 120, NULL, ''),
    (25, 'Revestimento do piso em Piso bus', 2, 'm2', 122, NULL, 90, NULL, ''),
    (26, 'Telha PVC Marrom', 1, 'm2', 12, NULL, 100, NULL, 'Telha em formato padrão de 2,42 x 0,88'),
    (27, 'Tablado de madeira', 2, 'm2', 85, NULL, 60, NULL, ''),
    (28, 'Tablado montado em perfil de alumínio anodizado revestido em madeira e carpete com 0,32m/h', 2, 'm2', 53, NULL, 350, NULL, '(Palco 32cm de altura)'),
    (29, 'Vaso de Planta Aéreo (Pendente)', 7, 'un', 52, NULL, 400, NULL, ''),
    (30, 'Vidro Inteiro 2,86 x 0,98', 3, 'un', 36, NULL, 300, NULL, ''),
    (31, 'Balcão armário em painel "TS" branco, montado em perfil de alumínio anodizado, formato, tampo de madeira revestido em plástico hospitalar, 01 nível de prateleira, com porta sem cadeado', 3, 'm', 451, NULL, 300, NULL, ''),
    (32, 'Balcão atendimento em painel "TS" branco, montado em perfil de alumínio anodizado, tampo de madeira revestido em plástico hospitalar, sem porta', 3, 'm', 166, NULL, 250, NULL, ''),
    (33, 'Tampo sobreposto de madeira para balcões de "TS".', 3, 'm', 1, NULL, 250, NULL, ''),
    (34, 'Balcão vitrine com parte superior em vidro e inferior em painel "TS" branco, montado em perfil de alumínio anodizado com porta e cadeado', 3, 'm', 177, NULL, 435, NULL, ''),
    (35, 'Balcão vitrine todo em vidro, montado em perfil de alumínio anodizado, prateleira de vidro (02 níveis – peso máximo 5,0kg), com porta e cadeado', 3, 'm', 227, NULL, 435, NULL, ''),
    (36, 'Bancada em painel "TS", montado em perfil de alumínio anodizado, tampo de madeira revestido em plástico hospitalar', 3, 'm', 581, NULL, 250, NULL, ''),
    (37, 'Elevação da testeira', 3, 'm', 574, NULL, 40, NULL, ''),
    (38, 'Vidro Inteiro 2,18 x 0,68', 3, 'un', 25, NULL, 180, NULL, ''),
    (39, 'Fechamento em painéis "TS", acoplados em perfis de alumínio anodizado a 2.20h', 3, 'm', 301, NULL, 75, NULL, ''),
    (40, 'Vidro Inteiro 2,18 x 0,98', 3, 'un', 15, NULL, 250, NULL, ''),
    (41, 'Forro de teto em duraplac.', 3, 'un', 298, NULL, 30, NULL, ''),
    (42, 'Montagem básica em painéis "TS", acoplados em perfis de alumínio anodizado 2,20m', 3, 'un', 650, NULL, 90, NULL, ''),
    (43, 'Montagem básica em painéis "TS", acoplados em perfis de alumínio anodizado 2,52m', 3, 'un', 25, NULL, 110, NULL, ''),
    (44, 'Montagem básica em painéis "TS", acoplados em perfis de alumínio anodizado 2,86m', 3, 'un', 978, NULL, 115, NULL, ''),
    (45, 'Montagem básica em painéis "TS", acoplados em perfis de alumínio anodizado 3,30m', 3, 'un', 869, NULL, 140, NULL, ''),
    (46, 'Montagem básica em painéis "TS", acoplados em perfis de alumínio anodizado 4,40m', 3, 'un', 78, NULL, 170, NULL, ''),
    (47, 'Balcão armário curvo em painel "TS" branco, montado em perfil de alumínio anodizado, tampo de madeira revestido em plástico hospitalar, 01 nível de prateleira, com porta e cadeado - 1,53x0,50x1,10m', 3, 'un', 31, NULL, 375, NULL, ''),
    (48, 'Balcão atendimento curvo em painel "TS" branco, montado em perfil de alumínio anodizado, tampo de madeira revestido em plástico hospitalar, com 01 nível de prateleira, sem porta - 1,53x0,50x1,10m', 3, 'un', 5, NULL, 375, NULL, ''),
    (49, 'Bancada curva em painel "TS" branco, montado em perfil de alumínio anodizado, tampo de madeira revestido em plástico hospitalar, com 01 nível de prateleira, sem porta - 1,53x0,50x1,10m', 3, 'un', 0, NULL, 375, NULL, ''),
    (50, 'Bancada para computador em painel "TS", montado em perfil de alumínio anodizado, tampo de madeira revestido em plástico hospitalar, com apoio para teclado 1,00x0,50x0,82m', 3, 'un', 28, NULL, 300, NULL, ''),
    (51, 'Espelho padrão 0,93x1,35', 3, 'un', 29, NULL, 180, NULL, ''),
    (52, 'Voil', 9, 'm2', 12, NULL, 50, NULL, ''),
    (53, 'Painel de vidro fixado em garras spider 0,48 x 1,08', 3, 'un', 228, NULL, 60, NULL, ''),
    (54, 'Balcão Argentina', 5, 'un', 89, NULL, 750, NULL, ''),
    (55, 'Painel de vidro fixado em garras spider 0,98 x 0,64', 3, 'un', 80, NULL, 70, NULL, ''),
    (56, 'Painel de vidro fixado em garras spider 0,98 x 1,08', 3, 'un', 2519, NULL, 110, NULL, ''),
    (57, 'Painel de vidro inteiro, montado em perfil de alumínio anodizado', 3, 'un', 166, NULL, 110, NULL, ''),
    (58, 'Painel montado em perfil de alumínio anodizado com 2/3 em vidro cristal e 1/3 inferior em painel "TS" na cor branca', 3, 'un', 73, NULL, 270, NULL, ''),
    (59, 'Painel Slat Wall, montado em perfil de alumínio anodizado', 3, 'un', 74, NULL, 300, NULL, '(Gôndola para mostroário)'),
    (60, 'Pia com bancada montada em perfil de alumínio anodizado', 3, 'un', 458, NULL, 600, NULL, ''),
    (61, 'Porta blindex', 3, 'un', 1025, NULL, 300, NULL, ''),
    (62, 'Porta de vidro, montada em perfil de alumínio anodizado', 3, 'un', 61, NULL, 300, NULL, ''),
    (63, 'Porta em "TS", montada em perfil de alumínio anodizado', 3, 'un', 712, NULL, 150, NULL, ''),
    (64, 'Porta montada em perfil de alumínio anodizado, fechamento com 2/3 em vidro cristal e 1/3 inferior em painel "TS" branco', 3, 'un', 36, NULL, 270, NULL, ''),
    (65, 'Prateleira de madeira revestida em plástico hospitalar branco', 3, 'un', 1950, NULL, 35, NULL, ''),
    (66, 'Painel de vidro fixado em garras spider 0,48 x 0,64', 3, 'un', 76, NULL, 45, NULL, ''),
    (67, 'Prateleira em "TS"', 3, 'un', 236, NULL, 35, NULL, ''),
    (68, 'Prateleira em vidro cristal, sustentada por mão francesa em plástico rígido, peso máximo 3,0kg', 3, 'un', 108, NULL, 50, NULL, ''),
    (69, 'Balcão Vem de Minas', 5, 'un', 2, NULL, 750, NULL, ''),
    (70, 'Balcão Minas Gerais', 5, 'un', 0, NULL, 750, NULL, ''),
    (71, 'Ponto aéreo', 13, 'un', 21, NULL, 900, NULL, ''),
    (72, 'Totem em painéis "TS", acoplados em perfis de alumínio anodizado', 3, 'un', 2, NULL, 200, NULL, ''),
    (73, 'Totem em MDF', 5, 'un', 3, NULL, 600, NULL, 'Chapa de 60 x 160 e base de 60 x 55 x 25 laminado'),
    (74, 'Vitrine montada em perfil de alumínio anodizado, fechamento com 2/3 em vidro cristal e 1/3 inferior em painel "TS" branco, tampo revestido em plástico hospitalar na cor branca, prateleira de vidro (peso máximo 5,0kg), com iluminação', 3, 'un', 44, NULL, 500, NULL, ''),
    (75, 'Vitrine curva montada em perfil de alumínio anodizado, fechamento com 2/3 em poliestireno cristal e 1/3 inferior em painel "TS" branco, tampo revestido em plástico hospitalar na cor branca, prateleira de vidro(peso máximo 5,0kg), com iluminação', 3, 'un', 2, NULL, 550, NULL, ''),
    (76, 'Vitrine curva, montada em perfil de alumínio anodizado, fechamento com 2/3 em poliestireno cristal e 1/3 inferior em painel "TS" branco, tampo revestido em plástico hospitalar na cor branca, prateleira de vidro (03 níveis – peso máximo 5,0kg), com ilum.', 3, 'un', 0, NULL, 550, NULL, ''),
    (77, 'Vitrine montada em perfil de alumínio anodizado, fechamento com 2/3 em vidro cristal e 1/3 inferior em painel "TS" branco, tampo revestido em plástico hospitalar na cor branca, prateleira de vidro (peso máximo 5,0kg), com iluminação', 3, 'un', 25, NULL, 450, NULL, ''),
    (78, 'Vitrine montada em perfil de alumínio anodizado, fechamento em vidro inteiro, tampo revestido em plástico hospitalar na cor branca, prateleira de vidro (peso máximo 5,0kg), com iluminação', 3, 'un', 142, NULL, 500, NULL, ''),
    (79, 'Vitrine montada em perfil de alumínio anodizado, fechamento em vidro spider, tampo revestido em plástico hospitalar na cor branca, prateleira de vidro (peso máximo 5,0kg), com iluminação', 3, 'un', 102, NULL, 500, NULL, ''),
    (80, 'Palco praticável 40cm altura', 3, 'm2', 0, NULL, 300, NULL, ''),
    (81, 'Parede em módulos de sarrafo de madeira revestida de bagum', 4, 'm2', 4651, NULL, 450, NULL, ''),
    (82, 'Fechamento lateral em lona com ilhós para tenda 10x10', 3, 'un', 38, NULL, 450, NULL, ''),
    (83, 'Aparador de madeira emassado e pintado com tampo de vidro', 4, 'm', 8, NULL, 800, NULL, ''),
    (84, 'Aparador de madeira revestido em bagum', 4, 'm', 146, NULL, 650, NULL, ''),
    (85, 'Cadeira Bruna Munich', 5, 'un', 1, NULL, 170, NULL, ''),
    (86, 'Cadeira rústica com regulagem de altura.', 5, 'un', 12, NULL, 180, NULL, ''),
    (87, 'Banqueta Iron/Tolix', 5, 'm', 20, NULL, 120, NULL, ''),
    (88, 'Impressão digital em lona retroiluminada', 11, 'm2', 36, NULL, 130, NULL, ''),
    (89, 'Parede padrão 3m - Em módulos de sarrafo de madeira revestida de bagum', 4, 'm2', 607, NULL, 225, NULL, 'Essa parede somente pode ser utilizada em estandes que apenas possuem paredes ou sancas padrões.'),
    (90, 'Balcão armário em madeira emassado e pintado 01 nível de prateleira, com porta e chave', 4, 'm', 1961, NULL, 1000, NULL, ''),
    (91, 'Balcão atendimento em madeira emassado e pintado 01 nível de prateleira sem porta', 4, 'm', 48, NULL, 800, NULL, ''),
    (92, 'Parede padrão 3m - Em módulos de sarrafo de madeira revestida em lona com impressão digital', 4, 'm2', 18, NULL, 215, NULL, 'Essa parede somente pode ser utilizada em estandes que apenas possuem paredes ou sancas padrões.'),
    (93, 'Sanca de madeira revestida em bagum - 0,25x0,25', 4, 'm', 33, NULL, 450, NULL, ''),
    (94, 'Sanca padrão de madeira revestida em bagum - 0,25x0,25', 4, 'm', 9, NULL, 225, NULL, 'Essa parede somente pode ser utilizada em estandes que apenas possuem paredes ou sancas padrões.'),
    (95, 'Pilar de madeira revestido em bagum 0,30x0,30', 4, 'm', 5, NULL, 475, NULL, ''),
    (96, 'Bancada em madeira emassada e pintada', 4, 'm', 172, NULL, 500, NULL, ''),
    (97, 'Bancada em madeira revestida em bagum', 4, 'm', 95, NULL, 500, NULL, ''),
    (98, 'Pilar de madeira revestido em bagum 0,40x0,40', 4, 'm', 2, NULL, 500, NULL, ''),
    (99, 'Jardineira de madeira revestida em bagum', 4, 'm', 258, NULL, 350, NULL, ''),
    (100, 'Pilar de madeira revestido em bagum 0,25x0,25', 4, 'm', 2092, NULL, 450, NULL, ''),
    (101, 'Porta de madeira revestida em bagum', 4, 'un', 1620, NULL, 700, NULL, ''),
    (102, 'Púlpito de madeira emassado e pintado com base de madeira e painel vertical, com apoio inclinado', 4, 'un', 20, NULL, 1000, NULL, ''),
    (103, 'Réguas de madeira revestidas em bagum (almofada)', 4, 'm', 3, NULL, 75, NULL, ''),
    (104, 'Sanca de madeira revestida em bagum - 0,3x0,3', 4, 'm', 1785, NULL, 475, NULL, ''),
    (105, 'Testeira de madeira revestida em bagum', 4, 'm2', 1796, NULL, 400, NULL, ''),
    (106, 'Teto em módulos de sarrafo de madeira revestido em bagum', 4, 'm2', 657, NULL, 350, NULL, ''),
    (109, 'Pilar padrão de madeira revestido em bagum - 0,25x0,25', 4, 'm', 46, NULL, 225, NULL, 'Essa pilar somente pode ser utilizado em estandes que apenas possuem paredes ou sancas padrões.'),
    (110, 'Totem para computador em madeira emassado e pintado com apoio para teclado', 4, 'un', 0, NULL, 1100, NULL, ''),
    (111, 'Banqueta Bruna Munich - Marrom', 5, 'un', 767, NULL, 200, NULL, ''),
    (112, 'Vitrine de madeira revestida em bagum com 03 níveis de prateleiras de madeira, fechamento em vidro spider, com iluminação', 4, 'un', 26, NULL, 120, NULL, ''),
    (113, 'Vitrine redonda de madeira emassada e pintada de 0,65m/Ø, com 01 nível de prateleira de madeira, fechamento em vidro preso com parafusos finesson(24un total)', 4, 'un', 0, NULL, 1700, NULL, ''),
    (114, 'Aparador de madeira 1,50x0,50x1,0m/h', 5, 'un', 19, NULL, 550, NULL, ''),
    (115, 'Aparador new Forest BP Imbuia', 5, 'un', 34, NULL, 450, NULL, ''),
    (116, 'Arara tubular de chão, pintada', 5, 'un', 18, NULL, 200, NULL, ''),
    (117, 'Banco de madeira em “S”', 5, 'un', 1, NULL, 300, NULL, ''),
    (118, 'Banco de praça em estrutura de ferro com ripado de madeira', 5, 'un', 36, NULL, 300, NULL, ''),
    (119, 'Banqueta Amanda', 5, 'un', 160, NULL, 120, NULL, ''),
    (120, 'Banqueta Belo Horizonte', 5, 'un', 380, NULL, 80, NULL, ''),
    (121, 'Banqueta Belo Horizonte Branca', 5, 'un', 1484, NULL, 70, NULL, ''),
    (122, 'Banqueta Belo Horizonte Preta', 5, 'un', 410, NULL, 70, NULL, ''),
    (123, 'Banqueta Belo Horizonte Vermelha', 5, 'un', 114, NULL, 70, NULL, ''),
    (124, 'Banqueta Bertóia', 5, 'un', 604, NULL, 120, NULL, ''),
    (125, 'Banqueta de madeira e metalon', 5, 'un', 26, NULL, 180, NULL, ''),
    (126, 'Banqueta Sorvete', 5, 'un', 59, NULL, 100, NULL, ''),
    (127, 'Banco New Forest (Madeira e Metalon)', 5, 'un', 0, NULL, 300, NULL, ''),
    (128, 'Banqueta Texas', 5, 'un', 5, NULL, 250, NULL, ''),
    (129, 'Banqueta Z', 5, 'un', 72, NULL, 100, NULL, ''),
    (130, 'Mesa centro Saarinem branca', 5, 'un', 34, NULL, 500, NULL, ''),
    (131, 'Base mesa centro Saarinem preto', 5, 'un', 3, NULL, 500, NULL, ''),
    (132, 'Cadeira Amanda', 5, 'un', 924, NULL, 100, NULL, ''),
    (133, 'Cadeira Atlanta', 5, 'un', 33, NULL, 70, NULL, ''),
    (134, 'Cadeira Bertóia', 5, 'un', 92, NULL, 200, NULL, ''),
    (135, 'Cadeira Bug', 5, 'un', 687, NULL, 75, NULL, ''),
    (136, 'Cadeira de braço', 5, 'un', 4, NULL, 100, NULL, ''),
    (137, 'Cadeira de braço com rodízio', 5, 'un', 35, NULL, 100, NULL, ''),
    (138, 'Mesa de centro com tampo de madeira e base eiffel', 5, 'un', 23, NULL, 80, NULL, ''),
    (139, 'Unifila', 5, 'un', 19, NULL, 30, NULL, ''),
    (141, 'Cadeira Eames III Eiffel Base de madeira com braço', 5, 'un', 24, NULL, 100, NULL, ''),
    (142, 'Cadeira Iron/Tolix', 5, 'un', 30, NULL, 120, NULL, ''),
    (143, 'Cadeira Eames III  Eiffel Base de madeira com braço  - Vermelha', 5, 'un', 37, NULL, 50, NULL, ''),
    (144, 'Cadeira Eames III Eiffel Base de madeira com braço - Branca', 5, 'un', 99, NULL, 100, NULL, ''),
    (145, 'Cadeira Eiffel base madeira sem braço', 5, 'un', 862, NULL, 70, NULL, ''),
    (146, 'Cadeira giratória de braço (escritório)', 5, 'un', 41, NULL, 200, NULL, ''),
    (147, 'Cadeira Phanton', 5, 'un', 0, NULL, 200, NULL, ''),
    (148, 'Cadeira RB azul', 5, 'un', 458, NULL, 40, NULL, ''),
    (149, 'Roleta de Premios', 5, 'un', 9, NULL, 800, NULL, ''),
    (150, 'Cubo de madeira revestido em carpete 0,50x0,50x0,50m', 5, 'un', 3, NULL, 150, NULL, ''),
    (151, 'Cubo de madeira revestido em carpete 0,50x0,50x0,70m', 5, 'un', 2, NULL, 150, NULL, ''),
    (152, 'Cubo de madeira revestido em carpete 0,50x0,50x0,80m', 5, 'un', 1, NULL, 200, NULL, ''),
    (153, 'Extintor de incêndio', 5, 'un', 749, NULL, 170, NULL, ''),
    (154, 'Lixeira cromada 5 litros', 5, 'un', 1169, NULL, 80, NULL, ''),
    (155, 'Lixeira de plástico', 5, 'un', 1600, NULL, 40, NULL, ''),
    (156, 'Mesa base palito cromada com tampo de vidro redondo', 5, 'un', 2746, NULL, 220, NULL, ''),
    (157, 'Mesa bistrô com tampo de vidro', 5, 'un', 2186, NULL, 220, NULL, ''),
    (158, 'Mesa com tampo de vidro retangular', 5, 'un', 185, NULL, 220, NULL, ''),
    (159, 'Mesa de canto com tampo de vidro quadrado', 5, 'un', 93, NULL, 220, NULL, ''),
    (160, 'Mesa de canto com tampo de vidro redondo', 5, 'un', 116, NULL, 220, NULL, ''),
    (161, 'Mesa bistrô rústica', 5, 'un', 5, NULL, 350, NULL, ''),
    (162, 'Mesa de centro com tampo de vidro redondo', 5, 'un', 122, NULL, 220, NULL, ''),
    (163, 'Mesa de centro com tampo de vidro retangular', 5, 'un', 70, NULL, 220, NULL, ''),
    (164, 'Mesa de centro Gênova', 5, 'un', 17, NULL, 250, NULL, ''),
    (165, 'Mesa de madeira com tampo de vidro redondo', 5, 'un', 14, NULL, 350, NULL, ''),
    (166, 'Mesa bistrô de madeira e metalon', 5, 'un', 28, NULL, 350, NULL, ''),
    (168, 'Mesa de reunião para 06 pessoas com tampo de vidro fumê retangular 1,80x0,80m', 5, 'un', 128, NULL, 600, NULL, ''),
    (169, 'Mesa jantar Conne carvalho preto', 5, 'un', 3, NULL, 600, NULL, ''),
    (170, 'Mesa Jantar New Forest Imbuia', 5, 'un', 1, NULL, 550, NULL, ''),
    (171, 'Mesa jantar oval Conne castanho', 5, 'un', 6, NULL, 600, NULL, ''),
    (172, 'Mesa lateral Joyce Vidro', 5, 'un', 0, NULL, 300, NULL, ''),
    (173, 'Mesa lateral Joyce Vidro preto', 5, 'un', 0, NULL, 200, NULL, ''),
    (174, 'Mesa lateral oval Luni', 5, 'un', 24, NULL, 300, NULL, ''),
    (175, 'Mesa lateral oval Luni Preto', 5, 'un', 8, NULL, 250, NULL, ''),
    (176, 'Módulo de sofá de 01 lugar', 5, 'un', 26, NULL, 400, NULL, ''),
    (177, 'Ombrelone Sam Martin Creme', 5, 'un', 0, NULL, 450, NULL, ''),
    (178, 'Poltrona Barcelona', 5, 'un', 256, NULL, 500, NULL, ''),
    (179, 'Poltrona Bay Grafite', 5, 'un', 3, NULL, 400, NULL, ''),
    (180, 'Poltrona Tarsila', 5, 'un', 7, NULL, 400, NULL, ''),
    (181, 'Poltrona Diamante II', 5, 'un', 26, NULL, 450, NULL, ''),
    (182, 'Poltrona Dover II', 5, 'un', 4, NULL, 450, NULL, ''),
    (183, 'Poltrona Ellis Imbuia', 5, 'un', 3, NULL, 450, NULL, ''),
    (184, 'Poltrona Geórgia Corano', 5, 'un', 0, NULL, 450, NULL, ''),
    (185, 'Poltrona Giratória Iris', 5, 'un', 14, NULL, 450, NULL, ''),
    (186, 'Poltrona Nova Orly Velo castor', 5, 'un', 7, NULL, 200, NULL, ''),
    (187, 'Poltrona poly branca de 01 lugar, com pés cromados', 5, 'un', 62, NULL, 400, NULL, ''),
    (188, 'Poltrona poly branca de 02 lugares, com pés cromados', 5, 'un', 66, NULL, 500, NULL, ''),
    (189, 'Poltrona rodizio Coimbra II PVC', 5, 'un', 6, NULL, 450, NULL, ''),
    (190, 'Poltrona rodizio Coimbra II PVC preta', 5, 'un', 8, NULL, 220, NULL, ''),
    (191, 'Porta folder em acrílico', 5, 'un', 16, NULL, 350, NULL, ''),
    (192, 'Porta folder em estrutura metálica, pintado', 5, 'un', 45, NULL, 350, NULL, ''),
    (193, 'Porta folder em madeira emassado e pintado', 5, 'un', 397, NULL, 350, NULL, ''),
    (194, 'Puff ¨Ameba¨', 5, 'un', 5, NULL, 200, NULL, ''),
    (195, 'Puff de pneu revestido em palha de taboa', 5, 'un', 1, NULL, 250, NULL, ''),
    (196, 'Puff quadrado', 5, 'un', 306, NULL, 90, NULL, ''),
    (197, 'Separador de filas com corrente de plástico', 5, 'un', 23, NULL, 40, NULL, ''),
    (198, 'Puff Curvo em S', 5, 'un', 11, NULL, 1200, NULL, ''),
    (199, 'Sofá de 01 lugar', 5, 'un', 40, NULL, 300, NULL, ''),
    (200, 'Sofá de 02 lugares', 5, 'un', 57, NULL, 600, NULL, ''),
    (204, 'Sofá Le Corbusier de 01 lugar', 5, 'un', 93, NULL, 350, NULL, ''),
    (205, 'Sofá Le Corbusier de 02 lugares', 5, 'un', 172, NULL, 600, NULL, ''),
    (206, 'Ar condicionado convencional', 6, 'un', 103, NULL, 1100, NULL, ''),
    (207, 'Ar condicionado SPLIT', 6, 'un', 123, NULL, 1100, NULL, ''),
    (208, 'Bebedouro elétrico tipo coluna com galão de 20 litros', 6, 'un', 60, NULL, 550, NULL, ''),
    (209, 'Cafeteira elétrica de filtro', 6, 'un', 77, NULL, 250, NULL, ''),
    (210, 'Circulador de ar, instalado no teto', 6, 'un', 13, NULL, 400, NULL, ''),
    (211, 'impressão para revestimento do piso em programação visual', 11, 'm2', 19, NULL, 180, NULL, ''),
    (213, 'DVD', 6, 'un', 0, NULL, 100, NULL, ''),
    (214, 'Forno Elétrico', 6, 'un', 53, NULL, 350, NULL, ''),
    (215, 'Freezer', 6, 'un', 99, NULL, 1000, NULL, ''),
    (216, 'Frigobar', 6, 'un', 1472, NULL, 650, NULL, ''),
    (217, 'Geladeira', 6, 'un', 1254, NULL, 800, NULL, ''),
    (218, 'Micro-ondas', 6, 'un', 51, NULL, 450, NULL, ''),
    (219, 'Notebook', 6, 'un', 4, NULL, 1600, NULL, ''),
    (221, 'Projetor com tela de 150”', 6, 'un', 3, NULL, 1200, NULL, ''),
    (222, 'TV LCD com 32”', 6, 'un', 71, NULL, 1000, NULL, ''),
    (223, 'TV LCD com 42”', 6, 'un', 1311, NULL, 1400, NULL, ''),
    (224, 'TV LCD com 52”', 6, 'un', 332, NULL, 1800, NULL, ''),
    (225, 'TV LCD com 55”', 6, 'un', 331, NULL, 2000, NULL, ''),
    (226, 'TV LCD com 60”', 6, 'un', 8, NULL, 2500, NULL, ''),
    (227, 'TV LCD com 70”', 6, 'un', 64, NULL, 3300, NULL, ''),
    (228, 'TV LCD com 65”', 6, 'un', 59, NULL, 3000, NULL, ''),
    (229, 'TV Touch Screen', 6, 'un', 85, NULL, 3500, NULL, ''),
    (230, 'Ventilador de teto/parede', 6, 'un', 29, NULL, 400, NULL, ''),
    (231, 'Ventilador com base', 6, 'un', 4, NULL, 400, NULL, ''),
    (232, 'Vídeo Wall (por módulos 42")', 6, 'un', 52, NULL, 900, NULL, ''),
    (233, 'Painel de LED (por módulos 50cm)', 6, 'un', 932, NULL, 950, NULL, ''),
    (234, 'Visa Cooler vertical', 6, 'un', 59, NULL, 3300, NULL, ''),
    (235, 'Vaso com planta natural e cachepô', 7, 'un', 1156, NULL, 380, NULL, ''),
    (236, 'Jardim com planta natural', 7, 'm2', 504, NULL, 600, NULL, ''),
    (237, 'Estrutura Box Truss Q15', 8, 'm', 42, NULL, 90, NULL, ''),
    (238, 'Cubos Box Truss Q15', 8, 'un', 35, NULL, 90, NULL, ''),
    (239, 'Cumeeira Box Truss Q15', 8, 'un', 0, NULL, 90, NULL, ''),
    (240, 'Sapata para Box Q15 ou Q25', 8, 'un', 35, NULL, 90, NULL, ''),
    (241, 'Estrutura Box Truss Q25', 8, 'm', 93, NULL, 115, NULL, ''),
    (242, 'Cubos box Truss Q25', 8, 'un', 85, NULL, 115, NULL, ''),
    (243, 'Cumeeira Box Truss Q25', 8, 'un', 0, NULL, 115, NULL, ''),
    (244, 'Estrutura Box Truss Q30', 8, 'm', 77, NULL, 115, NULL, ''),
    (245, 'Cubos box Truss Q30', 8, 'un', 51, NULL, 115, NULL, ''),
    (246, 'Cumeeira Box Truss Q30', 8, 'un', 0, NULL, 115, NULL, ''),
    (247, 'Cortina em tecido', 9, 'm2', 52, NULL, 200, NULL, ''),
    (248, 'Lycra branca tensionada no teto', 9, 'm2', 50, NULL, 60, NULL, ''),
    (249, 'Quadro de metalon', 10, 'm2', 3376, NULL, 300, NULL, ''),
    (250, 'Treliça metálica', 10, 'm', 18, NULL, 60, NULL, ''),
    (251, 'Tubo de metalon', 10, 'm', 717, NULL, 110, NULL, ''),
    (252, 'Cabo de aço', 10, 'm', 28, NULL, 25, NULL, ''),
    (253, 'Impressão digital', 11, 'm2', 10275, NULL, 130, NULL, ''),
    (254, 'Letra caixa em PVC Expandido 10mm', 11, 'm2', 2047, NULL, 750, NULL, ''),
    (255, 'Impressão digital em Lona com ilhós', 11, 'm2', 91, NULL, 150, NULL, ''),
    (256, 'Vinil', 11, 'm2', 1840, NULL, 75, NULL, ''),
    (257, 'Vinil jateado', 11, 'm2', 227, NULL, 75, NULL, ''),
    (258, 'Vinil jateado - filamento', 11, 'm2', 65, NULL, 75, NULL, ''),
    (259, 'Vinil jateado - quadriculado', 11, 'm2', 57, NULL, 75, NULL, ''),
    (260, 'Texto em recorte de vinil', 11, 'm2', 235, NULL, 100, NULL, ''),
    (261, 'Imagem em recorte de vinil adesivo', 11, 'm2', 568, NULL, 100, NULL, ''),
    (262, 'Piso elevado e chapeado em tablado de madeira com 0,30m/h, estruturado para Mezanino', 2, 'm2', 873, NULL, 150, NULL, ''),
    (263, 'Impressão digital com acabamento em bastão e corda formato', 11, 'm2', 11, NULL, 160, NULL, ''),
    (264, 'Pergolado em Z400', 3, 'm2', 304, NULL, 30, NULL, ''),
    (265, 'Pergolado em Z500', 3, 'm2', 13, NULL, 40, NULL, ''),
    (266, 'Insulfilm', 11, 'm2', 2, NULL, 170, NULL, ''),
    (267, 'Mesa de jantar de madeira 4m', 5, 'un', 24, NULL, 1200, NULL, ''),
    (268, 'Chapa em poliestireno  com aplicação de imagem digital em vinil', 11, 'm2', 45, NULL, 450, NULL, ''),
    (269, 'Banco de madeira com tampo de couro trançado', 5, 'un', 38, NULL, 200, NULL, ''),
    (270, 'Aparador de madeira rústico com gaveta 2,0 x 0,5', 5, 'un', 14, NULL, 1000, NULL, ''),
    (271, 'Quadro de energia e cabeamento elétrico interno', 12, 'un', 5258, NULL, 215, NULL, ''),
    (272, 'Tomada/novo padrão ABNT', 12, 'un', 5473, NULL, 110, NULL, ''),
    (273, 'Tomada embutida/novo padrão ABNT', 12, 'un', 884, NULL, 150, NULL, ''),
    (274, 'Tomada dupla modelo tripolar', 12, 'un', 1, NULL, 200, NULL, ''),
    (275, 'Refletor HQI', 12, 'un', 788, NULL, 110, NULL, ''),
    (276, 'Refletor de Led', 12, 'un', 3003, NULL, 120, NULL, ''),
    (277, 'Luminária palito cromada', 12, 'un', 46, NULL, 200, NULL, ''),
    (278, 'Luminária pendente formato globo', 12, 'un', 76, NULL, 220, NULL, ''),
    (279, 'Luminária pendente formato cone', 12, 'un', 35, NULL, 220, NULL, ''),
    (280, 'Luminária pendente retangular', 12, 'un', 7, NULL, 220, NULL, ''),
    (281, 'Luminária pendente c/cúpula em aço escovado', 12, 'un', 21, NULL, 220, NULL, ''),
    (282, 'Luminária pendente aramado diamante', 12, 'un', 8, NULL, 220, NULL, ''),
    (283, 'Luminária colonial pendente', 12, 'un', 25, NULL, 220, NULL, ''),
    (284, 'Lâmpada dicroica com plafon de embutir', 12, 'un', 638, NULL, 110, NULL, ''),
    (285, 'Lâmpada compacta com plafon de embutir', 12, 'un', 2595, NULL, 110, NULL, ''),
    (286, 'Lâmpada fluorescente colorida', 12, 'un', 5, NULL, 120, NULL, ''),
    (287, 'Refletor com lâmpada fria', 12, 'un', 3, NULL, 110, NULL, ''),
    (288, 'Refletor par 32', 12, 'un', 2, NULL, 125, NULL, ''),
    (289, 'Refletor par 64', 12, 'un', 1, NULL, 200, NULL, ''),
    (290, 'Ribalta de LED', 12, 'un', 8, NULL, 550, NULL, ''),
    (291, 'Luz de emergência', 12, 'un', 0, NULL, 120, NULL, ''),
    (292, 'Ponto de internet', 12, 'un', 1, NULL, 550, NULL, ''),
    (293, 'Calha metálica com 04 lâmpadas fluorescentes', 12, 'un', 16, NULL, 500, NULL, ''),
    (294, 'Poste colonial em estrutura tubular, com iluminação', 12, 'un', 23, NULL, 500, NULL, ''),
    (295, 'Spot', 12, 'un', 945, NULL, 60, NULL, ''),
    (296, 'Iluminação para quadro de madeira retro iluminado', 12, 'un', 75, NULL, 100, NULL, ''),
    (297, 'Luminária pendente simples com lâmpadas encandecestes âmbar', 12, 'un', 19, NULL, 180, NULL, ''),
    (298, 'Luminária em trilho com lâmpada (3 lâmpadas)', 12, 'un', 130, NULL, 250, NULL, ''),
    (299, 'Fita de LED', 12, 'm', 1422, NULL, 80, NULL, ''),
    (300, 'Impressão digital em vinil perfurado', 11, 'm2', 13, NULL, 250, NULL, ''),
    (301, 'Cabo de aço para fixação de elementos no teto do pavilhão', 10, 'un', 8, NULL, 1000, NULL, ''),
    (302, 'Fita de LED embutida', 12, 'm', 171, NULL, 120, NULL, ''),
    (303, 'Passa "UM" - Tampo de madeira revestido em plástico hospitalar montado em perfil de alumínio anodizado.', 3, 'un', 3, NULL, 350, NULL, ''),
    (304, 'Mesa Bistrô Lapa cromada tampo redondo', 5, 'un', 21, NULL, 200, NULL, ''),
    (305, 'Cadeira Eames Dsr Translúcida', 5, 'un', 19, NULL, 220, NULL, ''),
    (306, 'Cafeteira em capsulas', 6, 'un', 1564, NULL, 500, NULL, ''),
    (307, 'Poltrona Teresa pu com base disco', 5, 'un', 206, NULL, 450, NULL, ''),
    (308, 'Haste de aterramento conectado em estrutura de alumínio com 1,20m', 12, 'un', 11, NULL, 110, NULL, ''),
    (309, 'Testeira em madeira emassada e pintada de 4,00x0,75m com peça central em elipse de 1,85x0,85m para aplicação de logomarca, 03 tubos metálicos de 4,00m com 4 polegadas cada', 4, 'un', 1, NULL, NULL, NULL, ''),
    (310, 'Poltrona Barcelona preta', 5, 'un', 11, NULL, 450, NULL, ''),
    (311, 'Impressão digital em lona', 11, 'm2', 4163, NULL, 130, NULL, ''),
    (312, 'Forro de teto cego em duraplac', 3, 'un', 107, 10, 50, NULL, ''),
    (313, 'Fechamento em painéis "TS", acoplados em perfis de alumínio anodizado a 2,52h', 3, 'm', 15, NULL, 50, NULL, ''),
    (314, 'Fechamento em painéis "TS", acoplados em perfis de alumínio anodizado a 2,86h', 3, 'm', 234, NULL, 50, NULL, ''),
    (315, 'Fechamento em painéis "TS", acoplados em perfis de alumínio anodizado a 3,30h', 3, 'm', 344, NULL, 100, NULL, ''),
    (316, 'Painel de vidro fixado em garras spider 0,68 x 1,08', 3, 'un', 28, NULL, 80, NULL, ''),
    (317, 'Teto em módulos de sarrafo de madeira revestido em bagum com furação para plafons com altura de 30cm', 4, 'm2', 261, NULL, 250, NULL, ''),
    (318, 'Cadeiras simples vermelhas com base cromada;', 5, 'un', 2, NULL, 70, NULL, ''),
    (319, 'Lixeira cromada para 30 litros', 5, 'un', 15, NULL, 120, NULL, ''),
    (320, 'suporte/pedestal', 6, 'un', 26, NULL, 200, NULL, ''),
    (321, 'Extintor CO²', 5, 'un', 31, NULL, 150, NULL, ''),
    (322, 'Lâmpadas HO', 12, 'un', 702, NULL, 110, NULL, ''),
    (323, 'Porta folder retratil/cromado, com 06 bandejas em acrílico no formato A4', 5, 'un', 5, NULL, 350, NULL, ''),
    (324, 'Piso MDF para cobertura', 2, 'm2', 1, NULL, 150, NULL, ''),
    (325, 'Tambor de metal 200L', 10, 'un', 0, NULL, 300, NULL, ''),
    (326, 'Jardim vertical em folhagem natural', 7, 'm2', 120, NULL, 1000, NULL, ''),
    (327, 'Tablet 10 Polegadas', 6, 'un', 2, NULL, 1800, NULL, ''),
    (328, 'Letra caixa em PVC Expandido 15mm', 11, 'm2', 809, NULL, 1000, NULL, ''),
    (329, 'Mesa de madeira quadrada 1x1', 5, 'un', 48, NULL, 650, NULL, ''),
    (330, 'Puff cilindrico', 5, 'un', 250, 3000, 90, NULL, ''),
    (331, 'Parede em madeira emassada e pintado', 4, 'm2', 32, NULL, 500, NULL, ''),
    (332, 'Teto em madeira emassado e pintado', 4, 'un', 23, NULL, 450, NULL, ''),
    (333, 'Prateleira em madeira', 4, 'm', 177, NULL, 275, NULL, ''),
    (334, 'Letra Caixa Retroiluminada 10mm com PVC Expandindo e acrílico na frente', 11, 'm2', 1021, NULL, 1200, NULL, ''),
    (335, 'Depósito montado em painéis "TS", acoplados em perfis de alumínio anodizado - com porta e chave', 3, 'un', 170, NULL, 900, NULL, ''),
    (336, 'Cadeira Gruvyer', 5, 'un', 21, NULL, 85, NULL, ''),
    (337, 'Testeira emassada e pintada', 4, 'm2', 12, NULL, 480, NULL, ''),
    (338, 'Parede em módulos de sarrafo revestida em lona com impressão digital', 4, 'm2', 262, NULL, 420, NULL, ''),
    (339, 'Testeira de madeira em módulos de sarrafo revestida em lona com impressão digital', 4, 'm2', 133, NULL, 400, NULL, ''),
    (340, 'Sanca de madeira revestida em bagum - 0,4x0,4', 4, 'm', 133, NULL, 500, NULL, ''),
    (341, 'Viga de madeira revestida em bagum', 4, 'm', 285, NULL, 450, NULL, ''),
    (342, 'Rodapé de madeira, em mdf', 2, 'm', 127, NULL, 30, NULL, ''),
    (343, 'Parede em módulos de sarrafo de madeira crua', 4, 'm2', 50, NULL, 350, NULL, ''),
    (344, 'Jardim vertical com planta artificial', 7, 'm2', 184, NULL, 600, NULL, ''),
    (345, 'Letra caixa em PS 2mm recortada em router.', 11, 'm2', 611, NULL, 500, NULL, ''),
    (346, 'Nivelamento de piso', 2, 'm2', 7, 40, 45, NULL, ''),
    (347, 'Totem de carregamento em madeira com tomadas', 5, 'un', 32, NULL, 400, NULL, ''),
    (348, 'Quadro de metalon revestido em bagum', 10, 'm2', 9, NULL, 250, NULL, ''),
    (349, 'Estante de metalon com tampos de madeira 1,50x2,50m', 5, 'un', 2, NULL, 1300, NULL, '5 níveis, 15 nichos'),
    (350, 'Testeira construída de telha de metalon trapezoidal', 10, 'un', 2, NULL, 350, NULL, '')
) AS p(id, nome, grupo_id, unidade_slug, freq_uso, preco_custo, preco_locacao, consumo_kva, observacao)
LEFT JOIN custos_produto_grupos pg ON pg.prosperitas_id = p.grupo_id
LEFT JOIN custos_unidades cu ON cu.sigla = p.unidade_slug
LEFT JOIN custos_categorias cc ON cc.slug = CASE
  WHEN p.grupo_id = 1 THEN 'tendas'
  WHEN p.grupo_id = 2 THEN 'piso'
  WHEN p.grupo_id = 3 THEN 'estruturas'
  WHEN p.grupo_id = 4 THEN 'marcenaria'
  WHEN p.grupo_id = 5 THEN 'mobiliario'
  WHEN p.grupo_id = 6 THEN 'eletrica'
  WHEN p.grupo_id = 7 THEN 'decoracao'
  WHEN p.grupo_id = 8 THEN 'estruturas'
  WHEN p.grupo_id = 9 THEN 'decoracao'
  WHEN p.grupo_id = 10 THEN 'estruturas'
  WHEN p.grupo_id = 11 THEN 'programacao-visual'
  WHEN p.grupo_id = 12 THEN 'eletrica'
  WHEN p.grupo_id = 13 THEN 'outros'
  ELSE 'outros'
END
WHERE NOT EXISTS (
  SELECT 1 FROM custos_produtos cp WHERE cp.prosperitas_id = p.id
);

-- Marca produtos seed com origem='seed' (decidir depois se purga)
UPDATE custos_produtos
SET origem = 'seed'
WHERE prosperitas_id IS NULL AND origem = 'manual';

-- ============================================================================
-- Verificações
-- ============================================================================

SELECT
  (SELECT count(*) FROM custos_produto_grupos WHERE prosperitas_id IS NOT NULL) as grupos_prosperitas,
  (SELECT count(*) FROM custos_unidades WHERE prosperitas_id IS NOT NULL OR sigla IN ('un','m2','m3','m','s')) as unidades_totais,
  (SELECT count(*) FROM custos_produtos WHERE origem = 'prosperitas') as produtos_prosperitas,
  (SELECT count(*) FROM custos_produtos WHERE origem = 'seed') as produtos_seed;

-- Amostra de produtos com acentos e caracteres especiais
SELECT nome, descricao, unidade, frequencia_uso, preco_custo, preco_locacao
FROM custos_produtos
WHERE origem = 'prosperitas'
LIMIT 10;

COMMIT;
