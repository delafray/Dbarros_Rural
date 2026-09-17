# motor-planta

Lê a planta baixa vetorial (PDF do Corel), valida contra o manifesto da edição e gera
o que o sistema consome. Especificação completa: `ESPECIFICACAO.md`.

Fora do bundle do app (Python). Requer `pymupdf` e, para testes, `pytest` (já instalados na máquina).

## Uso

```bash
cd motor-planta
python -m motor_planta manifestos/megaleite-2027.json            # gera saida/megaleite-2027/
python -m motor_planta manifestos/megaleite-2027.json --anterior saida/megaleite-2027-alt01/mapa.json   # + diff.md
python -m pytest -q tests
```

Saída (`saida/<slug>/`, ignorada pelo git):

| Arquivo | Para quê |
| --- | --- |
| `relatorio.md` | Conferência humana: famílias, contagens, erros e avisos |
| `mapa.json` | Geometria dos estandes (viewBox + polígonos) que a página do mapa desenha |
| `fundo.png` | Planta rasterizada com os estandes pintados de branco (sobe pela tela da edição) |
| `planilha.json` | Categorias no formato da planilha + áreas por estande |
| `publicar.sql` | Cria/sincroniza a planilha e publica o mapa (rodar no Supabase SQL Editor) |
| `alertas.json` | Os mesmos alertas do relatório, em JSON |
| `diff.md` | Só com `--anterior`: o que mudou entre versões da planta |

Código de saída 1 quando há erro bloqueante (o `publicar.sql` ainda é gerado, mas não deve ser rodado).

## Convenção de desenho (resumo)

`LETRA-NN` dentro da célula · numeração a partir de 01 sem buracos · m² na linha abaixo ·
uma medida por estande · uma cor de preenchimento por família · PDF com texto vivo.
Decisões humanas (nomes, preços, exceções) ficam no manifesto, nunca na planta.
