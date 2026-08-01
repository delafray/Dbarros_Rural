# Versionamento — Dbarros Rural

## Formato

```
0.AAAA.MM.NNNN
```

| Campo | Significado | Exemplo |
|-------|-------------|---------|
| `0`    | Versão major (fixa por enquanto)                     | `0` |
| `AAAA` | Ano em que o commit foi feito                        | `2026` |
| `MM`   | Mês em que o commit foi feito (2 dígitos)            | `08` |
| `NNNN` | **Número do commit** = total de commits do git, com 4 dígitos | `0402` |

Exemplo: `0.2026.08.0402` = commit nº 402, feito em agosto de 2026.

O **número do commit** (`NNNN`) é o total de commits do repositório
(`git rev-list --count HEAD`). Como cada commit incrementa esse total, a versão
sobe **automaticamente a cada commit** e é sempre rastreável: o `NNNN` aponta
para exatamente aquele commit no histórico do git.

> Observação histórica: até 01/08/2026 o `NNNN` era um contador manual e ficou
> defasado (estava em `0042` com o repo já em 401 commits) e o mês estava fixo em
> `02`. A partir do commit 402 o número passou a refletir o git de verdade.

## Como é atualizado (automático)

Um hook de **pre-commit** (`.githooks/pre-commit`) recalcula a versão antes de
cada commit e grava em dois lugares:

- `version.ts` → `export const APP_VERSION` (é o que o app exibe).
- `package.json` → campo `"version"`.

Os dois arquivos são adicionados ao próprio commit, então nenhum passo manual é
necessário — basta commitar normalmente.

## Setup (uma vez por clone do repositório)

O hook fica versionado em `.githooks/`. Para o git usá-lo, cada clone precisa
apontar o `core.hooksPath` uma vez:

```bash
git config core.hooksPath .githooks
```

(No Windows, o hook roda via Git Bash — já funciona com o Git for Windows.)

Para conferir a versão atual sem commitar:

```bash
cat version.ts
```
