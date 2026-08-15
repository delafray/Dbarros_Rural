import { describe, it, expect } from 'vitest';
import { validateUpload, assertUpload } from './uploadValidation';

const f = (name: string, type: string, size: number) => ({ name, type, size });

describe('validateUpload (D3 — allowlist de upload)', () => {
    it('aceita imagem válida na galeria', () => {
        expect(validateUpload(f('foto.jpg', 'image/jpeg', 2_000_000), 'imageOrVideo').ok).toBe(true);
    });

    it('aceita vídeo mp4 na galeria e PDF em documento', () => {
        expect(validateUpload(f('clip.mp4', 'video/mp4', 5_000_000), 'imageOrVideo').ok).toBe(true);
        expect(validateUpload(f('proposta.pdf', 'application/pdf', 1_000_000), 'document').ok).toBe(true);
    });

    it('REJEITA HTML/SVG (vetor de XSS armazenado)', () => {
        expect(validateUpload(f('x.html', 'text/html', 100), 'imageOrVideo').ok).toBe(false);
        expect(validateUpload(f('x.svg', 'image/svg+xml', 100), 'image').ok).toBe(false);
    });

    it('REJEITA dupla-extensão disfarçada por tipo', () => {
        // extensão ok, mas o type real é html → barra
        const r = validateUpload(f('foto.png', 'text/html', 100), 'image');
        expect(r.ok).toBe(false);
    });

    it('rejeita extensão fora da allowlist do contexto', () => {
        expect(validateUpload(f('planilha.xlsx', 'application/vnd.ms-excel', 100), 'document').ok).toBe(false);
        // vídeo não entra em cardápio (só imagem)
        expect(validateUpload(f('clip.mp4', 'video/mp4', 100), 'image').ok).toBe(false);
    });

    it('rejeita arquivo sem extensão, vazio e acima do limite', () => {
        expect(validateUpload(f('semext', 'image/png', 100), 'image').ok).toBe(false);
        expect(validateUpload(f('vazio.png', 'image/png', 0), 'image').ok).toBe(false);
        expect(validateUpload(f('grande.png', 'image/png', 999_000_000), 'image').ok).toBe(false);
    });

    it('aceita type vazio se a extensão for válida (navegadores que não mandam type)', () => {
        expect(validateUpload(f('foto.jpg', '', 1000), 'image').ok).toBe(true);
    });

    it('assertUpload lança com a mensagem do erro', () => {
        expect(() => assertUpload(f('x.html', 'text/html', 100), 'image')).toThrow(/não permitida/i);
        expect(() => assertUpload(f('ok.png', 'image/png', 100), 'image')).not.toThrow();
    });
});
