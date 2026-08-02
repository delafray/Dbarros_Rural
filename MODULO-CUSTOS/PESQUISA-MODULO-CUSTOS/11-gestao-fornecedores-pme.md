# Gestão de Fornecedores para PMEs — Pesquisa e Recomendações

**Módulo:** Controle de Gastos de Eventos Rurais  
**Data:** 2026-08-01  
**Objetivo:** Embasar o cadastro de fornecedores (tendas, piso, elétrica, alimentação, banheiros químicos etc.) com histórico de cotações, avaliação pós-evento e múltiplas categorias por fornecedor.

---

## 1. Cadastro Mínimo Útil — Campos Essenciais

### O que a literatura e os sistemas BR recomendam

Todos os sistemas pesquisados (eGestor, Kamino, Bling, Omie, Serasa Experian) convergem para cinco blocos de dados:

#### Bloco 1 — Identificação Fiscal
| Campo | Obrigatório? | Notas |
|---|---|---|
| Razão Social | Sim | Nome jurídico completo |
| Nome Fantasia | Recomendado | Como é conhecido no mercado |
| CNPJ | Sim | Validar status ativo na Receita Federal |
| CPF (MEI / PF) | Situacional | Quando não há CNPJ |
| IE / IM | Opcional | Para fornecedores com nota fiscal |
| Regime tributário | Opcional | Simples, Lucro Presumido etc. |

**Prática recomendada:** O Omie permite busca automática por CNPJ que pré-preenche razão social, endereço e situação cadastral. Para nosso sistema, uma chamada à API pública da Receita Federal (dados.gov.br) faz o mesmo de graça.

#### Bloco 2 — Contato
| Campo | Obrigatório? | Notas |
|---|---|---|
| Nome do responsável comercial | Sim | A pessoa que atende e negocia |
| Telefone / WhatsApp | Sim | |
| E-mail | Recomendado | |
| Outros contatos (financeiro, técnico) | Opcional | Útil para fornecedores grandes |

**Observação importante (setor de eventos):** Em fornecedores de tenda, elétrica e alimentação, o contato que negocia raramente é o mesmo que acompanha a montagem. Guardar separado é útil.

#### Bloco 3 — Localização / Região de Atuação
| Campo | Obrigatório? | Notas |
|---|---|---|
| Endereço (cidade, estado) | Sim | Para filtrar por proximidade do evento |
| Raio de atuação | Opcional | "Atende até X km" ou lista de municípios |
| CEP | Recomendado | |

**Por que "região de atuação" importa aqui:** Eventos rurais costumam ser em locais remotos. Fornecedor de uma capital pode cobrar frete proibitivo. Um campo simples como "Municípios atendidos" ou "Raio de atuação (km)" resolve isso sem complexidade.

#### Bloco 4 — Condições Comerciais
| Campo | Obrigatório? | Notas |
|---|---|---|
| Prazo de entrega típico | Recomendado | Em dias úteis |
| Forma de pagamento preferida | Recomendado | PIX, boleto, cheque etc. |
| Banco / Chave PIX | Opcional | Acelera pagamento |
| Observações comerciais livres | Recomendado | "Exige 50% de entrada", "não trabalha em feriado" etc. |

#### Bloco 5 — Status e Metadados
| Campo | Obrigatório? | Notas |
|---|---|---|
| Status (ativo / inativo / bloqueado) | Sim | Evita cotações para fornecedores ruins |
| Data de cadastro | Automático | |
| Cadastrado por (usuário) | Automático | |
| Observações gerais | Recomendado | Campo livre de texto |

**Fontes:**
- [Cadastro de fornecedor — eGestor](https://blog.egestor.com.br/cadastro-de-fornecedor/)
- [Cadastro de fornecedores: campos obrigatórios, validação e setup no ciclo P2P — Kamino](https://kamino.com.br/blog/cadastro-de-fornecedores/)
- [Cadastro de fornecedores — Serasa Experian PME](https://www.serasaexperian.com.br/blog-pme/cadastro-de-fornecedores/)
- [Cadastrando meus Clientes e Fornecedores — Omie](https://ajuda.omie.com.br/pt-BR/articles/498798-cadastrando-meus-clientes-e-fornecedores)

---

## 2. Múltiplas Categorias por Fornecedor

### O problema

Um fornecedor de eventos frequentemente atende mais de uma categoria. Exemplo real:
- Empresa "Estruturas Rural Ltda." fornece: tenda + piso + iluminação
- Um buffet pode fornecer: alimentação + garçons + locação de mesas

Se o sistema amarrar o fornecedor a uma única categoria, ele precisará ser cadastrado três vezes — gerando duplicidade, inconsistência e perda de histórico.

### Como os sistemas resolvem

**Abordagem 1 — Múltiplas categorias (many-to-many)**  
Tabela de junção `fornecedor_categoria`: um fornecedor pode ter N categorias, uma categoria pode ter N fornecedores. É o padrão correto para esse domínio.

```
fornecedores (id, razao_social, cnpj, ...)
categorias_fornecimento (id, nome, descricao)   -- "Tenda", "Piso", "Elétrica", "Alimentação" etc.
fornecedor_categoria (fornecedor_id, categoria_id)  -- tabela de junção
```

**Abordagem 2 — Tags livres**  
Alguns sistemas menores (e o próprio Bling via campos customizados) usam tags de texto livre. É mais flexível, mas perde a padronização — "tenda", "Tenda" e "tendas" viram categorias diferentes.

**Abordagem 3 — Hierarquia de categorias**  
SAP e sistemas maiores usam hierarquia: "Estruturas" > "Tendas" > "Tenda 10x10". Para PME de eventos rurais, dois níveis bastam: Categoria Principal + Subcategoria opcional.

**Recomendação para nosso caso:** Tabela `categorias_fornecimento` com lista fechada (editável pelo admin) + relação many-to-many. A lista inicial sugerida:

| Categoria | Exemplos |
|---|---|
| Tendas e Coberturas | Tenda piramidal, chapéu de bruxa, galpão |
| Piso e Estrutura | Piso elevado, tablado, grade |
| Elétrica | Gerador, quadro elétrico, iluminação cênica |
| Alimentação e Bebidas | Buffet, churrasqueiro, bartender |
| Banheiros | Banheiro químico, container sanitário |
| Som e Audiovisual | PA, palco, telão |
| Decoração | Flores, mobiliário, loução |
| Segurança | Vigilância, brigadista |
| Transporte e Logística | Frete, manobrista |
| Outros | Campo livre |

**Fontes:**
- [Many-to-many relationships — Zoho Creator](https://www.zoho.com/creator/decode/many-to-many-database-relationships)
- [Many to Many Relationships — DataCamp](https://www.datacamp.com/blog/many-to-many-relationship)
- [How to Design a Relational Database for Supply Chain Management — GeeksforGeeks](https://www.geeksforgeeks.org/sql/how-to-design-a-relational-database-for-supply-chain-management/)
- [Campos Customizados Bling](https://blog.bling.com.br/novos-campos-customizados/)

---

## 3. Histórico de Cotações e Preços — Como Vira Inteligência

### O problema de negócio

A empresa organiza vários eventos por ano. Sem histórico estruturado, cada cotação começa do zero. Com histórico, é possível responder:
- "Ano passado a tenda 10x10 para 500 pessoas custou R$ X com a empresa Y"
- "No evento de março o banheiro químico ficou mais barato com Z do que com W"
- "A Empresa A cobrou 20% mais que a B para elétrica nos últimos 3 eventos"

### Como os sistemas BR fazem

**Bling:** Vincula fornecedores aos produtos via aba "Fornecedores" dentro do cadastro do produto. Armazena preço de compra, código do produto no fornecedor e fornecedor padrão. Não tem histórico temporal nativo para serviços.

**Omie:** Mantém histórico de compras associado ao fornecedor, mas o foco é notas fiscais de produto, não serviços de evento.

**CotaCompras / DuoSoftware:** Sistemas específicos de cotação que permitem convidar fornecedores, receber propostas na plataforma, comparar preços e manter histórico de cotações com data e vencedor.

**Senior ERP:** Tem "Quadro Comparativo de Propostas de Cotações" — compara fornecedores lado a lado por item cotado, com data e resultado.

### Modelo mínimo recomendado para nosso caso

A inteligência de compras vem de três tabelas simples ligadas ao que já existe no sistema:

```
cotacoes
  id
  evento_id          -- qual evento gerou a cotação
  fornecedor_id      -- quem foi cotado
  item_descricao     -- "Tenda 10x10 por 3 dias"
  categoria_id       -- categoria do fornecimento
  valor_cotado       -- preço proposto
  valor_negociado    -- preço final após negociação
  data_cotacao
  status             -- "em análise" | "aprovada" | "rejeitada" | "cancelada"
  observacoes        -- "incluiu montagem", "frete não incluído" etc.
  criado_por
  criado_em
```

Com isso, uma query simples já responde "quanto custou tenda no último evento?":

```sql
SELECT e.nome, f.razao_social, c.item_descricao, c.valor_negociado, c.data_cotacao
FROM cotacoes c
JOIN eventos e ON e.id = c.evento_id
JOIN fornecedores f ON f.id = c.fornecedor_id
WHERE c.categoria_id = 'tendas'
  AND c.status = 'aprovada'
ORDER BY c.data_cotacao DESC;
```

### O que copiar dos sistemas maiores (versão mínima)

| Funcionalidade | Como simplificar |
|---|---|
| Envio de convite de cotação por e-mail | Copiar link do evento + PDF; registrar retorno manualmente no início |
| Comparativo automático de propostas | View/relatório "cotações do evento X por categoria" |
| Alerta de variação de preço | Calcular % variação vs. cotação anterior do mesmo item no frontend |
| Histórico de fornecedor em PDF | Exportar cotações do fornecedor como relatório |

**Fontes:**
- [Sistema de Cotação e Pesquisa de Preços — DuoSoftware](https://duosoftware.com.br/servico/sistema-de-cotacao-e-pesquisa-de-precos/)
- [CotaCompras — Software de Gestão de Compras](https://www.cotacompras.com/)
- [5 Melhores Sistemas de Gestão de Compras 2026 — SULTS](https://www.sults.com.br/solucoes/gestao/5-melhores-sistemas-gestao-compras)
- [F410NQC — Quadro Comparativo Senior](https://documentacao.senior.com.br/goup/5.10.4/menu_suprimentos/f410nqc.htm)
- [Sistema de Gestão de Compras — Blog Industrial Nomus](https://www.nomus.com.br/blog-industrial/sistema-de-gestao-de-compras/)

---

## 4. Avaliação Pós-Evento — Simples, Sem Burocracia

### O que a indústria recomenda (vendor scorecard)

Sistemas como Ivalua, HighRadius e Amazon Business usam scorecards com 4 a 10 KPIs. Para PME com eventos ocasionais, a literatura recomenda manter **no máximo 4-5 métricas fixas** para garantir que a avaliação seja preenchida de verdade — e não ignorada por complexidade.

### As 4 métricas fundamentais (adaptadas para eventos rurais)

| Dimensão | Pergunta prática | Escala |
|---|---|---|
| Qualidade | O serviço entregue estava conforme o combinado? | 1 a 5 |
| Pontualidade | Chegou no horário e prazo acordados? | 1 a 5 |
| Relacionamento | A comunicação foi fácil? Resolveu problemas sem enrolar? | 1 a 5 |
| Custo-benefício | O preço foi justo pelo que entregou? | 1 a 5 |

Mais um campo obrigatório:
- **Contrataria novamente?** (Sim / Com ressalvas / Não) — funciona como flag rápida para filtrar fornecedores em futuras cotações.
- **Observações livres** — campo texto para "o gerador falhou 2h antes do evento", "o buffet trouxe menos garçons do que contratado" etc.

### Modelo de tabela

```
avaliacoes_fornecedor
  id
  cotacao_id        -- liga à cotação aprovada (e portanto ao evento e ao fornecedor)
  nota_qualidade    -- 1-5
  nota_pontualidade -- 1-5
  nota_relacionamento -- 1-5
  nota_custo_beneficio -- 1-5
  nota_media        -- calculada (média das 4)
  contrataria_novamente -- 'sim' | 'ressalvas' | 'nao'
  observacoes
  avaliado_por
  avaliado_em
```

### Boas práticas de processo

1. **Criar a avaliação logo após o evento** — o hook ideal é o fechamento/encerramento do evento no sistema.
2. **Tornar a avaliação obrigatória para encerrar o evento** (ou ao menos exibir aviso proeminente) — garantia de que o histórico vai sendo alimentado.
3. **Exibir a média histórica de um fornecedor ao criar nova cotação** — "Nota média: 4,2 em 5 eventos" como contexto na tela de cotação.
4. **Não usar o scorecard para punir** — usar para escolher melhor e negociar com dados.

**Fontes:**
- [Vendor Scorecard — Ramp](https://ramp.com/blog/supplier-scorecard-metrics)
- [Supplier Scorecard Metrics — HighRadius](https://www.highradius.com/resources/Blog/supplier-scorecard/)
- [Vendor Scorecards — Ivalua](https://www.ivalua.com/blog/vendor-scorecard/)
- [Gestão de Fornecedores em Eventos Corporativos — MeEventos](https://meeventos.com.br/blog/gestao-de-fornecedores-em-eventos-corporativos)
- [Dominando a gestão de fornecedores no setor de eventos — Ferbakdecor](https://www.ferbakdecor.com.br/artigos/dominando-a-gestao-de-fornecedores-e-parceiros-no-setor-de-eventos)

---

## 5. O Que os Sistemas BR e Internacionais Oferecem — Versão Mínima para Copiar

### Sistemas Brasileiros

#### Bling
- Cadastro unificado cliente/fornecedor com flag de tipo
- Vinculação de fornecedores aos produtos (com preço de compra por fornecedor)
- Campos customizados para extender o cadastro sem mexer no código
- **O que copiar:** conceito de "fornecedor vinculado ao item" — em vez de só ter um fornecedor genérico, ligar o fornecedor ao item cotado com o preço

#### Omie
- Busca de CNPJ com preenchimento automático via Google/Receita Federal
- Histórico de compras integrado ao financeiro
- Filtros por tipo de fornecedor
- **O que copiar:** busca por CNPJ que pré-preenche dados (reduz erros de digitação)

#### Conta Azul
- Foco em fluxo de caixa; cadastro de fornecedores mais simples
- **O que copiar:** integração do fornecedor ao lançamento financeiro (ao registrar gasto, já associar ao fornecedor e ao evento)

### Sistemas Internacionais

#### Zoho Books / Zoho Inventory
- Catálogo de produtos/serviços com preço por fornecedor
- Ordens de compra rastreáveis
- Avaliação básica de fornecedores
- **O que copiar:** tela de "comparar cotações" side-by-side antes de aprovar

#### Vendor Management Systems (Ivalua, Jaggaer, etc.)
Complexos demais para PME, mas dois conceitos valem copiar em versão leve:
1. **Supplier Portal (simplificado):** em vez de portal, um link compartilhável para o fornecedor preencher sua própria proposta (formulário público)
2. **Preferred supplier list:** lista de fornecedores preferidos por categoria, que aparece primeiro no momento de criar cotação

#### CotaCompras (BR)
- Plataforma de cotação com convite por e-mail para fornecedores
- Comparativo automático
- Histórico de cotações arquivado
- **O que copiar:** o fluxo de "criar cotação → convidar fornecedores → comparar → aprovar" como estados da cotação

**Fontes:**
- [Vendor Management System — Appvizer BR](https://www.appvizer.com.br/gestao-planejamento/procurement/vendor-management-system)
- [Software de gestão de fornecedores — Sienge](https://sienge.com.br/blog/software-de-gestao-de-fornecedores/)
- [Bling — Cadastrar fornecedores vinculados a produtos](https://ajuda.bling.com.br/hc/pt-br/articles/1500004346181-Importar-fornecedores-vinculados-aos-produtos)
- [CotaCompras](https://www.cotacompras.com/)

---

## 6. Modelo Mínimo Recomendado — Resumo Final

### Estrutura de dados (tabelas Supabase)

```
-- Fornecedores
fornecedores
  id uuid PK
  razao_social text NOT NULL
  nome_fantasia text
  cnpj text UNIQUE          -- validar formato
  cpf text UNIQUE           -- alternativa para MEI/PF
  contato_nome text         -- responsável comercial
  contato_whatsapp text
  contato_email text
  cidade text
  estado char(2)
  raio_atuacao_km int       -- opcional, para filtro geográfico
  municipios_atendidos text -- lista separada por vírgula ou jsonb
  condicoes_pagamento text  -- campo livre: "30 dias", "50% entrada + 50% entrega"
  chave_pix text
  status text DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','bloqueado'))
  observacoes text
  criado_por uuid REFERENCES auth.users
  criado_em timestamptz DEFAULT now()
  atualizado_em timestamptz DEFAULT now()

-- Categorias de fornecimento (lista fechada, editável pelo admin)
categorias_fornecimento
  id uuid PK
  nome text NOT NULL UNIQUE   -- "Tendas e Coberturas", "Elétrica" etc.
  descricao text
  ordem int                   -- para exibição em listas
  ativo bool DEFAULT true

-- Relação many-to-many: fornecedor ↔ categorias
fornecedor_categoria
  fornecedor_id uuid REFERENCES fornecedores
  categoria_id uuid REFERENCES categorias_fornecimento
  PRIMARY KEY (fornecedor_id, categoria_id)

-- Cotações (liga fornecedor + evento + item)
cotacoes
  id uuid PK
  evento_id uuid REFERENCES eventos
  fornecedor_id uuid REFERENCES fornecedores
  categoria_id uuid REFERENCES categorias_fornecimento
  item_descricao text NOT NULL  -- "Tenda 10x10 com laterais, 3 dias"
  quantidade numeric
  unidade text                  -- "un", "dia", "m²" etc.
  valor_unitario_cotado numeric
  valor_total_cotado numeric
  valor_negociado numeric        -- preço final aceito
  data_cotacao date
  status text DEFAULT 'em_analise'
    CHECK (status IN ('em_analise','aprovada','rejeitada','cancelada'))
  observacoes text               -- "frete incluso", "montagem não inclusa" etc.
  criado_por uuid REFERENCES auth.users
  criado_em timestamptz DEFAULT now()

-- Avaliações pós-evento
avaliacoes_fornecedor
  id uuid PK
  cotacao_id uuid REFERENCES cotacoes UNIQUE  -- uma avaliação por cotação aprovada
  nota_qualidade smallint CHECK (nota_qualidade BETWEEN 1 AND 5)
  nota_pontualidade smallint CHECK (nota_pontualidade BETWEEN 1 AND 5)
  nota_relacionamento smallint CHECK (nota_relacionamento BETWEEN 1 AND 5)
  nota_custo_beneficio smallint CHECK (nota_custo_beneficio BETWEEN 1 AND 5)
  nota_media numeric GENERATED ALWAYS AS (
    (nota_qualidade + nota_pontualidade + nota_relacionamento + nota_custo_beneficio) / 4.0
  ) STORED
  contrataria_novamente text CHECK (contrataria_novamente IN ('sim','ressalvas','nao'))
  observacoes text
  avaliado_por uuid REFERENCES auth.users
  avaliado_em timestamptz DEFAULT now()
```

### Regras de negócio essenciais

1. **Fornecedor sem categoria não deve ser cotado** — validar no frontend antes de salvar cotação.
2. **Cotação aprovada bloqueia edição de valor** — só observações podem ser alteradas.
3. **Avaliação só pode ser criada para cotações com status 'aprovada'** — constraint via RLS ou check.
4. **CNPJ deve ser único** — prevenir duplicidade (principal causa de perda de histórico).
5. **Ao buscar fornecedores para cotação, filtrar por categoria e status** — evitar cotações para fornecedores bloqueados ou fora da categoria.

### Inteligência gerada com o histórico

Com apenas essas tabelas, o sistema responde automaticamente:

| Pergunta | Query / relatório |
|---|---|
| Quanto custou tenda no evento X? | cotacoes WHERE evento_id = X AND categoria = "tenda" AND status = "aprovada" |
| Quem foi mais barato em elétrica nos últimos 12 meses? | GROUP BY fornecedor ORDER BY AVG(valor_negociado) |
| Qual fornecedor tem melhor nota em pontualidade? | JOIN avaliacoes ORDER BY nota_pontualidade DESC |
| Quanto variou o preço da alimentação ano a ano? | GROUP BY YEAR(data_cotacao), fornecedor |
| Quem nunca deve ser contratado de novo? | WHERE contrataria_novamente = "nao" |

### O que NÃO fazer (armadilhas frequentes)

- **Não criar campo "categoria" como texto livre no fornecedor** — vira bagunça de sinônimos
- **Não guardar histórico só em observações livres** — dado não estruturado não vira relatório
- **Não exigir CNPJ como obrigatório** — fornecedores informais e MEIs sem CNPJ são comuns no interior
- **Não criar scorecard com mais de 5 critérios** — avaliação não é preenchida
- **Não deixar a avaliação pós-evento como "opção de menu"** — ela precisa aparecer no fluxo natural de encerramento do evento

---

## Fontes Consolidadas

- [Cadastro de fornecedor — eGestor](https://blog.egestor.com.br/cadastro-de-fornecedor/)
- [Cadastro de fornecedores: campos obrigatórios, validação e setup no ciclo P2P — Kamino](https://kamino.com.br/blog/cadastro-de-fornecedores/)
- [Como Fazer Cadastro de Fornecedores — Gestio](https://www.gestio.com.br/blog/outros/cadastro-de-fornecedores/)
- [Cadastro de fornecedores — Serasa Experian PME](https://www.serasaexperian.com.br/blog-pme/cadastro-de-fornecedores/)
- [Sistema de Gestão de Fornecedores — Sebrae](https://sebrae.com.br/sites/PortalSebrae/canais_adicionais/sistemagestaofornecedores)
- [Cadastrando meus Clientes e Fornecedores — Omie](https://ajuda.omie.com.br/pt-BR/articles/498798-cadastrando-meus-clientes-e-fornecedores)
- [Sistema de cadastro do Bling](https://www.bling.com.br/funcionalidades/cadastro)
- [Campos Customizados Bling](https://blog.bling.com.br/novos-campos-customizados/)
- [Bling — fornecedores vinculados a produtos](https://ajuda.bling.com.br/hc/pt-br/articles/1500004346181-Importar-fornecedores-vinculados-aos-produtos)
- [Vendor Management System — Appvizer BR](https://www.appvizer.com.br/gestao-planejamento/procurement/vendor-management-system)
- [Software de gestão de fornecedores — Sienge](https://sienge.com.br/blog/software-de-gestao-de-fornecedores/)
- [5 Melhores Sistemas de Gestão de Compras 2026 — SULTS](https://www.sults.com.br/solucoes/gestao/5-melhores-sistemas-gestao-compras)
- [Sistema de Cotação e Pesquisa de Preços — DuoSoftware](https://duosoftware.com.br/servico/sistema-de-cotacao-e-pesquisa-de-precos/)
- [CotaCompras — Software de Gestão de Compras](https://www.cotacompras.com/)
- [Sistema de gestão de compras — Blog Industrial Nomus](https://www.nomus.com.br/blog-industrial/sistema-de-gestao-de-compras/)
- [F410NQC — Quadro Comparativo de Cotações Senior](https://documentacao.senior.com.br/goup/5.10.4/menu_suprimentos/f410nqc.htm)
- [Gestão de Fornecedores em Eventos Corporativos — MeEventos](https://meeventos.com.br/blog/gestao-de-fornecedores-em-eventos-corporativos)
- [Dominando a gestão de fornecedores no setor de eventos — Ferbakdecor](https://www.ferbakdecor.com.br/artigos/dominando-a-gestao-de-fornecedores-e-parceiros-no-setor-de-eventos)
- [Fornecedores para Eventos — Copastur](https://www.copastur.com.br/blog/fornecedores-para-eventos-corporativos-como-escolher-os-ideais/)
- [Vendor Scorecards — Ivalua](https://www.ivalua.com/blog/vendor-scorecard/)
- [Supplier Scorecard Metrics — Ramp](https://ramp.com/blog/supplier-scorecard-metrics)
- [Supplier Scorecard — HighRadius](https://www.highradius.com/resources/Blog/supplier-scorecard/)
- [Many-to-many relationships — Zoho Creator](https://www.zoho.com/creator/decode/many-to-many-database-relationships)
- [Many to Many Relationships — DataCamp](https://www.datacamp.com/blog/many-to-many-relationship)
- [Relational Database for Supply Chain Management — GeeksforGeeks](https://www.geeksforgeeks.org/sql/how-to-design-a-relational-database-for-supply-chain-management/)
