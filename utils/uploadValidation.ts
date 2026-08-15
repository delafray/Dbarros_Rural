// Validação de upload (auditoria F12 de 14/08/2026, Parte D3).
// Defesa em profundidade no cliente: bloqueia tipo/tamanho ANTES de enviar e dá
// feedback imediato. A trava REAL é no servidor — cada bucket do Supabase tem
// allowed_mime_types + file_size_limit (Bloco SQL 26). Um atacante que fale
// direto com o endpoint esbarra na trava do bucket; esta função protege o
// fluxo normal e evita subir lixo por engano.

export type UploadKind = 'image' | 'imageOrVideo' | 'document';

interface UploadRule {
    mimes: string[];
    exts: string[];
    maxBytes: number;
    label: string;
}

const MB = 1024 * 1024;

export const UPLOAD_RULES: Record<UploadKind, UploadRule> = {
    // Fotos da galeria: imagens comuns + vídeo curto
    imageOrVideo: {
        mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime'],
        exts: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov'],
        maxBytes: 100 * MB,
        label: 'imagem (JPG, PNG, WEBP, GIF) ou vídeo (MP4, MOV)',
    },
    // Fundos/chancelas de cardápio: só imagem
    image: {
        mimes: ['image/jpeg', 'image/png', 'image/webp'],
        exts: ['jpg', 'jpeg', 'png', 'webp'],
        maxBytes: 15 * MB,
        label: 'imagem (JPG, PNG, WEBP)',
    },
    // Documentos de edição: PDF e imagem de planta
    document: {
        mimes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
        exts: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
        maxBytes: 25 * MB,
        label: 'PDF ou imagem (JPG, PNG, WEBP)',
    },
};

export interface UploadCheck {
    ok: boolean;
    error?: string;
}

const extOf = (name: string): string => {
    const parts = name.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
};

// Bloqueia dupla-extensão maliciosa (arquivo.html.png) e nomes sem extensão.
export const validateUpload = (
    file: { name: string; type: string; size: number },
    kind: UploadKind,
): UploadCheck => {
    const rule = UPLOAD_RULES[kind];
    const ext = extOf(file.name);

    if (!ext) return { ok: false, error: 'Arquivo sem extensão não é permitido.' };
    if (!rule.exts.includes(ext)) {
        return { ok: false, error: `Extensão .${ext} não permitida. Aceito: ${rule.label}.` };
    }
    // O type pode vir vazio em alguns navegadores; se vier, tem de bater.
    if (file.type && !rule.mimes.includes(file.type)) {
        return { ok: false, error: `Tipo "${file.type}" não permitido. Aceito: ${rule.label}.` };
    }
    if (file.size <= 0) return { ok: false, error: 'Arquivo vazio.' };
    if (file.size > rule.maxBytes) {
        const mb = Math.round(rule.maxBytes / MB);
        return { ok: false, error: `Arquivo excede o limite de ${mb} MB.` };
    }
    return { ok: true };
};

// Versão que lança — para usar direto nos services antes do .upload()
export const assertUpload = (
    file: { name: string; type: string; size: number },
    kind: UploadKind,
): void => {
    const r = validateUpload(file, kind);
    if (!r.ok) throw new Error(r.error);
};
