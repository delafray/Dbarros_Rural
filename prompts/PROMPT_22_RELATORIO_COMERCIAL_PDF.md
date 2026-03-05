# 📄 PROMPT_22_RELATORIO_COMERCIAL_PDF.md
**Mapeamento de Regras Rigorosas para Exportação de Relatórios PDF (jsPDF + autoTable)**

> **OBJETIVO DESTE PROMPT:**
> Sempre que você (IA) for criar, editar ou padronizar novos relatórios em PDF para este sistema, **VOCÊ DEVE LER E SEGUIR ESTE ARQUIVO OBRIGATORIAMENTE**. Ele contém as decisões arquiteturais de Layout e Regras de Negócio exigidas pelo usuário para a geração de relatórios de venda comerciais.

---

## 🏗️ 1. PADRÃO DO DOCUMENTO (Obrigatório)

**O relatório NUNCA deve herdar configurações de tela do usuário.** 
A configuração do PDF deve ser matematicamente cravada no código da seguinte forma:
- **Biblioteca:** `jsPDF` (com o plugin `jspdf-autotable`).
- **Formato:** Folha A4 (`format: 'a4'`).
- **Orientação:** Paisagem (`orientation: 'landscape'`).
- **Unidade:** Milímetros (`unit: 'mm'`).

*Exemplo de Inicialização Imutável:*
```javascript
const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
const PW = 297, PH = 210, MX = 7, MY = 7; // Folha A4 padrão com margem de 7mm
```

---

## 🎨 2. ESTRUTURA DO CABEÇALHO (BANNER)

O Banner deve ser **Limpo, Corporativo e Estável**:

1. **Logo da Empresa (Centro):**
    - A logo comercial (ex: `/dbarros.png`) deve ser carregada de forma assíncrona (via `fetch` e convertida para Base64) *antes* de iniciar o desenho do PDF.
    - Deve ficar rigorosamente centralizada no topo da página.
    - Você deve aplicar matemática com proporção exata (Aspect Ratio) baseada na imagem real para **jamais achatá-la ou esticá-la**.

2. **Título da Edição (Esquerda):**
    - Nome do Evento e Ano alinhado à esquerda (`doc.text("Edição...", MX, Y)`).
    - Fonte em tamanho **12pt** e Estilo Negrito (`bold`). Mantenha a cor preta padrão.

3. **Nome da Empresa (Centro, abaixo da logo):**
    - Fonte em tamanho **12pt** e Estilo Negrito (`bold`).
    - Alinhamento "center" matemático exatamente no Eixo `PW / 2` (meio da folha).

4. **Carimbo de Geração e Página (Direita):**
    - Ao lado superior direito, exiba "Data de Geração: DD/MM/AAAA HH:mm".
    - No rodapé (ou topo direito): Numeração "Página X de Y".
    - Fonte tamanho **8pt**, Estilo Normal (`normal`).

---

## 🧹 3. REGRA DE NEGÓCIO: FILTRAGEM CONDICIONAL DE LINHAS (Ocultar Lixo)

Ao desenhar a Tabela de Vendas, **NUNCA jogue lixo na tela**.
Muitos itens adicionais (como MERC.01, STAND EXTRAS) são cadastrados no sistema, mas nem sempre são comprados ou preenchidos.

**A Regra de Ouro (Filtro Condicional):**
Items que **NÃO são Stands Principais** (ou seja, seu código não começa com A, B, C etc) SÓ DEvem aparecer no Relatório SE, E SOMENTE SE, tiverem **qualquer fragmento** de informação humana válida.

*Regra Técnica de Inclusão (`hasData`):*
A linha é validada e aparece no relatório SE atender a pelo menos **uma** destas condições matemáticas:
1. Tem um `cliente_id` atrelado (Venda registrada).
2. Tem um `cliente_nome_livre` preenchido (Nome digitado à mão).
3. O `tipo_venda` for diferente de nulo e diferente da palavra "DISPONÍVEL".
4. Qualquer opção extra ou combobox (`opcionais_selecionados`) contenha um marcador válido não nulo/vazio (ex: o caractere 'x', '*', ou quantidades).
5. O `desconto` for matematicamente `> 0`.

*Resultado Exigido:* Se o item não é Stand e estiver **100% virgem/nulo** em todos os campos acima (sem cliente, sem nome digitado livre, sem xisk, sem desconto), **Ele deve ser silenciado/filtrado fora** da matriz de dados do AutoTable. "Eu quero o relatório limpo. Se tiver informação, aparece. Se for nulo, pula."

---

## 🎯 4. UX: ALINHAMENTO MILIMÉTRICO DE MARCADORES (Combo / Opcionais)

Características do Sistema usam símbolos (`x` para sim, `*` para destaque).
No jsPDF, quando mandamos desenhar "x" no meio de um quadrado de tabela (`doc.text()`), a fonte base não é o centro da altura.

**Sua Matéria-Prima de UI:**
Para centralizar verticalmente *visualmente* cruzes (`x`) e asteriscos (`*`) dentro das Células (`didDrawCell` do autoTable):
1. O Y-Center (`boxCenterY`) da caixa desenhada deve sofrer uma quebra de **0.8mm** do chão matemático.
2. E se o caractere for um asterisco (`*`), ele flutua. Você deve empurrar a gravidade dele **+0.6mm (para baixo)** no eixo Y final para que ele fique *VISUALMENTE NO CENTRO PERFEITO* ao olho humano.
3. Isso serve para Tabelas de *Combo* (Múltipla Escolha) e *Opcionais* Booleanos na grade.

*(Fim das Regras)*
