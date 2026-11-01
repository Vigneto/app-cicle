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
    if (getAuth() && getAuth().getCurrentRole && getAuth().getCurrentRole() === 'partner') return;
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
    if (getAuth() && getAuth().getCurrentRole && getAuth().getCurrentRole() === 'partner') return;
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
      noteText: data.noteText || '',
      lastPeriod: data.lastPeriod || '',
      cycleLength: data.cycleLength || 28,
      periodLength: data.periodLength || 5,
      sleepHours: data.sleepHours || 8,
      symptomLevel: data.symptomLevel || 'Leggeri'
    };
    return JSON.stringify(payload);
  }

  function shareAll() {
    const auth = getAuth();
    const payload = getSharePayload('all');
    if (!payload) return '';

    if (auth && auth.getCurrentUser && auth.getCurrentUser() && auth.createAccessCode) {
      return auth.createAccessCode(auth.getCurrentUser(), JSON.parse(payload));
    }

    return btoa(encodeURIComponent(payload));
  }

  function shareSelected() {
    const auth = getAuth();
    if (!ensureCurrentUser()) return '';

    const data = readData();
    const selected = (data.diary || []).slice(0, 3);
    const payload = {
      exportedAt: new Date().toISOString(),
      type: 'selected',
      diary: selected,
      lastPeriod: data.lastPeriod || '',
      cycleLength: data.cycleLength || 28,
      periodLength: data.periodLength || 5,
      inReadOnlyMode: true
    };

    if (auth && auth.getCurrentUser && auth.getCurrentUser() && auth.createAccessCode) {
      return auth.createAccessCode(auth.getCurrentUser(), payload);
    }

    return btoa(encodeURIComponent(JSON.stringify(payload)));
  }

  function importSharedCode(raw) {
    if (!raw) return false;

    const auth = getAuth();
    if (!auth) return false;

    const access = auth.getAccessCodePayload ? auth.getAccessCodePayload(raw) : null;
    if (access && access.payload) {
      auth.setCurrentRole('partner');
      auth.setPartnerPayload(access.payload);
      return true;
    }

    try {
      const decoded = JSON.parse(decodeURIComponent(atob(raw)));
      auth.setCurrentRole('partner');
      auth.setPartnerPayload(decoded);
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
