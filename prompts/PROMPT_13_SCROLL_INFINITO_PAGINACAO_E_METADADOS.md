# Prompt Master: Paginação Invisível, "Scroll Infinito" e Metadados (React + Supabase)

> **Objetivo Final:** Ensinar a IA que NUNCA se deve baixar 1.000 ou 10.000 registros de um Banco de Dados de uma só vez para o celular do usuário. Essa arquitetura destrói a memória RAM do aparelho, estoura o plano de dados 4G e encarece a fatura do servidor. O sistema deve usar Paginação baseada em cursores (ou Range limits), acionada por um "Scroll Infinito" mágico que carrega os itens conforme a pessoa desce a tela, *enquanto* um cabeçalho fixo exibe o número total de itens e permite "Selecionar Todos" virtualmente.

---

## 🛑 1. O Pior Erro de Principiante (O Select Vazio)

A maioria das IAs escrevem consultas de banco de dados assim:
`const { data } = await supabase.from('fotos').select('*')`
Isso puxa toda a galeria de uma vez. Se tivermos mil fotos com vários bytes de texto, a tela congela por 5 segundos.

Quando o cliente clica em "Selecionar Tudo", o erro continua: a IA tenta varrer um `Array` imenso na memória do celular.

## 🛠️ 2. A Solução: Scroll Infinito (IntersectionObserver) + Metadata Count

A arquitetura correta exige que a IA divida o problema em 3 estratégias militares:

### Estratégia A: O Puxador de Contagem Leve (O Metadado)

Seu usuário precisa saber que existem "1.000 Itens na Base", mas nós não vamos puxá-los. Pedimos para a IA fazer uma query especial de contagem pura. Apenas o número, sem baixar nenhum conteúdo (Zero Bytes de payload).

```typescript
// Query Mágica no Supabase: Apenas devolve um número inteiro (ex: 1250)
const { count, error } = await supabase
    .from('fotos')
    .select('*', { count: 'exact', head: true }) // head: true não baixa o conteúdo do banco, so o Metadado
    .eq('visivel', true);

setTotalItemsNumber(count || 0); // O Título da Página Puxa esse Valor: "Você tem 1.250 Fotos".
```

### Estratégia B: O Botão Mágico "Selecionar Tudo (Virtual)"

Se o cara clica na caixa "Selecionar Pág Atual", você joga as 50 fotos da tela num Array (estado normal). 
Mas se ele clica em "Selecionar Todas as 1.250 do Sistema", você NÃO puxa as 1.250 na memória. Você inverte a Lógica!

Instrua a IA a criar um booleano:
```tsx
const [isAllSelected, setIsAllSelected] = useState(false);
const [excludedIds, setExcludedIds] = useState<string[]>([]); // Lista Negra!

// Quando Invertido: 
// Se isAllSelected for TRUE, o App considera que TUDO no banco está marcado.
// Se o cara desmarcar só 3 fotos na tela, nós adicionamos elas na `excludedIds`.
// Quando for Apagar ou Gerar PDF: Você envia pro Servidor: "Faça em todos os filtros atuais, MENOS nestes excludedIds". Dinâmica B2B Profissional!
```

### Estratégia C: Scroll Infinito por Observador de Tela (Lazy Load)

Em vez de botões "Página 1", "Página 2" velhos, nós pedimos páginas por baixo dos panos conforme o usuário desliza.

```tsx
const [pageNumber, setPageNumber] = useState(0); // Página 0 = Primeiros 50
const PAGE_SIZE = 50;

// O Gatilho do Scroll (Sensor de que o usuário chegou no fim do buraco)
// No último item pintado na tela, o React bota um Sentinela
<div 
   ref={(el) => {
      // IntersectionObserver é Nativo do Navegador. Custa 0% de Processamento.
      if (el) {
          const observer = new IntersectionObserver((entries) => {
              if (entries[0].isIntersecting) {
                  // O usuário enxergou a borda final da tela!
                  setPageNumber(prev => prev + 1); // Pede mais 50 e soma na lista!
                  observer.disconnect(); // Desliga o sensor pra não puxar mil vezes rápido
              }
          });
          observer.observe(el);
      }
   }}
   className="h-10 w-full opacity-0" // Sentinela Transparente
> 
  {/* Se enxergar isso, carrega mais! */}
</div>
```

### Estratégia D: O Cabeçalho Fixo (Sticky Header) da Seleção

O usuário NUNCA vai lembrar se selecionou algo se não estiver vendo. A IA deve construir um "Dashboard Rápido" grudado no teto da tela (`sticky top-X`) contendo os botões de Ação Dinâmica.

```tsx
// Exemplo Real de Cabeçalho Fixo Flutuante (Tailwind UI)
<div className="sticky top-16 z-40 bg-white/95 backdrop-blur-md border-b shadow-sm p-4 flex flex-wrap items-center gap-3">
    
    <span className="text-sm font-bold text-slate-700">
        Status: {isAllSelected ? countTotalBanco : selecionadosManuais.length} itens marcados
    </span>

    {/* O Botão Mágico (Mostra a quantidade total dinâmica na Cara do Botão) */}
    <Button 
        variant="primary" 
        onClick={() => setIsAllSelected(true)}
        className="px-4 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md"
    >
        Selecionar Tudo ({countTotalBanco})
    </Button>

    {/* Botão de Limpar (Aparece apenas quando tem "Lixo" nos filtros ou itens selecionados) */}
    {(isAllSelected || selecionadosManuais.length > 0) && (
        <Button 
            variant="outline"
            onClick={() => {
                setIsAllSelected(false);
                setSelecionadosManuais([]);
                setExcludedIds([]);
            }}
            className="px-4 py-2 font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
            Limpar Tudo
        </Button>
    )}
</div>
```

---

Qualquer aplicativo que lida com Banco de Dados de Médio/Longo Prazo sem essa arquitetura está **fadado a morrer (travar Celulares Fracos)** em seu 6º mês de vida. Este modelo protege o banco, torna a lista suave (carregando em nacos) e ainda entrega os benefícios de um Excel ("Selecionar Todas as Linhas do Banco") para administradores com zero estresse de memória!
