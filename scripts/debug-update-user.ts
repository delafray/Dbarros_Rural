
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Carregar variáveis de ambiente
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        envVars[key] = value;
    }
});

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

async function testUpdate() {
    console.log('🧪 Testando atualização de usuário...\n');

    // 1. Pegar primeiro usuário da lista
    const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .limit(1);

    if (fetchError || !users || users.length === 0) {
        console.error('❌ Erro ao buscar usuários:', fetchError?.message);
        return;
    }

    const testUser = users[0];
    console.log(`👤 Usuário de teste: ${testUser.name} (${testUser.id})`);
    console.log(`   Status Atual: ${testUser.is_active ? 'Ativo' : 'Inativo'}`);

    // 2. Tentar inverter o status
    const newStatus = !testUser.is_active;
    console.log(`\n🔄 Tentando mudar status para: ${newStatus ? 'Ativo' : 'Inativo'}...`);

    const { data, error, status } = await supabase
        .from('users')
        .update({ is_active: newStatus })
        .eq('id', testUser.id)
        .select();

    console.log(`📡 Status HTTP: ${status}`);

    if (error) {
        console.error('❌ Erro no Supabase:', error.message);
        console.error('   Código:', error.code);
        console.error('   Detalhes:', error.details);
        console.error('   Dica:', error.hint);
    } else if (data && data.length > 0) {
        console.log('✅ Sucesso! O banco de dados foi atualizado.');
        console.log('📝 Resposta:', data[0]);
    } else {
        console.warn('⚠️ O comando executou sem erros, mas NENHUMA linha foi alterada.');
        console.warn('   Isso geralmente indica uma restrição de RLS (Row Level Security).');
        console.warn('   Verifique se o seu usuário tem permissão de UPDATE na tabela "users".');
    }
}

testUpdate();
