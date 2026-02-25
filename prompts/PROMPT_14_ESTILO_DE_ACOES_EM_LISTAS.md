# PROMPT_14_ESTILO_DE_ACOES_EM_LISTAS

Este documento define o padrão visual para botões de ação em tabelas e listagens do sistema.

## Princípio de Design: Visibilidade Imediata

Ao contrário de interfaces que escondem ações sob efeitos de *hover* (passar o mouse), o sistema **VendasEventos** prioriza a acessibilidade e a clareza, mantendo os botões de ação sempre visíveis.

### Diretrizes de Implementação

1. **Sempre Visível**: Nunca utilize classes como `opacity-0 group-hover:opacity-100` para esconder botões de Editar, Excluir ou Visualizar em linhas de tabelas.
2. **Identificação por Cores**:
   - **Edição**: Azul (`text-blue-600`)
   - **Exclusão**: Vermelho (`text-red-500`)
   - **Sucesso/Salvar**: Verde (`text-green-600`)
3. **Feedback Visual**: Utilize efeitos de `hover:bg-slate-50` ou similares para indicar interatividade ao passar o mouse, mas sem alterar a opacidade do ícone.
4. **Espaçamento**: Mantenha um `gap` consistente (geralmente `gap-2`) entre os botões para evitar cliques acidentais em dispositivos móveis.

### Exemplo de Template (Tailwind)

```tsx
<td className="px-6 py-4 text-right">
    <div className="flex items-center justify-end gap-2 px-6 py-4">
        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            {/* Ícone Editar */}
        </button>
        <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            {/* Ícone Excluir */}
        </button>
    </div>
</td>
```

---
*Este padrão deve ser seguido em todas as novas telas de listagem para garantir consistência na experiência do usuário.*
