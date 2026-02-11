// Script de migração para bcrypt
// Execute com: npx tsx scripts/migrate-to-bcrypt.ts

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

// Carregar variáveis de ambiente do .env.local
const envPath = path.join(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
    console.error('❌ Erro: Arquivo .env.local não encontrado.');
    process.exit(1);
}

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
    console.error('❌ Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontrados');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateToBcrypt() {
    console.log('🔐 Iniciando migração para bcrypt...\n');

    try {
        // Buscar todos os usuários
        const { data: users, error: fetchError } = await supabase
            .from('users')
            .select('*');

        if (fetchError) {
            throw new Error(`Erro ao buscar usuários: ${fetchError.message}`);
        }

        if (!users || users.length === 0) {
            console.log('ℹ️  Nenhum usuário encontrado. Criando usuário admin padrão...\n');

            // Criar usuário admin com senha bcrypt
            const adminPasswordHash = await bcrypt.hash('admin', 10);

            const { error: createError } = await supabase
                .from('users')
                .insert({
                    name: 'admin',
                    email: 'admin@admin.com',
                    password_hash: adminPasswordHash,
                    is_admin: true,
                    is_visitor: false,
                    is_active: true
                });

            if (createError) {
                throw new Error(`Erro ao criar admin: ${createError.message}`);
            }

            console.log('✅ Usuário admin criado com sucesso!');
            console.log('📧 Login: admin');
            console.log('🔑 Senha: admin\n');
            console.log('⚠️  Por favor, altere a senha após o primeiro login.\n');
            return;
        }

        console.log(`📊 Total de usuários: ${users.length}\n`);

        // Verificar se algum usuário já tem bcrypt (começa com $2a$ ou $2b$)
        const hasBcrypt = users.some(u => u.password_hash?.startsWith('$2'));

        if (hasBcrypt) {
            console.log('ℹ️  Alguns usuários já estão usando bcrypt. Pulando migração em massa.\n');
        } else {
            console.log('⚠️  ATENÇÃO: Todas as senhas SHA-256 serão invalidadas.\n');
        }

        // Verificar se existe usuário admin
        const adminUser = users.find(u => u.name === 'admin' || u.email === 'admin@admin.com');

        if (adminUser) {
            // Atualizar senha do admin para bcrypt
            const adminPasswordHash = await bcrypt.hash('admin', 10);

            const { error: updateError } = await supabase
                .from('users')
                .update({ password_hash: adminPasswordHash })
                .eq('id', adminUser.id);

            if (updateError) {
                throw new Error(`Erro ao atualizar admin: ${updateError.message}`);
            }

            console.log('✅ Senha do usuário admin resetada para bcrypt');
            console.log('📧 Login: admin');
            console.log('🔑 Senha: admin\n');
        } else {
            // Criar novo usuário admin
            const adminPasswordHash = await bcrypt.hash('admin', 10);

            const { error: createError } = await supabase
                .from('users')
                .insert({
                    name: 'admin',
                    email: 'admin@admin.com',
                    password_hash: adminPasswordHash,
                    is_admin: true,
                    is_visitor: false,
                    is_active: true
                });

            if (createError) {
                throw new Error(`Erro ao criar admin: ${createError.message}`);
            }

            console.log('✅ Usuário admin criado com sucesso!');
            console.log('📧 Login: admin');
            console.log('🔑 Senha: admin\n');
        }

        console.log('📝 Próximos passos:');
        console.log('1. Faça login como admin/admin');
        console.log('2. Vá para a página de Usuários');
        console.log('3. Redefina as senhas dos outros usuários\n');
        console.log('✅ Migração concluída!\n');

    } catch (error: any) {
        console.error(`❌ Erro: ${error.message}`);
        process.exit(1);
    }
}

migrateToBcrypt();
