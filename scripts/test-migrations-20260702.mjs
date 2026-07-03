// Teste pós-aplicação das migrations 20260702 (rodar com: node scripts/test-migrations-20260702.mjs)
// Usa a chave ANON (pública) — simula um usuário NÃO logado. Não altera nenhum dado existente.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
    readFileSync('.env.local', 'utf-8')
        .split('\n')
        .filter(l => l.includes('='))
        .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
let failures = 0;

function report(name, ok, detail) {
    console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
    if (!ok) failures++;
}

// 1. backup_introspect deve NEGAR acesso a quem não é admin
{
    const { data, error } = await supabase.rpc('backup_introspect');
    report(
        'backup_introspect bloqueado para não-admin',
        !!error && !data,
        error ? error.message : 'ATENÇÃO: retornou dados!'
    );
}

// 2. regenerate_estandes deve EXISTIR (chamada com UUID aleatório e lista vazia:
//    DELETE não casa com nada, INSERT de zero linhas — inofensivo)
{
    const { error } = await supabase.rpc('regenerate_estandes', {
        p_config_id: '00000000-0000-0000-0000-000000000000',
        p_stand_nrs: [],
    });
    const notFound = error && /could not find|does not exist|404/i.test(error.message);
    report(
        'regenerate_estandes existe no banco',
        !notFound,
        error ? `resposta: ${error.message}` : 'executou OK (0 linhas afetadas)'
    );
}

// 3. Anônimo NÃO deve conseguir ler a tabela users (senhas temp em texto claro)
{
    const { data, error } = await supabase
        .from('users')
        .select('email, temp_password_plain')
        .limit(3);
    const exposed = !error && Array.isArray(data) && data.length > 0;
    report(
        'tabela users protegida contra leitura anônima',
        !exposed,
        exposed
            ? `VAZAMENTO: ${data.length} linha(s) legível(is), temp_password_plain ${data.some(r => r.temp_password_plain) ? 'EXPOSTA' : 'nula nas lidas'}`
            : (error ? `bloqueado: ${error.message}` : 'consulta retornou vazio')
    );
}

console.log(failures === 0 ? '\nTodos os testes passaram.' : `\n${failures} teste(s) falharam.`);
process.exit(failures === 0 ? 0 : 1);
