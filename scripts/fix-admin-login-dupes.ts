// Script para corrigir o login do Administrator (Lidando com duplicatas)
// Execute com: npx tsx scripts/fix-admin-login-dupes.ts

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

async function fixLoginDupes() {
    console.log('🔧 Corrigindo logins duplicados...\n');

    const identifier = 'admin';
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${identifier},name.ilike.${identifier}`);

    if (error) {
        console.error('❌ Erro ao buscar usuários:', error.message);
        return;
    }

    if (!users || users.length === 0) {
        console.log('❌ Nenhum usuário encontrado para "admin".');
        return;
    }

    console.log(`📊 Encontrados ${users.length} usuários conflitantes:`);
    users.forEach(u => console.log(`   - ID: ${u.id}, Nome: ${u.name}, Email: ${u.email}`));

    console.log('\n🔐 Resetando senha de TODOS para "admin"...');
    const hash = await bcrypt.hash('admin', 10);

    for (const user of users) {
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: hash,
                is_active: true,
                is_admin: true
            })
            .eq('id', user.id);

        if (updateError) {
            console.error(`❌ Erro ao atualizar ${user.name}:`, updateError.message);
        } else {
            console.log(`✅ Senha atualizada para: ${user.name} (${user.email})`);
        }
    }

    console.log('\n🚀 Tente logar agora com:');
    console.log('   Login: admin');
    console.log('   Senha: admin');
}

fixLoginDupes();
