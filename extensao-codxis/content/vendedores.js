(() => {
  const Log = globalThis.CodXisLog;
  const { normalizar } = globalThis.CodXisDom;

  const FILTROS_CONHECIDOS = [
    { chave: 'vendedor', id: 'form:tabView:colabordor', rotulo: /vend|colaborador|colabordor/i },
    { chave: 'cidade', id: 'form:tabView:cidade', rotulo: /cidade/i },
    { chave: 'pagamento', id: 'form:tabView:formaPagamento', rotulo: /forma.*pag|formapag|pagamento|pagto/i }
  ];

  const ROTULOS = {
    vendedor: { titulo: 'Selecionar vendedores', unidade: 'vendedor(es)', curto: 'Vendedor' },
    cidade: { titulo: 'Selecionar cidades', unidade: 'cidade(s)', curto: 'Cidade' },
    pagamento: { titulo: 'Selecionar formas de pagamento', unidade: 'forma(s) de pagamento', curto: 'Forma de Pagamento' }
  };

  const REGEX_BOTAO = /pesq|busc|filtr|consult|localiz|procur/i;
  const SELETOR_BOTAO =
    'button, a, input[type="submit"], input[type="button"], input[type="image"], [role="button"], span.ui-button';

  function montar(select, def) {
    const container =
      document.getElementById(def.id) || select.closest('.ui-selectonemenu') || select.parentElement;
    const label = container ? container.querySelector('[id$="_label"]') : null;
    const tipo = typeof select.options !== 'undefined' ? 'select' : 'input';
    return { chave: def.chave, id: def.id, select, container, label, tipo, fonte: null };
  }

  function acharFonte(def) {
    const candidatos = [...document.querySelectorAll('select[id]')].filter(
      (s) => s.id !== def.id + '_input' && def.rotulo.test(s.id) && s.options && s.options.length > 1
    );
    if (!candidatos.length) return null;
    candidatos.sort((a, b) => b.options.length - a.options.length);
    Log.debug(`Filtro ${def.chave} é <input> — lista lida de:`, candidatos[0].id);
    return candidatos[0];
  }

  function detectarFiltros() {
    const achar = (def) => {
      const direto = document.getElementById(def.id + '_input');
      if (!direto) return null;
      if (typeof direto.options !== 'undefined') return direto;

      const wrapper = document.getElementById(def.id);
      if (wrapper && typeof wrapper.querySelectorAll === 'function') {
        const selects = [...wrapper.querySelectorAll('select')].filter(
          (s) => s.id && s.id.startsWith(def.id)
        );
        const melhor = selects.find((s) => s.options && s.options.length > 1) || selects[0];
        if (melhor) return melhor;
      }

      Log.warn(`${def.id}_input é <${direto.tagName.toLowerCase()}> (não <select>) — tratando como input`);
      return direto;
    };

    const achados = [];
    for (const def of FILTROS_CONHECIDOS) {
      const select = achar(def);
      if (!select) continue;
      const filtro = montar(select, def);
      if (filtro.tipo === 'input') filtro.fonte = acharFonte(def);
      achados.push(filtro);
    }
    return achados;
  }

  function lerOpcoes(filtro) {
    if (!filtro) return [];
    const alvo =
      typeof filtro.select.options !== 'undefined' ? filtro.select : filtro.fonte;
    if (!alvo || typeof alvo.options === 'undefined') return [];

    const opcoes = [...alvo.options]
      .filter((o) => o.value && !o.hasAttribute('data-noselection-option'))
      .map((o) => ({ value: o.value, label: o.textContent.replace(/\s+/g, ' ').trim() }))
      .filter((v) => v.value && v.label);

    if (filtro.tipo === 'input') {
      return opcoes.map((o) => ({ value: o.label, label: o.label }));
    }
    return opcoes;
  }

  function lerVendedores(select) {
    if (!select || typeof select.options === 'undefined') return [];
    return [...select.options]
      .filter((o) => o.value && !o.hasAttribute('data-noselection-option'))
      .map((o) => ({ value: o.value, label: o.textContent.replace(/\s+/g, ' ').trim() }))
      .filter((v) => v.value && v.label);
  }

  function definirFiltro(filtro, valor, rotulo) {
    if (!filtro || !filtro.select) return false;
    const alvo = filtro.tipo === 'input' ? rotulo || valor : valor;
    filtro.select.value = alvo;
    const ok = filtro.select.value === alvo;
    if (ok && filtro.label && typeof filtro.label === 'object' && filtro.label.textContent !== undefined) {
      if (filtro.tipo === 'select') {
        const op = filtro.select.options[filtro.select.selectedIndex];
        filtro.label.textContent = op ? op.textContent : '\u00A0';
      } else {
        filtro.label.textContent = alvo;
      }
    }
    return ok;
  }

  function limparFiltrosSistema(filtros) {
    let limpos = 0;
    for (const f of filtros) {
      if (!f.select || f.select.value === '') continue;
      f.select.value = '';
      if (f.label) f.label.textContent = '\u00A0';
      limpos++;
    }
    if (limpos) Log.debug('Campos de filtro do sistema limpos antes da pesquisa:', limpos);
    return limpos;
  }

  async function garantirFiltrosVisiveis(filtro) {
    if (!filtro || !filtro.select) return false;
    if (filtro.select.getClientRects().length) return true;

    const cabecalhos = [...document.querySelectorAll('[id$="_header"]')].filter(
      (h) => h.getClientRects().length && /filtr/i.test(normalizar(h.textContent))
    );
    if (!cabecalhos.length) return false;

    Log.debug('Painel de filtros recolhido — expandindo pelo cabeçalho "Filtros"');
    cabecalhos[0].click();

    const prazo = Date.now() + 3000;
    while (Date.now() < prazo) {
      if (filtro.select.getClientRects().length) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return Boolean(filtro.select.getClientRects().length);
  }

  function textoCandidato(el) {
    const cru = [
      el.textContent || '',
      el.value || '',
      el.getAttribute('title') || '',
      el.getAttribute('aria-label') || '',
      el.getAttribute('alt') || '',
      el.getAttribute('placeholder') || ''
    ].join(' ');
    return normalizar(cru.replace(/[^\p{L}\p{N}\s]+/gu, ' '));
  }

  function encontrarBotaoPesquisa() {
    const escopos = [];
    const painel = document.getElementById('form:tabView');
    const form = document.getElementById('form');
    if (painel) escopos.push(painel);
    if (form && form !== painel) escopos.push(form);

    for (const escopo of escopos) {
      for (const el of escopo.querySelectorAll(SELETOR_BOTAO)) {
        if (!el.getClientRects().length) continue;
        if (!REGEX_BOTAO.test(textoCandidato(el))) continue;
        return el.closest('button, a, input[type="submit"], input[type="button"], input[type="image"]') || el;
      }
    }

    const vistos = new Set();
    const detalhado = [];
    for (const escopo of escopos) {
      for (const b of escopo.querySelectorAll(SELETOR_BOTAO)) {
        if (!b.getClientRects().length || vistos.has(b)) continue;
        vistos.add(b);
        detalhado.push(
          `${b.tagName.toLowerCase()}#${b.id || '(sem id)'} [${(b.getAttribute('title') || textoCandidato(b) || 'sem texto').slice(0, 50)}]`
        );
      }
    }
    Log.warn(
      'Botão Pesquisar não encontrado. Botões visíveis no painel:',
      detalhado.length ? detalhado : ['painel #form:tabView e #form ausentes']
    );
    return null;
  }

  function chaveColuna(th) {
    const id = (th.id || '').toLowerCase();
    const txt = normalizar(th.textContent);
    if (/:vendedor$/.test(id) || /vendedor|colaborador|colabordor/.test(txt)) return 'vendedor';
    if (/:cidade/.test(id) || /cidade/.test(txt)) return 'cidade';
    if (/formapag|forma-?pag/.test(id) || /forma\s*de\s*pag|forma\s*pag|pagamento/.test(txt)) return 'pagamento';
    return null;
  }

  function detectarGrid() {
    for (const th of document.querySelectorAll('.ui-datatable thead th')) {
      const table = th.closest('.ui-datatable');
      if (!table || !table.getClientRects().length) continue;
      if (chaveColuna(th) !== 'vendedor') continue;

      const tbody = table.querySelector('tbody.ui-datatable-data') || table.querySelector('tbody');
      if (!tbody) continue;

      const cols = {};
      const linhaHeader = th.closest('tr');
      if (linhaHeader) {
        [...linhaHeader.children].forEach((c, i) => {
          const k = chaveColuna(c);
          if (k && cols[k] === undefined) cols[k] = i;
        });
      }

      return {
        table,
        tbody,
        cols,
        colIndex: cols.vendedor !== undefined ? cols.vendedor : -1,
        thId: th.id || ''
      };
    }
    return null;
  }

  function extrairVendedor(linha, colIndex, nomesConhecidos) {
    const celula = colIndex >= 0 ? linha.cells[colIndex] : null;
    const texto = celula ? normalizar(celula.textContent) : '';
    if (texto && nomesConhecidos.has(texto)) return nomesConhecidos.get(texto);
    for (const cel of linha.cells) {
      const t = normalizar(cel.textContent);
      if (nomesConhecidos.has(t)) return nomesConhecidos.get(t);
    }
    return null;
  }

  function combinaCelula(celula, selecionados) {
    if (!celula) return true;
    const t = normalizar(celula.textContent);
    if (!t) return false;
    if (selecionados.has(t)) return true;
    for (const s of selecionados) {
      if (s && (t.includes(s) || s.includes(t))) return true;
    }
    return false;
  }

  function chaveLinha(linha) {
    if (!linha || linha.cells.length <= 1) return null;
    const partes = [];
    for (const cel of linha.cells) partes.push(normalizar(cel.textContent));
    return partes.join('|');
  }

  function lerChaves(grid) {
    const chaves = new Set();
    if (!grid || !grid.tbody) return chaves;
    for (const linha of grid.tbody.rows) {
      const k = chaveLinha(linha);
      if (k) chaves.add(k);
    }
    return chaves;
  }

  function aplicarLinhas(grid, selecoes, nomesConhecidos, conjuntos) {
    const res = { total: 0, exibidas: 0, ocultas: 0, desconhecidas: 0, semColuna: [] };
    if (!grid || !grid.tbody) return res;

    const cols = grid.cols || {};
    const temVendedor = Boolean(selecoes.vendedor && selecoes.vendedor.size);
    const temCidade = Boolean(selecoes.cidade && selecoes.cidade.size);
    const temPagamento = Boolean(selecoes.pagamento && selecoes.pagamento.size);

    const porChaveCidade = Boolean(
      conjuntos && conjuntos.cidade != null && cols.cidade === undefined
    );
    const porChavePagamento = Boolean(
      conjuntos && conjuntos.pagamento != null && cols.pagamento === undefined
    );

    if (temCidade && cols.cidade === undefined && !porChaveCidade) {
      res.semColuna.push(ROTULOS.cidade.curto);
    }
    if (temPagamento && cols.pagamento === undefined && !porChavePagamento) {
      res.semColuna.push(ROTULOS.pagamento.curto);
    }

    for (const linha of grid.tbody.rows) {
      if (linha.cells.length <= 1) continue;
      res.total++;

      let passa = true;
      let chave = null;
      const lerChave = () => {
        if (chave === null) chave = chaveLinha(linha) || '';
        return chave;
      };

      if (temVendedor) {
        const nome = extrairVendedor(linha, grid.colIndex, nomesConhecidos);
        if (!nome) {
          res.desconhecidas++;
        } else if (!selecoes.vendedor.has(nome)) {
          passa = false;
        }
      }

      if (passa && temCidade) {
        if (cols.cidade !== undefined) {
          passa = combinaCelula(linha.cells[cols.cidade], selecoes.cidade);
        } else if (porChaveCidade) {
          passa = conjuntos.cidade.has(lerChave());
        }
      }

      if (passa && temPagamento) {
        if (cols.pagamento !== undefined) {
          passa = combinaCelula(linha.cells[cols.pagamento], selecoes.pagamento);
        } else if (porChavePagamento) {
          passa = conjuntos.pagamento.has(lerChave());
        }
      }

      if (passa) {
        if (linha.dataset.codxisOculta) {
          linha.style.display = '';
          delete linha.dataset.codxisOculta;
        }
        res.exibidas++;
      } else {
        linha.style.display = 'none';
        linha.dataset.codxisOculta = '1';
        res.ocultas++;
      }
    }
    return res;
  }

  function limparLinhas(grid) {
    if (!grid || !grid.tbody) return 0;
    let restauradas = 0;
    for (const linha of grid.tbody.rows) {
      if (linha.dataset.codxisOculta) {
        linha.style.display = '';
        delete linha.dataset.codxisOculta;
        restauradas++;
      }
    }
    return restauradas;
  }

  const ROTULOS_COLUNAS = {
    num: 'Número',
    tipo: 'Tipo',
    nomecliente: 'Cliente',
    total: 'Total',
    vendedor: 'Vendedor',
    situacaoatual: 'Situação'
  };

  const PERIODO_IDS = {
    inicial: 'form:tabView:dataInicial_input',
    final: 'form:tabView:dataFinal_input',
    finInicial: 'form:tabView:dataFinalizacaoInicial_input',
    finFinal: 'form:tabView:dataFinalizacaoFinal_input'
  };

  function lerPeriodo() {
    const valor = (id) => {
      const el = document.getElementById(id);
      return el ? (el.value || '').trim() : '';
    };
    return {
      inicial: valor(PERIODO_IDS.inicial),
      final: valor(PERIODO_IDS.final),
      finInicial: valor(PERIODO_IDS.finInicial),
      finFinal: valor(PERIODO_IDS.finFinal)
    };
  }

  function extrairTabela(grid) {
    const dados = { colunas: [], linhas: [] };
    if (!grid || !grid.tbody) return dados;

    const thVendedor = grid.thId ? document.getElementById(grid.thId) : null;
    const linhaHeader = thVendedor
      ? thVendedor.closest('tr')
      : grid.table.querySelector('thead tr:last-child');
    if (!linhaHeader) return dados;

    const manter = [];
    [...linhaHeader.children].forEach((th, i) => {
      const visivel = (th.innerText || '').split('\n')[0].replace(/\s+/g, ' ').trim();
      const cru = (th.textContent || '').replace(/\s+/g, ' ').trim();
      const sufixo = (th.id || '').split(':').pop();
      const titulo =
        visivel || cru || ROTULOS_COLUNAS[sufixo] || (/^j_idt\d+$/i.test(sufixo) ? null : sufixo);
      if (!titulo) return;
      manter.push({ i, titulo });
    });
    dados.colunas = manter.map((c) => c.titulo);

    for (const linha of grid.tbody.rows) {
      if (linha.cells.length <= 1) continue;
      if (linha.dataset.codxisOculta) continue;
      if (linha.style.display === 'none') continue;
      const celulas = manter.map((c) => {
        const cel = linha.cells[c.i];
        if (!cel) return '';
        return (cel.innerText || cel.textContent || '').replace(/\s+/g, ' ').trim();
      });
      if (celulas.every((t) => !t)) continue;
      dados.linhas.push(celulas);
    }
    return dados;
  }

  function aguardarResposta(grid, timeoutMs = 8000) {
    return new Promise((resolve) => {
      let encerrado = false;
      const concluir = (motivo) => {
        if (encerrado) return;
        encerrado = true;
        try {
          observer.disconnect();
        } catch (e) {}
        clearTimeout(timer);
        resolve(motivo);
      };

      const observer = new MutationObserver((muts) => {
        const houveTroca = muts.some((m) => m.addedNodes.length > 0 || m.removedNodes.length > 0);
        if (houveTroca) concluir('atualizado');
      });

      const alvos = [grid.table, grid.table.parentElement].filter(Boolean);
      try {
        alvos.forEach((alvo) => observer.observe(alvo, { childList: true, subtree: true }));
      } catch (e) {
        resolve('sem-observer');
        return;
      }

      const timer = setTimeout(() => concluir('timeout'), timeoutMs);
    });
  }

  function textoDe(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function lerTotais() {
    const definicoes = [
      { valorId: 'form:numeroDocumentos', tituloId: 'form:numeroDocumentosTitulo', padrao: 'Número de Pedidos' },
      { valorId: 'form:totalPedidos', tituloId: 'form:totalPedidosTitulo', padrao: 'Pedidos Finalizados' },
      { valorId: 'form:totalPedidosAberto', tituloId: 'form:totalPedidosAbertoTitulo', padrao: 'Pedidos em Aberto' }
    ];

    const totais = [];
    for (const d of definicoes) {
      const valor = textoDe(d.valorId);
      if (!valor) continue;
      totais.push({ rotulo: textoDe(d.tituloId) || d.padrao, valor });
    }
    return totais;
  }

  globalThis.CodXisVendedores = {
    FILTROS_CONHECIDOS,
    ROTULOS,
    detectarFiltros,
    lerOpcoes,
    lerVendedores,
    definirFiltro,
    limparFiltrosSistema,
    garantirFiltrosVisiveis,
    encontrarBotaoPesquisa,
    detectarGrid,
    chaveLinha,
    lerChaves,
    aplicarLinhas,
    extrairTabela,
    lerPeriodo,
    limparLinhas,
    aguardarResposta,
    lerTotais
  };
})();
