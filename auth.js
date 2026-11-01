(function () {
  const USERS_KEY = 'moonflow-users';
  const CURRENT_USER_KEY = 'moonflow-current-user';

  function defaults() {
    return {
      lastPeriod: '2026-10-25',
      cycleLength: 28,
      periodLength: 5,
      symptomLevel: 'Leggeri',
      noteTitle: 'Energia alta',
      noteText: 'Ho completato la sessione cardio senza affaticamento eccessivo.',
      reminderText: 'Controlla lo stress',
      sleepHours: 8,
      diary: [
        {
          id: Date.now(),
          date: new Date().toISOString(),
          mood: 'tranquilla',
          text: 'Oggi mi sento più tranquilla, ho dormito bene e ho più energia.'
        }
      ],
      history: [
        {
          date: '2026-09-20',
          cycleLength: 28,
          note: 'Ciclo regolare, sintomi molto lievi.'
        }
      ],
      sharedNotes: []
    };
  }

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getCurrentUser() {
    return localStorage.getItem(CURRENT_USER_KEY) || null;
  }

  function setCurrentUser(username) {
    localStorage.setItem(CURRENT_USER_KEY, username);
  }

  function clearCurrentUser() {
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  function getProfile(username) {
    const users = getUsers();
    if (!users[username]) return null;
    return users[username];
  }

  function getCurrentProfile() {
    const current = getCurrentUser();
    if (!current) return null;
    return getProfile(current);
  }

  function createUser(username, password) {
    const users = getUsers();
    if (!username || !password || users[username]) return false;

    users[username] = { password, data: defaults() };
    saveUsers(users);
    return true;
  }

  function loginUser(username, password) {
    const users = getUsers();
    const user = users[username];
    if (!user || user.password !== password) return false;
    setCurrentUser(username);
    return true;
  }

  function updateCurrentData(partial) {
    const current = getCurrentUser();
    const users = getUsers();
    if (!current || !users[current]) return false;

    users[current].data = {
      ...users[current].data,
      ...partial
    };

    saveUsers(users);
    return true;
  }

  function getCurrentData() {
    const profile = getCurrentProfile();
    return profile ? profile.data : defaults();
  }

  function ensureProfile() {
    const current = getCurrentUser();
    const users = getUsers();
    if (!current || !users[current]) return false;
    if (!users[current].data) {
      users[current].data = defaults();
      saveUsers(users);
    }
    return true;
  }

  window.MoonFlowAuth = {
    defaults,
    getUsers,
    saveUsers,
    getCurrentUser,
    setCurrentUser,
    clearCurrentUser,
    createUser,
    loginUser,
    getCurrentProfile,
    getCurrentData,
    updateCurrentData,
    ensureProfile,
    getProfile
  };
})();
