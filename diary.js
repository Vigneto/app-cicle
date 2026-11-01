(function () {
  function getAuth() {
    return window.MoonFlowAuth;
  }

  function ensureCurrentUser() {
    const auth = getAuth();
    return auth && auth.ensureProfile();
  }

  function readData() {
    const auth = getAuth();
    if (!auth) return null;
    return auth.getCurrentData();
  }

  function saveData(nextData) {
    const auth = getAuth();
    if (!auth) return false;
    return auth.updateCurrentData(nextData);
  }

  function addDiaryEntry(text, mood) {
    if (!ensureCurrentUser()) return;
    const data = readData();
    const nextEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      mood: mood || 'tranquilla',
      text: text.trim()
    };

    const existing = Array.isArray(data.diary) ? data.diary : [];
    data.diary = [nextEntry, ...existing].slice(0, 12);
    saveData({ diary: data.diary });
  }

  function addHistoryEntry(note, cycleLength) {
    if (!ensureCurrentUser()) return;
    const data = readData();
    const entry = {
      date: data.lastPeriod || new Date().toISOString(),
      cycleLength: Number(cycleLength || data.cycleLength || 28),
      note: note || 'Ciclo registrato dal diario.'
    };

    const current = Array.isArray(data.history) ? data.history : [];
    data.history = [entry, ...current].slice(0, 12);
    saveData({ history: data.history });
  }

  function getSharePayload(type = 'all') {
    if (!ensureCurrentUser()) return '';
    const data = readData();
    const payload = {
      exportedAt: new Date().toISOString(),
      type,
      diary: data.diary || [],
      history: data.history || [],
      noteTitle: data.noteTitle || '',
      noteText: data.noteText || ''
    };
    return JSON.stringify(payload);
  }

  function shareAll() {
    return btoa(encodeURIComponent(getSharePayload('all')));
  }

  function shareSelected() {
    if (!ensureCurrentUser()) return '';
    const data = readData();
    const selected = (data.diary || []).slice(0, 3);
    const payload = {
      exportedAt: new Date().toISOString(),
      type: 'selected',
      diary: selected
    };
    return btoa(encodeURIComponent(JSON.stringify(payload)));
  }

  function importSharedCode(raw) {
    if (!raw || !ensureCurrentUser()) return false;
    try {
      const decoded = JSON.parse(decodeURIComponent(atob(raw)));
      const auth = getAuth();
      const data = auth.getCurrentData();
      const existing = Array.isArray(data.sharedNotes) ? data.sharedNotes : [];
      const next = {
        id: Date.now(),
        source: decoded.exportedAt || new Date().toISOString(),
        payload: decoded,
        importedAt: new Date().toISOString()
      };

      data.sharedNotes = [next, ...existing].slice(0, 10);
      auth.updateCurrentData({ sharedNotes: data.sharedNotes });
      return true;
    } catch {
      return false;
    }
  }

  window.MoonFlowDiary = {
    addDiaryEntry,
    addHistoryEntry,
    getSharePayload,
    shareAll,
    shareSelected,
    importSharedCode,
    readData,
    saveData
  };
})();
