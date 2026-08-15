# Estado de produção — Dbarros Rural

> Resumo do que está no ar e o que aguarda validação. Atualizar a cada entrega.
> Histórico completo de decisões: memória persistente + docs dos módulos.

## No ar (produção — `main` → Vercel `dbarros-rural.vercel.app`)

- Sistema de vendas/eventos completo: dashboard, clientes, eventos/edições,
  planilhas de venda, atendimentos, cardápios, controle de imagens.
- **Centro de Custo (módulo de custos)**: MERGEADO e deployado, mas com
  **acesso EXCLUSIVO** de `ronaldo@ronaldoborba.com.br` (RF-060) — front (menu
  + rota) e RLS (`custos_papel` → `sem_acesso` para os demais). Todos os outros
  usuários veem o sistema como antes. Liberação geral: reversão pronta no
  `scripts/bloco25-acesso-exclusivo-custos.sql`.
- **Botão de simulação de visão** no Dashboard (só o dono): cicla Super Admin →
  Admin → Usuário sem trocar de login (só a UI; RLS segue real).
- **Segurança (auditoria F12, 14/08)**: código-fonte/histórico git fora do
  bundle público; allowlist de upload nos buckets; ban de credencial ao
  desativar usuário. Nenhum segredo vazou.

## Aguardando o usuário

- **RESUMO-MANHA-2026-08-05.md** (precificação, base das fases R4/R5 do módulo
  de custos) — ainda não lido.
- Ban retroativo das 9 contas temporárias inativas antigas (UPDATE opcional em
  `scripts/bloco27-ban-credencial-desativado.sql`).
- Fases R4 (Julgamento/Diversos) e R5 (redesenho do fluxo) do módulo de custos.

## Notas

- `services/api/photoService.ts` aponta para bucket `photos` que NÃO existe
  aqui — código legado do template; o sistema de fotos real é outro repo.
