# Prompt Master: Padronização de Componentes UI (React + Tailwind CSS)

> **Objetivo Final:** Ensinar a IA a criar um Design System enxuto focado em consistência de Botões, Inputs e Cards. O princípio arquitetônico é **acabar com a "Salada de Classes" Tailwind espalhada no código**, onde cada botão na tela tem tamanhos, cores ou comportamentos (`hover`/`disabled`) diferentes. A Inteligência Artificial será instruída a centralizar regras matemáticas puras em um único arquivo `UI.tsx`.

---

## 🛑 1. O Problema da "Salada Tailwind"

Se o desenvolvedor (ou a própria IA em edições simples de páginas) criar botões colocando dezenas de classes isoladas `className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2"`, o projeto acaba com:
- Botões de "Salvar" e "Cancelar" com alturas de fonte diferentes.
- Botões que quebram o layout (text-overflow) no celular se o texto for grande.
- Botões que não dão feedback ao estarem "Desativados" (`disabled`).

## 🛠️ 2. A Solução: Padrão Componente Mestre (`UI.tsx`)

A IA **DEVE** criar obrigatoriamente um arquivo mestre que exporta primitivos via `React.forwardRef` (Isso é muito importante caso os componentes precisem interagir com bibliotecas de Animação ou Tooltips no futuro). 

Exija que a Inteligência artificial agrupe todos os Botões em **4 Variantes Únicas** (`primary`, `secondary`, `danger`, `outline`). Nunca crie mais do que o necessário. Se a página pedir um botão verde limão isolado, a IA deve focar em adaptar a hierarquia visual para uma das variantes mestre.

### O Código de Ouro do `<Button>`:

```tsx
import React from 'react';

export const Button = React.forwardRef<
  HTMLButtonElement, 
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline' }
>(({ children, variant = 'primary', className = '', ...props }, ref) => {
  
  // O Dicionário Rígido de Tipos. NUNCA DEVE CONTER LÓGICA DE TAMANHO (Width/Height) AQUI DENTRO.
  // Apenas Cores e Interações Base
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-slate-800 text-white hover:bg-slate-900',
    danger: 'bg-red-500 text-white shadow hover:bg-red-600',
    outline: 'bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-50',
  };

  return (
    <button
      ref={ref}
      // CLASSES BASE INDISPENSÁVEIS PARA A GEOMETRIA
      className={`
        px-4 py-2 rounded-lg font-medium transition-colors 
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2 // Padrão universal para lidar com ícones + texto
        active:scale-95 // Feedback tátil nativo crucial para Experiência Mobile
        ${variants[variant as keyof typeof variants] || ''} 
        ${className} // Permite ao Pai definir width ou margin (ex: w-full, mt-4)
      `}
      {...props}
    >
      {children}
    </button>
  );
});
```

## 🧠 3. Regras para Componentes Estruturais (Cards e Inputs)

Para o resto do App como os Containers Brancos ou Entradas de Texto, aplique o mesmo processo lógico:
- `<Card>` deve absorver os paddings repetitivos, sombras elegantes (`shadow-sm` do Tailwind) e a borda arredondada global do design (`rounded-xl` no caso de painéis).
- `<Input>` não deve ser só um `<input>`. Sua estrutura Mestre *deve abraçar uma label vinculada* nativa para garantir a acessibilidade (Leitores de tela para cegos e *Tap Targets* melhores no Mobile).

```tsx
// O Padrão Universal de Input (Auto-envolvente com Label)
export const Input = React.forwardRef<
    HTMLInputElement, 
    React.InputHTMLAttributes<HTMLInputElement> & { label?: string }
  >(({ label, className = '', ...props }, ref) => (
  // margin space-y-1 mantém o label sempre à distância perfeita do Input.
  <div className="space-y-1 w-full"> 
    {label && <label className="block text-sm font-black uppercase text-slate-700">{label}</label>}
    <input
      ref={ref}
      className={`w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${className}`}
      {...props}
    />
  </div>
));
```

---

Aplicando este Blueprint Padrão estritamente no início do projeto, qualquer botão importado na tela 3 meses depois vai ter o exato contorno, comportamento de clique Mobile (`active:scale-95`) e espaçamentos simétricos do botão feito no dia 1. Harmonia Visual!
