
(function () {
  'use strict';

  const SEL = {
    loginForm: 'loginForm',
    loginMsg: 'loginMsg',
    logoutBtn: 'logoutBtn',
    currentUserInfo: 'currentUserInfo'
  };

  function $(id) {
    return document.getElementById(id);
  }

  function showMessage(el, text, type = 'info') {
    if (!el) return;
    el.textContent = text || '';
    el.className = 'form-msg ' + (type === 'error' ? 'error' : type === 'success' ? 'success' : '');
    if (text) {
      // quitar mensaje después de 4 segundos
      setTimeout(() => {
        if (el.textContent === text) {
          el.textContent = '';
          el.className = 'form-msg';
        }
      }, 4000);
    }
  }

  async function login(username, password) {
    const msgEl = $(SEL.loginMsg);
    try {
      if (!window.DB || !window.DB_API) {
        await window.DB_API.initDB();
      }
      const uname = String(username || '').trim();
      const pword = String(password || '').trim();
      if (!uname || !pword) {
        showMessage(msgEl, 'Ingrese usuario y contraseña', 'error');
        return false;
      }

      // Buscar usuario (validación directa; en producción, nunca guardar contraseñas en texto plano)
      const users = window.DB_API.getAll('users');
      const found = users.find(u => u.username === uname && u.password === pword);
      if (!found) {

        showMessage(msgEl, 'Credenciales inválidas', 'error');
        return false;
      }

      // Guardar sesión (sanitizada)
      const sessionUser = window.StorageAPI.setCurrentUser(found);


      // Actualizar área de usuario inmediatamente si existe
      const infoEl = $(SEL.currentUserInfo);
      if (infoEl) {
        infoEl.textContent = sessionUser.fullName ? `${sessionUser.fullName} (${sessionUser.role})` : `${sessionUser.username} (${sessionUser.role})`;
      }
      const logoutBtn = $(SEL.logoutBtn);
      if (logoutBtn) logoutBtn.style.display = 'inline-flex';

      showMessage(msgEl, 'Ingreso exitoso', 'success');

      // Emitir evento global para que app.js re-renderice UI
      window.dispatchEvent(new CustomEvent('auth:login', { detail: sessionUser }));
      return true;
    } catch (e) {

      showMessage(msgEl, 'Error inesperado al iniciar sesión', 'error');
      return false;
    }
  }

  function logout() {
    try {
      window.StorageAPI.logout();

      const infoEl = $(SEL.currentUserInfo);
      if (infoEl) infoEl.textContent = '';
      const logoutBtn = $(SEL.logoutBtn);
      if (logoutBtn) logoutBtn.style.display = 'none';

      window.dispatchEvent(new CustomEvent('auth:logout', { detail: true }));
      return true;
    } catch (e) {

      return false;
    }
  }

  function isAuthenticated() {
    return window.StorageAPI.isAuthenticated();
  }

  function getCurrentUser() {
    return window.StorageAPI.getCurrentUser();
  }

  function bindLoginForm() {
    const form = $(SEL.loginForm);
    if (!form) return;
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const fd = new FormData(form);
      const username = fd.get('username');
      const password = fd.get('password');
      await login(username, password);
    });
  }

  function bindLogoutBtn() {
    const btn = $(SEL.logoutBtn);
    if (!btn) return;
    btn.addEventListener('click', () => {
      logout();
    });
  }

  function initAuthBindings() {
    bindLoginForm();
    bindLogoutBtn();
    // Restaurar sesión si existe
    const u = getCurrentUser();
    if (u) {
      const infoEl = $(SEL.currentUserInfo);
      if (infoEl) {
        infoEl.textContent = u.fullName ? `${u.fullName} (${u.role})` : `${u.username} (${u.role})`;
      }
      const logoutBtn = $(SEL.logoutBtn);
      if (logoutBtn) logoutBtn.style.display = 'inline-flex';
      // No lanzar evento aquí; app.js decidirá flujo al cargar
    }
  }

  // Exponer API
  window.AuthAPI = {
    initAuthBindings,
    login,
    logout,
    isAuthenticated,
    getCurrentUser
  };
})();
