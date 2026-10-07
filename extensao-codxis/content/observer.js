(() => {
  const Log = globalThis.CodXisLog;
  let observer = null;
  let debounce = null;

  globalThis.CodXisObserver = {
    start(callback) {
      if (observer || !document.body) return;
      if (typeof callback !== 'function') return;

      observer = new MutationObserver(() => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          try {
            callback();
          } catch (e) {
            Log.error('Erro no callback do observer:', e.message);
          }
        }, 300);
      });

      observer.observe(document.body, { childList: true, subtree: true });
      Log.debug('MutationObserver ativo (debounce 300ms)');
    },

    stop() {
      if (!observer) return;
      clearTimeout(debounce);
      observer.disconnect();
      observer = null;
      Log.debug('MutationObserver desconectado');
    }
  };
})();
