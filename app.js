(function () {
  const Auth = window.MoonFlowAuth;
  const Diary = window.MoonFlowDiary;

  function formatShortDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString + 'T12:00:00');
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'short'
    }).format(date);
  }

  function getState() {
    if (!Auth || !Auth.getCurrentData) return Auth ? Auth.defaults() : null;
    return Auth.getCurrentData();
  }

  function renderHistoryList(data) {
    const list = document.getElementById('history-list');
    if (!list) return;

    const history = Array.isArray(data.history) && data.history.length ? data.history : [{ date: data.lastPeriod, cycleLength: data.cycleLength, note: 'Primo ciclo registrato.' }];
    list.innerHTML = history.map(item => `
      <li>
        <strong>${formatShortDate(item.date)}</strong>
        <div class="history-entry">Durata ciclo: ${item.cycleLength || 28} giorni · ${item.note || 'Nessuna nota'}</div>
      </li>
    `).join('');
  }

  function renderDiaryList(data) {
    const list = document.getElementById('diary-list');
    if (!list) return;

    const entries = Array.isArray(data.diary) && data.diary.length ? data.diary.slice().reverse() : [];
    if (!entries.length) {
      list.innerHTML = '<li><strong>Nessuna nota</strong><div class="entry-copy">Scrivi la tua prima nota del giorno.</div></li>';
      return;
    }

    list.innerHTML = entries.map(entry => `
      <li>
        <div class="entry-top">
          <strong>${new Date(entry.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
          <span class="mood-pill">${(entry.mood || 'tranquilla').toUpperCase()}</span>
        </div>
        <div class="entry-copy">${entry.text || '—'}</div>
      </li>
    `).join('');
  }

  function renderSharedList(data) {
    const list = document.getElementById('shared-list');
    if (!list) return;

    const shared = Array.isArray(data.sharedNotes) ? data.sharedNotes : [];
    if (!shared.length) {
      list.innerHTML = '<li><strong>Nessuna nota condivisa</strong><div class="shared-entry">Importa un codice condiviso oppure salva un set di note.</div></li>';
      return;
    }

    list.innerHTML = shared.map(item => `
      <li>
        <strong>${new Date(item.importedAt || item.source).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
        <div class="shared-entry">Codice importato · ${JSON.stringify(item.payload).slice(0, 110)}...</div>
      </li>
    `).join('');
  }

  function getCycleDay(lastPeriod, cycleLength) {
    if (!lastPeriod) return 0;
    const last = new Date(lastPeriod + 'T12:00:00');
    const today = new Date();
    const diff = Math.floor((today - last) / 86400000);
    return Math.max(diff % cycleLength, 0);
  }

  function getPhaseLabel(cycleDay, cycleLength, periodLength) {
    if (cycleDay >= 0 && cycleDay < periodLength) return 'Mestruazione';
    if (cycleDay >= cycleLength - 7 && cycleDay <= cycleLength) return 'Fertile';
    if (cycleDay >= cycleLength - 3) return 'Picco';
    return 'Equilibrio';
  }

  function getForecast(data) {
    const cycleLength = Number(data.cycleLength) || 28;
    const lastPeriod = data.lastPeriod;
    if (!lastPeriod) return { nextCycleIn: 0, expectedDelay: 0, averageCycle: cycleLength };

    const last = new Date(lastPeriod + 'T12:00:00');
    const next = new Date(last.getTime() + cycleLength * 86400000);
    const today = new Date();
    const nextCycleIn = Math.max(Math.ceil((next - today) / 86400000), 0);
    const currentDay = Math.floor((today - last) / 86400000);
    const expectedDelay = Math.max(currentDay - cycleLength, 0);

    const historyValues = Array.isArray(data.history) ? data.history.map(item => Number(item.cycleLength) || cycleLength) : [];
    const averageCycle = historyValues.length ? Math.round(historyValues.reduce((sum, value) => sum + value, 0) / historyValues.length) : cycleLength;

    return {
      nextCycleIn,
      expectedDelay,
      averageCycle
    };
  }

  function updateDashboard() {
    const data = getState();
    if (!data) return;

    const cycleLength = Number(data.cycleLength) || 28;
    const cycleDay = getCycleDay(data.lastPeriod, cycleLength);
    const phase = getPhaseLabel(cycleDay, cycleLength, Number(data.periodLength) || 5);
    const forecast = getForecast(data);

    const lastPeriodValue = document.getElementById('last-period-value');
    const cycleLengthDisplay = document.getElementById('cycle-length-display');
    const energyDisplay = document.getElementById('energy-display');
    const fertilityDisplay = document.getElementById('fertility-display');
    const phaseBadge = document.querySelector('.phase-badge');
    const ovulationValue = document.getElementById('ovulation-value');
    const ringValue = document.querySelector('.ring-value');

    if (lastPeriodValue) lastPeriodValue.textContent = formatShortDate(data.lastPeriod);
    if (cycleLengthDisplay) cycleLengthDisplay.textContent = `${cycleLength} giorni`;
    if (energyDisplay) energyDisplay.textContent = Number(data.sleepHours) >= 8 ? '5/5' : '4/5';
    if (fertilityDisplay) fertilityDisplay.textContent = `${Math.max(cycleLength - 7, 1)} giorni`;
    if (phaseBadge) phaseBadge.textContent = phase;

    const ovulationDate = new Date(new Date(data.lastPeriod + 'T12:00:00').getTime() + ((cycleLength - 14) * 86400000));
    if (ovulationValue) ovulationValue.textContent = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(ovulationDate);
    if (ringValue) ringValue.textContent = Math.round(Math.min(Math.max(cycleLength - cycleDay, 1), cycleLength));

    const flowValue = document.getElementById('flow-value');
    const flowMeta = document.getElementById('flow-meta');
    const symptomValue = document.getElementById('symptom-value');
    const symptomMeta = document.getElementById('symptom-meta');
    const sleepValue = document.getElementById('sleep-value');
    const sleepMeta = document.getElementById('sleep-meta');
    const wellnessValue = document.getElementById('wellness-value');
    const wellnessMeta = document.getElementById('wellness-meta');

    if (flowValue) flowValue.textContent = data.symptomLevel === 'Leggeri' ? 'Moderato' : data.symptomLevel === 'Moderati' ? 'Intenso' : 'Alto';
    if (flowMeta) flowMeta.textContent = `${Number(data.periodLength) || 5}/5 · ${(Number(data.periodLength) || 5) + 1} giorni previsti`;
    if (symptomValue) symptomValue.textContent = data.symptomLevel;
    if (symptomMeta) symptomMeta.textContent = data.noteText || 'Nessun sintomo registrato';
    if (sleepValue) sleepValue.textContent = `${Number(data.sleepHours) || 8}h`;
    if (sleepMeta) sleepMeta.textContent = 'Qualità del riposo personale';
    if (wellnessValue) wellnessValue.textContent = Number(data.sleepHours) >= 8 ? 'Buona' : 'Media';
    if (wellnessMeta) wellnessMeta.textContent = 'Ritmo regolare e recupero ottimale';

    const averageCycle = document.getElementById('average-cycle');
    const nextCycle = document.getElementById('next-cycle');
    const delayScore = document.getElementById('delay-score');
    const forecastNext = document.getElementById('forecast-next');
    const forecastDelay = document.getElementById('forecast-delay');
    if (averageCycle) averageCycle.textContent = `${forecast.averageCycle}d`;
    if (nextCycle) nextCycle.textContent = forecast.nextCycleIn === 0 ? 'Oggi' : `${forecast.nextCycleIn}d`;
    if (delayScore) delayScore.textContent = `${forecast.expectedDelay}d`;
    if (forecastNext) forecastNext.textContent = forecast.nextCycleIn === 0 ? 'Oggi' : `Tra ${forecast.nextCycleIn} giorni`;
    if (forecastDelay) forecastDelay.textContent = forecast.expectedDelay > 0 ? `Ritardo ${forecast.expectedDelay} giorni` : 'Nessun ritardo';

    renderHistoryList(data);
    renderDiaryList(data);
    renderSharedList(data);
  }

  function populateForm() {
    const data = getState();
    if (!data) return;

    const lastPeriod = document.getElementById('lastPeriod');
    const cycleLength = document.getElementById('cycleLength');
    const periodLength = document.getElementById('periodLength');
    const symptomLevel = document.getElementById('symptomLevel');
    const noteTitle = document.getElementById('noteTitle');
    const noteText = document.getElementById('noteText');
    const reminderText = document.getElementById('reminderText');
    const sleepHours = document.getElementById('sleepHours');

    if (lastPeriod) lastPeriod.value = data.lastPeriod || '';
    if (cycleLength) cycleLength.value = data.cycleLength || 28;
    if (periodLength) periodLength.value = data.periodLength || 5;
    if (symptomLevel) symptomLevel.value = data.symptomLevel || 'Leggeri';
    if (noteTitle) noteTitle.value = data.noteTitle || '';
    if (noteText) noteText.value = data.noteText || '';
    if (reminderText) reminderText.value = data.reminderText || '';
    if (sleepHours) sleepHours.value = data.sleepHours || 8;
  }

  function setAuthRole(role) {
    const roleButtons = document.querySelectorAll('.role-btn');
    const partnerWrap = document.getElementById('partner-code-wrap');
    const submit = document.getElementById('auth-submit');
    const isPartner = role === 'partner';

    roleButtons.forEach((button) => {
      button.classList.toggle('active', (button.dataset.role || 'owner') === role);
    });

    if (partnerWrap) partnerWrap.classList.toggle('hidden', !isPartner);
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const partnerCode = document.getElementById('partner-code');
    if (username) username.required = !isPartner;
    if (password) password.required = !isPartner;
    if (partnerCode) partnerCode.required = isPartner;

    const activeMode = document.querySelector('.tab-btn.active')?.dataset.mode || 'login';
    if (submit) submit.textContent = isPartner ? 'Accedi con codice' : (activeMode === 'register' ? 'Registrati' : 'Accedi');
  }

  function renderAuthState() {
    const role = Auth && Auth.getCurrentRole ? Auth.getCurrentRole() : 'owner';
    const current = Auth && Auth.getCurrentUser ? Auth.getCurrentUser() : null;
    const partnerPayload = Auth && Auth.getPartnerPayload ? Auth.getPartnerPayload() : null;
    const authShell = document.getElementById('auth-shell');
    const appShell = document.getElementById('app-shell');
    const badge = document.getElementById('account-badge');
    const name = document.getElementById('account-name');
    const logoutBtn = document.getElementById('logout-btn');

    if (role === 'partner' && partnerPayload) {
      if (authShell) authShell.classList.add('hidden');
      if (appShell) appShell.classList.remove('hidden');
      if (badge) badge.classList.remove('hidden');
      if (logoutBtn) logoutBtn.classList.remove('hidden');
      if (name) name.textContent = 'Partner';
    } else if (current) {
      if (authShell) authShell.classList.add('hidden');
      if (appShell) appShell.classList.remove('hidden');
      if (badge) badge.classList.remove('hidden');
      if (logoutBtn) logoutBtn.classList.remove('hidden');
      if (name) name.textContent = current;
    } else {
      if (authShell) authShell.classList.remove('hidden');
      if (appShell) appShell.classList.add('hidden');
      if (badge) badge.classList.add('hidden');
      if (logoutBtn) logoutBtn.classList.add('hidden');
      if (name) name.textContent = 'Utente';
    }
  }

  function bindAuth() {
    document.querySelectorAll('.role-btn').forEach((button) => {
      button.addEventListener('click', () => setAuthRole(button.dataset.role || 'owner'));
    });

    document.querySelectorAll('.tab-btn').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.toggle('active', btn === button));
        const mode = button.dataset.mode || 'login';
        const submit = document.getElementById('auth-submit');
        const currentRole = document.querySelector('.role-btn.active')?.dataset.role || 'owner';
        if (submit) submit.textContent = currentRole === 'partner' ? 'Accedi con codice' : (mode === 'register' ? 'Registrati' : 'Accedi');
      });
    });

    document.getElementById('auth-form').addEventListener('submit', function (event) {
      event.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
      const partnerCode = document.getElementById('partner-code').value.trim();
      const role = document.querySelector('.role-btn.active')?.dataset.role || 'owner';
      const mode = document.querySelector('.tab-btn.active')?.dataset.mode || 'login';

      if (role === 'partner') {
        if (!partnerCode) {
          alert('Inserisci il codice generato dal proprietario dell\'account.');
          return;
        }

        const ok = Auth.loginAsPartner(partnerCode);
        if (!ok) {
          alert('Codice non valido o scaduto. Richiedi un nuovo codice al proprietario dell\'account.');
          return;
        }

        document.getElementById('auth-form').reset();
        setAuthRole('partner');
        renderAuthState();
        populateForm();
        updateDashboard();
        return;
      }

      if (!username || !password) {
        alert('Inserisci username e password.');
        return;
      }

      if (mode === 'register') {
        const created = Auth.createUser(username, password);
        if (!created) {
          alert('Questo nome utente esiste già. Prova ad accedere.');
          return;
        }
        Auth.setCurrentUser(username);
        Auth.setCurrentRole('owner');
      } else {
        const ok = Auth.loginUser(username, password);
        if (!ok) {
          alert('Credenziali non valide.');
          return;
        }
      }

      document.getElementById('auth-form').reset();
      renderAuthState();
      if (Auth.ensureProfile()) {
        populateForm();
        updateDashboard();
      }
    });

    document.getElementById('logout-btn').addEventListener('click', function () {
      Auth.clearCurrentUser();
      document.getElementById('partner-code').value = '';
      setAuthRole('owner');
      renderAuthState();
    });
  }

  function bindCycleForm() {
    document.getElementById('cycle-form').addEventListener('submit', function (event) {
      event.preventDefault();
      if (Auth.getCurrentRole && Auth.getCurrentRole() === 'partner') return;

      const form = new FormData(event.currentTarget);
      const update = {
        lastPeriod: form.get('lastPeriod') || Auth.defaults().lastPeriod,
        cycleLength: Number(form.get('cycleLength')) || 28,
        periodLength: Number(form.get('periodLength')) || 5,
        symptomLevel: form.get('symptomLevel') || 'Leggeri',
        noteTitle: form.get('noteTitle') || 'Nota del giorno',
        noteText: form.get('noteText') || '',
        reminderText: form.get('reminderText') || 'Controlla lo stress',
        sleepHours: Number(form.get('sleepHours')) || 8
      };

      Auth.updateCurrentData(update);
      updateDashboard();
    });

    document.getElementById('add-history-btn').addEventListener('click', function () {
      if (Auth.getCurrentRole && Auth.getCurrentRole() === 'partner') return;
      const data = getState();
      Diary.addHistoryEntry(data.noteText || 'Ciclo registrato.', data.cycleLength);
      updateDashboard();
    });
  }

  function bindDiary() {
    document.getElementById('journal-save-btn').addEventListener('click', function () {
      if (Auth.getCurrentRole && Auth.getCurrentRole() === 'partner') return;
      const text = document.getElementById('journal-entry').value.trim();
      const mood = document.getElementById('mood-select').value;
      if (!text) return;
      Diary.addDiaryEntry(text, mood);
      document.getElementById('journal-entry').value = '';
      updateDashboard();
    });
  }

  function bindShare() {
    document.getElementById('share-all-btn').addEventListener('click', function () {
      if (Auth.getCurrentRole && Auth.getCurrentRole() === 'partner') return;
      const code = Diary.shareAll();
      document.getElementById('share-output').value = code;
    });

    document.getElementById('share-selected-btn').addEventListener('click', function () {
      if (Auth.getCurrentRole && Auth.getCurrentRole() === 'partner') return;
      const code = Diary.shareSelected();
      document.getElementById('share-output').value = code;
    });

    document.getElementById('copy-share-btn').addEventListener('click', async function () {
      const text = document.getElementById('share-output').value;
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        document.getElementById('share-output').select();
      }
    });

    document.getElementById('import-share-btn').addEventListener('click', function () {
      if (Auth.getCurrentRole && Auth.getCurrentRole() === 'partner') return;
      const code = document.getElementById('share-import').value.trim();
      if (!code) return;
      const ok = Diary.importSharedCode(code);
      if (ok) {
        renderAuthState();
        updateDashboard();
        document.getElementById('share-import').value = '';
      } else {
        alert('Codice condiviso non valido.');
      }
    });
  }

  function init() {
    bindAuth();
    bindCycleForm();
    bindDiary();
    bindShare();
    setAuthRole('owner');
    renderAuthState();

    if (Auth.getCurrentUser()) {
      Auth.ensureProfile();
      populateForm();
      updateDashboard();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
