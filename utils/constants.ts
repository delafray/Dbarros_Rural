/**
 * Chaves de armazenamento local usadas em toda a aplicação.
 * Centralizadas aqui para evitar erros de digitação e facilitar manutenção.
 */
export const STORAGE_KEYS = {
  /** Flag de biometria cadastrada no dispositivo atual */
  BIOMETRICS_ENROLLED: 'biometricsEnrolled',
  /** Mensagem de logout forçado a ser exibida na tela de login */
  FORCE_LOGOUT_MESSAGE: 'auth_force_logout_message',
} as const;

/**
 * Mensagens de logout forçado exibidas ao usuário.
 */
export const FORCE_LOGOUT_MESSAGES = {
  INACTIVE: 'Seu acesso foi desativado pelo administrador.',
  EXPIRED: 'Sua conta temporária expirou.',
} as const;

/**
 * URL pública do app em produção (Vercel).
 * Única fonte para links enviados a terceiros (WhatsApp de acesso temporário).
 * O domínio antigo dbarros.vercel.app morreu — auditoria de 14/08/2026.
 */
export const APP_PUBLIC_URL = 'https://dbarros-rural.vercel.app';
/** Versão exibível do domínio (sem protocolo), para telas */
export const APP_PUBLIC_HOST = APP_PUBLIC_URL.replace('https://', '');

/** Buckets de storage do Supabase */
export const STORAGE_BUCKETS = [
  'photos',
  'avatars',
  'assets',
  'system',
  'edicao-docs',
] as const;

/** Cores padrão para categorias de stands */
export const CORES_CATEGORIAS = [
  'bg-[#FCE4D6]',
  'bg-[#FFF2CC]',
  'bg-[#E2EFDA]',
  'bg-[#D9E1F2]',
  'bg-[#F2F2F2]',
  'bg-[#E6E6FA]',
] as const;

/** Timeouts padrão (ms) */
export const TIMEOUTS = {
  TOAST: 3000,
  FEEDBACK: 2500,
} as const;
