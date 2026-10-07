(() => {
  const PREFIXO = '[CodXis Extension]';
  const estado = { debug: true };

  const normalizar = (texto) =>
    String(texto || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  globalThis.CodXisLog = {
    setDebug(ativo) {
      estado.debug = Boolean(ativo);
    },
    debug(...args) {
      if (estado.debug) console.log(PREFIXO, ...args);
    },
    info(...args) {
      if (estado.debug) console.log(PREFIXO, ...args);
    },
    warn(...args) {
      console.warn(PREFIXO, ...args);
    },
    error(...args) {
      console.error(PREFIXO, ...args);
    }
  };

  globalThis.CodXisDom = { normalizar };
})();
