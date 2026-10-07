(() => {
  const Log = globalThis.CodXisLog;
  const { normalizar } = globalThis.CodXisDom;

  let raiz = null;
  let refs = {};
  let callbacks = {};

  const TITULOS = {
    vendedor: { titulo: 'Selecionar vendedores', unidade: 'vendedor(es)' },
    cidade: { titulo: 'Selecionar cidades', unidade: 'cidade(s)' },
    pagamento: { titulo: 'Selecionar formas de pagamento', unidade: 'forma(s) de pagamento' }
  };

  const estadoRender = {
    opcoes: { vendedor: [], cidade: [], pagamento: [] },
    selecoes: { vendedor: new Set(), cidade: new Set(), pagamento: new Set() },
    totais: [],
    periodo: { inicial: '', final: '', finInicial: '', finFinal: '' },
    filtroAtual: 'vendedor',
    filtroDisponivel: false,
    carregando: false
  };

  let assinaturaLista = null;
  let assinaturaTotais = null;
  let assinaturaPeriodo = null;

  const MARCACAO = `
    <div class="codxis-painel codxis-painel--oculto" id="codxis-painel" role="dialog" aria-label="Seleção múltipla">
      <header class="codxis-cabecalho">
        <div class="codxis-titulos">
          <h2 class="codxis-titulo">Selecionar vendedores</h2>
          <p class="codxis-contexto codxis-contexto--ok">Verificando...</p>
        </div>
        <div class="codxis-botoes">
          <button type="button" class="codxis-icone-btn" data-acao="exportar" title="Exportar tabela filtrada para Excel (.xls)" aria-label="Exportar tabela para Excel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3v11"/>
              <path d="M7.5 10.5 12 15l4.5-4.5"/>
              <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>
            </svg>
          </button>
          <button type="button" class="codxis-icone-btn" data-acao="ocultar" title="Ocultar extensão (reativar no popup)" aria-label="Ocultar extensão">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
              <path d="M3 3l18 18"/>
              <path d="M10.7 5.2A10.6 10.6 0 0 1 12 5c5 0 9 4.6 9 7 0 1-.5 2.3-1.4 3.5"/>
              <path d="M6.6 6.8C4.4 8.3 3 10.4 3 12c0 2.4 4 7 9 7 1.5 0 2.9-.4 4.1-1"/>
              <path d="M9.9 10a3 3 0 0 0 4.2 4.2"/>
            </svg>
          </button>
          <button type="button" class="codxis-icone-btn codxis-icone-btn--fechar" data-acao="fechar" title="Fechar (Esc)" aria-label="Fechar painel">&times;</button>
        </div>
      </header>

      <div class="codxis-corpo">
        <div class="codxis-periodo" hidden>
          <p class="codxis-periodo__titulo">Período da consulta</p>
          <div class="codxis-periodo__itens">
            <span class="codxis-periodo__item">
              <span class="codxis-periodo__rotulo">Data inicial</span>
              <span class="codxis-periodo__valor" data-periodo="inicial">—</span>
            </span>
            <span class="codxis-periodo__item">
              <span class="codxis-periodo__rotulo">Data final</span>
              <span class="codxis-periodo__valor" data-periodo="final">—</span>
            </span>
            <span class="codxis-periodo__item">
              <span class="codxis-periodo__rotulo">Data Finalização Inicial</span>
              <span class="codxis-periodo__valor" data-periodo="finInicial">—</span>
            </span>
            <span class="codxis-periodo__item">
              <span class="codxis-periodo__rotulo">Data Finalização Final</span>
              <span class="codxis-periodo__valor" data-periodo="finFinal">—</span>
            </span>
          </div>
        </div>

        <div class="codxis-totais" hidden>
          <p class="codxis-totais__titulo">Totais do sistema <span>(servidor — todos os vendedores)</span></p>
          <div class="codxis-totais__itens"></div>
        </div>

        <div class="codxis-aviso codxis-aviso--info" hidden>
          Nenhum filtro de seleção disponível nesta tela. Abra
          <strong>Pedido de Venda → Consultar</strong> para filtrar.
        </div>

        <div class="codxis-busca">
          <svg class="codxis-busca__icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>
          </svg>
          <input type="search" class="codxis-busca__campo" placeholder="Pesquisar..." aria-label="Pesquisar opção" autocomplete="off" spellcheck="false">
        </div>

        <ul class="codxis-lista" role="listbox" aria-multiselectable="true"></ul>

        <p class="codxis-contador" aria-live="polite">0 selecionado(s)</p>

        <div class="codxis-acoes">
          <button type="button" class="codxis-btn codxis-btn--secundario" data-acao="todos">Selecionar todos</button>
          <button type="button" class="codxis-btn codxis-btn--secundario" data-acao="limpar">Limpar tudo</button>
          <button type="button" class="codxis-btn codxis-btn--primario" data-acao="aplicar">Aplicar filtro</button>
        </div>

        <details class="codxis-presets">
          <summary class="codxis-presets__resumo">Presets de vendedores <span class="codxis-presets__dica">sincronizados</span></summary>
          <div class="codxis-presets__corpo">
            <div class="codxis-presets__linha">
              <input type="text" class="codxis-presets__nome" placeholder="Nome do preset" maxlength="40" autocomplete="off" aria-label="Nome do preset">
              <button type="button" class="codxis-btn codxis-btn--secundario codxis-btn--salvar" data-acao="salvarPreset">Salvar</button>
            </div>
            <ul class="codxis-presets__lista" hidden></ul>
            <p class="codxis-presets__vazio">Nenhum preset salvo ainda. Marque vendedores e dê um nome.</p>
          </div>
        </details>

        <div class="codxis-status codxis-status--vazio" role="status" aria-live="polite"></div>
      </div>
    </div>
  `;

  function montar(cb) {
    if (raiz) return;
    callbacks = cb || {};

    raiz = document.createElement('div');
    raiz.id = 'codxis-extension-root';
    raiz.className = 'codxis-raiz';
    raiz.innerHTML = MARCACAO;
    document.body.appendChild(raiz);

    refs = {
      painel: raiz.querySelector('.codxis-painel'),
      titulo: raiz.querySelector('.codxis-titulo'),
      contexto: raiz.querySelector('.codxis-contexto'),
      periodo: raiz.querySelector('.codxis-periodo'),
      periodoInicial: raiz.querySelector('[data-periodo="inicial"]'),
      periodoFinal: raiz.querySelector('[data-periodo="final"]'),
      periodoFinInicial: raiz.querySelector('[data-periodo="finInicial"]'),
      periodoFinFinal: raiz.querySelector('[data-periodo="finFinal"]'),
      totais: raiz.querySelector('.codxis-totais'),
      totaisItens: raiz.querySelector('.codxis-totais__itens'),
      aviso: raiz.querySelector('.codxis-aviso'),
      busca: raiz.querySelector('.codxis-busca__campo'),
      lista: raiz.querySelector('.codxis-lista'),
      contador: raiz.querySelector('.codxis-contador'),
      status: raiz.querySelector('.codxis-status'),
      acoes: raiz.querySelector('.codxis-acoes'),
      presets: raiz.querySelector('.codxis-presets'),
      presetsNome: raiz.querySelector('.codxis-presets__nome'),
      presetsLista: raiz.querySelector('.codxis-presets__lista'),
      presetsVazio: raiz.querySelector('.codxis-presets__vazio'),
      exportar: raiz.querySelector('[data-acao="exportar"]'),
      botoes: {}
    };

    refs.painel.addEventListener('click', (ev) => {
      const botao = ev.target.closest('[data-acao]');
      if (!botao) return;
      const acao = botao.dataset.acao;
      if (acao === 'fechar') fecharPainel();
      else if (acao === 'ocultar' && callbacks.onOcultar) callbacks.onOcultar();
      else if (acao === 'exportar' && callbacks.onExportar) callbacks.onExportar();
    });

    refs.busca.addEventListener('input', aplicarBusca);

    refs.lista.addEventListener('change', (ev) => {
      const alvo = ev.target;
      if (!alvo || !alvo.classList.contains('codxis-item__check')) return;
      if (callbacks.onSelecao) callbacks.onSelecao(estadoRender.filtroAtual, alvo.value, alvo.checked);
    });

    refs.acoes.addEventListener('click', (ev) => {
      const botao = ev.target.closest('[data-acao]');
      if (!botao) return;
      const acao = botao.dataset.acao;
      if (acao === 'todos' && callbacks.onSelecionarTodos) {
        callbacks.onSelecionarTodos(estadoRender.filtroAtual, visiveisSelecionaveis());
      } else if (acao === 'limpar' && callbacks.onLimpar) {
        callbacks.onLimpar();
      } else if (acao === 'aplicar' && callbacks.onAplicar) {
        callbacks.onAplicar();
      }
    });

    refs.presets.addEventListener('click', (ev) => {
      const salvar = ev.target.closest('[data-acao="salvarPreset"]');
      if (salvar) {
        if (callbacks.onSalvarPreset) callbacks.onSalvarPreset(refs.presetsNome.value);
        return;
      }
      const aplicar = ev.target.closest('.codxis-preset__aplicar');
      if (aplicar && callbacks.onAplicarPreset) {
        callbacks.onAplicarPreset(aplicar.dataset.preset);
        return;
      }
      const remover = ev.target.closest('.codxis-preset__remover');
      if (remover && callbacks.onRemoverPreset) {
        callbacks.onRemoverPreset(remover.dataset.presetRemover);
      }
    });

    refs.presetsNome.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        if (callbacks.onSalvarPreset) callbacks.onSalvarPreset(refs.presetsNome.value);
      }
    });

    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && aberto()) fecharPainel();
    });

    document.addEventListener('mousedown', (ev) => {
      if (!raiz || !aberto()) return;
      const alvo = ev.target;
      if (refs.painel.contains(alvo)) return;
      if (Object.values(refs.botoes).some((b) => alvo === b || b.contains(alvo))) return;
      fecharPainel();
    });

    refs.painel.addEventListener(
      'wheel',
      (ev) => {
        if (ev.deltaY === 0) return;
        let el = ev.target;
        while (el && el !== refs.painel.parentElement) {
          if (el.scrollHeight > el.clientHeight + 1) {
            const podeDescer = ev.deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1;
            const podeSubir = ev.deltaY < 0 && el.scrollTop > 0;
            if (podeDescer || podeSubir) return;
            ev.preventDefault();
            return;
          }
          el = el.parentElement;
        }
        ev.preventDefault();
      },
      { passive: false }
    );

    window.addEventListener(
      'scroll',
      () => {
        if (aberto()) posicionar();
      },
      true
    );
    window.addEventListener('resize', () => {
      if (aberto()) posicionar();
    });

    Log.debug('Interface montada');
  }

  function ancorar(filtros) {
    if (!raiz || !filtros.length) return;
    const desejados = new Map(filtros.map((f) => [f.chave, f.container]));

    for (const chave of Object.keys(refs.botoes)) {
      const b = refs.botoes[chave];
      if (!desejados.has(chave) || b._ancora !== desejados.get(chave)) {
        b.remove();
        delete refs.botoes[chave];
      }
    }

    for (const f of filtros) {
      const existente = refs.botoes[f.chave];
      if (existente && existente.isConnected && existente._ancora === f.container) continue;

      if (existente) existente.remove();

      const botao = document.createElement('button');
      botao.type = 'button';
      botao.id = `codxis-botao-${f.chave}`;
      botao.className = 'codxis-botao ui-button ui-widget ui-state-default ui-corner-all';
      botao.title = TITULOS[f.chave].titulo;
      botao.setAttribute('aria-haspopup', 'dialog');
      botao.setAttribute('aria-expanded', 'false');
      botao.innerHTML =
        '<span class="ui-button-text ui-c">Selecionar vários</span><span class="codxis-badge" hidden></span>';
      botao._ancora = f.container;
      f.container.insertAdjacentElement('afterend', botao);
      botao.addEventListener('click', (ev) => {
        ev.stopPropagation();
        alternarPainel(f.chave);
      });
      refs.botoes[f.chave] = botao;
    }

    if (!refs.botoes[estadoRender.filtroAtual]) {
      estadoRender.filtroAtual = filtros[0].chave;
    }
    atualizarBadges();
    Log.info('Botões "Selecionar vários" posicionados em:', Object.keys(refs.botoes).join(', '));
  }

  function desancorar() {
    if (refs.painel) refs.painel.classList.add('codxis-painel--oculto');
    for (const chave of Object.keys(refs.botoes)) {
      refs.botoes[chave].remove();
      delete refs.botoes[chave];
    }
  }

  function botaoAtual() {
    return refs.botoes[estadoRender.filtroAtual] || null;
  }

  function visiveisSelecionaveis() {
    return [...refs.lista.querySelectorAll('.codxis-item__check')]
      .filter((c) => !c.closest('li').hidden)
      .map((c) => c.value);
  }

  function aberto() {
    return Boolean(refs.painel) && !refs.painel.classList.contains('codxis-painel--oculto');
  }

  function posicionar(botao) {
    const alvo = botao || botaoAtual();
    if (!alvo || !alvo.isConnected) return;
    const r = alvo.getBoundingClientRect();
    const pw = refs.painel.offsetWidth || 350;
    const ph = refs.painel.offsetHeight || 420;

    let left = Math.min(r.left, window.innerWidth - pw - 10);
    left = Math.max(10, left);

    let top = r.bottom + 6;
    if (top + ph > window.innerHeight - 10 && r.top - ph - 6 > 10) {
      top = r.top - ph - 6;
    }

    refs.painel.style.left = `${left}px`;
    refs.painel.style.top = `${top}px`;
  }

  function atualizarTitulo() {
    refs.titulo.textContent = TITULOS[estadoRender.filtroAtual].titulo;
    refs.contexto.textContent = `${estadoRender.opcoes[estadoRender.filtroAtual].length} ${TITULOS[estadoRender.filtroAtual].unidade} no filtro`;
    refs.contexto.classList.toggle('codxis-contexto--ok', estadoRender.filtroDisponivel);
  }

  function alternarPainel(chave) {
    const botao = refs.botoes[chave];
    if (!botao) return;

    const eraEste = aberto() && estadoRender.filtroAtual === chave;
    estadoRender.filtroAtual = chave;
    Object.values(refs.botoes).forEach((b) => b.setAttribute('aria-expanded', 'false'));

    if (eraEste) {
      fecharPainel();
      return;
    }

    refs.painel.classList.remove('codxis-painel--oculto');
    botao.setAttribute('aria-expanded', 'true');
    atualizarTitulo();
    renderLista();
    refs.busca.value = '';
    aplicarBusca();
    posicionar(botao);
    refs.busca.focus({ preventScroll: true });
  }

  function fecharPainel() {
    if (!refs.painel || !aberto()) return;
    refs.painel.classList.add('codxis-painel--oculto');
    const botao = botaoAtual();
    if (botao) {
      botao.setAttribute('aria-expanded', 'false');
      botao.focus({ preventScroll: true });
    }
  }

  function aplicarBusca() {
    const consulta = normalizar(refs.busca.value);
    for (const item of refs.lista.querySelectorAll('.codxis-item')) {
      item.hidden = consulta !== '' && !item.dataset.rotulo.includes(consulta);
    }
    const vazio = refs.lista.querySelector('.codxis-lista__vazio');
    if (vazio) {
      const algumVisivel = [...refs.lista.querySelectorAll('.codxis-item')].some((i) => !i.hidden);
      vazio.hidden = algumVisivel;
      vazio.textContent =
        estadoRender.opcoes[estadoRender.filtroAtual].length === 0
          ? 'Nenhuma opção disponível no filtro do sistema.'
          : 'Nenhuma opção encontrada para a busca.';
    }
  }

  function sincronizarHabilitacao() {
    const { filtroDisponivel, carregando } = estadoRender;
    const temOpcoes = estadoRender.opcoes[estadoRender.filtroAtual].length > 0;
    refs.busca.disabled = !filtroDisponivel || !temOpcoes;
    refs.acoes.querySelectorAll('button').forEach((b) => {
      b.disabled = !filtroDisponivel || carregando;
    });
    refs.lista.querySelectorAll('.codxis-item__check').forEach((c) => {
      c.disabled = carregando;
    });
    if (refs.exportar) refs.exportar.disabled = carregando;
  }

  function renderPeriodo() {
    if (!refs.periodo) return;
    const p = estadoRender.periodo || {};
    const g = (k) => p[k] || '';
    const chaves = ['inicial', 'final', 'finInicial', 'finFinal'];
    const assinatura = chaves.map(g).join('\u0001');
    if (assinatura === assinaturaPeriodo) return;
    assinaturaPeriodo = assinatura;
    refs.periodoInicial.textContent = g('inicial') || '—';
    refs.periodoFinal.textContent = g('final') || '—';
    refs.periodoFinInicial.textContent = g('finInicial') || '—';
    refs.periodoFinFinal.textContent = g('finFinal') || '—';
    refs.periodo.hidden = !chaves.some((k) => g(k));
  }

  function renderTotais() {
    const assinatura = estadoRender.totais.map((t) => `${t.rotulo}=${t.valor}`).join('\u0001');
    if (assinatura === assinaturaTotais && refs.totaisItens.children.length) return;
    assinaturaTotais = assinatura;

    refs.totais.hidden = estadoRender.totais.length === 0;
    refs.totaisItens.textContent = '';
    for (const t of estadoRender.totais) {
      const item = document.createElement('div');
      item.className = 'codxis-total';

      const rotulo = document.createElement('span');
      rotulo.className = 'codxis-total__rotulo';
      rotulo.textContent = t.rotulo;

      const valor = document.createElement('span');
      valor.className = 'codxis-total__valor';
      valor.textContent = t.valor;

      item.append(rotulo, valor);
      refs.totaisItens.appendChild(item);
    }
  }

  function renderLista() {
    const chave = estadoRender.filtroAtual;
    const opcoes = estadoRender.opcoes[chave];
    const selecionados = estadoRender.selecoes[chave];

    const assinatura = chave + '|' + opcoes.map((o) => o.value).join('\u0001');
    if (refs.lista.children.length && assinatura === assinaturaLista) {
      for (const c of refs.lista.querySelectorAll('.codxis-item__check')) {
        c.checked = selecionados.has(c.value);
      }
      atualizarContador();
      atualizarTitulo();
      return;
    }
    assinaturaLista = assinatura;

    const scrollTop = refs.lista.scrollTop;
    refs.lista.textContent = '';

    const vazio = document.createElement('li');
    vazio.className = 'codxis-lista__vazio';
    vazio.textContent =
      opcoes.length === 0
        ? 'Nenhuma opção disponível no filtro do sistema.'
        : 'Nenhuma opção encontrada para a busca.';
    refs.lista.appendChild(vazio);

    for (const op of opcoes) {
      const item = document.createElement('li');
      item.className = 'codxis-item';
      item.dataset.rotulo = normalizar(op.label);

      const rotulo = document.createElement('label');
      rotulo.className = 'codxis-item__rotulo';

      const check = document.createElement('input');
      check.type = 'checkbox';
      check.className = 'codxis-item__check';
      check.value = op.value;
      check.checked = selecionados.has(op.value);

      const nome = document.createElement('span');
      nome.className = 'codxis-item__nome';
      nome.textContent = op.label;

      rotulo.append(check, nome);
      item.appendChild(rotulo);
      refs.lista.appendChild(item);
    }

    refs.lista.scrollTop = scrollTop;
    aplicarBusca();
    atualizarContador();
    atualizarTitulo();
  }

  function atualizarBadges() {
    for (const [chave, botao] of Object.entries(refs.botoes)) {
      const badge = botao.querySelector('.codxis-badge');
      if (!badge) continue;
      const total = estadoRender.selecoes[chave] ? estadoRender.selecoes[chave].size : 0;
      badge.hidden = total === 0;
      badge.textContent = String(total);
    }
  }

  function atualizarContador() {
    const chave = estadoRender.filtroAtual;
    const total = estadoRender.selecoes[chave].size;
    const disponiveis = estadoRender.opcoes[chave].length;
    refs.contador.textContent = `${total} selecionado(s) de ${disponiveis} ${TITULOS[chave].unidade}`;
  }

  function atualizar({ opcoes, selecoes, totais, periodo, filtroDisponivel }) {
    if (!refs.lista) return;
    if (opcoes) estadoRender.opcoes = opcoes;
    if (selecoes) estadoRender.selecoes = selecoes;
    if (totais) estadoRender.totais = totais;
    if (periodo) estadoRender.periodo = periodo;
    estadoRender.filtroDisponivel = Boolean(filtroDisponivel);

    renderPeriodo();
    renderTotais();
    renderLista();
    atualizarBadges();
    refs.aviso.hidden = estadoRender.filtroDisponivel;
    sincronizarHabilitacao();
    if (aberto()) posicionar();
  }

  function mostrar() {
    if (raiz) raiz.classList.remove('codxis-raiz--oculto');
  }

  function ocultar() {
    if (raiz) {
      raiz.classList.add('codxis-raiz--oculto');
      if (refs.painel) refs.painel.classList.add('codxis-painel--oculto');
      Object.values(refs.botoes).forEach((b) => b.setAttribute('aria-expanded', 'false'));
    }
  }

  function atualizarPresets(presets) {
    if (!refs.presetsLista) return;
    refs.presetsLista.textContent = '';

    for (const p of presets) {
      const item = document.createElement('li');
      item.className = 'codxis-preset';

      const aplicar = document.createElement('button');
      aplicar.type = 'button';
      aplicar.className = 'codxis-preset__aplicar';
      aplicar.dataset.preset = p.nome;
      aplicar.textContent = `${p.nome} (${p.valores.length})`;
      aplicar.title = `Aplicar preset "${p.nome}"`;

      const remover = document.createElement('button');
      remover.type = 'button';
      remover.className = 'codxis-preset__remover';
      remover.dataset.presetRemover = p.nome;
      remover.textContent = '×';
      remover.setAttribute('aria-label', `Remover preset ${p.nome}`);

      item.append(aplicar, remover);
      refs.presetsLista.appendChild(item);
    }

    refs.presetsLista.hidden = presets.length === 0;
    refs.presetsVazio.hidden = presets.length > 0;
  }

  function limparNomePreset() {
    refs.presetsNome.value = '';
  }

  function carregando(ativo) {
    estadoRender.carregando = Boolean(ativo);
    raiz.querySelectorAll('.codxis-presets button').forEach((b) => (b.disabled = ativo));
    const aplicar = refs.acoes.querySelector('[data-acao="aplicar"]');
    aplicar.classList.toggle('codxis-btn--carregando', ativo);
    aplicar.textContent = ativo ? 'Aplicando...' : 'Aplicar filtro';
    refs.painel.classList.toggle('codxis-painel--carregando', ativo);
    sincronizarHabilitacao();
  }

  function baixarXls(dados) {
    const esc = (t) =>
      String(t == null ? '' : t)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const cabecalho = dados.colunas.map((c) => `<th>${esc(c)}</th>`).join('');
    const corpo = dados.linhas
      .map((l) => `<tr>${l.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
      .join('');

    const periodo = dados.periodo;
    const rotulos = [
      ['Data inicial', periodo && periodo.inicial],
      ['Data final', periodo && periodo.final],
      ['Data Finalização Inicial', periodo && periodo.finInicial],
      ['Data Finalização Final', periodo && periodo.finFinal]
    ].filter(([, v]) => v);
    const topo = rotulos.length
      ? rotulos
          .map(([rot, val]) => `<tr><td><b>${esc(rot)}</b></td><td>${esc(val)}</td></tr>`)
          .join('') + '<tr><td></td><td></td></tr>'
      : '';

    const html =
      '<html xmlns:x="urn:schemas-microsoft-com:office:excel">' +
      '<head><meta charset="utf-8"></head>' +
      `<body><table border="1"><thead>${topo}<tr>${cabecalho}</tr></thead><tbody>${corpo}</tbody></table></body></html>`;

    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const data = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `pedidos-codxis-${data}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function status(tipo, mensagem) {
    refs.status.className = 'codxis-status' + (tipo ? ` codxis-status--${tipo}` : ' codxis-status--vazio');
    refs.status.textContent = mensagem || '';
  }

  globalThis.CodXisUI = {
    montar,
    ancorar,
    desancorar,
    atualizar,
    atualizarPresets,
    limparNomePreset,
    mostrar,
    ocultar,
    carregando,
    baixarXls,
    status
  };
})();
