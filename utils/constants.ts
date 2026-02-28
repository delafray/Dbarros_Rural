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
