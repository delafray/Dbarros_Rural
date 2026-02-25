/**
 * Simplifica um texto para busca:
 * - Remove acentos (normalize NFD)
 * - Converte para minúsculas
 * - Remove TODOS os espaços
 * 
 * @param text O texto original
 * @returns O texto simplificado
 */
export const simplifyText = (text: string): string => {
    if (!text) return '';
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, '');
};

/**
 * Verifica se um texto simplificado (target) contém o termo de busca simplificado (search).
 * 
 * @param target Texto onde a busca será feita
 * @param search Termo de busca
 * @returns boolean
 */
export const smartIncludes = (target: string, search: string): boolean => {
    return simplifyText(target).includes(simplifyText(search));
};
