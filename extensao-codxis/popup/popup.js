(() => {
  const status = document.getElementById('codxis-status');
  const debug = document.getElementById('codxis-debug');
  const visivel = document.getElementById('codxis-visivel');
  const DOMINIO_CODXIS = 'https://web.codxis.api.br/';

  function mostrar(texto, ok) {
    status.textContent = texto;
    status.classList.toggle('codxis-popup__status--ok', Boolean(ok));
    status.classList.toggle('codxis-popup__status--off', !ok);
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const aba = tabs[0] || {};
    const url = aba.url || '';

    if (!url.startsWith('http')) {
      mostrar('Abra o sistema CodXis para usar a extensão.', false);
      return;
    }
    if (!url.startsWith(DOMINIO_CODXIS)) {
      mostrar('Esta aba não é o CodXis (web.codxis.api.br).', false);
      return;
    }

    chrome.tabs.sendMessage(aba.id, { tipo: 'codxisStatus' }, (resposta) => {
      if (chrome.runtime.lastError || !resposta) {
        mostrar('Extensão NÃO está rodando nesta página: clique em ⟳ em chrome://extensions e dê F5 no CodXis.', false);
        return;
      }
      if (!resposta.detectado) {
        if (!resposta.dbg) {
          mostrar('Código antigo rodando na página: clique em ↻ na extensão (chrome://extensions) e dê F5 no CodXis.', false);
          return;
        }
        const d = resposta.dbg || {};
        const itens = [
          `painel de Filtros: ${d.painelFiltros ? 'encontrado' : 'AUSENTE'}`,
          `campo Colaborador: ${d.colabordor ? 'ok' : 'AUSENTE'}`,
          `campo Cidade: ${d.cidade ? 'ok' : 'AUSENTE'}`,
          `campo Forma Pagamento: ${d.formaPagamento ? 'ok' : 'AUSENTE'}`
        ];
        mostrar(
          `Extensão rodando, mas nenhum filtro disponível nesta tela. Abra Pedido de Venda → aba CONSULTAR. [${itens.join(' | ')}]`,
          false
        );
        return;
      }
      if (resposta.visivel === false) {
        mostrar('Filtros detectados, mas a extensão está OCULTA. Marque "Mostrar extensão nas páginas do CodXis" abaixo.', false);
        return;
      }
      const partes = [`${resposta.vendedores} vendedor(es)`];
      if (resposta.cidades) partes.push(`${resposta.cidades} cidade(s)`);
      if (resposta.formasPagamento) partes.push(`${resposta.formasPagamento} forma(s) de pagamento`);
      mostrar(
        `Filtros detectados: ${partes.join(', ')}. Botão "Selecionar vários" ao lado de cada campo.`,
        true
      );
    });
  });

  chrome.storage.local.get({ codxisDebug: true, codxisVisivel: true }, (dados) => {
    debug.checked = dados.codxisDebug;
    visivel.checked = dados.codxisVisivel;
  });

  debug.addEventListener('change', () => {
    chrome.storage.local.set({ codxisDebug: debug.checked });
  });

  visivel.addEventListener('change', () => {
    chrome.storage.local.set({ codxisVisivel: visivel.checked });
  });
})();
