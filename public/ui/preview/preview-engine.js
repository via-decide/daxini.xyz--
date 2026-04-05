(function initWorkspacePreview(global) {
  function createPreviewEngine(options) {
    const frame = options && options.frame;
    let activeUrl = '';

    function setSource(url) {
      activeUrl = String(url || '').trim();
      if (!activeUrl || !frame) return;
      frame.src = `${activeUrl}${activeUrl.endsWith('/') ? '' : '/'}?t=${Date.now()}`;
    }

    function reload() {
      if (!activeUrl || !frame) return;
      frame.src = `${activeUrl}${activeUrl.endsWith('/') ? '' : '/'}?t=${Date.now()}`;
    }

    return {
      setSource,
      reload,
    };
  }

  global.ZayvoraPreviewEngine = {
    createPreviewEngine,
  };
})(window);
