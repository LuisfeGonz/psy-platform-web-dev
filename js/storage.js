/**
 * Helpers de sesión (LocalStorage) y utilidades compartidas.
 * - Solo guardar datos mínimos del usuario en sesión (sin contraseña)
 * - Proveer utilidades para consultar rol y autenticación
 */
(function () {
  'use strict';

  const LS_SESSION_USER = 'currentUser';  // almacena solo la sesión del usuario actual
  const LS_APP_KEY = 'appData';           // clave usada por DB para respaldo (solo informativo aquí)

  // Sanitiza el usuario para no guardar datos sensibles
  function sanitizeUser(user) {
    if (!user || typeof user !== 'object') return null;
    const {
      id, username, role, fullName, email, consultorId, createdAt
    } = user;
    return { id, username, role, fullName, email, consultorId, createdAt };
  }

  // Lee sesión actual desde LocalStorage
  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(LS_SESSION_USER);
      if (!raw) return null;
      const user = JSON.parse(raw);
      if (user && typeof user === 'object' && user.id && user.role) return user;
      return null;
    } catch {
      return null;
    }
  }

  // Guarda usuario actual en LocalStorage (sanitizado)
  function setCurrentUser(user) {
    if (!user || !user.id) throw new Error('Usuario inválido para sesión');
    const safeUser = sanitizeUser(user);
    localStorage.setItem(LS_SESSION_USER, JSON.stringify(safeUser));
    return safeUser;
  }

  // Limpia la sesión
  function clearCurrentUser() {
    localStorage.removeItem(LS_SESSION_USER);
  }

  // ¿Hay sesión activa?
  function isAuthenticated() {
    return !!getCurrentUser();
  }

  // Devuelve el rol actual o null
  function getRole() {
    const u = getCurrentUser();
    return u ? u.role : null;
  }

  // Helpers de rol
  function hasRole(roles) {
    const role = getRole();
    if (!role) return false;
    if (Array.isArray(roles)) return roles.includes(role);
    return role === roles;
  }
  function isAdmin() { return hasRole('admin'); }
  function isConsultor() { return hasRole('consultor'); }
  function isConsultante() { return hasRole('consultante'); }

  // Cerrar sesión (helper)
  function logout() {
    clearCurrentUser();
    return true;
  }

  // Exponer API pública
  window.StorageAPI = {
    LS_KEYS: {
      SESSION_USER: LS_SESSION_USER,
      APP_DATA: LS_APP_KEY
    },
    sanitizeUser,
    getCurrentUser,
    setCurrentUser,
    clearCurrentUser,
    isAuthenticated,
    getRole,
    hasRole,
    isAdmin,
    isConsultor,
    isConsultante,
    logout
  };
})();
