(() => {
  const Log = globalThis.CodXisLog;
  const { normalizar } = globalThis.CodXisDom;

  const CHAVE = 'codxisPresets';
  const MAX_NOME = 40;
  const MAX_PRESETS = 60;
  const LIMITE_ITEM = 7000;

  function area() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync ? chrome.storage.sync : null;
  }

  async function listar() {
    const a = area();
    if (!a) return [];
    try {
      const dados = await a.get({ [CHAVE]: [] });
      return Array.isArray(dados[CHAVE]) ? dados[CHAVE] : [];
    } catch (e) {
      Log.error('Falha ao ler presets:', e.message);
      return [];
    }
  }

  async function salvar(nome, valores) {
    const a = area();
    if (!a) throw new Error('Armazenamento sincronizado indisponível.');
    if (!nome || !nome.trim()) throw new Error('Informe um nome para o preset.');
    if (!Array.isArray(valores) || !valores.length) throw new Error('Nenhum vendedor selecionado.');

    const lista = await listar();
    const chave = normalizar(nome);
    const indice = lista.findIndex((p) => normalizar(p.nome) === chave);

    const item = {
      nome: nome.trim().slice(0, MAX_NOME),
      valores: [...new Set(valores)],
      atualizadoEm: Date.now()
    };

    if (indice >= 0) lista[indice] = item;
    else lista.unshift(item);
    if (lista.length > MAX_PRESETS) lista.length = MAX_PRESETS;

    if (JSON.stringify(lista).length > LIMITE_ITEM) {
      throw new Error('Presets excedem o limite de sincronização do Chrome. Remova alguns.');
    }

    await a.set({ [CHAVE]: lista });
    Log.debug('Preset salvo:', item.nome, `(${item.valores.length} vendedores)`);
    return { nome: item.nome, substituido: indice >= 0 };
  }

  async function remover(nome) {
    const a = area();
    if (!a) throw new Error('Armazenamento sincronizado indisponível.');
    const lista = await listar();
    const chave = normalizar(nome);
    const restantes = lista.filter((p) => normalizar(p.nome) !== chave);
    if (restantes.length === lista.length) throw new Error('Preset não encontrado.');
    await a.set({ [CHAVE]: restantes });
    Log.debug('Preset removido:', nome);
  }

  globalThis.CodXisPresets = { CHAVE, listar, salvar, remover };
})();
