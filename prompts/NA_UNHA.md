# Protocolo de Teste Visual Exaustivo (Na Unha)

Este prompt define o procedimento para testes profundos de UI/UX e persistência de dados, que deve ser utilizado **APENAS quando solicitado explicitamente** pelo usuário através do comando "Testar na Unha".

## Objetivos
- Garantir que a UI reflete exatamente o estado do banco de dados.
- Verificar responsividade e micro-interações.
- Validar fluxos completos (Criar -> Editar -> Excluir).
- Capturar evidências visuais (screenshots/recordings) para o walkthrough.

## Procedimento Padrão
1. **Navegação**: Acessar a rota principal do recurso afetado.
2. **Preenchimento**: Utilizar dados variados (incluindo caracteres especiais ou limites de campo).
3. **Submissão**: Observar feedbacks visuais (toasts, alertas, redirecionamentos).
4. **Verificação de Estado**: Retornar à listagem para garantir que o dado persistiu conforme o preenchido.
5. **Console**: Verificar se há erros silenciosos (logs de erro vermelhos).

## Quando NÃO usar
- Refatorações simples de código sem impacto visual.
- Correções de lógica de backend pura (usar verificações de SQL em vez disso).
- Modos de edição rápida.
