// Script para limpar TODOS os dados de planilha (estandes + configurações)
// Uso: node scripts/reset-planilha.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vefxyslqeqkrzaznomdk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZnh5c2xxZXFrcnphem5vbWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5Nzg1MTIsImV4cCI6MjA4NzU1NDUxMn0.c4XbZuqciwmy2yT7bfWWy3k_0CVXwsix7iwPY93215o';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function reset() {
    console.log('🗑️  Apagando todos os estandes...');
    const { error: e1, count: c1 } = await supabase
        .from('planilha_vendas_estandes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // deleta tudo

    if (e1) { console.error('Erro estandes:', e1.message); process.exit(1); }
    console.log(`   ✓ Estandes removidos: ${c1 ?? 'todos'}`);

    console.log('🗑️  Apagando todas as configurações...');
    const { error: e2, count: c2 } = await supabase
        .from('planilha_configuracoes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (e2) { console.error('Erro configs:', e2.message); process.exit(1); }
    console.log(`   ✓ Configurações removidas: ${c2 ?? 'todas'}`);

    console.log('\n✅ Planilha zerada com sucesso! Pode criar uma nova em Configurações.');
}

reset();
