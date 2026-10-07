# Extensão CodXis

Extensão Chrome/Edge (Manifest V3) que adiciona **seleção múltipla** aos filtros do sistema CodXis (**vendedor, cidade e forma de pagamento**), sem modificar o sistema. Age como uma camada sobre a interface existente — botões com as mesmas classes (`ui-button`) do PrimeFaces, parecendo parte do sistema.

## Status

| Etapa | Descrição | Status |
|---|---|---|
| 1 | Análise (componente, AJAX e limitações mapeados) | ✅ |
| 2 | Estrutura + manifest | ✅ |
| 3 | Detecção do filtro de vendedores | ✅ |
| 4 | Interface de seleção múltipla | ✅ |
| 5 | Aplicação do filtro | ✅ |
| 6 | Robustez (AJAX/reload) | ✅ |
| 7 | Presets com sincronização (`chrome.storage.sync`) | ✅ |
| 8 | Finalização e revisão | ✅ |
| 9 | Cidade + Forma de Pagamento (seleção múltipla) e Totais do sistema no painel | ✅ |
| 10 | Busca sequencial no servidor para Cidade/Forma de Pagamento (tabela sem essas colunas) | ✅ |
| 11 | Botão **Exportar Excel** (.xls) da tabela filtrada com período (4 datas) no topo; período também exibido no painel | ✅ |

## O que foi mapeado no CodXis (ETAPA 1)

- **Filtros** (`p:selectOneMenu` em `form:tabView`, tela Pedido de Venda):
  - vendedor: `form:tabView:colabordor_input`
  - cidade: `form:tabView:cidade_input`
  - forma de pagamento: `form:tabView:formaPagamento_input`
- **Aplicação:** o sistema filtra apenas ao clicar no botão **Pesquisar** (`p:ajax`, `execute=@all`, renderiza `form:datatablePedidoVenda` + totais).
- **Totais (lidos do DOM):** `form:numeroDocumentos`, `form:totalPedidos`, `form:totalPedidosAberto` (+ títulos `*Titulo`).
- **Limitação descoberta por testes:** o servidor aceita **1 valor por campo por requisição** (vírgula, ponto e vírgula, pipe, espaço e `+` foram testados — só o primeiro vale).
- **Grid:** sem paginação — todos os registros do período já estão no DOM.

## Estratégia de aplicação

Como o servidor não aceita lista, a extensão:

1. Lê as opções dos filtros oficiais do sistema (vendedor, cidade, forma de pagamento).
2. Ao **Aplicar filtro**:
   - **Cidade/Forma de Pagamento sem coluna na tabela** (caso real da tela Consultar):
     faz **busca sequencial** — 1 requisição por valor marcado (limpa os campos,
     seta só o valor atual, clica **Pesquisar**, coleta os nº de pedido da resposta)
     → ao final, **1 busca com tudo limpo** (tabela completa do servidor) →
     **oculta** as linhas fora da interseção (cidades ∩ pagamentos ∩ vendedor).
     O status mostra o progresso (`Buscando Cidade 2/5: ...`) e o total de pesquisas.
   - **Filtro com coluna correspondente** (vendedor sempre; cidade/pagamento se existir
     a coluna): 1 única busca com os campos limpos → oculta as linhas direto pelo valor
     da célula.
3. Os nº de pedido coletados ficam em **conjuntos por filtro** (`estado.conjuntos`);
   mudar a marcação de cidade/pagamento invalida o conjunto e o próximo
   **Aplicar filtro** refaz a sequência.
4. Reaplica o filtro automaticamente quando o CodXis recria o grid via AJAX (`MutationObserver`).
5. Se a coleta falhar ou faltar a coluna sem conjunto, o status avisa
   `tabela sem coluna para: ...` em vez de filtrar em falso.

**Limitação:** os totais do sistema (`numeroDocumentos`, `totalPedidos`, `totalPedidosAberto`) são calculados pelo servidor sobre **todos** os vendedores — a extensão não os altera. O painel exibe esses totais numa seção própria (marcados como "servidor — todos os vendedores") e mostra também a contagem dos registros exibidos.

## Estrutura

```text
extensao-codxis/
├── manifest.json
├── content/
│   ├── content.js        # orquestração (detecção → UI → aplicação → presets)
│   ├── vendedores.js     # detecção do filtro/grid, leitura, aplicação de linhas
│   ├── presets.js        # presets no chrome.storage.sync (entre dispositivos)
│   ├── ui.js             # painel de seleção múltipla
│   └── observer.js       # MutationObserver com debounce (300ms)
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── styles/
│   └── extension.css     # estilos isolados (#codxis-extension-root, prefixo codxis-)
├── utils/
│   └── dom.js            # logger (CodXisLog) + utilitários
└── README.md
```

## Instalação

1. O `manifest.json` já está apontando para `https://web.codxis.api.br/*`
   (se o endereço do sistema mudar, atualize `content_scripts[0].matches`).
2. Abra `chrome://extensions` (Edge: `edge://extensions`).
3. Ative **Modo do desenvolvedor**.
4. **Carregar descompactada** → selecione a pasta `extensao-codxis`.
5. Abra o CodXis → tela **Pedido de Venda → Consultar**.

## Como testar

No Console (F12) devem aparecer:

```text
[CodXis Extension] Extensão iniciada em /...
[CodXis Extension] MutationObserver ativo (debounce 300ms)
[CodXis Extension] Filtros detectados: vendedor (6), cidade (10), pagamento (5)
```

Na tela de **Pedido de Venda → Consultar** (com o painel *Filtros* visível) surge o
botão nativo **Selecionar vários** ao lado de **cada** campo gerenciado —
*Colaborador*, *Cidade* e *Forma de Pagamento* — com as mesmas classes (`ui-button`)
do sistema:

1. Clique em um dos botões → abre o painel ancorado logo abaixo dele, com o
   título do filtro daquele campo (busca + lista + contador + Ações + Presets + status).
2. No topo do painel, a seção **Período da consulta** mostra Data inicial,
   Data final, Data Finalização Inicial e Data Finalização Final (lidas do
   filtro do sistema; vazias aparecem como `—`); logo abaixo, **Totais do
   sistema** mostra Número de Pedidos, Pedidos Finalizados e Pedidos em Aberto
   (valores do servidor — todos os vendedores).
3. Pesquise pelo nome, marque 1 ou mais. O badge azul no botão mostra a contagem.
4. **Aplicar filtro** → progresso no status (`Buscando Cidade 1/3: ...` — uma
   pesquisa por cidade/pagamento marcado quando a tabela não tem aquela coluna,
   + 1 busca final) → status: `X de Y pedido(s) exibido(s) — N pesquisa(s) no servidor`.
   Os filtros marcados são combinados em **E** (vendedor ∩ cidade ∩ forma de pagamento).
5. **Limpar tudo** → limpa todas as seleções e todas as linhas voltam.
6. Troque os filtros do sistema e clique Pesquisar → a extensão reaplica sozinha.
7. O painel fecha com **Esc**, **×** ou clique fora; os botões ficam nos campos.
   Se o painel *Filtros* do sistema estiver recolhido, a extensão o expande
   sozinha antes de pesquisar.
8. Botão **⬇** no cabeçalho do painel (presente em cada filtro) → **Exportar
   Excel**: baixa `pedidos-codxis-AAAA-MM-DD.xls` com **Data inicial**,
   **Data final**, **Data Finalização Inicial** e **Data Finalização Final**
   do período consultado no topo (lidos de `form:tabView:dataInicial_input`,
   `dataFinal_input`, `dataFinalizacaoInicial_input` / `dataFinalizacaoFinal_input`),
   depois os cabeçalhos e as linhas **visíveis** da tabela (respeita o filtro
   aplicado) — abre direto no Excel/LibreOffice.

Em telas **sem** filtros de seleção, os botões/painel simplesmente não aparecem
(nada flutuante sobre outras telas); o popup diz que não há filtro disponível.

**Presets** salvam a seleção de **vendedores** (campo principal).

### Ocultar / reativar a extensão

- **Ocultar:** ícone do olho riscado no cabeçalho do painel → remove o botão e o painel de todas as telas (persistente).
- **Reativar:** popup da extensão → checkbox **"Mostrar extensão nas páginas do CodXis"**.
- O popup também diagnostica: diz se a extensão está rodando na aba e se o filtro foi detectado.
- Fechar o painel: **Esc**, **×** ou clique fora dele.

### Presets (sincronizados entre dispositivos)

- Marque vendedores → digite um nome em **Presets** → **Salvar** (ou Enter).
- Clique no preset para **carregar** a seleção; **×** para remover.
- Salvos no `chrome.storage.sync`: sincronizam pela sua conta Chrome em outros
  computadores onde a extensão estiver instalada — **sem servidor externo**.
- Se um vendedor do preset não existir mais no CodXis, o status avisa quantos faltam.
- Limites do Chrome: ~60 presets / 8KB por item (a extensão mostra erro claro se estourar).
- Alterações feitas em outro dispositivo aparecem automaticamente.

### Cenários de erro (mensagens no painel)

| Situação | Mensagem |
|---|---|
| Tela sem filtros de seleção | botões/painel não aparecem (só nas telas com filtro) |
| Botão Pesquisar não identificado | `Botão Pesquisar não encontrado...` + lista de candidatos no Console |
| Nada marcado | `Selecione ao menos um vendedor, cidade ou forma de pagamento.` |
| Resposta lenta (>8s) | aviso de resposta demorada |
| Linha sem vendedor identificado | contagem separada no status |
| Tabela sem a coluna Cidade/Forma de Pagamento | tratado pela busca sequencial; o aviso `tabela sem coluna para: ...` só aparece se a coleta falhar ou a seleção mudou depois de aplicado |

### Ajuste fino (se algo não for encontrado)

Os ids do CodXis podem mudar. Tudo está em constantes no topo de `content/vendedores.js`:

- `FILTROS_CONHECIDOS` — ids dos 3 campos (`vendedor`, `cidade`, `pagamento`) + regex de rótulo
- `ROTULOS` — títulos/unidades exibidos no painel
- `REGEX_BOTAO` — como identificar o botão Pesquisar (texto/title/aria-label)

## Logs

- Padrão: ligados. Desligue pelo **popup da extensão** (checkbox "Logs detalhados") ou no Console:
  ```js
  CodXisLog.setDebug(false)
  ```
- `debug/info` são silenciados; `warn/error` sempre aparecem.

## Segurança

- Não lê cookies, senhas, tokens, ViewState nem dados de sessão.
- Não envia dados para servidores externos. Todas as ações ocorrem na própria página do CodXis.
- Permissões: `storage` (logs + presets sincronizados) e `activeTab` (ler a URL da aba no popup).
- IDs de classes/elementos próprios (`codxis-*`) para evitar conflito de CSS com o sistema.
