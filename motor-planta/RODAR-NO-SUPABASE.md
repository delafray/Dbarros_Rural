# Publicar o mapa do Megaleite 2027 — passo a passo (usuário)

Tudo roda no **Supabase → SQL Editor**, nesta ordem. Cada script é idempotente
(rodar duas vezes não duplica nada).

| # | O quê | Arquivo | Resultado esperado |
| --- | --- | --- | --- |
| 1 | Criar a tabela do mapa + RLS | `supabase/migrations/20260917000001_planilha_mapa.sql` | `CREATE TABLE`, 2 `CREATE POLICY`; a query de verificação no fim do arquivo lista `mapa_leitura_equipe` e `mapa_escrita_master` |
| 2 | Cadastrar evento, edição e planilha (famílias, preços, merchandising, combos, áreas) | `scripts/seed-megaleite-2027.sql` | Tabela de conferência: C 17 · D 4 · F 16 · G 22 · L 20 · M 8 · P 33 · PR 20 · R 19 = 159 |
| 3 | Publicar a geometria do mapa (ALT 01) | `motor-planta/saida/megaleite-2027/publicar.sql` (gerado por `python -m motor_planta manifestos/megaleite-2027.json`). **Atenção:** a geometria vem numa linha de ~65 KB e o SQL Editor pode não colar; se "No rows returned" e nada em `planilha_mapa`, quebre a linha longa em cada `}, {` (uma quebra de linha depois da vírgula) antes de colar (o conteúdo é o mesmo) | `NOTICE: Planilha já existia (...): 0 estande(s) novo(s)` e `Mapa ALT 01 publicado` |
| 4 | Subir o fundo da planta | Supabase → Storage → bucket `edicao-docs` → pasta `<id da edição>` → upload de `motor-planta/saida/megaleite-2027/fundo.png` renomeado para **`mapa-fundo.png`** | O mapa mostra a planta por trás dos estandes (sem o fundo, mostra só os polígonos — funciona igual) |
| 5 | Abrir no sistema | Planilha de vendas do Megaleite 2027 → botão **Mapa** (rota `/mapa-vendas/<id da edição>`) | 159 estandes azuis (livres); marcar um `x` na planilha pinta o estande de verde na hora. No mapa: 1º clique seleciona, 2º clique no mesmo estande cicla livre → vendido → cortesia → livre (grava na planilha) |

O id da edição aparece no `NOTICE` do passo 2 (`Edição "Megaleite 2027" criada: <uuid>`)
ou na URL da planilha (`/planilha-vendas/<uuid>`).

## Quando a planta mudar (ALT 02, ALT 03…)

1. Exportar o PDF novo e apontar `manifestos/megaleite-2027.json` → `planta.arquivo` / `planta.versao`.
2. `python -m motor_planta manifestos/megaleite-2027.json --anterior saida/megaleite-2027/mapa.json`
   (antes, copie a pasta `saida/megaleite-2027` para `saida/megaleite-2027-alt01` se quiser guardar).
3. Ler `relatorio.md` (erros bloqueiam) e `diff.md` (o que mudou).
4. Rodar o novo `publicar.sql` (passo 3) e subir o novo `fundo.png` (passo 4). Estandes vendidos
   não são apagados nem alterados; só entram códigos novos e o mapa ativo é trocado.
5. **Guarda de vendas.** Se a planta nova mexer em estande OCUPADO (venda, reservado ou
   cortesia) — sumiu, mudou de área ou mudou de lugar — o `publicar.sql` **para sem gravar
   nada** e mostra a lista (erro em vermelho no SQL Editor, um estande por linha, com o cliente).
   Decida:
   - corrigir a planta no Corel (ou a planilha na tela) e gerar de novo; **ou**
   - aceitar: mudar `v_confirmar_impactos := true` na 1ª linha do `DECLARE` e rodar de novo.
   Mesmo aceitando, a área que está na planilha NÃO é sobrescrita (ajuste na tela se precisar).
   Caso especial: estande ocupado que **só trocou de número** (novo código no mesmo lugar) aparece
   como "só TROCOU DE NÚMERO → P-09. Tudo certo?"; ao confirmar, a linha da planilha é renumerada
   sozinha (a linha vazia que existia com o número novo sai; linha ocupada nunca é apagada).

## Reverter

- Mapa: `UPDATE planilha_mapa SET ativo = false WHERE edicao_id = '<uuid>';` (a página volta a "nenhum mapa publicado").
- Planilha/evento: bloco ROLLBACK comentado no fim de `scripts/seed-megaleite-2027.sql`.
