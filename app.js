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

    document.getElementById('last-period-value').textContent = formatShortDate(data.lastPeriod);
    document.getElementById('cycle-length-display').textContent = `${cycleLength} giorni`;
    document.getElementById('energy-display').textContent = Number(data.sleepHours) >= 8 ? '5/5' : '4/5';
    document.getElementById('fertility-display').textContent = `${Math.max(cycleLength - 7, 1)} giorni`;
    document.querySelector('.phase-badge').textContent = phase;

    const ovulationDate = new Date(new Date(data.lastPeriod + 'T12:00:00').getTime() + ((cycleLength - 14) * 86400000));
    document.getElementById('ovulation-value').textContent = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(ovulationDate);
    document.querySelector('.ring-value').textContent = Math.round(Math.min(Math.max(cycleLength - cycleDay, 1), cycleLength));

    document.getElementById('flow-value').textContent = data.symptomLevel === 'Leggeri' ? 'Moderato' : data.symptomLevel === 'Moderati' ? 'Intenso' : 'Alto';
    document.getElementById('flow-meta').textContent = `${Number(data.periodLength) || 5}/5 · ${(Number(data.periodLength) || 5) + 1} giorni previsti`;
    document.getElementById('symptom-value').textContent = data.symptomLevel;
    document.getElementById('symptom-meta').textContent = data.noteText || 'Nessun sintomo registrato';
    document.getElementById('sleep-value').textContent = `${Number(data.sleepHours) || 8}h`;
    document.getElementById('sleep-meta').textContent = 'Qualità del riposo personale';
    document.getElementById('wellness-value').textContent = Number(data.sleepHours) >= 8 ? 'Buona' : 'Media';
    document.getElementById('wellness-meta').textContent = 'Ritmo regolare e recupero ottimale';

    document.getElementById('average-cycle').textContent = `${forecast.averageCycle}d`;
    document.getElementById('next-cycle').textContent = forecast.nextCycleIn === 0 ? 'Oggi' : `${forecast.nextCycleIn}d`;
    document.getElementById('delay-score').textContent = `${forecast.expectedDelay}d`;
    document.getElementById('forecast-next').textContent = forecast.nextCycleIn === 0 ? 'Oggi' : `Tra ${forecast.nextCycleIn} giorni`;
    document.getElementById('forecast-delay').textContent = forecast.expectedDelay > 0 ? `Ritardo ${forecast.expectedDelay} giorni` : 'Nessun ritardo';

    renderHistoryList(data);
    renderDiaryList(data);
    renderSharedList(data);

    const notesList = document.getElementById('notes-list');
    if (notesList) {
      notesList.innerHTML = `
        <li>
          <span class="note-time">Oggi</span>
          <strong>${(data.noteTitle || 'Nota del giorno').trim()}</strong>
          <small>${(data.noteText || 'Nessun dettaglio aggiunto').trim()}</small>
        </li>
      `;
    }

    const reminderList = document.getElementById('reminder-list');
    if (reminderList) {
      reminderList.innerHTML = `
        <li>
          <span class="reminder-dot"></span>
          <div>
            <strong>${data.reminderText || 'Promemoria personale'}</strong>
            <small>Ricorda di controllare il tuo benessere oggi.</small>
          </div>
        </li>
      `;
    }
  }

  function populateForm() {
    const data = getState();
    if (!data) return;

    document.getElementById('lastPeriod').value = data.lastPeriod || '';
    document.getElementById('cycleLength').value = data.cycleLength || 28;
    document.getElementById('periodLength').value = data.periodLength || 5;
    document.getElementById('symptomLevel').value = data.symptomLevel || 'Leggeri';
    document.getElementById('noteTitle').value = data.noteTitle || '';
    document.getElementById('noteText').value = data.noteText || '';
    document.getElementById('reminderText').value = data.reminderText || '';
    document.getElementById('sleepHours').value = data.sleepHours || 8;
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
      authShell.classList.add('hidden');
      appShell.classList.remove('hidden');
      badge.classList.remove('hidden');
      logoutBtn.classList.remove('hidden');
      name.textContent = 'Partner';
    } else if (current) {
      authShell.classList.add('hidden');
      appShell.classList.remove('hidden');
      badge.classList.remove('hidden');
      logoutBtn.classList.remove('hidden');
      name.textContent = current;
    } else {
      authShell.classList.remove('hidden');
      appShell.classList.add('hidden');
      badge.classList.add('hidden');
      logoutBtn.classList.add('hidden');
      name.textContent = 'Utente';
    }
  }

  function setAuthRole(role) {
    const roleButtons = document.querySelectorAll('.role-btn');
    const partnerWrap = document.getElementById('partner-code-wrap');
    const submit = document.getElementById('auth-submit');
    const tabs = document.querySelectorAll('.tab-btn');

    roleButtons.forEach((button) => button.classList.toggle('active', (button.dataset.role || 'owner') === role));
    const isPartner = role === 'partner';
    partnerWrap.classList.toggle('hidden', !isPartner);
    document.getElementById('username').required = !isPartner;
    document.getElementById('password').required = !isPartner;

    if (isPartner) {
      tabs.forEach((tab) => {
        if (tab.dataset.mode === 'register') tab.classList.remove('active');
        if (tab.dataset.mode === 'login') tab.classList.add('active');
      });
      submit.textContent = 'Accedi con codice';
      document.getElementById('partner-code').focus();
    } else {
      submit.textContent = document.querySelector('.tab-btn.active')?.dataset.mode === 'register' ? 'Registrati' : 'Accedi';
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
        submit.textContent = currentRole === 'partner' ? 'Accedi con codice' : (mode === 'register' ? 'Registrati' : 'Accedi');
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
