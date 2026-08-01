# Padrão para Novos Sistemas — feito certo desde o zero

> **Como usar:** copie este arquivo para a raiz de todo projeto novo e diga à IA:
> *"Leia o PADRAO-NOVOS-SISTEMAS.md e siga ele em tudo, desde o início."*
>
> **Objetivo deste arquivo (o problema que ele existe para resolver):** nunca mais
> virar a noite consertando RLS e testes que não foram feitos durante o trabalho.
> A regra central é simples: **segurança (RLS) e teste são parte de "está pronto",
> não uma etapa depois.** Feature sem teste e sem RLS revisado NÃO está pronta.

---

## 1. As duas regras de ouro (inegociáveis)

1. **RLS e segurança são projetados ANTES da primeira tela**, junto com o modelo de
   dados — não depois que o sistema já está rodando. Consertar RLS em produção é o
   que faz a pessoa virar a noite. Feito no início, é barato e à luz do dia.
2. **Teste nasce junto com o código.** A função de regra de negócio e o teste dela
   são escritos no mesmo passo. Nunca "depois" — "depois" nunca chega no horário
   de trabalho, chega às 2h da manhã.

Se a IA propuser "deixo os testes/segurança para o final", isso está **proibido**
por este arquivo.

---

## 2. Divisão de IA por custo-benefício

Objetivo: gastar o modelo caro onde errar dói, e economizar no que é repetitivo.

**IA mais potente (obrigatória para a fundação):**
- Modelo de dados, schema e **RLS/policies/segurança**.
- Arquitetura e fronteiras dos módulos.
- **Estratégia de teste**: o que cobrir, quais fluxos são críticos, montar a
  infraestrutura de mock.
- Os **testes difíceis**: segurança, casos-limite, fluxos que quebram o negócio.
- Configuração do **CI** que trava o deploy.

**IA mais barata (só depois que o padrão acima existe):**
- Expandir o **volume** de testes seguindo o molde já pronto: mais casos para
  funções puras já definidas, testes de CRUD padrão copiando o mock existente.
- Boilerplate.

> Por quê: projetar teste e RLS é raciocínio, não trabalho braçal — é onde o erro
> nasce e onde o teste encontra bug. Isso fica com o modelo forte. O "mais do mesmo"
> desce de nível. **Nunca** deixe a IA barata decidir política de RLS ou o que testar.

---

## 3. Arquitetura que torna 90% de cobertura barato

A cobertura alta é consequência da arquitetura, não de força de vontade:

- **Separe lógica de tela.** Regras, contas e validações vão para **funções puras**
  (entra dado, sai dado, sem efeito colateral). A tela só desenha. Função pura é
  testável a 100% em milissegundos.
- **Camada de serviço** para todo acesso ao banco. As telas NUNCA falam com o banco
  direto — chamam serviços. Assim dá para mockar o banco num lugar só.
- **Dinheiro em inteiro (centavos)**, nunca float. Uma função central de soma/formato.
- **Datas com utilitário único** (evita o clássico "vencido 3h antes" por timezone).

Meta de cobertura realista: **90%+ na lógica de negócio** (funções puras e serviços).
NÃO persiga 90% de cada linha de tela — testar UI pixel a pixel rende pouco. Telas
são cobertas por poucos testes de fluxo (ver seção 5).

---

## 4. Checklist de RLS / segurança (faça no dia zero, não às 2h)

Lições que já custaram noites. Aplique em toda tabela desde o início:

- [ ] **RLS ligado em TODA tabela** (`ENABLE ROW LEVEL SECURITY`). Tabela sem RLS = aberta.
- [ ] **Nenhuma policy "curinga"** do tipo `USING (true)` ou `auth.role() = 'authenticated'`
      em tabela que deveria ter isolamento. Policies permissivas se somam por **OR** —
      uma policy aberta **anula** todo o isolamento das outras. (Foi exatamente isso
      que vazou histórico e imagens no sistema anterior.)
- [ ] **Menor privilégio por papel.** Visitante/leitor não escreve; se escreve, é
      explícito. Separe `read_all` (SELECT) de `write` (INSERT/UPDATE/DELETE por papel).
- [ ] **Colunas sensíveis nunca em leitura ampla.** Senha, hash, CPF, telefone: NÃO
      expor via SELECT geral. Ou coluna revogada do papel + **RPC `SECURITY DEFINER`
      com checagem de admin**, ou **view sem as colunas sensíveis** para o papel restrito.
- [ ] **Nunca `select('*')` em tabela com coluna sensível.** Se um dia você revogar a
      coluna, o `select('*')` quebra o app inteiro com "permission denied". Liste as
      colunas explicitamente desde o começo.
- [ ] **Nada de segredo no bundle do cliente.** Nenhuma chave de service_role, nenhum
      código de servidor, nenhum hash/senha fixa embutida no build público.
- [ ] **Ordem de deploy quando mudar policy:** primeiro o código que para de usar a
      coluna/tabela vai ao ar, **depois** o `REVOKE`/`DROP` no banco. O contrário
      quebra produção por alguns minutos.
- [ ] **Teste a RLS.** Escreva teste que loga como o papel restrito (visitante) e prova
      que ele NÃO lê o que não deve. Segurança sem teste é suposição.

---

## 5. Padrão de teste

**Ferramenta:** Vitest (unit/integração). Playwright só para poucos fluxos E2E.

**Três camadas, por prioridade:**
1. **Funções puras (a maioria):** regra de negócio, contas, validações. Meta 90%+.
2. **Serviços com banco mockado:** montagem de payload, tratamento de erro. Aqui
   moram os testes de segurança (papel restrito não acessa o proibido).
3. **E2E (poucos, caros):** só os fluxos que quebram o negócio — login, cadastro
   crítico, o fluxo que gera dinheiro/documento. Não faça E2E de tudo.

**Anatomia do teste (o molde a repetir):**
```ts
import { describe, it, expect, vi } from 'vitest';

// mocka o banco num lugar só — testes rodam em ms, sem rede, sem dado real
vi.mock('./dbClient', () => ({ db: {} }));

import { calcularTotal } from './planilha';

describe('calcularTotal (valor cobrado do cliente)', () => {
  it('multiplica área por preço/m²', () => {
    expect(calcularTotal({ area: 10, precoM2: 150 })).toBe(1500);
  });
  it('usa o override quando existe, ignorando área/preço', () => {
    expect(calcularTotal({ override: 999, area: null, precoM2: null })).toBe(999);
  });
});
```
Regras do molde:
- Nome do `it(...)` é uma **frase em português** que descreve o comportamento — a
  suíte se lê como especificação.
- **Um comportamento por teste.** Inclua os casos-limite (nulo, zero, negativo, vazio).
- Banco **sempre mockado** na camada de serviço.
- Teste de segurança monta o **ataque** e prova que falha (ex.: injeção, papel
  restrito tentando ler dado proibido).

---

## 6. CI que segura a corda (para não depender de disciplina)

- Pipeline roda `test` + cobertura em todo push/PR.
- **Trava o merge/deploy se a cobertura da lógica de negócio cair abaixo de 90%.**
- Roda `build` e checagem de tipos; nada com erro de tipo passa.
- Assim o padrão se mantém **sozinho** — não depende de você lembrar às 2h da manhã.

---

## 7. Definição de "PRONTO" (cole no topo de cada tarefa)

Uma feature só está pronta quando:
1. A lógica está em função pura / serviço, separada da tela.
2. Tem teste cobrindo o comportamento e os casos-limite (90%+ da lógica nova).
3. Se toca em dado: a RLS/segurança da(s) tabela(s) foi revisada pela seção 4.
4. `build`, tipos e testes passam localmente.
5. O CI está verde.

Sem os 5, **não mergeia** — é isso que impede o acúmulo que vira madrugada.

---

## 8. Instrução pronta para colar no início de um projeto novo

> Vamos construir este sistema do zero seguindo o `PADRAO-NOVOS-SISTEMAS.md`.
> Antes de qualquer feature: defina o modelo de dados e a RLS/segurança (seção 4) e
> monte a infraestrutura de teste com banco mockado. A partir daí, cada feature vem
> com teste junto (seção 5) e só é considerada pronta pela checklist da seção 7.
> Configure o CI travando deploy abaixo de 90% de cobertura na lógica (seção 6).
> Use o modelo mais potente para banco/segurança/arquitetura/testes críticos; só
> depois, se eu pedir, delegue a expansão de testes repetitivos a um modelo mais barato.
> Nunca deixe RLS ou teste "para o final".
