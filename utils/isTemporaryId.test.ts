import { describe, it, expect } from 'vitest';
import { isTemporaryId } from './isTemporaryId';

describe('isTemporaryId (decide insert vs update de endereços/contatos)', () => {
    it('trata IDs curtos (gerados no client via Math.random) como temporários', () => {
        // Math.random().toString(36).substring(7) → strings curtas
        expect(isTemporaryId('abc123')).toBe(true);
        expect(isTemporaryId('x')).toBe(true);
        expect(isTemporaryId('')).toBe(true);
        expect(isTemporaryId('1234567890')).toBe(true); // exatamente 10 chars ainda é temp
    });

    it('trata UUIDs (persistidos no banco) como NÃO temporários', () => {
        expect(isTemporaryId('123e4567-e89b-12d3-a456-426614174000')).toBe(false);
        expect(isTemporaryId('12345678901')).toBe(false); // 11 chars já é persistido
    });
});
