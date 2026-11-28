/* js/auth.js — Autentikasi Admin (Ci Felicia) & Customer */
window.PO_AUTH = (function () {
  const SESSION_KEY = 'po_session_v1';
  const USERS_KEY = 'po_users_v1';

  // Kredensial khusus Admin (Ci Felicia) 
  const ADMIN_ACCOUNT = {
    email: 'admin@liciasbakehouse.com',
    username: 'felicia',
    password: 'licia2026',
    name: 'Ci Felicia',
    role: 'admin'
  };

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  function login(identifier, password) {
    const id = (identifier || '').trim().toLowerCase();
    const pw = (password || '').trim();

    if (!id || !pw) {
      return { ok: false, message: 'Email/username dan password wajib diisi.' };
    }

    // 1. Cek apakah akun Admin (Ci Felicia)
    if (
      (id === ADMIN_ACCOUNT.email.toLowerCase() || id === ADMIN_ACCOUNT.username.toLowerCase()) &&
      pw === ADMIN_ACCOUNT.password
    ) {
      const session = {
        name: ADMIN_ACCOUNT.name,
        email: ADMIN_ACCOUNT.email,
        role: 'admin'
      };
      setSession(session);
      return { ok: true, role: 'admin', redirect: 'admin.html' };
    }

    // 2. Cek akun Customer yang terdaftar
    const users = getUsers();
    const found = users.find(
      (u) => (u.email.toLowerCase() === id || (u.phone && u.phone === id)) && u.password === pw
    );

    if (!found) {
      return { ok: false, message: 'Akun tidak ditemukan atau password salah.' };
    }

    const session = {
      id: found.id,
      name: found.name,
      email: found.email,
      phone: found.phone || '',
      role: 'customer'
    };
    setSession(session);
    return { ok: true, role: 'customer', redirect: 'Customer/customer.html' };
  }

  function signup({ name, email, phone, password }) {
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanName || !cleanEmail || !cleanPass) {
      return { ok: false, message: 'Nama, email, dan password wajib diisi.' };
    }
    if (cleanPass.length < 4) {
      return { ok: false, message: 'Password minimal 4 karakter.' };
    }
    if (cleanEmail === ADMIN_ACCOUNT.email.toLowerCase() || cleanEmail === ADMIN_ACCOUNT.username) {
      return { ok: false, message: 'Email tersebut sudah digunakan oleh sistem.' };
    }

    const users = getUsers();
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { ok: false, message: 'Email sudah terdaftar. Silakan langsung masuk (Login).' };
    }

    const newUser = {
      id: 'usr_' + Date.now(),
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      password: cleanPass,
      role: 'customer',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    setSession({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: 'customer'
    });

    return { ok: true, role: 'customer', redirect: 'Customer/customer.html' };
  }

  function logout(toRoot) {
    localStorage.removeItem(SESSION_KEY);
    // Jika dipanggil dari dalam folder Customer/, naik 1 level ke ../index.html
    const isSubfolder = window.location.pathname.toLowerCase().includes('/customer/');
    window.location.href = toRoot || (isSubfolder ? '../index.html' : 'index.html');
  }

  function guard(requiredRole) {
    const session = getSession();
    const isSubfolder = window.location.pathname.toLowerCase().includes('/customer/');
    const loginPath = isSubfolder ? '../index.html' : 'index.html';

    if (!session) {
      window.location.replace(loginPath);
      return null;
    }

    if (requiredRole && session.role !== requiredRole) {
      if (session.role === 'admin') {
        window.location.replace(isSubfolder ? '../admin.html' : 'admin.html');
      } else {
        window.location.replace(isSubfolder ? 'customer.html' : 'Customer/customer.html');
      }
      return null;
    }

    return session;
  }

  return {
    login,
    signup,
    logout,
    guard,
    getSession,
    ADMIN_ACCOUNT
  };
})();