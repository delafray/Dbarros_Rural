// Script para testar login do admin
// Execute com: npx tsx scripts/test-admin-login.ts

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

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Variáveis de ambiente não encontradas');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
    console.log('🔍 Testando login admin...\n');

    try {
        // Tentar buscar usuário por nome exato
        console.log('1. Buscando usuário "admin" por nome...');
        const { data: byName, error: nameError } = await supabase
            .from('users')
            .select('*')
            .eq('name', 'admin')
            .maybeSingle();

        if (nameError) {
            console.error('❌ Erro ao buscar por nome:', nameError.message);
        } else if (byName) {
            console.log('✅ Usuário encontrado por nome!');
            console.log(`   ID: ${byName.id}`);
            console.log(`   Email: ${byName.email}`);
            console.log(`   Admin: ${byName.is_admin}`);
            console.log(`   Active: ${byName.is_active}`);
            console.log(`   Hash (10 primeiros): ${byName.password_hash.substring(0, 10)}`);

            // Testar senha
            console.log('\n2. Testando senha "admin"...');
            const isValid = await bcrypt.compare('admin', byName.password_hash);
            console.log(isValid ? '✅ Senha VÁLIDA!' : '❌ Senha INVÁLIDA!');
        } else {
            console.log('❌ Usuário "admin" não encontrado por nome');
        }

        // Tentar buscar por email
        console.log('\n3. Buscando usuário por email "admin@admin.com"...');
        const { data: byEmail, error: emailError } = await supabase
            .from('users')
            .select('*')
            .eq('email', 'admin@admin.com')
            .maybeSingle();

        if (emailError) {
            console.error('❌ Erro ao buscar por email:', emailError.message);
        } else if (byEmail) {
            console.log('✅ Usuário encontrado por email!');
        } else {
            console.log('❌ Usuário não encontrado por email');
        }

        // Tentar query OR (igual ao authService)
        console.log('\n4. Testando query OR (como no authService)...');
        const identifier = 'admin';
        const { data: byOr, error: orError } = await supabase
            .from('users')
            .select('*')
            .or(`email.eq.${identifier},name.ilike.${identifier}`)
            .maybeSingle();

        if (orError) {
            console.error('❌ Erro com query OR:', orError.message);
        } else if (byOr) {
            console.log('✅ Usuário encontrado com OR!');
            console.log(`   Nome: ${byOr.name}`);
        } else {
            console.log('❌ Usuário não encontrado com query OR');
        }

        // Listar todos os usuários
        console.log('\n5. Listando TODOS os usuários...');
        const { data: allUsers, error: allError } = await supabase
            .from('users')
            .select('id, name, email, is_admin, is_active');

        if (allError) {
            console.error('❌ Erro ao listar:', allError.message);
        } else if (allUsers) {
            console.log(`\n📊 Total: ${allUsers.length} usuários`);
            allUsers.forEach(u => {
                console.log(`   - ${u.name} (${u.email}) - Admin: ${u.is_admin}, Ativo: ${u.is_active}`);
            });
        }

    } catch (error: any) {
        console.error('❌ Erro:', error.message);
    }
}

testLogin();
