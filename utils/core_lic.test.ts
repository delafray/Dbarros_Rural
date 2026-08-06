import { describe, it, expect } from 'vitest';
import { getSystemInfo, getOwnerName } from './core_lic';

describe('core_lic — direitos autorais ofuscados', () => {
    it('getOwnerName decodifica o nome do autor', () => {
        expect(getOwnerName()).toBe('Ronaldo Borba');
    });

    it('getSystemInfo decodifica rótulo e contato do sidebar', () => {
        const info = getSystemInfo();
        expect(info.label).toContain('Ronaldo Borba');
        expect(info.label).toContain('Direitos autorais');
        expect(info.contact).toBe('ronaldo@ronaldoborba.com.br');
    });
});
