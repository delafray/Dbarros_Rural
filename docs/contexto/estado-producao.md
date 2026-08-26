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
- **Cardápios — preços compostos (26/08)**: valor `Rótulo - R$ X / ...` agora
  é estruturado pelo parser e SEMPRE vira sublinhas pontilhadas (o inline de
  2 tamanhos quebrava em cardápio pequeno/fonte grande — caso Riva Sorvetes).
  Aplicado no A4 (preview+export, auto-fit conta as sublinhas), no A3 Duplo
  (EmpresaBlock + PDF vetorial) e na Lona (renderer + peso; a fonte automática
  já conta as sublinhas). Ainda inline: só o renderer antigo do módulo
  Cardápios (CardapioRenderer).
- **Lona — controles novos (26/08)**: "Juntar linhas" e "Mostrar categorias"
  no editor, salvos no JSON `fontes` da lona (compat: JSON antigo cai no
  padrão). Como a fonte da lona cresce até encher a área útil, compactar/
  ocultar categorias AUMENTA a letra automaticamente. Helpers do juntar
  linhas agora moram em `utils/cardapioParser` (A3 re-exporta).
- **A3 Duplo — controles novos (26/08)**: "Juntar linhas" (70–130%, compressão
  ponderada: descrição encolhe metade, espaços largos o valor cheio) e
  "Mostrar categorias" (oculta DOCES/LANCHES... de todos os cardápios).
  Salvos em `fontes_a3` (campos `linhas`/`mostrarCategorias`); JSON antigo
  sem os campos cai no padrão.
- **A3 Duplo — preenchimento automático (26/08)**: `fillScale` cresce sozinho
  (teto 1.6×, convergência em ≤5 re-medições — `proximoFillScale`) para as
  fontes ocuparem o máximo da página SEM alterar os px do usuário nem as
  proporções entre eles; reage a qualquer mudança (fontes, juntar linhas,
  categorias, topo). Status mostra a fonte efetiva (%).
  **Bug conhecido e ACEITO pelo usuário (26/08, sem corrigir por ora)**: em
  produção o crescimento não disparou (fonte ficou em 100% com colunas a
  ~70%) — na prática o A3 segue manual; o usuário ajusta as fontes à mão.

## Aguardando o usuário

- **RESUMO-MANHA-2026-08-05.md** (precificação, base das fases R4/R5 do módulo
  de custos) — ainda não lido.
- Ban retroativo das 9 contas temporárias inativas antigas (UPDATE opcional em
  `scripts/bloco27-ban-credencial-desativado.sql`).
- Fases R4 (Julgamento/Diversos) e R5 (redesenho do fluxo) do módulo de custos.

## Notas

- `services/api/photoService.ts` aponta para bucket `photos` que NÃO existe
  aqui — código legado do template; o sistema de fotos real é outro repo.
