# PROMPT_15_SISTEMA_DE_BUSCA_INTELIGENTE

Este prompt define o padrão técnico para implementações de busca e filtros de texto dentro do ecossistema **VendasEventos**.

## Objetivo: Busca "Sem Atrito"

O usuário deve encontrar o que procura independente de rigor técnico na digitação. O sistema deve ser tolerante a erros comuns e preguiça na digitação (falta de acentos ou espaços).

### Regras de Ouro do Filtro

1. **Auto-filtro (As-you-type)**: A filtragem deve ocorrer instantaneamente a cada tecla pressionada.
2. **Busca Omnipresente (Todas as Colunas)**: O filtro não deve se limitar ao nome. Ele deve buscar em **todas as colunas visíveis** na tela (Nomes, Documentos, Telefones, Categorias, etc.).
3. **Insensibilidade a Acentos**: 'biometria' deve encontrar 'Biometria'.
4. **Insensibilidade a Espaços**: 'danielaborba' deve encontrar 'Daniela Borba'.
5. **Busca Global (Substring)**: O termo pode estar no início, meio ou fim do campo.
6. **Insensibilidade a Caixa**: Busca sempre em Lowercase por baixo dos panos.

### Implementação Técnica Sugerida (Centralizada)

Utilize a utilidade centralizada em `src/utils/textUtils.ts` para garantir consistência:

```typescript
import { simplifyText } from '../src/utils/textUtils';

// No useEffect de filtro:
const simplifiedSearch = simplifyText(searchTerm);
const searchHasDigits = /\d/.test(simplifiedSearch);

const results = items.filter(item => {
    const target = simplifyText(item.name || '');
    const document = (item.cpf || item.cnpj || '').replace(/\D/g, '');
    
    // Busca por texto
    const matchText = target.includes(simplifiedSearch);
    
    // Busca por documento (apenas se o termo de busca contiver números)
    const matchDoc = searchHasDigits && document.includes(simplifiedSearch.replace(/\D/g, ''));
    
    return matchText || matchDoc;
});
```

### Por que a regra de números é importante?
Se o usuário pesquisar por "DANI", a versão puramente numérica do termo de busca será vazia (`""`). Sem a trava `searchHasDigits`, o sistema consideraria que "DANI" existe dentro de qualquer CPF (pois `""` está contido em qualquer string), quebrando o filtro.

---
*Este padrão garante que o usuário encontre informações rapidamente, mesmo em dispositivos móveis onde a digitação é mais propensa a erros.*
