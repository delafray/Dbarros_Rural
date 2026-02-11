// Script para corrigir o login do Administrator
// Execute com: npx tsx scripts/fix-admin-login.ts

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
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

async function fixLogin() {
    console.log('🔧 Corrigindo login do Administrator...\n');

    // 1. Buscar quem está respondendo por "admin"
    const identifier = 'admin';
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${identifier},name.ilike.${identifier}`)
        .maybeSingle();

    if (error || !user) {
        console.error('❌ Usuário problemático não encontrado:', error?.message);
        return;
    }

    console.log('👤 Usuário encontrado:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Email: ${user.email}`);

    // 2. Resetar senha para bcrypt('admin')
    console.log('\n🔐 Resetando senha para "admin"...');
    const hash = await bcrypt.hash('admin', 10);

    const { error: updateError } = await supabase
        .from('users')
        .update({
            password_hash: hash,
            is_active: true,
            is_admin: true // Garantir que é admin
        })
        .eq('id', user.id);

    if (updateError) {
        console.error('❌ Erro ao atualizar:', updateError.message);
    } else {
        console.log('✅ Senha atualizada com sucesso!');
        console.log('🚀 Tente logar agora com:');
        console.log('   Login: admin');
        console.log('   Senha: admin');
    }
}

fixLogin();
