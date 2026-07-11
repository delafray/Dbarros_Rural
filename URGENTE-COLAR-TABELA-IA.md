# 🔴 URGENTE — Colar tabela da IA no editor ainda vem emendado

> Registrado em 11/07/2026 à noite. Usuário testou colar a tabela copiada do
> chat da IA no editor de cardápio e o texto continuou vindo TUDO EMENDADO
> ("LANCHESKAKA LANCHESCATEGORIAITEM..."), mesmo após o interceptador de
> paste (commits c3285d7 + 28c632b) estar na main/deploy.

## O que já existe

- `utils/cardapioClipboard.ts` → `tabelaHtmlParaTexto(html)`: converte
  `<table>` do clipboard em texto TSV + linhas de título.
- `onPaste` nos textareas de `pages/CardapioEditor.tsx` e
  `pages/CardapioA4Editor.tsx`: chama o conversor com
  `e.clipboardData.getData('text/html')`; se retornar null, paste normal.
- Fluxo Excel → sistema CONTINUA funcionando (foi o workaround do usuário).

## Hipóteses, na ordem de investigação

1. **Versão velha no navegador (PWA/service worker)** — o teste pode ter
   rodado no bundle anterior ao fix. Primeiro passo: F5/Ctrl+Shift+R e
   conferir no DevTools se o onPaste dispara.
2. **O chat dessa IA não põe `text/html` no clipboard** — só texto puro
   emendado (e talvez `text/rtf`, que o Excel entende mas o browser não
   expõe fácil). Diagnóstico: adicionar log temporário no onPaste:
   `console.log([...e.clipboardData.types], e.clipboardData.getData('text/html').slice(0,500))`
   e pedir para o usuário colar e mandar o print do console.
3. **O HTML vem sem `<table>`** (ex: divs com display:table, ou markdown
   cru) → o conversor retorna null. O mesmo log do item 2 revela.

## Possíveis soluções conforme o diagnóstico

- Caso 2/3: fallback heurístico no texto puro emendado — detectar o padrão
  `R$ NN,NN` como delimitador de fim de VALOR e reconstruir as colunas
  (arriscado; melhor: instruir o prompt da IA a SEMPRE oferecer também um
  bloco de código TSV copiável, ou botão "Colar da IA" que abre um modal
  aceitando o texto emendado + parser específico).
- Caso 1: nada a fazer além de recarregar.

## Amostra real do texto emendado (para testar o parser)

LANCHESKAKA LANCHESCATEGORIAITEMVALORDESCRIÇÃOLANCHESHambúrguerR$ 20,00Bife e saladaLANCHESX SaladaR$ 22,00Bife, salada e mussarela (…)
— padrão observável: cada item termina em `R$ NN,NN` + descrição opcional;
categorias em CAIXA ALTA coladas no item seguinte.
