(function () {
  const USERS_KEY = 'moonflow-users';
  const CURRENT_USER_KEY = 'moonflow-current-user';
  const CURRENT_ROLE_KEY = 'moonflow-current-role';
  const PARTNER_PAYLOAD_KEY = 'moonflow-partner-payload';
  const ACCESS_CODES_KEY = 'moonflow-access-codes';

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
    localStorage.removeItem(CURRENT_ROLE_KEY);
    localStorage.removeItem(PARTNER_PAYLOAD_KEY);
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
    localStorage.setItem(CURRENT_ROLE_KEY, 'owner');
    localStorage.removeItem(PARTNER_PAYLOAD_KEY);
    return true;
  }

  function setCurrentRole(role) {
    localStorage.setItem(CURRENT_ROLE_KEY, role || 'owner');
  }

  function getCurrentRole() {
    return localStorage.getItem(CURRENT_ROLE_KEY) || 'owner';
  }

  function clearCurrentRole() {
    localStorage.removeItem(CURRENT_ROLE_KEY);
  }

  function setPartnerPayload(payload) {
    if (!payload) {
      localStorage.removeItem(PARTNER_PAYLOAD_KEY);
      return;
    }
    localStorage.setItem(PARTNER_PAYLOAD_KEY, JSON.stringify(payload));
  }

  function getPartnerPayload() {
    try {
      const raw = localStorage.getItem(PARTNER_PAYLOAD_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function getAccessCodes() {
    try {
      return JSON.parse(localStorage.getItem(ACCESS_CODES_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function saveAccessCodes(codes) {
    localStorage.setItem(ACCESS_CODES_KEY, JSON.stringify(codes));
  }

  function createAccessCode(ownerUsername, payload) {
    const code = `MOONFLOW-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const codes = getAccessCodes();
    codes[code] = {
      owner: ownerUsername || 'owner',
      payload: payload || defaults(),
      createdAt: new Date().toISOString()
    };
    saveAccessCodes(codes);
    return code;
  }

  function getAccessCodePayload(code) {
    const normalized = (code || '').trim();
    if (!normalized) return null;
    const codes = getAccessCodes();
    return codes[normalized] || null;
  }

  function loginAsPartner(accessCode) {
    const access = getAccessCodePayload(accessCode);
    if (!access || !access.payload) return false;

    localStorage.removeItem(CURRENT_USER_KEY);
    setCurrentRole('partner');
    setPartnerPayload(access.payload);
    return true;
  }

  function updateCurrentData(partial) {
    if (getCurrentRole() === 'partner') return false;

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
    if (getCurrentRole() === 'partner') {
      const partnerPayload = getPartnerPayload();
      return partnerPayload || defaults();
    }

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
    getCurrentRole,
    setCurrentRole,
    clearCurrentUser,
    clearCurrentRole,
    createUser,
    loginUser,
    loginAsPartner,
    getProfile,
    getCurrentProfile,
    getCurrentData,
    updateCurrentData,
    ensureProfile,
    getAccessCodePayload,
    createAccessCode,
    setPartnerPayload,
    getPartnerPayload,
    getAccessCodes
  };
})();
