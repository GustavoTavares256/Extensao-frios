(() => {
  const Log = globalThis.CodXisLog;
  const V = globalThis.CodXisVendedores;
  const UI = globalThis.CodXisUI;
  const P = globalThis.CodXisPresets;
  const { normalizar } = globalThis.CodXisDom;

  const CHAVES = ['vendedor', 'cidade', 'pagamento'];

  const estado = {
    filtros: [],
    grid: null,
    totais: [],
    opcoes: { vendedor: [], cidade: [], pagamento: [] },
    selecoes: { vendedor: new Set(), cidade: new Set(), pagamento: new Set() },
    conjuntos: { cidade: null, pagamento: null },
    periodo: { inicial: '', final: '', finInicial: '', finFinal: '' },
    presets: [],
    filtroAtivo: false,
    aplicando: false,
    visivel: true,
    montado: false,
    assinatura: ''
  };

  function mapaConhecidos() {
    const mapa = new Map();
    for (const v of estado.opcoes.vendedor) mapa.set(normalizar(v.label), v.label);
    return mapa;
  }

  function nomesSelecionados() {
    const porValor = new Map(estado.opcoes.vendedor.map((v) => [v.value, v.label]));
    const nomes = new Set();
    for (const valor of estado.selecoes.vendedor) {
      const nome = porValor.get(valor);
      if (nome) nomes.add(nome);
    }
    return nomes;
  }

  function labelsNormalizados(chave) {
    const porValor = new Map(estado.opcoes[chave].map((o) => [o.value, o.label]));
    const saida = new Set();
    for (const valor of estado.selecoes[chave]) {
      const rotulo = porValor.get(valor);
      if (rotulo) saida.add(normalizar(rotulo));
    }
    return saida;
  }

  function detectadas() {
    return new Set(estado.filtros.map((f) => f.chave));
  }

  function selecoesAtivas() {
    const ativas = detectadas();
    return {
      vendedor: ativas.has('vendedor') ? nomesSelecionados() : new Set(),
      cidade: ativas.has('cidade') ? labelsNormalizados('cidade') : new Set(),
      pagamento: ativas.has('pagamento') ? labelsNormalizados('pagamento') : new Set()
    };
  }

  function totalSelecionados() {
    return estado.filtros.reduce((n, f) => n + estado.selecoes[f.chave].size, 0);
  }

  function rotuloDe(chave, valor) {
    const op = estado.opcoes[chave].find((o) => o.value === valor);
    return op ? op.label : valor;
  }

  function mensagemResultado(res, respostaLenta = false) {
    let msg = `${res.exibidas} de ${res.total} pedido(s) exibido(s)`;
    if (respostaLenta) msg += ' — resposta demorou, confira o resultado';
    if (res.desconhecidas) msg += ` — ${res.desconhecidas} linha(s) sem vendedor identificado`;
    if (res.semColuna && res.semColuna.length) {
      msg += ` — tabela sem coluna para: ${res.semColuna.join(', ')}`;
    }
    return msg;
  }

  function render() {
    UI.atualizar({
      opcoes: estado.opcoes,
      selecoes: estado.selecoes,
      totais: estado.totais,
      periodo: estado.periodo,
      filtroDisponivel: estado.filtros.length > 0
    });
  }

  function restaurarTudo() {
    const grid = V.detectarGrid() || estado.grid;
    if (grid) {
      estado.grid = grid;
      V.limparLinhas(grid);
    }
    estado.filtroAtivo = false;
  }

  function reaplicar() {
    if (estado.aplicando) return;
    const grid = V.detectarGrid() || estado.grid;
    if (!grid) return;
    estado.grid = grid;

    if (!totalSelecionados()) {
      if (estado.filtroAtivo) {
        V.limparLinhas(grid);
        estado.filtroAtivo = false;
        UI.status('info', 'Nenhuma seleção — filtro removido.');
        render();
      }
      return;
    }

    const res = V.aplicarLinhas(grid, selecoesAtivas(), mapaConhecidos(), estado.conjuntos);
    estado.filtroAtivo = true;
    UI.status('info', mensagemResultado(res));
    render();
  }

  function avaliar() {
    try {
      const filtros = V.detectarFiltros();
      estado.filtros = filtros;
      const presentes = new Set(filtros.map((f) => f.chave));

      for (const f of filtros) {
        const opcoes = V.lerOpcoes(f);
        estado.opcoes[f.chave] = opcoes;
        const validos = new Set(opcoes.map((o) => o.value));
        for (const valor of [...estado.selecoes[f.chave]]) {
          if (!validos.has(valor)) estado.selecoes[f.chave].delete(valor);
        }
      }
      for (const chave of CHAVES) {
        if (!presentes.has(chave)) estado.opcoes[chave] = [];
      }

      const assinatura = filtros.map((f) => f.select.id).join('|');
      if (assinatura !== estado.assinatura) {
        estado.assinatura = assinatura;
        if (filtros.length) {
          Log.info(
            'Filtros detectados:',
            filtros.map((f) => `${f.chave} (${estado.opcoes[f.chave].length})`).join(', ')
          );
        } else {
          Log.debug('Nenhum filtro de seleção nesta tela');
        }
      }

      if (!estado.aplicando) estado.totais = V.lerTotais();
      estado.periodo = V.lerPeriodo();

      if (filtros.length && filtros[0].select.getClientRects().length === 0) {
        V.garantirFiltrosVisiveis(filtros[0])
          .then((ok) => {
            if (ok) Log.debug('Painel "Filtros" expandido para exibir os botões');
          })
          .catch(() => {});
      }

      if (!estado.montado) {
        UI.montar({
          onSelecao: aoTrocarSelecao,
          onSelecionarTodos: aoSelecionarTodos,
          onLimpar: aoLimpar,
          onAplicar: aplicar,
          onSalvarPreset: aoSalvarPreset,
          onAplicarPreset: aoAplicarPreset,
          onRemoverPreset: aoRemoverPreset,
          onOcultar: aoOcultar,
          onExportar: exportarExcel
        });
        estado.montado = true;
      }

      if (filtros.length && estado.visivel) {
        UI.mostrar();
        UI.ancorar(filtros);
        UI.atualizarPresets(estado.presets);
        render();
      } else {
        UI.desancorar();
        UI.ocultar();
      }

      estado.grid = V.detectarGrid();
      if (estado.filtroAtivo) reaplicar();

      Log.info(
        `Estado → filtros: [${estado.filtros.map((f) => f.chave).join(', ')}] | visível: ${estado.visivel}` +
          ` | montado: ${estado.montado} | totais: ${estado.totais.length}`
      );
    } catch (e) {
      Log.error('Erro na detecção:', e.message);
    }
  }

  function aoOcultar() {
    estado.visivel = false;
    if (estado.montado) avaliar();
    try {
      chrome.storage.local.set({ codxisVisivel: false });
    } catch (e) {
      Log.warn('Não foi possível persistir a ocultação:', e.message);
    }
    Log.debug('Extensão ocultada — reative pelo popup (checkbox "Mostrar")');
  }

  function aoTrocarSelecao(chave, valor, marcado) {
    if (!estado.selecoes[chave]) return;
    if (estado.conjuntos[chave]) estado.conjuntos[chave] = null;
    if (marcado) estado.selecoes[chave].add(valor);
    else estado.selecoes[chave].delete(valor);
    render();
    if (estado.filtroAtivo) reaplicar();
  }

  function aoSelecionarTodos(chave, valores) {
    if (!estado.selecoes[chave]) return;
    if (estado.conjuntos[chave]) estado.conjuntos[chave] = null;
    for (const v of valores) estado.selecoes[chave].add(v);
    render();
    if (estado.filtroAtivo) reaplicar();
    Log.debug(`Selecionados (${chave}):`, estado.selecoes[chave].size);
  }

  function aoLimpar() {
    for (const chave of CHAVES) estado.selecoes[chave].clear();
    estado.conjuntos = { cidade: null, pagamento: null };
    restaurarTudo();
    render();
    UI.status('info', 'Seleções limpas e filtro removido.');
    Log.debug('Seleções e filtro removidos');
  }

  async function carregarPresets() {
    estado.presets = await P.listar();
    UI.atualizarPresets(estado.presets);
  }

  async function aoSalvarPreset(nome) {
    if (!estado.selecoes.vendedor.size) {
      UI.status('aviso', 'Selecione vendedores antes de salvar o preset.');
      return;
    }
    try {
      const r = await P.salvar(nome, [...estado.selecoes.vendedor]);
      UI.limparNomePreset();
      await carregarPresets();
      UI.status(
        'sucesso',
        r.substituido ? `Preset "${r.nome}" atualizado e sincronizado.` : `Preset "${r.nome}" salvo e sincronizado.`
      );
    } catch (e) {
      Log.error('Falha ao salvar preset:', e.message);
      UI.status('erro', e.message);
    }
  }

  async function aoAplicarPreset(nome) {
    const preset = estado.presets.find((p) => p.nome === nome);
    if (!preset) {
      UI.status('erro', 'Preset não encontrado. Atualize a lista.');
      await carregarPresets();
      return;
    }

    const validos = new Set(estado.opcoes.vendedor.map((v) => v.value));
    estado.selecoes.vendedor = new Set(preset.valores.filter((v) => validos.has(v)));
    const ausentes = preset.valores.length - estado.selecoes.vendedor.size;

    render();
    if (estado.filtroAtivo) reaplicar();

    let msg = `Preset "${preset.nome}" carregado: ${estado.selecoes.vendedor.size} vendedor(es).`;
    if (ausentes > 0) msg += ` ${ausentes} não existe(m) mais no sistema.`;
    if (!estado.selecoes.vendedor.size) msg = `Preset "${preset.nome}": nenhum vendedor dele existe mais no sistema.`;
    UI.status(ausentes ? 'aviso' : 'info', msg);
  }

  async function aoRemoverPreset(nome) {
    try {
      await P.remover(nome);
      await carregarPresets();
      UI.status('info', `Preset "${nome}" removido.`);
    } catch (e) {
      Log.error('Falha ao remover preset:', e.message);
      UI.status('erro', e.message);
    }
  }

  async function pesquisarCom(botao, gridBase) {
    const espera = gridBase ? V.aguardarResposta(gridBase, 8000) : Promise.resolve('sem-grid');
    botao.click();
    const motivo = await espera;
    await new Promise((r) => setTimeout(r, 200));
    return motivo;
  }

  async function aplicar() {
    if (estado.aplicando) return;
    if (!estado.filtros.length) {
      UI.status('erro', 'Esta tela não tem filtros de seleção. Abra Pedido de Venda → Consultar.');
      return;
    }
    if (!totalSelecionados()) {
      UI.status('aviso', 'Selecione ao menos um vendedor, cidade ou forma de pagamento.');
      return;
    }

    estado.aplicando = true;
    estado.filtroAtivo = false;
    UI.carregando(true);
    UI.status('info', 'Aplicando filtro...');

    try {
      const frescos = V.detectarFiltros();
      if (frescos.length) estado.filtros = frescos;

      const filtrosOk = await V.garantirFiltrosVisiveis(estado.filtros[0]);
      if (!filtrosOk) {
        throw new Error(
          'O painel "Filtros" do sistema está recolhido e não abriu sozinho. Expanda-o manualmente e clique em Aplicar filtro novamente.'
        );
      }

      const botao = V.encontrarBotaoPesquisa();
      if (!botao) {
        throw new Error(
          'Botão Pesquisar não encontrado. Abra o Console (F12) e copie o aviso "Botão Pesquisar não encontrado. Botões visíveis no painel:".'
        );
      }

      const grid0 = V.detectarGrid();
      const cols = grid0 && grid0.cols ? grid0.cols : {};
      const ativas = selecoesAtivas();

      const coletar = ['cidade', 'pagamento'].filter(
        (chave) =>
          estado.selecoes[chave].size > 0 &&
          cols[chave] === undefined &&
          estado.filtros.some((f) => f.chave === chave)
      );
      const total = coletar.reduce((n, c) => n + estado.selecoes[c].size, 0);
      const conjuntos = { cidade: null, pagamento: null };
      let seq = 0;
      let demorou = false;
      let falha = null;

      for (const chave of coletar) {
        const filtro = estado.filtros.find((f) => f.chave === chave);
        conjuntos[chave] = new Set();
        for (const valor of estado.selecoes[chave]) {
          seq++;
          const rotulo = rotuloDe(chave, valor);
          UI.status('info', `Buscando ${V.ROTULOS[chave].curto} ${seq}/${total}: ${rotulo}...`);
          Log.debug(`Sequência ${seq}/${total} — ${chave} = ${rotulo}`);
          V.limparFiltrosSistema(estado.filtros);
          if (!V.definirFiltro(filtro, valor, rotulo)) {
            Log.warn(`Não foi possível definir ${chave} = ${rotulo}`);
          }
          try {
            const motivo = await pesquisarCom(botao, V.detectarGrid() || grid0);
            if (motivo === 'timeout') demorou = true;
          } catch (e) {
            falha = e;
          }
          if (falha) {
            conjuntos[chave] = null;
            break;
          }
          const g = V.detectarGrid();
          if (g) for (const k of V.lerChaves(g)) conjuntos[chave].add(k);
          Log.debug(`${chave} = ${rotulo} → acumulado: ${conjuntos[chave].size} linha(s)`);
        }
        if (falha) break;
      }

      V.limparFiltrosSistema(estado.filtros);
      UI.status(
        'info',
        seq ? `Buscando resultado completo (${seq + 1}/${total + 1})...` : 'Aplicando filtro...'
      );
      Log.debug('Clicando no botão Pesquisar (busca final):', botao.id || botao.className);
      const motivoFinal = await pesquisarCom(botao, V.detectarGrid() || grid0);
      if (motivoFinal === 'timeout') demorou = true;

      const grid = V.detectarGrid();
      if (!grid) throw falha || new Error('Grid de resultados não encontrado após a pesquisa.');
      estado.grid = grid;

      const res = V.aplicarLinhas(grid, ativas, mapaConhecidos(), conjuntos);
      estado.conjuntos = conjuntos;
      estado.filtroAtivo = true;

      let msg = mensagemResultado(res, demorou);
      if (seq) msg += ` — ${seq + 1} pesquisa(s) no servidor`;
      if (falha) msg += ` — falha em uma busca: ${falha.message}`;
      UI.status(falha ? 'aviso' : 'sucesso', msg);
      render();
      Log.info('Filtro aplicado:', res, seq ? `| buscas sequenciais: ${seq}` : '');
    } catch (e) {
      Log.error('Falha ao aplicar filtro:', e.message);
      UI.status('erro', e.message);
    } finally {
      estado.aplicando = false;
      UI.carregando(false);
    }
  }

  function exportarExcel() {
    if (estado.aplicando) return;
    const grid = V.detectarGrid() || estado.grid;
    if (!grid) {
      UI.status('aviso', 'Nenhuma tabela de resultados para exportar. Abra Pedido de Venda → Consultar.');
      return;
    }
    const dados = V.extrairTabela(grid);
    if (!dados.colunas.length || !dados.linhas.length) {
      UI.status('aviso', 'Nenhuma linha visível para exportar.');
      return;
    }
    dados.periodo = V.lerPeriodo();
    UI.baixarXls(dados);
    let msg = `Planilha exportada: ${dados.linhas.length} linha(s) × ${dados.colunas.length} coluna(s).`;
    if (dados.periodo.inicial || dados.periodo.final) {
      msg += ` Período: ${dados.periodo.inicial || '—'} a ${dados.periodo.final || '—'}.`;
    }
    if (dados.periodo.finInicial || dados.periodo.finFinal) {
      msg += ` Finalização: ${dados.periodo.finInicial || '—'} a ${dados.periodo.finFinal || '—'}.`;
    }
    UI.status('sucesso', msg);
    Log.info('Exportado para XLS:', dados.linhas.length, 'linhas,', dados.colunas.length, 'colunas');
  }

  function configurarStorage() {
    try {
      chrome.storage.local.get({ codxisDebug: true, codxisVisivel: true }, (dados) => {
        Log.setDebug(dados.codxisDebug);
        estado.visivel = Boolean(dados.codxisVisivel);
        if (estado.montado) avaliar();
      });
      chrome.storage.onChanged.addListener((mudancas, area) => {
        if (area === 'local' && mudancas.codxisDebug) Log.setDebug(mudancas.codxisDebug.newValue);
        if (area === 'local' && mudancas.codxisVisivel) {
          estado.visivel = Boolean(mudancas.codxisVisivel.newValue);
          if (estado.montado) avaliar();
        }
        if (area === 'sync' && mudancas.codxisPresets) {
          Log.debug('Presets alterados em outro dispositivo — recarregando');
          carregarPresets();
        }
      });
    } catch (e) {
      Log.warn('Storage indisponível, logs mantidos no padrão.');
    }
  }

  function iniciar() {
    Log.info('Extensão iniciada em', location.pathname);
    configurarStorage();
    carregarPresets();

    if (!document.getElementById('form')) {
      Log.warn('Página sem #form do CodXis — a extensão se ativará se um filtro de seleção aparecer.');
    }

    globalThis.CodXisObserver.start(avaliar);
    avaliar();

    try {
      chrome.runtime.onMessage.addListener((mensagem, remetente, responder) => {
        if (mensagem && mensagem.tipo === 'codxisStatus') {
          responder({
            detectado: estado.filtros.length > 0,
            vendedores: estado.opcoes.vendedor.length,
            cidades: estado.opcoes.cidade.length,
            formasPagamento: estado.opcoes.pagamento.length,
            selecionados: totalSelecionados(),
            montado: estado.montado,
            filtroAtivo: estado.filtroAtivo,
            visivel: estado.visivel,
            dbg: {
              caminho: location.pathname,
              painelFiltros: Boolean(document.getElementById('form:tabView')),
              colabordor: Boolean(document.getElementById('form:tabView:colabordor_input')),
              cidade: Boolean(document.getElementById('form:tabView:cidade_input')),
              formaPagamento: Boolean(document.getElementById('form:tabView:formaPagamento_input')),
              selects: document.querySelectorAll('select[id$="_input"]').length
            }
          });
        }
      });
    } catch (e) {
      Log.warn('Listener de status do popup indisponível:', e.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  } else {
    iniciar();
  }
})();
