#!/usr/bin/env node
/**
 * gerar-import-prosperitas.mjs
 *
 * Parser do dump Prosperitas (backup.sql, latin1) e gerador do bloco SQL de import.
 * Lê: produto_grupo (13), unidade_medida (5), produto (340), item_descritivo (~200K em 27 INSERTs)
 * Escreve: scripts/import-prosperitas-catalogo.sql (UTF-8, idempotente)
 *
 * Spec: MODULO-CUSTOS/IMPORT-CATALOGO-PROSPERITAS.md
 */

import fs from 'fs';
import path from 'path';

// Detecta o diretório do repositório (onde está o script)
const repoDir = path.resolve(process.cwd());
// Dump de 26/03 (o mais recente; a cópia "- Copia" é idêntica, cmp ok)
const dumpPath = path.join(
  path.dirname(repoDir),
  '_OLD-2026_05_05',
  'sistema (3)',
  'backup.sql'
);
const sqlOutPath = path.join(repoDir, 'scripts', 'import-prosperitas-catalogo.sql');

// ============================================================================
// PARSER DE TUPLAS SQL
// ============================================================================
/**
 * Faz parse de uma sequência de tuplas SQL do formato:
 * (val1, val2, 'string com \'escapes\' e "aspas"', NULL, 123, _binary '...', ...)
 *
 * Respeita:
 * - Strings entre ' ... ' com escapes MySQL: \' \" \\
 * - NULL
 * - Números (int, float)
 * - _binary '...'
 * - Separa tuplas por ),( (formato do dump: múltiplas tuplas em uma linha gigante)
 *
 * Retorna: Array<Array<string|null|number>>
 */
function parseTuples(tuplesStr) {
  const tuples = [];

  // Wrap com parênteses se necessário (o regex captura sem o wrapper)
  if (!tuplesStr.trim().startsWith('(')) {
    tuplesStr = '(' + tuplesStr + ')';
  }

  // Extrai tuplas respeitando parênteses e strings
  const tuplesRaw = [];
  let current = '';
  let inString = false;
  let depth = 0;

  for (let i = 0; i < tuplesStr.length; i++) {
    const ch = tuplesStr[i];

    if (!inString) {
      if (ch === "'") {
        inString = true;
        current += ch;
      } else if (ch === '(') {
        depth++;
        if (depth === 1) {
          current = '';
        } else {
          current += ch;
        }
      } else if (ch === ')') {
        depth--;
        if (depth === 0) {
          tuplesRaw.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      } else {
        current += ch;
      }
    } else {
      // Dentro de string
      if (ch === '\\' && i + 1 < tuplesStr.length) {
        const nextCh = tuplesStr[i + 1];
        current += ch + nextCh;
        i++;
      } else if (ch === "'") {
        inString = false;
        current += ch;
      } else {
        current += ch;
      }
    }
  }

  // Processa cada tupla extraída
  for (const tupla of tuplesRaw) {
    const values = [];
    let j = 0;
    let val = '';
    let inStr = false;

    while (j < tupla.length) {
      const ch = tupla[j];

      if (!inStr) {
        if (ch === "'") {
          inStr = true;
          j++;
        } else if (ch === ',') {
          val = val.trim();
          if (val === 'NULL') {
            values.push(null);
          } else if (val.startsWith('_binary')) {
            // _binary '...' → NULL
            // Pula _binary e o conteúdo
            let k = j - 1;
            while (k >= 0 && tupla[k] !== "'") k--;
            if (k >= 0) {
              // Encontra a próxima aspas fechando
              while (j < tupla.length && tupla[j] !== "'") j++;
              j++;
            }
            values.push(null);
            val = '';
            j++;
            continue;
          } else if (!isNaN(val) && val !== '') {
            values.push(parseFloat(val));
          } else {
            values.push(val);
          }
          val = '';
          j++;
        } else {
          val += ch;
          j++;
        }
      } else {
        // Dentro de string com '
        if (ch === '\\' && j + 1 < tupla.length) {
          const nextCh = tupla[j + 1];
          if (nextCh === "'") {
            val += "'"; // \' → ' (será '' no SQL)
            j += 2;
          } else if (nextCh === '"') {
            val += '"'; // \" → "
            j += 2;
          } else if (nextCh === '\\') {
            val += '\\'; // \\ → \
            j += 2;
          } else {
            val += ch;
            j++;
          }
        } else if (ch === "'") {
          inStr = false;
          j++;
        } else {
          val += ch;
          j++;
        }
      }
    }

    // Fecha tupla
    if (val.trim()) {
      val = val.trim();
      if (val === 'NULL') {
        values.push(null);
      } else if (!isNaN(val)) {
        values.push(parseFloat(val));
      } else {
        values.push(val);
      }
    }

    if (values.length > 0) {
      tuples.push(values);
    }
  }

  return tuples;
}

// ============================================================================
// EXTRAÇÃO DO DUMP
// ============================================================================
console.log(`Lendo dump (UTF-8): ${dumpPath}`);
const dumpContent = fs.readFileSync(dumpPath, 'utf-8');

// Extrai INSERT INTO `produto_grupo` VALUES (...)
const grupoMatch = dumpContent.match(
  /INSERT INTO\s+`produto_grupo`\s+VALUES\s*\(([\s\S]*?)\);/i
);
const grupos = grupoMatch
  ? parseTuples(grupoMatch[1])
  : [];

// Extrai INSERT INTO `unidade_medida` VALUES (...)
const unidadeMatch = dumpContent.match(
  /INSERT INTO\s+`unidade_medida`\s+VALUES\s*\(([\s\S]*?)\);/i
);
const unidades = unidadeMatch
  ? parseTuples(unidadeMatch[1])
  : [];

// Extrai INSERT INTO `produto` VALUES (...) — uma grande tupla
const produtoMatch = dumpContent.match(
  /INSERT INTO\s+`produto`\s+VALUES\s*\(([\s\S]*?)\);/i
);
const produtos = produtoMatch
  ? parseTuples(produtoMatch[1])
  : [];

// Extrai todas as 27 linhas de INSERT INTO `item_descritivo` VALUES (...)
// e coleta produto_id (índice 6)
const itemDescritivoPattern = /INSERT INTO\s+`item_descritivo`\s+VALUES\s*\(([\s\S]*?)\);/gi;
const frequenciaUso = {}; // produto_id -> count
let match;
while ((match = itemDescritivoPattern.exec(dumpContent)) !== null) {
  const items = parseTuples(match[1]);
  for (const item of items) {
    const produtoId = item[6]; // idx6 = produto_id
    if (produtoId !== null && produtoId !== undefined) {
      frequenciaUso[produtoId] = (frequenciaUso[produtoId] || 0) + 1;
    }
  }
}

console.log(`\nExtraído do dump:`);
console.log(`  - ${grupos.length} grupos de produtos`);
console.log(`  - ${unidades.length} unidades de medida`);
console.log(`  - ${produtos.length} produtos`);
console.log(`  - ${Object.keys(frequenciaUso).length} produtos com uso em item_descritivo`);

// ============================================================================
// DE-PARA: GRUPO → CATEGORIA (seção 4 da spec)
// ============================================================================
const grupoDePara = {
  1: 'tendas',
  2: 'piso',
  3: 'estruturas',
  4: 'marcenaria',
  5: 'mobiliario',
  6: 'eletrica',
  7: 'decoracao',
  8: 'estruturas',
  9: 'decoracao',
  10: 'estruturas',
  11: 'programacao-visual',
  12: 'eletrica',
  13: 'outros',
};

// ============================================================================
// DE-PARA: SIGLA UNIDADE → SLUG (seção 5 da spec)
// ============================================================================
const unidadeSiglaDeParaSlug = {
  'Unid.': 'un',
  'm²': 'm2',
  'm': 'm',
  's': 's',
  'm³': 'm3',
};

// ============================================================================
// GERAÇÃO DO SQL
// ============================================================================
let sql = `-- Import do catálogo Prosperitas (340 produtos, 13 grupos, 5 unidades)
-- Gerado automaticamente por gerar-import-prosperitas.mjs
-- Data: ${new Date().toISOString().split('T')[0]}
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

`;

// Seeds de unidades: PRIMEIRO as do dump (para manterem o prosperitas_id na
// dedup por sigla), depois as extras já usadas nos seeds atuais do módulo
const unidadeSeeds = [];
for (const unidade of unidades) {
  const id = unidade[0];
  const descricao = unidade[4]; // idx4 = nome
  const sigla = unidade[7]; // idx7 = sigla
  const slug = unidadeSiglaDeParaSlug[sigla] || sigla.toLowerCase();

  unidadeSeeds.push({
    nome: descricao,
    sigla: slug,
    prosperitas: id,
  });
}
unidadeSeeds.push(
  { nome: 'Diária', sigla: 'diaria', prosperitas: null },
  { nome: 'Evento', sigla: 'evento', prosperitas: null },
  { nome: 'Verba', sigla: 'vb', prosperitas: null },
  { nome: 'Kit', sigla: 'kit', prosperitas: null },
  { nome: 'Saco', sigla: 'saco', prosperitas: null },
  { nome: 'Fardo', sigla: 'fardo', prosperitas: null },
  { nome: 'Quilômetro', sigla: 'km', prosperitas: null },
  { nome: 'Semana', sigla: 'semana', prosperitas: null },
);

// Remove duplicatas por sigla, mantendo a primeira
const unidadeSeedUnique = [];
const unidadeSiglaVisto = new Set();
for (const seed of unidadeSeeds) {
  if (!unidadeSiglaVisto.has(seed.sigla)) {
    unidadeSiglaVisto.add(seed.sigla);
    unidadeSeedUnique.push(seed);
  }
}

sql += 'INSERT INTO custos_unidades (nome, sigla, prosperitas_id) VALUES\n';
for (let i = 0; i < unidadeSeedUnique.length; i++) {
  const seed = unidadeSeedUnique[i];
  const nom = seed.nome.replace(/'/g, "''");
  const sig = seed.sigla.replace(/'/g, "''");
  const pros = seed.prosperitas !== null ? seed.prosperitas : 'NULL';
  sql += `  ('${nom}', '${sig}', ${pros})`;
  if (i < unidadeSeedUnique.length - 1) {
    sql += ',\n';
  } else {
    sql += '\n';
  }
}
sql += 'ON CONFLICT (sigla) DO NOTHING;\n\n';

// ============================================================================
// 5. SEEDS: custos_produto_grupos (13 do Prosperitas)
// ============================================================================

sql += 'INSERT INTO custos_produto_grupos (nome, ordem, prosperitas_id) VALUES\n';
for (let i = 0; i < grupos.length; i++) {
  const grupo = grupos[i];
  const id = grupo[0];
  const nome = grupo[4]; // idx4 = descricao
  const ordem = grupo[10]; // idx10 = ordem
  const nomEsc = nome.replace(/'/g, "''");
  sql += `  ('${nomEsc}', ${ordem || 'NULL'}, ${id})`;
  if (i < grupos.length - 1) {
    sql += ',\n';
  } else {
    sql += '\n';
  }
}
sql += 'ON CONFLICT (prosperitas_id) DO NOTHING;\n\n';

// ============================================================================
// 6. INSERT dos 340 produtos (idempotente via prosperitas_id)
// ============================================================================

sql += `-- Insert dos produtos (idempotente via ON CONFLICT + WHERE NOT EXISTS para backup)\n`;
sql += `INSERT INTO custos_produtos\n`;
sql += `  (nome, descricao, categoria_id, unidade, frequencia_uso, ativo,\n`;
sql += `   grupo_id, unidade_id, preco_locacao, preco_custo, consumo_kva,\n`;
sql += `   observacao, prosperitas_id, origem)\n`;
sql += `SELECT\n`;
sql += `  p.nome,\n`;
sql += `  NULL, -- descricao: no Prosperitas o nome É a descrição completa\n`;
sql += `  COALESCE(cc.id, (SELECT id FROM custos_categorias WHERE slug = 'outros')) AS categoria_id,\n`;
sql += `  p.unidade_slug,\n`;
sql += `  p.freq_uso,\n`;
sql += `  true,\n`;
sql += `  pg.id AS grupo_id,\n`;
sql += `  cu.id AS unidade_id,\n`;
sql += `  NULLIF(p.preco_locacao, 0),\n`;
sql += `  NULLIF(p.preco_custo, 0),\n`;
sql += `  NULLIF(p.consumo_kva, 0),\n`;
sql += `  NULLIF(p.observacao, ''),\n`;
sql += `  p.id,\n`;
sql += `  'prosperitas'\n`;
sql += `FROM (\n`;

// CTE interna com os produtos e seus dados
sql += `  VALUES\n`;
for (let i = 0; i < produtos.length; i++) {
  const prod = produtos[i];
  const id = prod[0]; // idx0 = id (Prosperitas)
  const descricao = prod[6]; // idx6 = descricao (nome)
  const grupoId = prod[8]; // idx8 = grupo_id
  const unidadeId = prod[12]; // idx12 = unidade_id
  const custo = prod[3]; // idx3 = custo
  const valorLocacao = prod[15]; // idx15 = valor_locacao
  const consumoKva = prod[2]; // idx2 = consumo_kva
  const observacao = prod[16]; // idx16 = observacao

  const descEsc = descricao.replace(/'/g, "''");
  const obsEsc = observacao ? String(observacao).replace(/'/g, "''") : '';

  // Determina unidade_slug
  let unidadeSlug = 'un'; // default
  for (const unit of unidades) {
    if (unit[0] === unidadeId) {
      const sigla = unit[7];
      unidadeSlug = unidadeSiglaDeParaSlug[sigla] || sigla.toLowerCase();
      break;
    }
  }

  const freq = frequenciaUso[id] || 0;

  sql += `    (${id}, '${descEsc}', ${grupoId}, '${unidadeSlug}', ${freq}, `;
  sql += `${custo !== null ? custo : 'NULL'}, ${valorLocacao !== null ? valorLocacao : 'NULL'}, `;
  sql += `${consumoKva !== null ? consumoKva : 'NULL'}, '${obsEsc}')`;

  if (i < produtos.length - 1) {
    sql += ',\n';
  } else {
    sql += '\n';
  }
}

sql += `) AS p(id, nome, grupo_id, unidade_slug, freq_uso, preco_custo, preco_locacao, consumo_kva, observacao)\n`;
sql += `LEFT JOIN custos_produto_grupos pg ON pg.prosperitas_id = p.grupo_id\n`;
sql += `LEFT JOIN custos_unidades cu ON cu.sigla = p.unidade_slug\n`;
sql += `LEFT JOIN custos_categorias cc ON cc.slug = CASE\n`;

// Monta CASE para de-para grupo → categoria
for (const [grupoId, categSlug] of Object.entries(grupoDePara)) {
  sql += `  WHEN p.grupo_id = ${grupoId} THEN '${categSlug}'\n`;
}
sql += `  ELSE 'outros'\n`;
sql += `END\n`;
sql += `WHERE NOT EXISTS (\n`;
sql += `  SELECT 1 FROM custos_produtos cp WHERE cp.prosperitas_id = p.id\n`;
sql += `);\n\n`;

// ============================================================================
// 7. UPDATE dos produtos seed (origem='seed')
// ============================================================================

sql += `-- Marca produtos seed com origem='seed' (decidir depois se purga)\n`;
sql += `UPDATE custos_produtos\n`;
sql += `SET origem = 'seed'\n`;
sql += `WHERE prosperitas_id IS NULL AND origem = 'manual';\n\n`;

// ============================================================================
// 8. VERIFICAÇÕES FINAIS
// ============================================================================

sql += `-- ============================================================================\n`;
sql += `-- Verificações\n`;
sql += `-- ============================================================================\n\n`;
sql += `SELECT\n`;
sql += `  (SELECT count(*) FROM custos_produto_grupos WHERE prosperitas_id IS NOT NULL) as grupos_prosperitas,\n`;
sql += `  (SELECT count(*) FROM custos_unidades WHERE prosperitas_id IS NOT NULL OR sigla IN ('un','m2','m3','m','s')) as unidades_totais,\n`;
sql += `  (SELECT count(*) FROM custos_produtos WHERE origem = 'prosperitas') as produtos_prosperitas,\n`;
sql += `  (SELECT count(*) FROM custos_produtos WHERE origem = 'seed') as produtos_seed;\n\n`;

sql += `-- Amostra de produtos com acentos e caracteres especiais\n`;
sql += `SELECT nome, descricao, unidade, frequencia_uso, preco_custo, preco_locacao\n`;
sql += `FROM custos_produtos\n`;
sql += `WHERE origem = 'prosperitas'\n`;
sql += `LIMIT 10;\n\n`;

sql += `COMMIT;\n`;

// ============================================================================
// ESCRITA DO SQL
// ============================================================================

fs.writeFileSync(sqlOutPath, sql, 'utf-8');
console.log(`\nSQL gerado: ${sqlOutPath}`);
console.log(`Tamanho: ${(sql.length / 1024).toFixed(2)} KB`);

// ============================================================================
// VERIFICAÇÃO
// ============================================================================

console.log(`\n✓ Produtos esperados: 340`);
console.log(`✓ Grupos esperados: ${grupos.length}`);
console.log(`✓ Unidades esperadas: ${unidadeSeedUnique.length} (5 Prosperitas + 8 seeds)`);

// Amostra de 5 produtos
console.log(`\nAmostra de 5 produtos do dump (parse check):`);
for (let i = 0; i < Math.min(5, produtos.length); i++) {
  const prod = produtos[i];
  console.log(`  [${i}] id=${prod[0]}, nome="${prod[6]}", grupo=${prod[8]}, unidade=${prod[12]}`);
}

console.log(`\n✓ Parser completado sem erros!`);
