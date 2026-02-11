// Script para listar usuários e diagnosticar login
// Execute com: npx tsx scripts/debug-users.ts

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

async function debugUsers() {
    console.log('🔍 Listando todos os usuários do banco...\n');

    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, email, is_admin, is_active, password_hash');

    if (error) {
        console.error('❌ Erro:', error.message);
        return;
    }

    console.table(users.map(u => ({
        name: u.name,
        email: u.email,
        isAdmin: u.is_admin,
        hashStart: u.password_hash?.substring(0, 10) + '...',
        isBcrypt: u.password_hash?.startsWith('$2')
    })));

    // Testar a query de login exata
    const identifier = 'admin';
    console.log(`\n🔍 Testando query de login para "${identifier}"...`);

    const { data: loginUser, error: loginError } = await supabase
        .from('users')
        .select('name, email')
        .or(`email.eq.${identifier},name.ilike.${identifier}`)
        .limit(1)
        .maybeSingle();

    if (loginUser) {
        console.log('✅ Query retornou:', loginUser);
    } else {
        console.log('❌ Query não retornou nada.');
    }
}

debugUsers();
