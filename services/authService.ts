import { supabase } from './supabaseClient';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface User {
    id: string;
    name: string;
    email: string;
    isAdmin: boolean;
    isVisitor: boolean;
    isActive: boolean;
    createdAt: string;
    expiresAt?: string;
    isTemp: boolean;
    canManageTags: boolean;
    isProjetista: boolean;
    edicaoId?: string;
    password?: string; // Campo opcional para trânsito de dados (ajuste de senha)
    tempPasswordPlain?: string; // Senha em texto plano para visitantes temp (só admin lê)
}

/** Tipo da linha retornada pelas queries na tabela `public.users` */
interface DbUser {
    id: string;
    name: string;
    email: string;
    is_admin: boolean | null;
    is_visitor: boolean | null;
    is_active: boolean | null;
    created_at: string | null;
    expires_at: string | null;
    is_temp: boolean | null;
    can_manage_tags: boolean | null;
    is_projetista: boolean | null;
    edicao_id?: string | null;
    temp_password_plain?: string | null;
}

// ── Factory: converte linha do DB para interface User ─────────────────────────

/**
 * Converte um registro da tabela `users` no banco para o tipo `User` da aplicação.
 * Centraliza os defaults para evitar duplicação nos métodos do service.
 */
function mapDbUserToUser(row: DbUser): User {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        isAdmin: row.is_admin ?? false,
        isVisitor: row.is_visitor ?? false,
        isActive: row.is_active ?? true,
        createdAt: row.created_at ?? '',
        expiresAt: row.expires_at ?? undefined,
        isTemp: row.is_temp ?? false,
        canManageTags: row.can_manage_tags ?? false,
        isProjetista: row.is_projetista ?? false,
        edicaoId: row.edicao_id ?? undefined,
        tempPasswordPlain: row.temp_password_plain ?? undefined,
    };
}

// ── Helpers de segurança ──────────────────────────────────────────────────────

/**
 * Remove caracteres que poderiam quebrar o parser de filtros do PostgREST
 * dentro de uma chamada `.or()` (vírgula, parênteses, aspas, backslash).
 * Mantém letras, números, @, _, -, ponto e espaço — suficiente para emails e nomes.
 */
function sanitizeFilterValue(value: string): string {
    return value.replace(/[,'()"\\\n\r\t]/g, '');
}

/**
 * Gera o prefixo base para usuários temporários a partir do título da edição.
 * Usa a primeira palavra (sem acentos, max 8 chars) + ano do título (ou ano atual).
 * Ex: "Barra Mansa 2026" → "barra2026"
 *     "Expo Rural"       → "expo2026"  (usa ano atual)
 */
function generateTempBase(titulo: string): string {
    const normalized = titulo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    // "Barra Mansa 2026" -> ["barra", "mansa", "2026"]
    const firstWord = (normalized.match(/[a-z]+/) ?? ['visitante'])[0].slice(0, 8);
    const yearMatch = titulo.match(/\b(20\d{2})\b/);
    const year = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
    return `${firstWord}${year}`;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const authService = {

    /** Verifica se o navegador suporta autenticação biométrica (WebAuthn). */
    checkBiometricSupport(): boolean {
        return !!(window.PublicKeyCredential && window.crypto?.subtle);
    },

    /**
     * Registra um novo usuário via RPC `create_user_admin`.
     * Requer que a função SQL exista no Supabase com os parâmetros correspondentes.
     */
    async register(
        name: string,
        email: string,
        password: string,
        isAdmin = false,
        isVisitor = false,
        canManageTags = false,
        isProjetista = false,
    ): Promise<User> {
        const { data: userId, error: rpcError } = await (supabase as any).rpc('create_user_admin', {
            user_name: name,
            user_email: email,
            user_password: password,
            is_admin_flag: isAdmin,
            is_visitor_flag: isVisitor,
            can_manage_tags_flag: canManageTags,
            is_projetista_flag: isProjetista,
        });

        if (rpcError) throw new Error(`Falha ao registrar usuário: ${rpcError.message}`);

        const { data, error: fetchError } = await (supabase as any)
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (fetchError || !data) {
            throw new Error(`Usuário criado, mas erro ao buscar perfil: ${fetchError?.message}`);
        }

        return mapDbUserToUser(data as DbUser);
    },

    /**
     * Autentica o usuário por email/nome + senha.
     * O `identifier` é sanitizado antes de ser usado no filtro PostgREST.
     */
    async login(identifier: string, password: string): Promise<User> {
        // Sanitiza o identificador para evitar injeção via filtro PostgREST
        const safeId = sanitizeFilterValue(identifier.trim());

        const { data: profile, error: profileError } = await (supabase as any)
            .from('users')
            .select('*')
            .or(`email.ilike.${safeId},name.ilike.${safeId}`)
            .limit(1)
            .maybeSingle();

        if (profileError) throw new Error(`Erro ao buscar perfil: ${profileError.message}`);
        if (!profile) throw new Error('Usuário não encontrado.');

        if (profile.is_active === false) throw new Error('Sua conta está desativada.');

        if (profile.expires_at && new Date(profile.expires_at) < new Date()) {
            throw new Error('Sua conta temporária expirou.');
        }

        const { error: authError } = await supabase.auth.signInWithPassword({
            email: profile.email,
            password,
        });

        if (authError) throw new Error(`Falha na autenticação: ${authError.message}`);

        return mapDbUserToUser(profile as DbUser);
    },

    async logout(): Promise<void> {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    /** Retorna o usuário da sessão ativa, ou `null` se não autenticado / conta inválida. */
    async getCurrentUser(): Promise<User | null> {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) return null;

        const { data, error } = await (supabase as any)
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error || !data) return null;

        const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
        if (data.is_active === false || isExpired) {
            await supabase.auth.signOut();
            return null;
        }

        return mapDbUserToUser(data as DbUser);
    },

    /** Retorna todos os usuários cadastrados, ordenados do mais recente. */
    async getAllUsers(): Promise<User[]> {
        const { data, error } = await (supabase as any)
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data as DbUser[]).map(mapDbUserToUser);
    },

    /** Atualiza campos permitidos de um usuário. */
    async updateUser(id: string, updates: Partial<User>): Promise<void> {
        const dbUpdates: Partial<DbUser> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.isAdmin !== undefined) dbUpdates.is_admin = updates.isAdmin;
        if (updates.isVisitor !== undefined) dbUpdates.is_visitor = updates.isVisitor;
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
        if (updates.canManageTags !== undefined) dbUpdates.can_manage_tags = updates.canManageTags;
        if (updates.isProjetista !== undefined) dbUpdates.is_projetista = updates.isProjetista;

        // Se houver senha, usamos o RPC para atualizar no auth.users também
        if (updates.password) {
            const { error: pwdError } = await (supabase as any).rpc('update_user_password_admin', {
                target_user_id: id,
                new_password: updates.password
            });
            if (pwdError) throw new Error(`Erro ao atualizar senha: ${pwdError.message}`);
        }

        const { error } = await (supabase as any)
            .from('users')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Cadastra uma passkey (biometria) para o usuário atual via WebAuthn.
     * Requer função RPC `enroll_passkey` configurada no Supabase.
     */
    async enrollPasskey(): Promise<void> {
        const { error } = await (supabase as any).rpc('enroll_passkey');
        if (error) throw new Error(error.message);
    },

    /**
     * Autentica via passkey (biometria).
     * Requer função RPC `sign_in_with_passkey` configurada no Supabase.
     */
    async signInWithPasskey(email?: string): Promise<User> {
        const { data, error } = await (supabase as any).rpc('sign_in_with_passkey', {
            user_email: email ?? null,
        });

        if (error) throw new Error(error.message);

        return mapDbUserToUser(data as DbUser);
    },

    /**
     * Cria um usuário visitante temporário vinculado a uma edição específica.
     * Gera credenciais aleatórias e retorna email + senha para compartilhar.
     */
    async createTempUser(expiresAt: Date, edicaoId: string, edicaoTitulo: string): Promise<{ user: User; passwordRaw: string }> {
        const base = generateTempBase(edicaoTitulo || 'visitante');

        // Conta quantos usuários já existem com esse base exato para gerar sequencial único
        const { data: existing } = await (supabase as any)
            .from('users')
            .select('id')
            .ilike('email', `${base}-%@temp.local`);
        const seq = String(((existing as any[])?.length ?? 0) + 1).padStart(2, '0');

        const username = `${base}-${seq}`;
        const name = username;
        const email = `${username}@temp.local`;
        const password = Math.random().toString(36).slice(2, 10)
            + Math.random().toString(36).slice(2, 5).toUpperCase();

        // Cria o usuário base com flag visitor via RPC existente
        await this.register(name, email, password, false, true, false, false);

        // Atualiza campos específicos do visitante temporário
        const { data, error } = await (supabase as any)
            .from('users')
            .update({
                is_temp: true,
                expires_at: expiresAt.toISOString(),
                edicao_id: edicaoId,
                temp_password_plain: password,
            })
            .eq('email', email)
            .select('*')
            .single();

        if (error || !data) throw new Error(`Erro ao configurar usuário temporário: ${error?.message ?? 'sem dados retornados (RLS ou coluna ausente)'}`);


        return { user: mapDbUserToUser(data as DbUser), passwordRaw: password };
    },

    /**
     * Encerra imediatamente o acesso de um usuário temporário,
     * desativando a conta e expirando o prazo.
     */
    async terminateTempUser(userId: string): Promise<void> {
        const { error } = await (supabase as any)
            .from('users')
            .update({ is_active: false, expires_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) throw new Error('Erro ao encerrar usuário temporário');
    },

    /** Exclui permanentemente um usuário (public e auth) via RPC. */
    async deleteUser(userId: string): Promise<void> {
        const { error } = await (supabase as any).rpc('delete_user_admin', {
            target_user_id: userId
        });
        if (error) throw new Error(`Erro ao excluir usuário: ${error.message}`);
    },
};
