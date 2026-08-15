# Instruções para a IA — Dbarros Rural (VendasEventos)

> Este arquivo é deliberadamente **ENXUTO** para não inflar o contexto de toda
> sessão. Traz o essencial + um **mapa de ponteiros**: quando o assunto tocar um
> tema abaixo, **leia o arquivo indicado ANTES de agir**. Não leia tudo
> preventivamente.

## 📍 Mapa de contexto — leia sob demanda

| Quando o assunto for... | Leia |
| --- | --- |
| Módulo de custos / centro de custo ("voltar ao módulo") | `MODULO-CUSTOS/LEIA-PRIMEIRO-RETOMADA.md` (protocolo completo) |
| Refatorar arquivo; padrão de arquitetura de páginas | `docs/contexto/refatoracao.md` |
| O que está no ar / pendências / estado atual | `docs/contexto/estado-producao.md` |
| Versionamento (formato, hook, setup) | `VERSIONING.md` |
| Teste + RLS obrigatórios em feature nova (checklist) | `PADRAO-NOVOS-SISTEMAS.md` |
| Auditoria de segurança / vazamento no F12 | `RBARROS-Galeria-Repositorio-SISTEMARB/prompts/PROMPT_18_*.md` |
| Histórico de decisões e lições | índice da memória persistente (`MEMORY.md`) |

## Stack

React + TypeScript + Vite · Supabase (PostgreSQL + RLS) · Tailwind · Vitest ·
deploy Vercel (CD a partir do push na `main`).

## Idioma

Responder em **português (pt-BR)**. Código e nomes seguem o padrão do repositório.

## Contexto geral

Sistema de gestão de vendas de eventos rurais (feiras/exposições) da Dbarros
Rural. Módulos: dashboard, clientes, eventos/edições, planilhas de venda,
atendimentos, cardápios, controle de imagens e o Centro de Custo (em teste
restrito). ~100 usuários; produção real.

## Regras críticas — SEMPRE ativas

1. **Não tomar iniciativas não solicitadas.** Executar só o que o usuário pediu;
   não propor refatoração/melhoria/limpeza sem pedido direto.
2. **Feature nova = teste + RLS na mesma entrega.** Nunca deixar teste ou
   segurança "para depois" (ver `PADRAO-NOVOS-SISTEMAS.md`).
3. **Nunca commitar segredo nem embutir código/doc no bundle público.**
4. **Reportar todo `git push`** com hash do commit **e** a versão
   (ex.: `d5c61ab → V0.2026.08.0097`) — o usuário confere o deploy sem abrir a
   Vercel. Versão é automática pelo hook; **não bumpar à mão**.
5. **Páginas não importam `supabase` direto** — sempre via `services/`.
6. **Commits pequenos, verificados e reversíveis**, em branch quando fizer sentido.

## Estado de produção

Resumo curto em `docs/contexto/estado-producao.md` (atualizar a cada entrega).
Em uma linha: sistema de vendas no ar; Centro de Custo deployado com acesso
exclusivo do dono (RF-060) enquanto testa em produção.
