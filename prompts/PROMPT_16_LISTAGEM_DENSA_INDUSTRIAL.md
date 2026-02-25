# PROMPT_16: Listagem Densa Industrial (Ultra-Density Spreadsheet)

Este prompt ensina a IA a construir tabelas de alta performance com densidade máxima de informação, replicando o visual de planilhas técnicas de sistemas legados.

## 🎯 Objetivo
Transformar listagens comuns em grades compactas onde centenas de registros podem ser visualizados com scroll mínimo, mantendo a clareza estrutural através de bordas definidas e tipografia técnica.

## 🛠️ Especificações Técnicas (The DNA)

### 1. Geometria e Estrutura (Grid)
- **Sharp Edges**: Use `rounded-none`. Evite bordas arredondadas que desperdiçam espaço em sistemas industriais.
- **Full Borders**: Aplique bordas em todas as células (horizontais e verticais). Use `border border-slate-300` para garantir que cada dado esteja em sua "caixa".
- **Density**: O preenchimento vertical deve ser o mínimo absoluto (`py-0.5` ou `py-1`).

### 2. Tipografia e Conteúdo
- **Font-Size**: Cabeçalhos em `11px` (Bold/Uppercase) e Corpo em `12px` (Semi-bold para nomes, Regular para dados).
- **Single Line Rule**: NUNCA quebre linhas. Use `whitespace-nowrap`.
- **Truncamento inteligente**: Use `truncate` (ellipsis) em colunas de texto longo para evitar que o layout quebre.
- **Max-Width**: Defina larguras máximas (ex: `max-w-[200px]`) para colunas de nomes e e-mails para manter a tabela previsível.

### 3. Auxiliares Visuais
- **Zebra Striping**: Use `even:bg-slate-200/40` para criar uma separação clara entre registros sem precisar de muito espaço.
- **Hover Focus**: Use `hover:bg-blue-100/40` para que o usuário saiba exatamente qual linha está selecionando.

### 4. Ações Ultra-Compactas
- **Icon-Only**: Botões de ação devem ser apenas ícones (`w-3.5 h-3.5`) dentro de um contêiner pequeno com borda sutil, ganhando sombra apenas no hover.

## 📝 Exemplo de Implementação (Tailwind)

```tsx
<tr className="hover:bg-blue-100/40 even:bg-slate-200/40 transition-colors">
    <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap max-w-[250px] truncate text-[12px]">
        {data.nome}
    </td>
    <td className="px-3 py-0.5 border-b border-r border-slate-300 whitespace-nowrap text-[12px]">
        {data.telefone}
    </td>
    {/* ... outras colunas ... */}
</tr>
```

---
*Este Blueprint deve ser invocado sempre que o usuário solicitar uma interface "Compacta", "Industrial", "Estilo Planilha" ou "Para usuários avançados".*
