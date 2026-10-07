# Publicação para o LinkedIn (copie e cole)

---

## VERSÃO PRINCIPAL (recomendada)

Quem trabalha com sistemas legados sabe que "simples tarefinha" quase nunca é simples.

Trabalho diário com um sistema feito em JSF + PrimeFaces, e um dos filtros mais usados tinha uma trava clássica: o servidor aceitava **apenas 1 valor por campo por requisição**. Quer filtrar 3 vendedores ao mesmo tempo? Volta e meia fazendo buscas manuais. Filtro combinando vendedor, cidade e forma de pagamento? Impossível pela tela.

Então resolvi construir por cima: uma **extensão para Chrome/Edge (Manifest V3)** que adiciona seleção múltipla sem tocar no sistema.

Como funciona:
- Botões com as mesmas classes do PrimeFaces (`ui-button`), colados nos campos oficiais — parece que sempre esteve lá.
- Painel de seleção múltipla com busca, contador, presets sincronizados pela conta Chrome e totais lidos do próprio sistema.
- Combinação em E lógico: vendedor ∩ cidade ∩ forma de pagamento.
- Como o servidor só aceita 1 valor, para cidade/pagamento (que nem têm coluna na tabela) a extensão faz **busca sequencial**: pesquisa 1 valor por vez, recolhe os números de pedido e mostra só a interseção.
- Botão de **exportar para Excel (.xls)** com as datas do período consultado no topo — bom para conferência e envio.
- Zero modificação no sistema, sem dados saindo do navegador, sem tocar em ViewState/cookies.

Tecnologias e como o código foi pensado:
- **JavaScript (ES6+)**: a extensão é um *content script* injetado na página do sistema; toda a detecção e orquestração é JS puro (sem framework).
- **CSS**: painel com a cara "nativa" — em vez de `all: initial`, a UI herda a fonte e as classes `ui-button` do PrimeFaces, e o painel fica ancorado ao campo (position, reposiciona em scroll/resize).
- **HTML**: painel injetado com escopo isolado (`#codxis-extension-root`).
- **APIs do Chrome/Edge (Manifest V3)**: `chrome.storage.sync/local` (presets sincronizados em outros dispositivos + preferências) e `chrome.runtime` (popup de diagnóstico).
- **Como foi arquitetado**:
  - *Camadas separadas por responsabilidade*: detecção/regras do grid, interface, presets, observer e orquestração em arquivos próprios (`content/`).
  - *Defensivo por natureza*: sistema legado muda id — a detecção usa id direto + fallbacks e logs de diagnóstico (`[CodXis Extension]`).
  - *Respeita o DOM do sistema*: nunca reescreve a tabela — só oculta linhas, mantendo ids e ações originais; reaplica sozinha quando o JSF recria o grid (MutationObserver).
  - *Combinação por conjuntos*: a busca sequencial coleta os números de pedido de cada valor e a interseção define o que exibir (E lógico).
  - *Qualidade prática*: cada arquivo passa em `node --check` antes de publicar, e o painel tem Fallback de rolagem contida para não roubar o scroll da página.

O que aprendi no caminho:
- Nem sempre dá para pedir "merge para suportar lista" — às vezes a melhor entrega é camuflar a solução na interface que o usuário já usa.
- Detecção por \`id\`/estrutura funciona, mas sistema legado muda — o código precisou de fallbacks e logs de diagnóstico.
- UX de "parecer nativo" dá trabalho: posicionamento ancorado, rolagem contida no painel, cores e tipografia herdadas.

E você, já teve que dar "jeitinho" num sistema legado? Como resolveu?

**#Desenvolvimento #PrimeFaces #JSF #ChromeExtension #FrontEnd #Produtividade #SistemaLegado #Excel**

---

## VERSÃO CURTA

Construí uma extensão para Chrome/Edge que adiciona **seleção múltipla nos filtros** de um sistema JSF/PrimeFaces que só aceitava 1 valor por campo.

- Vendedor, cidade e forma de pagamento combinados (E lógico)
- UI com a cara nativa do PrimeFaces
- Busca sequencial no servidor para cidades/pagamentos (sem coluna na tabela)
- Exportação para Excel (.xls) com o período consultado
- Presets sincronizados pela conta Chrome
- Sem modificar o sistema, sem dados saindo do navegador
- 100% JavaScript + CSS + HTML (content script MV3), arquitetado em camadas e com detecção defensiva do DOM legado

Legado não precisa ser limitação — dá para ser mais produtivo sem esperar o "vai pro backlog".

#Desenvolvimento #PrimeFaces #ChromeExtension #Produtividade