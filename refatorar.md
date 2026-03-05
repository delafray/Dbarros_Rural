# 🛠️ Plano Diretor de Refatoração: `Dashboard.tsx`

> **Instrução para a IA (Protocolo de Inicialização):**
> Ao ler este arquivo, você deve preparar o ambiente para fatiar o componente `Dashboard.tsx` (atualmente com +1200 linhas) em pequenos módulos lógicos, organizados e testáveis, sem quebrar nenhuma funcionalidade do sistema atual. Todo o trabalho deve ser feito em uma branch git nova e isolada (ex: `refatoracao-dashboard`).

---

## 🛑 O Problema Atual (Pecados Técnicos)
O arquivo `pages/Dashboard.tsx` tornou-se um *God Component* (Componente Deus). Ele gerencia:
- O estado complexo da tela.
- A lógica de cálculos e exportação pesada (jsPDF).
- A comunicação com o banco de dados via Supabase (mesmo usando services, ele invoca chamadas pesadas).
- Modais e Lógicas Visuais.
- Dezenas de pequenos botões de UI com estilos Tailwind gigantes copiados e colados.

**O Risco:** A manutenção ficou perigosa. Mexer na cor de um botão pode quebrar o gerador de boletos ou o PDF, porque tudo divide o mesmo escopo de memória.

---

## 📐 O Plano de Ação em 3 Fases

### FASE 1: Isolamento Cirúrgico com Nova Branch
1. Criar branch `refactor-dashboard`.
2. Não alterar nenhuma rota ou importação principal até a fase 3.

### FASE 2: Fatiamento Horizontal (Extração de Lógica)
O objetivo principal é esvaziar a função principal do Dashboard para que ela tenha apenas umas 150 a 200 linhas (focada em desenhar blocos maiores).

**Extrações Obrigatórias:**
1. **Lógica de Exportação do PDF (`usePdfExport`)**:
   - Mover CADA LINHA do manipulador detalhado de PDF e formatação do `jsPDF` para um *Custom Hook* isolado (ex: `src/hooks/useDashboardExportPDF.ts`) ou num serviço em `/utils/pdf/`. O Dashboard vai apenas chamar `const { generatePDF } = useDashboardExportPDF()`.
2. **Componentização de UI (Cards e Botões)**:
   - Os cartões de edição (`<Card>`), que repetem dezenas de propriedades Tailwind, devem virar componentes reais. Exemplo: criar `components/dashboard/EdicaoCard.tsx`.
   - Criar um `<DashboardActionButton icon="pdf" color="blue" onClick={...} />` para unificar os padrões de botões redondos em uma única fonte de verdade de CSS.
3. **Modais Isolados**:
   - Os modais de *Gerar Promotor*, *Visualizar Plano*, etc., devem se tornar arquivos independentes na pasta `components/modals/`, recebendo apenas `isOpen` e `onClose` via *props*.

### FASE 3: Testes, QA e Limpeza do TypeScript
- Ao refatorar, garantir que todos os elementos estão devidamente tipados e com dependências limpas.
- Fazer Teste Visual Criterioso na tela (rodar `npm run dev`) testando os funis refatorados.
- Se o PDF falhar 1 pixel ao testar na branch isolada, consultar o `prompts/PROMPT_22_RELATORIO_COMERCIAL_PDF.md`.

---

## 📝 Ordem de Atendimento (Para Você, IA, ler quando acordarmos)
1. Confirme para o usuário (Ronaldo) qual é a branch atual.
2. Inicie pelas extrações visuais (os botões e os cartões). Assim a tela já se encolhe 400 linhas.
3. Extraia as funções lógicas grandes (PDF e buscas de tabelas).
4. Rode a página para garantir a sanidade e, só depois, faça o merge interativo com o usuário supervisionando a branch.

---
> **"Dividir para Conquistar". Quando um arquivo morre, nasce um sistema sustentável.**
