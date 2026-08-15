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
| `NNNN` | **Contador do mês** = commits feitos no mês corrente, com 4 dígitos | `0097` |

Exemplo: `0.2026.08.0097` = 97º commit de agosto de 2026. O app exibe com o
prefixo `V` no rodapé do menu lateral: `V0.2026.08.0097` — é por ali que se
confere se o deploy versionou, sem entrar na Vercel.

O **contador do mês** (`NNNN`) é o número de commits do mês corrente
(`git rev-list --count HEAD --since="<ano>-<mês>-01"`). Ele **reinicia a cada
virada de mês**; a dupla `AAAA.MM` + `NNNN` continua identificando o commit
de forma única.

> Observações históricas: até 01/08/2026 o `NNNN` era um contador manual
> defasado (estava em `0042` com o repo já em 401 commits, mês fixo em `02`);
> do commit 402 até 14/08/2026 o `NNNN` foi o TOTAL de commits do repositório
> (chegou a `0483`); a partir de 14/08/2026 passou a ser o contador do mês
> (pedido do usuário — "a versão do mês").

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
