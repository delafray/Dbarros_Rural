import { describe, it, expect } from 'vitest';
import {
    onlyDigits,
    maskCNPJ,
    maskCPF,
    maskTelefone,
    maskCEP,
    validarCNPJ,
    validarCPF,
} from './masks';

describe('onlyDigits', () => {
    it('remove tudo que não for dígito', () => {
        expect(onlyDigits('123.456-78/90 ab')).toBe('1234567890');
        expect(onlyDigits('')).toBe('');
    });
});

describe('maskCPF', () => {
    it('formata CPF completo', () => {
        expect(maskCPF('52998224725')).toBe('529.982.247-25');
    });
    it('formata parcial conforme digita', () => {
        expect(maskCPF('529')).toBe('529');
        expect(maskCPF('5299')).toBe('529.9');
        expect(maskCPF('529982247')).toBe('529.982.247');
    });
    it('descarta excedente além de 11 dígitos', () => {
        expect(maskCPF('529982247259999')).toBe('529.982.247-25');
    });
});

describe('maskCNPJ', () => {
    it('formata CNPJ completo', () => {
        expect(maskCNPJ('11222333000181')).toBe('11.222.333/0001-81');
    });
    it('descarta excedente além de 14 dígitos', () => {
        expect(maskCNPJ('112223330001819999')).toBe('11.222.333/0001-81');
    });
});

describe('maskTelefone', () => {
    it('formata fixo com 10 dígitos', () => {
        expect(maskTelefone('2433334444')).toBe('(24) 3333-4444');
    });
    it('formata celular com 11 dígitos', () => {
        expect(maskTelefone('24999998888')).toBe('(24) 99999-8888');
    });
});

describe('maskCEP', () => {
    it('formata CEP', () => {
        expect(maskCEP('27123456')).toBe('27123-456');
    });
});

describe('validarCPF', () => {
    it('aceita CPF válido (dígitos verificadores corretos)', () => {
        expect(validarCPF('529.982.247-25')).toBe(true);
        expect(validarCPF('52998224725')).toBe(true);
    });
    it('rejeita dígito verificador errado', () => {
        expect(validarCPF('52998224724')).toBe(false);
        expect(validarCPF('52998224735')).toBe(false);
    });
    it('rejeita todos os dígitos iguais', () => {
        expect(validarCPF('11111111111')).toBe(false);
        expect(validarCPF('000.000.000-00')).toBe(false);
    });
    it('rejeita tamanho errado', () => {
        expect(validarCPF('5299822472')).toBe(false);
        expect(validarCPF('')).toBe(false);
    });
});

describe('validarCNPJ', () => {
    it('aceita CNPJ válido (dígitos verificadores corretos)', () => {
        expect(validarCNPJ('11.222.333/0001-81')).toBe(true);
        expect(validarCNPJ('11222333000181')).toBe(true);
    });
    it('rejeita dígito verificador errado', () => {
        expect(validarCNPJ('11222333000180')).toBe(false);
        expect(validarCNPJ('11222333000191')).toBe(false);
    });
    it('rejeita todos os dígitos iguais', () => {
        expect(validarCNPJ('00000000000000')).toBe(false);
    });
    it('rejeita tamanho errado', () => {
        expect(validarCNPJ('1122233300018')).toBe(false);
        expect(validarCNPJ('')).toBe(false);
    });
});
