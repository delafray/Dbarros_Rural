# PROMPT 20 — Coluna "Cliente" da Planilha: Flex vs Fixo

## Contexto

Em 28/02/2026 a coluna CLIENTE da `TempPlanilha` foi alterada de **largura fixa (200px)** para **largura flexível**.

O objetivo era: se o monitor tiver espaço, expandir a coluna para mostrar o nome completo do cliente; se não tiver, truncar com `...`.

---

## Como está AGORA (versão flex)

**Arquivo:** `pages/TempPlanilha.tsx`

### Container da tabela
```tsx
<div
  className="overflow-x-auto overflow-y-auto bg-white shadow-xl rounded-lg border border-slate-200 select-none w-full"
  style={{ maxHeight: "calc(100vh - 80px)" }}
>
  <table
    className="border-collapse text-[11px] font-sans select-none w-full"
  >
```

### `<td>` do cliente
```tsx
<td
  className={`${tdStyle} min-w-[200px] cursor-pointer group px-2`}
>
```

### Span do nome livre
```tsx
<span className="text-amber-900 font-black italic truncate block">
```

---

## Como REVERTER para largura fixa (versão original)

Se a coluna flex parecer estranha (muito larga, desequilibrada, ou com a tabela esticada demais), aplique as mudanças abaixo:

### 1. Container da tabela — voltar a `w-fit` e envolver com flex centering

```tsx
<div className="flex justify-center">
<div
  className="overflow-x-auto overflow-y-auto bg-white shadow-xl rounded-lg border border-slate-200 select-none w-fit max-w-full"
  style={{ maxHeight: "calc(100vh - 80px)" }}
>
  <table
    className="border-collapse text-[11px] font-sans select-none"
    style={{ minWidth: "max-content" }}
  >
```
*(Lembre de fechar o `</div>` extra depois do `</div>` da tabela, antes da tag `<style>`)*

### 2. `<td>` do cliente — voltar a largura fixa

```tsx
<td
  className={`${tdStyle} w-[200px] min-w-[200px] max-w-[200px] cursor-pointer group px-2`}
>
```

### 3. Span do nome livre — voltar com max-w explícito

```tsx
<span className="text-amber-900 font-black italic truncate block max-w-[250px]">
```

---

## Por que foi mudado

- A tabela estava sempre com 200px para o nome do cliente, mesmo em monitores 1920px
- Com a versão flex, em telas largas o nome do cliente aparece completo sem scroll
- Em telas estreitas, `truncate` entra em ação automaticamente pois a coluna é a única sem `max-w` e recebe o espaço restante após todas as colunas fixas

---

## Prompt para recriar do zero (se necessário em outro projeto)

```
Na tabela TempPlanilha (React + Tailwind), a coluna CLIENTE deve ter largura flexível:
- Mínimo de 200px para ser legível
- Sem largura máxima — expande para mostrar o nome completo quando o monitor tem espaço
- Trunca com "..." quando não há espaço (o texto tem classe `truncate block`)
- O container da tabela deve ter `w-full` e a `<table>` também `w-full`
- Remover `w-fit` do container e `minWidth: "max-content"` da tabela
- Remover `w-[200px]` e `max-w-[200px]` do <td> do cliente, mantendo apenas `min-w-[200px]`
```
