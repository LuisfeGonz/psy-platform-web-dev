(function () {
  'use strict';

  // ---------------------------
  // Helpers DOM y visibilidad
  // ---------------------------
  const $ = (id) => document.getElementById(id);
  const q = (sel) => document.querySelector(sel);
  const qa = (sel) => Array.from(document.querySelectorAll(sel));

  // ---------------------------
  // Tema claro/oscuro
  // ---------------------------
  const THEME_KEY = 'ui.theme'; // 'light' | 'dark'
  function getSavedTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch { return null; }
  }
  function updateThemeToggleUI() {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
      btn.textContent = '🌙';
      btn.title = 'Cambiar a modo oscuro';
      btn.setAttribute('aria-label', 'Cambiar a modo oscuro');
    } else {
      btn.textContent = '☀️';
      btn.title = 'Cambiar a modo claro';
      btn.setAttribute('aria-label', 'Cambiar a modo claro');
    }
  }
  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme'); // dark por defecto
    updateThemeToggleUI();
  }
  function initTheme() {
    const saved = getSavedTheme();
    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved);
    } else {
      const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      applyTheme(prefersLight ? 'light' : 'dark');
    }
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
      btn.addEventListener('click', () => {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const next = isLight ? 'dark' : 'light';
        applyTheme(next);
        try { localStorage.setItem(THEME_KEY, next); } catch {}
      });
    }
    const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)');
    if (mql) {
      const handler = (e) => {
        const savedPref = getSavedTheme();
        if (savedPref) return; // respetar preferencia del usuario
        applyTheme(e.matches ? 'light' : 'dark');
      };
      if (mql.addEventListener) mql.addEventListener('change', handler);
      else if (mql.addListener) mql.addListener(handler);
    }
  }

  const SECTIONS = {
    login: 'loginSection',
    dashboard: 'dashboardSection',
    adminUsers: 'adminUsersSection',
    adminSettings: 'adminSettingsSection',
    consultorCreateTest: 'consultorCreateTestSection',
    consultorAssign: 'consultorAssignSection',
    consultorResults: 'consultorResultsSection',
    consultorClients: 'consultorClientsSection',
    consultanteAssigned: 'consultanteAssignedSection',
    takeTest: 'takeTestSection',
    consultanteMyResults: 'consultanteMyResultsSection',
    contact: 'contactSection'
  };

  function showSection(sectionId) {
    // proteger rutas
    if (!StorageAPI.isAuthenticated() && sectionId !== SECTIONS.login) {
      sectionId = SECTIONS.login;
    }
    // protección por rol
    if (StorageAPI.isAuthenticated()) {
      const role = StorageAPI.getRole();
      const allowedByRole = {
        admin: [SECTIONS.dashboard, SECTIONS.adminUsers, SECTIONS.adminSettings, SECTIONS.consultorCreateTest, SECTIONS.consultorAssign, SECTIONS.consultorResults, SECTIONS.contact],
        consultor: [SECTIONS.dashboard, SECTIONS.consultorCreateTest, SECTIONS.consultorClients, SECTIONS.consultorAssign, SECTIONS.consultorResults, SECTIONS.contact],
        consultante: [SECTIONS.dashboard, SECTIONS.consultanteAssigned, SECTIONS.takeTest, SECTIONS.consultanteMyResults, SECTIONS.contact]
      };
      const allowed = allowedByRole[role] || [SECTIONS.login];
      if (!allowed.includes(sectionId)) {
        sectionId =
          role === 'admin' ? SECTIONS.dashboard :
          role === 'consultor' ? SECTIONS.consultorCreateTest :
          role === 'consultante' ? SECTIONS.consultanteAssigned :
          SECTIONS.login;
      }
    }
    qa('main > section').forEach(sec => sec.classList.add('hidden'));
    const target = $((sectionId));
    if (target) target.classList.remove('hidden');
    // Center login section on screen
    const main = $('mainContent');
    const app = q('.app-container');
    if (main) {
      if (sectionId === SECTIONS.login) main.classList.add('login-centered');
      else main.classList.remove('login-centered');
    }
    if (app) {
      if (sectionId === SECTIONS.login) app.classList.add('login-mode');
      else app.classList.remove('login-mode');
    }

    // actualizar activo en menú
    const menuList = $('menuList');
    if (menuList) {
      qa('#menuList li a').forEach(a => {
        const to = a.getAttribute('data-section');
        if (to === sectionId) a.classList.add('active');
        else a.classList.remove('active');
      });
    }

    // cerrar panel lateral en móvil si estaba abierto
    if (document.body.classList.contains('mobile-menu-open')) {
      document.body.classList.remove('mobile-menu-open');
      const sidebarEl = $('sidebar');
      if (sidebarEl) sidebarEl.classList.remove('open');
      const hb = $('hamburgerBtn');
      if (hb) hb.setAttribute('aria-expanded', 'false');
    }

    // acciones de entrada
    switch (sectionId) {
      case SECTIONS.dashboard:
        renderDashboard();
        break;
      case SECTIONS.adminUsers:
        renderUsersTable();
        fillConsultorSelectForNewUser();
        break;
      case SECTIONS.consultorCreateTest:
        renderMyTestsTable();
        break;
      case SECTIONS.consultorAssign:
        hydrateAssignSelectors();
        renderAssignmentsTable();
        break;
      case SECTIONS.consultorResults:
        hydrateResultsFilter();
        renderConsultorResults();
        break;
      case SECTIONS.consultorClients:
        renderConsultorClients();
        break;
      case SECTIONS.consultanteAssigned:
        renderAssignedToMe();
        break;
      case SECTIONS.consultanteMyResults:
        renderMyResults();
        break;
      default:
        break;
    }
  }





  function toggleHamburger() {
    const btn = $('hamburgerBtn');
    const sidebar = $('sidebar');
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    if (btn) {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
    }

    if (isMobile) {
      // Off-canvas en móvil (asegurar que el sidebar esté visible)
      if (sidebar) {
        sidebar.classList.remove('hidden');
        sidebar.classList.toggle('open');
      }
      document.body.classList.toggle('mobile-menu-open');
    } else {
      // Colapsar/expandir en desktop (asegurar visibilidad del sidebar)
      if (sidebar) sidebar.classList.remove('hidden');
      document.body.classList.toggle('sidebar-collapsed');
    }

  }



  // Actualiza solo accesibilidad y estado visual; mantener 3 líneas/X sin insertar texto
  function updateCollapseButtonLabel() {
    const btn = $('hamburgerBtn');
    if (!btn) return;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    // Asegurar que el botón tenga las tres líneas (por si se perdió su contenido)
    if (!btn.querySelector('span')) {
      btn.innerHTML = '<span></span><span></span><span></span>';
    }

    if (isMobile) {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-label', expanded ? 'Cerrar menú' : 'Abrir menú');
      btn.classList.toggle('is-open', expanded);
      return;
    }

    const collapsed = document.body.classList.contains('sidebar-collapsed');
    btn.setAttribute('aria-label', collapsed ? 'Abrir menú' : 'Colapsar menú');
    btn.classList.toggle('is-open', !collapsed);
  }

  // ---------------------------
  // Menú dinámico por rol
  // ---------------------------
  function getMenuIcon(section) {
    switch (section) {
      case SECTIONS.dashboard:
        return '<span class="menu-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8v8H3v-8zm10 0h8v8h-8v-8zM3 3h8v8H3V3zm10 0h8v8h-8V3z"/></svg></span>';
      case SECTIONS.adminUsers:
      case SECTIONS.consultorClients:
        return '<span class="menu-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 3-1.34 3-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.67 0-8 1.34-8 4v2h10v-2c0-1.5.83-2.79 2.09-3.6C11.64 13.49 9.85 13 8 13zm8 0c-.35 0-.69.02-1.02.05 1.67.89 3.02 2.35 3.02 4.45v2h6v-2c0-2.66-5.33-4-8-4z"/></svg></span>';
      case SECTIONS.adminSettings:
        return '<span class="menu-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.65l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.027 7.027 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 12.86 2h-3.72a.5.5 0 0 0-.49.41l-.36 2.54c-.58.23-1.12.53-1.63.94l-2.39-.96a.5.5 0 0 0-.61.22L.94 8.97a.5.5 0 0 0 .12.65l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L1.06 14.66a.5.5 0 0 0-.12.65l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.51.41 1.06.74 1.63.94l.36 2.54a.5.5 0 0 0 .49.41h3.72a.5.5 0 0 0 .49-.41l.36-2.54c.58-.23 1.12-.53 1.63-.94l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.65l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/></svg></span>';
      case SECTIONS.consultorCreateTest:
        return '<span class="menu-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 21H5a2 2 0 0 1-2-2V5c0-1.11.89-2 2-2h10l4 4v12a2 2 0 0 1-2 2h-4v-2h4V8h-3V5H5v14h4v2zm0-6h8v2H9v-2zm0-4h8v2H9V11zm0-4h8v2H9V7z"/></svg></span>';
      case SECTIONS.consultorAssign:
        return '<span class="menu-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .89-2 2v14a2 2 0 0 0 2 2h14c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg></span>';
      case SECTIONS.consultorResults:
      case SECTIONS.consultanteMyResults:
        return '<span class="menu-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h2v18H3V3zm4 8h2v10H7V11zm4-4h2v14h-2V7zm4 6h2v8h-2v-8zm4-10h2v18h-2V3z"/></svg></span>';
      case SECTIONS.consultanteAssigned:
        return '<span class="menu-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 11H4v2h5v-2zm0-4H4v2h5V7zm0 8H4v2h5v-2zm11-9l-9 9-3-3 1.41-1.41L11 12.17l7.59-7.59L20 6z"/></svg></span>';
      case SECTIONS.contact:
        return '<span class="menu-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg></span>';
      default:
        return '<span class="menu-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg></span>';
    }
  }
  function buildMenu() {
    const list = $('menuList');
    if (!list) return;
    list.innerHTML = '';
    if (!StorageAPI.isAuthenticated()) return;

    const u = StorageAPI.getCurrentUser();
    const items = [];

    // Siempre dashboard
    items.push({ label: 'Dashboard', section: SECTIONS.dashboard });

    if (StorageAPI.isAdmin()) {
      // Admin: Dashboard, Gestión de Usuarios, Gestión de Pruebas, Asignaciones, Resultados, Configuración
      items.push(
        { label: 'Gestión de Usuarios', section: SECTIONS.adminUsers },
        { label: 'Gestión de Pruebas', section: SECTIONS.consultorCreateTest },
        { label: 'Asignaciones', section: SECTIONS.consultorAssign },
        { label: 'Resultados', section: SECTIONS.consultorResults },
        { label: 'Configuración', section: SECTIONS.adminSettings }
      );
    } else if (StorageAPI.isConsultor()) {
      // Consultor: Dashboard, Crear Prueba, Mis Consultantes, Asignar Pruebas, Resultados
      items.push(
        { label: 'Crear Prueba', section: SECTIONS.consultorCreateTest },
        { label: 'Mis Consultantes', section: SECTIONS.consultorClients },
        { label: 'Asignar Pruebas', section: SECTIONS.consultorAssign },
        { label: 'Resultados', section: SECTIONS.consultorResults }
      );
    } else if (StorageAPI.isConsultante()) {
      // Consultante: Dashboard, Pruebas Asignadas, Mis Resultados
      items.push(
        { label: 'Pruebas Asignadas', section: SECTIONS.consultanteAssigned },
        { label: 'Mis Resultados', section: SECTIONS.consultanteMyResults }
      );
    }

    // Contacto para todos los roles
    items.push({ label: 'Contacto', section: SECTIONS.contact });

    items.forEach(item => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.innerHTML = `${getMenuIcon(item.section)}<span>${escapeHtml(item.label)}</span>`;
      a.setAttribute('data-section', item.section);
      a.addEventListener('click', (e) => {
        e.preventDefault();
        showSection(item.section);
      });
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  // ---------------------------
  // Dashboard
  // ---------------------------
  function renderDashboard() {
    const u = StorageAPI.getCurrentUser();
    if (!u) return;

    const setText = (id, text) => { const el = $(id); if (el) el.textContent = String(text); };

    // Título
    const subtitle = $('dashboardSubtitle');
    if (subtitle) {
      const roleLabel = u.role.charAt(0).toUpperCase() + u.role.slice(1);
      subtitle.textContent = `Bienvenido, ${u.fullName || u.username} (${roleLabel})`;
    }

    // Métricas
    const tests = DB_API.getAll('tests');
    const assignments = DB_API.getAll('assignments');
    const results = DB_API.getAll('results');

    let testsCount = 0, assignCount = 0, resultsCount = 0;
    if (StorageAPI.isAdmin()) {
      testsCount = tests.length;
      assignCount = assignments.length;
      resultsCount = results.length;
    } else if (StorageAPI.isConsultor()) {
      testsCount = tests.filter(t => t.createdBy === u.id).length;
      assignCount = assignments.filter(a => a.consultorId === u.id).length;
      resultsCount = results.filter(r => {
        // r.assignmentId pertenece a una asignación con consultorId == u.id
        const asg = assignments.find(a => a.id === r.assignmentId);
        return asg && asg.consultorId === u.id;
      }).length;
    } else if (StorageAPI.isConsultante()) {
      testsCount = tests.length; // Info general
      assignCount = assignments.filter(a => a.consultantId === u.id).length;
      resultsCount = results.filter(r => r.consultantId === u.id).length;
    }

    setText('dashTestsCount', testsCount);
    setText('dashAssignmentsCount', assignCount);
    setText('dashResultsCount', resultsCount);
  }

  // ---------------------------
  // Admin - Gestión de Usuarios
  // ---------------------------
  function renderUsersTable() {
    const tbody = $('usersTableBody');
    if (!tbody) return;
    const users = DB_API.getAll('users');
    const consultores = users.filter(u => u.role === 'consultor');
    const getUserName = (id) => {
      const u = users.find(x => x.id === id);
      return u ? (u.fullName || u.username) : '-';
    };
    tbody.innerHTML = '';
    users.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.username}</td>
        <td>${escapeHtml(u.fullName || '')}</td>
        <td>${u.role}</td>
        <td>${escapeHtml(u.email || '')}</td>
        <td>${u.consultorId ? escapeHtml(getUserName(u.consultorId)) : '-'}</td>
        <td>
          <button class="btn btn-ghost btn-small" data-action="del" data-id="${u.id}">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Bind eliminar
    tbody.querySelectorAll('button[data-action="del"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (!id) return;
        if (!confirm('¿Eliminar usuario?')) return;
        const ok = DB_API.remove('users', id);
        if (ok) {
          renderUsersTable();
        }
      });
    });

    // Mostrar / ocultar fila de consultor asignado según rol seleccionado en el form
    const roleSel = $('userRole');
    const row = $('consultorOfRow');
    if (roleSel && row) {
      roleSel.addEventListener('change', () => {
        row.style.display = roleSel.value === 'consultante' ? '' : 'none';
      });
    }
  }

  function fillConsultorSelectForNewUser() {
    const sel = $('userConsultorOf');
    if (!sel) return;
    const consultores = DB_API.find('users', u => u.role === 'consultor');
    sel.innerHTML = '';
    consultores.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.fullName || c.username;
      sel.appendChild(opt);
    });
  }

  function bindCreateUserForm() {
    const form = $('createUserForm');
    const msgEl = $('createUserMsg');
    const roleSel = $('userRole');
    const consultorRow = $('consultorOfRow');
    if (!form) return;

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fd = new FormData(form);
      const username = String(fd.get('username') || '').trim();
      const password = String(fd.get('password') || '').trim();
      const fullName = String(fd.get('fullName') || '').trim();
      const email = String(fd.get('email') || '').trim();
      const role = String(fd.get('role') || '').trim();
      const consultorId = String(fd.get('consultorId') || '').trim();

      if (!username || !password || !fullName || !email || !role) {
        setFormMsg(msgEl, 'Complete los campos obligatorios', 'error');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFormMsg(msgEl, 'Email inválido', 'error');
        return;
      }
      if (role === 'consultante' && !consultorId) {
        setFormMsg(msgEl, 'Seleccione el consultor asignado', 'error');
        return;
      }
      // username único
      const users = DB_API.getAll('users');
      if (users.some(u => u.username === username)) {
        setFormMsg(msgEl, 'El usuario ya existe', 'error');
        return;
      }

      const data = {
        username, password, role, fullName, email
      };
      if (role === 'consultante') data.consultorId = consultorId;

      const created = DB_API.create('users', data);
      setFormMsg(msgEl, `Usuario creado con ID: ${created.id}`, 'success');
      form.reset();
      if (roleSel) roleSel.value = 'admin';
      if (consultorRow) consultorRow.style.display = 'none';
      renderUsersTable();
      fillConsultorSelectForNewUser();
    });
  }

  // ---------------------------
  // Admin - Configuración
  // ---------------------------
  function bindAdminSettings() {
    const exportBtn = $('exportDataBtn');
    const exportAppBtn = $('exportAppDataBtn');
    const saveFsBtn = $('saveFsBtn');
    const resetBtn = $('resetDbBtn');
    const msg = $('adminSettingsMsg');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        try {
          const data = window.DB || {};
          // Descargar las 4 colecciones por separado
          DB_API.downloadJSON('users.json', data.users || { users: [] });
          DB_API.downloadJSON('tests.json', data.tests || { tests: [] });
          DB_API.downloadJSON('assignments.json', data.assignments || { assignments: [] });
          DB_API.downloadJSON('results.json', data.results || { results: [] });
          setFormMsg(msg, 'Archivos JSON descargados', 'success');
        } catch (e) {
          setFormMsg(msg, 'Error al exportar datos', 'error');
        }
      });
    }

    if (exportAppBtn) {
      exportAppBtn.addEventListener('click', () => {
        try {
          const data = window.DB || {};
          DB_API.downloadJSON('appData.json', data);
          setFormMsg(msg, 'BD completa exportada (appData.json)', 'success');
        } catch (e) {
          setFormMsg(msg, 'Error al exportar BD completa', 'error');
        }
      });
    }

    if (saveFsBtn) {
      saveFsBtn.addEventListener('click', async () => {
        try {
          if (!('showDirectoryPicker' in window)) {
            setFormMsg(msg, 'Su navegador no soporta File System Access API. Use Chrome/Edge reciente.', 'error');
            return;
          }
          await DB_API.saveAllCollectionsToDirectory();
          setFormMsg(msg, 'Datos guardados en la carpeta seleccionada', 'success');
        } catch (e) {
          setFormMsg(msg, 'Error al guardar en carpeta data', 'error');
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        DB_API.resetDatabase();
      });
    }
  }

  // ---------------------------
  // Consultor - Crear Prueba (constructor de preguntas)
  // ---------------------------
  const builderState = {
    questions: [],
    editingIndex: -1,
    lastImageData: null
  };

  // Edición de pruebas existentes
  let editingTestId = null;

  function bindQuestionBuilder() {
    const typeSel = $('qType');
    const optionsWrapper = $('optionsWrapper');
    const addOptionBtn = $('addOptionBtn');
    const optionsList = $('optionsList');
    const imgInput = $('qImage');
    const imgPreview = $('qImagePreview');
    const addQuestionBtn = $('addQuestionBtn');

    if (!typeSel) return; // sección no existe

    function refreshOptionsVisibility() {
      const type = typeSel.value;
      if (type === 'closed' || type === 'multiple') {
        optionsWrapper.classList.remove('hidden');
      } else {
        optionsWrapper.classList.add('hidden');
      }
    }

    function addOptionItem(value = '') {
      const li = document.createElement('li');
      li.className = 'option-item';
      li.innerHTML = `
        <input class="option-input" placeholder="Texto de opción" value="${escapeHtml(value)}"/>
        <button type="button" class="btn btn-ghost btn-small" data-action="remove">✕</button>
      `;
      optionsList.appendChild(li);
      li.querySelector('button[data-action="remove"]').addEventListener('click', () => {
        li.remove();
      });
    }

    function getOptionsArray() {
      return Array.from(optionsList.querySelectorAll('.option-input'))
        .map((inp, idx) => ({ id: `opt_${idx + 1}`, text: String(inp.value || '').trim() }))
        .filter(o => o.text.length > 0);
    }

    function clearBuilderInputs() {
      $('qText').value = '';
      optionsList.innerHTML = '';
      builderState.lastImageData = null;
      if (imgPreview) imgPreview.innerHTML = '';
      typeSel.value = 'open';
      refreshOptionsVisibility();
      builderState.editingIndex = -1;
    }

    if (addOptionBtn) {
      addOptionBtn.addEventListener('click', () => addOptionItem());
    }

    if (typeSel) {
      typeSel.addEventListener('change', refreshOptionsVisibility);
      refreshOptionsVisibility();
    }

    if (imgInput) {
      imgInput.addEventListener('change', async () => {
        const file = imgInput.files && imgInput.files[0];
        try {
          const v = DB_API.validateImage(file);
          if (!v.ok) throw new Error(v.reason);
          const dataUrl = await DB_API.fileToBase64(file);
          builderState.lastImageData = dataUrl;
          if (imgPreview) {
            imgPreview.innerHTML = dataUrl ? `<img src="${dataUrl}" alt="Vista previa" style="max-width:180px;max-height:140px;border-radius:6px;"/>` : '';
          }
        } catch (e) {
          builderState.lastImageData = null;
          if (imgPreview) imgPreview.innerHTML = `<span class="muted">Imagen inválida</span>`;
        }
      });
    }

    if (addQuestionBtn) {
      addQuestionBtn.addEventListener('click', () => {
        const type = typeSel.value;
        const qText = String(($('qText').value || '')).trim();
        if (!qText) {
          setFormMsg($('createTestMsg'), 'La pregunta debe tener texto', 'error');
          return;
        }
        let options = null;
        if (type === 'closed' || type === 'multiple') {
          const opts = getOptionsArray();
          if (opts.length < 2) {
            setFormMsg($('createTestMsg'), 'Preguntas cerradas/múltiples requieren al menos 2 opciones', 'error');
            return;
          }
          options = opts;
        }
        const question = {
          id: `q_${Date.now().toString(36)}`,
          type,
          questionText: qText,
          image: builderState.lastImageData || null
        };
        if (options) question.options = options;

        if (builderState.editingIndex >= 0) {
          builderState.questions[builderState.editingIndex] = question;
          builderState.editingIndex = -1;
        } else {
          builderState.questions.push(question);
        }
        renderQuestionsList();
        clearBuilderInputs();
      });
    }
  }

  function renderQuestionsList() {
    const ul = $('questionsList');
    if (!ul) return;
    ul.innerHTML = '';
    builderState.questions.forEach((q, idx) => {
      const li = document.createElement('li');
      const optCount = Array.isArray(q.options) ? q.options.length : 0;
      li.className = 'question-item';
      li.innerHTML = `
        <div class="qi-main">
          <strong>[${escapeHtml(getTypeLabel(q.type))}]</strong> ${escapeHtml(q.questionText)} ${q.image ? '<span class="tag">img</span>' : ''}
          ${optCount ? `<span class="muted">(${optCount} opciones)</span>` : ''}
        </div>
        <div class="qi-actions">
          <button class="btn btn-ghost btn-small" data-act="edit" data-idx="${idx}">Editar</button>
          <button class="btn btn-ghost btn-small" data-act="del" data-idx="${idx}">Eliminar</button>
        </div>
      `;
      ul.appendChild(li);
    });

    ul.querySelectorAll('button[data-act="del"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.getAttribute('data-idx'));
        builderState.questions.splice(i, 1);
        renderQuestionsList();
      });
    });
    ul.querySelectorAll('button[data-act="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.getAttribute('data-idx'));
        const q = builderState.questions[i];
        if (!q) return;
        builderState.editingIndex = i;
        $('qType').value = q.type;
        $('qText').value = q.questionText;
        const optionsWrapper = $('optionsWrapper');
        const optionsList = $('optionsList');
        const imgPreview = $('qImagePreview');
        // construir opciones si aplica
        if (q.type === 'closed' || q.type === 'multiple') {
          optionsWrapper.classList.remove('hidden');
          optionsList.innerHTML = '';
          (q.options || []).forEach(o => {
            const li = document.createElement('li');
            li.className = 'option-item';
            li.innerHTML = `
              <input class="option-input" placeholder="Texto de opción" value="${escapeHtml(o.text)}"/>
              <button type="button" class="btn btn-ghost btn-small" data-action="remove">✕</button>
            `;
            optionsList.appendChild(li);
            li.querySelector('button[data-action="remove"]').addEventListener('click', () => li.remove());
          });
        } else {
          optionsWrapper.classList.add('hidden');
          optionsList.innerHTML = '';
        }
        builderState.lastImageData = q.image || null;
        imgPreview.innerHTML = q.image ? `<img src="${q.image}" alt="Vista previa" style="max-width:180px;max-height:140px;border-radius:6px;"/>` : '';
        // limpiar input file
        const imgInput = $('qImage');
        if (imgInput) imgInput.value = '';
      });
    });
  }

  function bindCreateTestForm() {
    const form = $('createTestForm');
    const msg = $('createTestMsg');
    if (!form) return;

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const u = StorageAPI.getCurrentUser();
      if (!u) return;

      const title = String(($('testTitle').value || '')).trim();
      const description = String(($('testDescription').value || '')).trim();
      if (!title || !description) {
        setFormMsg(msg, 'Complete título y descripción', 'error');
        return;
      }
      if (builderState.questions.length < 1) {
        setFormMsg(msg, 'Agregue al menos una pregunta', 'error');
        return;
      }
      // Validaciones puntuales
      for (const q of builderState.questions) {
        if (!q.questionText || !q.type) {
          setFormMsg(msg, 'Cada pregunta debe tener tipo y texto', 'error');
          return;
        }
        if ((q.type === 'closed' || q.type === 'multiple')) {
          const opts = Array.isArray(q.options) ? q.options.filter(o => o.text && o.text.trim().length > 0) : [];
          if (opts.length < 2) {
            setFormMsg(msg, 'Las preguntas cerradas/múltiples requieren al menos 2 opciones válidas', 'error');
            return;
          }
        }
      }

      // construir datos base (para crear o actualizar)
      const baseData = {
        title,
        description,
        questions: builderState.questions.map((q, idx) => {
          const obj = {
            id: q.id || `q_${idx + 1}_${Date.now().toString(36)}`,
            type: q.type,
            questionText: q.questionText,
            image: q.image || null
          };
          if (q.type === 'closed' || q.type === 'multiple') {
            obj.options = (q.options || []).map((o, i) => ({ id: o.id || `opt_${i + 1}`, text: o.text }));
          }
          return obj;
        })
      };

      if (editingTestId) {
        // Actualizar prueba existente
        const existing = DB_API.getById('tests', editingTestId);
        if (!existing) {
          setFormMsg(msg, '❌ Error: La prueba a actualizar no existe', 'error');
          return;
        }
        const updateData = Object.assign({}, existing, baseData, { updatedAt: DB_API.getCurrentTimestamp() });
        const updated = DB_API.update('tests', editingTestId, updateData);
        setFormMsg(msg, `Prueba actualizada: ${updated.id}`, 'success');
        // Salir de modo edición
        exitEditMode();
      } else {
        // Crear nueva prueba
        const testData = Object.assign({}, baseData, {
          createdBy: u.id,
          createdAt: DB_API.getCurrentTimestamp()
        });
        const created = DB_API.create('tests', testData);
        setFormMsg(msg, `Prueba creada con ID: ${created.id}`, 'success');

        // Reset UI
        builderState.questions = [];
        builderState.editingIndex = -1;
        renderQuestionsList();
        form.reset();
        $('qImagePreview').innerHTML = '';
      }
      // refrescar tablas y selects
      renderMyTestsTable();
      hydrateAssignSelectors();
    });
  }

  function renderMyTestsTable() {
    const tbody = $('myTestsTableBody');
    if (!tbody) return;
    const u = StorageAPI.getCurrentUser();

    let rows = [];
    if (StorageAPI.isAdmin()) {
      rows = DB_API.getAll('tests');
    } else {
      rows = DB_API.getTestsByConsultor(u.id);
    }

    tbody.innerHTML = '';
    rows.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(t.title)}</td>
        <td>${(t.questions || []).length}</td>
        <td>${escapeHtml(new Date(t.createdAt).toLocaleString())}</td>
        <td class="actions">
          <button class="btn btn-ghost btn-small" data-act="view" data-id="${t.id}">Ver</button>
          <button class="btn btn-ghost btn-small" data-act="edit" data-id="${t.id}">Editar</button>
          <button class="btn btn-ghost btn-small" data-act="del" data-id="${t.id}">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Ver detalle
    tbody.querySelectorAll('button[data-act="view"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        showTestDetail(id);
      });
    });

    // Editar prueba
    tbody.querySelectorAll('button[data-act="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        startEditTest(id);
      });
    });

    // Eliminar
    tbody.querySelectorAll('button[data-act="del"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('¿Eliminar prueba?')) return;
        const ok = DB_API.remove('tests', id);
        if (ok) {
          renderMyTestsTable();
          hydrateAssignSelectors();
        }
      });
    });
  }

  // Mostrar detalle de una prueba (composición: preguntas, opciones, imágenes)
  function showTestDetail(testId) {
    const card = $('testDetailCard');
    const detail = $('testDetail');
    if (!detail || !card) return;
    const t = DB_API.getById('tests', testId);
    if (!t) { detail.innerHTML = '<p class="muted">Prueba no encontrada</p>'; card.classList.remove('hidden'); return; }

    const users = DB_API.getAll('users');
    const creator = users.find(u => u.id === t.createdBy);
    const creatorName = creator ? (creator.fullName || creator.username) : (t.createdBy || '-');

    let html = '';
    html += `<div class="detail-header">`;
    html += `<h4>${escapeHtml(t.title)}</h4>`;
    html += `<p class="muted">${escapeHtml(t.description || '')}</p>`;
    html += `<p class="muted">Creada por: ${escapeHtml(creatorName)} • ${escapeHtml(new Date(t.createdAt).toLocaleString())}${t.updatedAt ? ' • Actualizada: ' + escapeHtml(new Date(t.updatedAt).toLocaleString()) : ''}</p>`;
    html += `</div>`;

    html += `<ol class="detail-questions">`;
    (t.questions || []).forEach((q, idx) => {
      html += `<li class="dq-item">`;
      html += `<div><strong>[${escapeHtml(getTypeLabel(q.type))}]</strong> ${escapeHtml(q.questionText)}</div>`;
      if (q.image) {
        html += `<div><img src="${q.image}" alt="Imagen pregunta ${idx + 1}" style="max-width:240px;border-radius:6px;margin:6px 0"/></div>`;
      }
      if (q.type === 'closed' || q.type === 'multiple') {
        html += `<ul class="dq-options">`;
        (q.options || []).forEach(o => {
          html += `<li>• ${escapeHtml(o.text)}</li>`;
        });
        html += `</ul>`;
      }
      html += `</li>`;
    });
    html += `</ol>`;

    html += `<div class="detail-actions"><button id="hideTestDetailBtn" class="btn btn-ghost btn-small">Ocultar</button></div>`;

    detail.innerHTML = html;
    card.classList.remove('hidden');

    const hideBtn = $('hideTestDetailBtn');
    if (hideBtn) hideBtn.onclick = () => card.classList.add('hidden');
  }

  // Iniciar modo edición de una prueba existente
  function startEditTest(testId) {
    const t = DB_API.getById('tests', testId);
    if (!t) return;

    // Ir a la sección de gestión de pruebas
    showSection(SECTIONS.consultorCreateTest);

    // Prefill formulario
    const form = $('createTestForm');
    if (!form) return;
    const titleEl = $('testTitle');
    const descEl = $('testDescription');
    if (titleEl) titleEl.value = t.title || '';
    if (descEl) descEl.value = t.description || '';

    // Cargar preguntas al builder
    builderState.questions = (t.questions || []).map(q => ({
      id: q.id,
      type: q.type,
      questionText: q.questionText,
      image: q.image || null,
      options: (q.type === 'closed' || q.type === 'multiple') ? (q.options || []).map(o => ({ id: o.id, text: o.text })) : undefined
    }));
    builderState.editingIndex = -1;
    renderQuestionsList();

    // Marcar edición
    editingTestId = testId;

    // UI: cambiar texto del submit y añadir botón cancelar si no existe
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Guardar cambios';

    let cancelBtn = document.getElementById('cancelEditTestBtn');
    if (!cancelBtn) {
      cancelBtn = document.createElement('button');
      cancelBtn.id = 'cancelEditTestBtn';
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn btn-ghost';
      cancelBtn.textContent = 'Cancelar edición';
      submitBtn?.insertAdjacentElement('afterend', cancelBtn);
      cancelBtn.addEventListener('click', exitEditMode);
    }

    setFormMsg($('createTestMsg'), `Editando prueba: ${testId}`, 'info');
  }

  function exitEditMode() {
    const form = $('createTestForm');
    if (!form) return;
    editingTestId = null;

    // Reset builder y formulario
    builderState.questions = [];
    builderState.editingIndex = -1;
    renderQuestionsList();
    form.reset();
    const imgPrev = $('qImagePreview');
    if (imgPrev) imgPrev.innerHTML = '';

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Guardar prueba';
    const cancelBtn = document.getElementById('cancelEditTestBtn');
    if (cancelBtn) cancelBtn.remove();
    setFormMsg($('createTestMsg'), '', 'info');
  }

  // ---------------------------
  // Consultor - Asignaciones
  // ---------------------------
  function hydrateAssignSelectors() {
    const testSel = $('assignTest');
    const consSel = $('assignConsultant');
    const u = StorageAPI.getCurrentUser();
    if (!testSel || !consSel || !u) return;

    testSel.innerHTML = '';
    consSel.innerHTML = '';

    let tests = [];
    let consultants = [];

    if (StorageAPI.isAdmin()) {
      tests = DB_API.getAll('tests');
      consultants = DB_API.find('users', x => x.role === 'consultante');
    } else if (StorageAPI.isConsultor()) {
      tests = DB_API.getTestsByConsultor(u.id);
      consultants = DB_API.find('users', x => x.role === 'consultante' && x.consultorId === u.id);
    }

    if (tests.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '— Sin pruebas —';
      opt.disabled = true;
      opt.selected = true;
      testSel.appendChild(opt);
    } else {
      tests.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.title;
        testSel.appendChild(opt);
      });
    }

    if (consultants.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '— Sin consultantes —';
      opt.disabled = true;
      opt.selected = true;
      consSel.appendChild(opt);
    } else {
      consultants.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.fullName || c.username;
        consSel.appendChild(opt);
      });
    }
  }

  function bindAssignForm() {
    const form = $('assignForm');
    const msg = $('assignMsg');
    if (!form) return;

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const u = StorageAPI.getCurrentUser();
      if (!u) return;

      const testId = $('assignTest').value;
      const consultantId = $('assignConsultant').value;
      const dueStr = $('assignDue').value;

      // Validaciones
      const test = DB_API.getById('tests', testId);
      if (!test) return setFormMsg(msg, '❌ Error: Prueba no encontrada', 'error');

      const consultant = DB_API.getById('users', consultantId);
      if (!consultant || consultant.role !== 'consultante') {
        return setFormMsg(msg, '❌ Error: Consultante no válido', 'error');
      }
      if (StorageAPI.isConsultor() && consultant.consultorId !== u.id) {
        return setFormMsg(msg, '❌ Error: El consultante no pertenece a usted', 'error');
      }
      // Duplicada activa
      const dup = DB_API.find('assignments', a => a.testId === testId && a.consultantId === consultantId && a.status !== 'completed');
      if (dup.length > 0) {
        return setFormMsg(msg, '⚠️ Advertencia: Asignación ya existe', 'error');
      }

      const assignedDate = DB_API.getCurrentTimestamp();
      let dueDate = null;
      if (dueStr) {
        const d = new Date(dueStr);
        if (!isNaN(d.getTime())) dueDate = d.toISOString();
      }

      const consultorIdForAssign = StorageAPI.isAdmin()
        ? (consultant.consultorId || (test.createdBy || u.id))
        : u.id;

      const data = {
        testId,
        consultantId,
        consultorId: consultorIdForAssign,
        assignedDate,
        dueDate,
        status: 'pending'
      };
      const created = DB_API.create('assignments', data);
      setFormMsg(msg, `Asignación creada: ${created.id}`, 'success');
      renderAssignmentsTable();
    });
  }

  function renderAssignmentsTable() {
    const tbody = $('assignmentsTableBody');
    if (!tbody) return;
    const u = StorageAPI.getCurrentUser();
    const asgsAll = DB_API.getAll('assignments');
    const tests = DB_API.getAll('tests');
    const users = DB_API.getAll('users');
    const getTestTitle = id => {
      const t = tests.find(x => x.id === id);
      return t ? t.title : id;
    };
    const getUserName = id => {
      const x = users.find(u => u.id === id);
      return x ? (x.fullName || x.username) : id;
    };

    const rows = StorageAPI.isAdmin()
      ? asgsAll
      : (StorageAPI.isConsultor() ? asgsAll.filter(a => a.consultorId === u.id) : []);

    tbody.innerHTML = '';
    rows.forEach(a => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${a.id}</td>
        <td>${escapeHtml(getTestTitle(a.testId))}</td>
        <td>${escapeHtml(getUserName(a.consultantId))}</td>
        <td>${a.status}</td>
        <td>${a.dueDate ? escapeHtml(new Date(a.dueDate).toLocaleString()) : '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ---------------------------
  // Consultor - Resultados
  // ---------------------------
  function hydrateResultsFilter() {
    const sel = $('filterConsultant');
    if (!sel) return;
    const u = StorageAPI.getCurrentUser();
    if (!u) return;
    sel.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = '';
    optAll.textContent = 'Todos';
    sel.appendChild(optAll);

    const myConsultants = DB_API.find('users', x => x.role === 'consultante' && x.consultorId === u.id);
    myConsultants.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.fullName || c.username;
      sel.appendChild(opt);
    });

    sel.addEventListener('change', renderConsultorResults);
  }

  function renderConsultorResults() {
    const tbody = $('consultorResultsBody');
    if (!tbody) return;
    const filterSel = $('filterConsultant');
    const filterId = filterSel ? filterSel.value : '';
    const results = DB_API.getAll('results');
    const asgs = DB_API.getAll('assignments');
    const tests = DB_API.getAll('tests');
    const users = DB_API.getAll('users');
    const u = StorageAPI.getCurrentUser();

    const getTestTitle = id => {
      const t = tests.find(x => x.id === id);
      return t ? t.title : id;
    };
    const getUserName = id => {
      const x = users.find(u => u.id === id);
      return x ? (x.fullName || x.username) : id;
    };

    const rows = results
      .filter(r => {
        const a = asgs.find(x => x.id === r.assignmentId);
        if (!a) return false;
        if (!StorageAPI.isAdmin() && a.consultorId !== u.id) return false;
        if (filterId && r.consultantId !== filterId) return false;
        return true;
      });

    tbody.innerHTML = '';
    rows.forEach(r => {
      const a = asgs.find(x => x.id === r.assignmentId);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${a ? a.id : '-'}</td>
        <td>${escapeHtml(getUserName(r.consultantId))}</td>
        <td>${escapeHtml(getTestTitle(r.testId))}</td>
        <td>${escapeHtml(new Date(r.submittedAt).toLocaleString())}</td>
        <td><button class="btn btn-ghost btn-small" data-act="view" data-id="${r.id}">Ver</button></td>
      `;
      tbody.appendChild(tr);
    });

    // Ver detalle resultado (consultor/admin)
    tbody.querySelectorAll('button[data-act="view"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const r = DB_API.getAll('results').find(x => x.id === id);
        const detail = $('consultorResultDetail');
        if (!r || !detail) return;
        const tests = DB_API.getAll('tests');
        const users = DB_API.getAll('users');
        const getUserName = uid => {
          const u = users.find(x => x.id === uid);
          return u ? (u.fullName || u.username) : uid;
        };
        const test = DB_API.getById('tests', r.testId);
        const mapQ = {};
        (test?.questions || []).forEach(q => { mapQ[q.id] = q; });
        let html = `<h4>Detalle resultado ${r.id}</h4>`;
        html += `<p class="muted">Consultante: ${escapeHtml(getUserName(r.consultantId))} • Prueba: ${escapeHtml(test ? test.title : r.testId)}</p>`;
        html += `<ul class="answers-list">`;
        (r.answers || []).forEach(a => {
          const qq = mapQ[a.questionId];
          const qText = qq ? qq.questionText : a.questionId;
          let val = '';
          if (a.type === 'open') {
            val = escapeHtml(String(a.answer || ''));
          } else if (a.type === 'closed') {
            const opt = (qq?.options || []).find(o => o.id === a.answer);
            val = escapeHtml(opt ? opt.text : a.answer);
          } else if (a.type === 'multiple') {
            const arr = (Array.isArray(a.answer) ? a.answer : []);
            const labels = arr.map(optId => {
              const opt = (qq?.options || []).find(o => o.id === optId);
              return escapeHtml(opt ? opt.text : optId);
            });
            val = labels.join(', ');
          }
          html += `<li><strong>${escapeHtml(qText)}:</strong> ${val}</li>`;
        });
        html += `</ul>`;
        detail.innerHTML = html;
      });
    });
  }

  // ---------------------------
  // Consultor - Mis Consultantes
  // ---------------------------
  function renderConsultorClients() {
    const tbody = $('consultorClientsBody');
    if (!tbody) return;
    const u = StorageAPI.getCurrentUser();
    if (!u) return;

    const users = DB_API.getAll('users');
    const assignments = DB_API.getAll('assignments');
    const results = DB_API.getAll('results');

    const myConsultants = users.filter(x => x.role === 'consultante' && x.consultorId === u.id);

    tbody.innerHTML = '';
    myConsultants.forEach(c => {
      const activeAssigns = assignments.filter(a => a.consultantId === c.id && a.consultorId === u.id && a.status !== 'completed').length;
      const resultsCount = results.filter(r => r.consultantId === c.id).length;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(c.fullName || c.username)}</td>
        <td>${escapeHtml(c.email || '')}</td>
        <td>${activeAssigns}</td>
        <td>${resultsCount}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ---------------------------
  // Consultante - Pruebas asignadas y realizar
  // ---------------------------
  function renderAssignedToMe() {
    const tbody = $('assignedToMeBody');
    if (!tbody) return;
    const u = StorageAPI.getCurrentUser();
    const msg = $('assignedMsg');
    if (msg) setFormMsg(msg, '', 'info');
    const asgs = DB_API.getAssignmentsByConsultant(u.id);
    const tests = DB_API.getAll('tests');
    const getTestTitle = id => {
      const t = tests.find(x => x.id === id);
      return t ? t.title : id;
    };

    tbody.innerHTML = '';
    asgs.forEach(a => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${a.id}</td>
        <td>${escapeHtml(getTestTitle(a.testId))}</td>
        <td>${a.status}</td>
        <td>${a.dueDate ? escapeHtml(new Date(a.dueDate).toLocaleString()) : '-'}</td>
        <td>
          ${a.status === 'pending'
            ? `<button class="btn btn-secondary btn-small" data-act="start" data-id="${a.id}">Iniciar</button>`
            : a.status === 'in_progress'
              ? `<button class="btn btn-secondary btn-small" data-act="continue" data-id="${a.id}">Continuar</button>`
              : '-'}
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('button[data-act="start"]').forEach(btn => {
      btn.addEventListener('click', () => {
        startTakeTest(btn.getAttribute('data-id'));
      });
    });
    tbody.querySelectorAll('button[data-act="continue"]').forEach(btn => {
      btn.addEventListener('click', () => {
        startTakeTest(btn.getAttribute('data-id'));
      });
    });
  }

  function startTakeTest(assignmentId) {
    const a = DB_API.getById('assignments', assignmentId);
    const u = StorageAPI.getCurrentUser();
    if (!a || a.consultantId !== u.id) return;
    if (a.status === 'completed') return;

    if (a.dueDate) {
      const due = new Date(a.dueDate).getTime();
      if (!isNaN(due) && Date.now() > due) {
        setFormMsg($('assignedMsg'), '⚠️ La asignación está vencida', 'error');
        return;
      }
    }

    const test = DB_API.getById('tests', a.testId);
    if (!test) {
      setFormMsg($('assignedMsg'), '❌ Error: Prueba no encontrada', 'error');
      return;
    }

    $('takeTestTitle').textContent = `Realizar: ${test.title}`;
    $('takeTestDesc').textContent = test.description || '';
    const prefill = Array.isArray(a.progressAnswers) ? a.progressAnswers : [];
    buildTakeTestQuestions(test, prefill);
    if (a.status === 'pending') {
      DB_API.update('assignments', a.id, { status: 'in_progress', startedAt: DB_API.getCurrentTimestamp() });
    }
    showSection(SECTIONS.takeTest);

    const cancelBtn = $('cancelTakeTestBtn');
    if (cancelBtn) {
      cancelBtn.onclick = () => showSection(SECTIONS.consultanteAssigned);
    }

    const form = $('takeTestForm');
    const msg = $('takeTestMsg');

    // Guardar avance
    const saveBtn = $('saveProgressBtn');
    if (saveBtn) {
      saveBtn.onclick = () => {
        const partial = collectPartialTakeTestAnswers(test);
        DB_API.update('assignments', a.id, {
          status: 'in_progress',
          progressAnswers: partial,
          lastSavedAt: DB_API.getCurrentTimestamp()
        });
        setFormMsg(msg, 'Avance guardado', 'success');
      };
    }

    form.onsubmit = (ev) => {
      ev.preventDefault();
      const answers = collectTakeTestAnswers(test);
      if (!answers.valid) {
        setFormMsg(msg, answers.error || 'Responda todas las preguntas requeridas', 'error');
        return;
      }
      // Guardar resultado
      const resultData = {
        assignmentId: a.id,
        testId: test.id,
        consultantId: u.id,
        submittedAt: DB_API.getCurrentTimestamp(),
        answers: answers.data
      };
      DB_API.create('results', resultData);
      DB_API.update('assignments', a.id, { status: 'completed', progressAnswers: [], completedAt: DB_API.getCurrentTimestamp() });
      setFormMsg(msg, '✅ Respuestas enviadas correctamente', 'success');
      renderAssignedToMe();
      renderMyResults();
      setTimeout(() => showSection(SECTIONS.consultanteMyResults), 600);
    };
  }

  function buildTakeTestQuestions(test, prefillAnswers = []) {
    const container = $('takeTestQuestions');
    container.innerHTML = '';
    (test.questions || []).forEach((q, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'question-block';
      const label = document.createElement('label');
      label.innerHTML = `<strong>Q${idx + 1}.</strong> ${escapeHtml(q.questionText)}`;
      wrap.appendChild(label);

      if (q.image) {
        const img = document.createElement('img');
        img.src = q.image;
        img.alt = 'Imagen pregunta';
        img.style.maxWidth = '220px';
        img.style.borderRadius = '6px';
        img.style.display = 'block';
        img.style.margin = '6px 0 8px';
        wrap.appendChild(img);
      }

      if (q.type === 'open') {
        const ta = document.createElement('textarea');
        ta.name = `q_${q.id}`;
        ta.rows = 3;
        ta.required = true;
        wrap.appendChild(ta);
      } else if (q.type === 'closed') {
        (q.options || []).forEach(o => {
          const div = document.createElement('div');
          div.className = 'option';
          div.innerHTML = `
            <label>
              <input type="radio" name="q_${q.id}" value="${o.id}" required />
              ${escapeHtml(o.text)}
            </label>
          `;
          wrap.appendChild(div);
        });
      } else if (q.type === 'multiple') {
        (q.options || []).forEach(o => {
          const div = document.createElement('div');
          div.className = 'option';
          div.innerHTML = `
            <label>
              <input type="checkbox" name="q_${q.id}" value="${o.id}" />
              ${escapeHtml(o.text)}
            </label>
          `;
          wrap.appendChild(div);
        });
      }

      container.appendChild(wrap);
    });

    // Prefill answers si existen
    if (Array.isArray(prefillAnswers) && prefillAnswers.length) {
      const prefillMap = {};
      prefillAnswers.forEach(a => { if (a && a.questionId) prefillMap[a.questionId] = a; });
      (test.questions || []).forEach(q => {
        const a = prefillMap[q.id];
        if (!a) return;
        if (q.type === 'open') {
          const ta = document.querySelector(`textarea[name="q_${q.id}"]`);
          if (ta) ta.value = String(a.answer || '');
        } else if (q.type === 'closed') {
          const inp = document.querySelector(`input[type="radio"][name="q_${q.id}"][value="${a.answer}"]`);
          if (inp) inp.checked = true;
        } else if (q.type === 'multiple') {
          const arr = Array.isArray(a.answer) ? a.answer : [];
          arr.forEach(val => {
            const cb = document.querySelector(`input[type="checkbox"][name="q_${q.id}"][value="${val}"]`);
            if (cb) cb.checked = true;
          });
        }
      });
    }
  }

  function collectTakeTestAnswers(test) {
    const answers = [];
    for (const q of (test.questions || [])) {
      if (q.type === 'open') {
        const ta = document.querySelector(`textarea[name="q_${q.id}"]`);
        const val = (ta && String(ta.value || '').trim()) || '';
        if (!val) return { valid: false, error: 'Responda todas las preguntas abiertas' };
        answers.push({ questionId: q.id, type: 'open', answer: val });
      } else if (q.type === 'closed') {
        const checked = document.querySelector(`input[name="q_${q.id}"]:checked`);
        if (!checked) return { valid: false, error: 'Seleccione una opción en todas las preguntas cerradas' };
        answers.push({ questionId: q.id, type: 'closed', answer: checked.value });
      } else if (q.type === 'multiple') {
        const checked = Array.from(document.querySelectorAll(`input[name="q_${q.id}"]:checked`)).map(i => i.value);
        if (checked.length === 0) return { valid: false, error: 'Seleccione al menos una opción en preguntas múltiples' };
        answers.push({ questionId: q.id, type: 'multiple', answer: checked });
      }
    }
    return { valid: true, data: answers };
  }

  // Helper: recolecta respuestas parciales (sin validar)
  function collectPartialTakeTestAnswers(test) {
    const answers = [];
    for (const q of (test.questions || [])) {
      if (q.type === 'open') {
        const ta = document.querySelector(`textarea[name="q_${q.id}"]`);
        const val = (ta && String(ta.value || '').trim()) || '';
        if (val) answers.push({ questionId: q.id, type: 'open', answer: val });
      } else if (q.type === 'closed') {
        const checked = document.querySelector(`input[name="q_${q.id}"]:checked`);
        if (checked) answers.push({ questionId: q.id, type: 'closed', answer: checked.value });
      } else if (q.type === 'multiple') {
        const checked = Array.from(document.querySelectorAll(`input[name="q_${q.id}"]:checked`)).map(i => i.value);
        if (checked.length) answers.push({ questionId: q.id, type: 'multiple', answer: checked });
      }
    }
    return answers;
  }

  // ---------------------------
  // Consultante - Mis Resultados
  // ---------------------------
  function renderMyResults() {
    const tbody = $('myResultsBody');
    const detail = $('myResultDetail');
    if (!tbody) return;
    const u = StorageAPI.getCurrentUser();
    if (!u) return;
    const my = DB_API.find('results', r => r.consultantId === u.id);
    const assignments = DB_API.getAll('assignments');
    const tests = DB_API.getAll('tests');

    const getTestTitle = id => {
      const t = tests.find(x => x.id === id);
      return t ? t.title : id;
    };

    tbody.innerHTML = '';
    my.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${escapeHtml(getTestTitle(r.testId))}</td>
        <td>${escapeHtml(new Date(r.submittedAt).toLocaleString())}</td>
        <td><button class="btn btn-ghost btn-small" data-act="view" data-id="${r.id}">Ver</button></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('button[data-act="view"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const r = DB_API.getAll('results').find(x => x.id === id);
        if (!r) return;
        const test = DB_API.getById('tests', r.testId);
        const mapQ = {};
        (test?.questions || []).forEach(q => { mapQ[q.id] = q; });
        let html = `<h4>Detalle resultado ${r.id}</h4>`;
        html += `<p class="muted">Prueba: ${escapeHtml(test ? test.title : r.testId)}</p>`;
        html += `<ul class="answers-list">`;
        (r.answers || []).forEach(a => {
          const qq = mapQ[a.questionId];
          const qText = qq ? qq.questionText : a.questionId;
          let val = '';
          if (a.type === 'open') {
            val = escapeHtml(String(a.answer || ''));
          } else if (a.type === 'closed') {
            const opt = (qq?.options || []).find(o => o.id === a.answer);
            val = escapeHtml(opt ? opt.text : a.answer);
          } else if (a.type === 'multiple') {
            const arr = (Array.isArray(a.answer) ? a.answer : []);
            const labels = arr.map(optId => {
              const opt = (qq?.options || []).find(o => o.id === optId);
              return escapeHtml(opt ? opt.text : optId);
            });
            val = labels.join(', ');
          }
          html += `<li><strong>${escapeHtml(qText)}:</strong> ${val}</li>`;
        });
        html += `</ul>`;
        if (detail) detail.innerHTML = html;
      });
    });
  }

  // ---------------------------
  // Contacto
  // ---------------------------
  function bindContactForm() {
    const form = $('contactForm');
    const msg = $('contactMsg');
    if (!form) return;
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fd = new FormData(form);
      const name = String(fd.get('name') || '').trim();
      const email = String(fd.get('email') || '').trim();
      const subject = String(fd.get('subject') || '').trim();
      const message = String(fd.get('message') || '').trim();
      if (!name || !email || !subject || !message) {
        setFormMsg(msg, 'Complete todos los campos', 'error');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFormMsg(msg, 'Email inválido', 'error');
        return;
      }
      setFormMsg(msg, 'Mensaje enviado. ¡Gracias por contactarnos!', 'success');
      form.reset();
    });
  }

  // ---------------------------
  // Utilidades UI
  // ---------------------------
  function setFormMsg(el, text, type = 'info') {
    if (!el) return;
    el.textContent = text || '';
    el.className = 'form-msg ' + (type === 'error' ? 'error' : type === 'success' ? 'success' : '');
    if (text) {
      setTimeout(() => {
        if (el.textContent === text) {
          el.textContent = '';
          el.className = 'form-msg';
        }
      }, 4000);
    }
  }

  // Mapea el tipo técnico a una etiqueta en español
  function getTypeLabel(t) {
    switch (t) {
      case 'open': return 'Abierta';
      case 'closed': return 'Cerrada';
      case 'multiple': return 'Múltiple';
      default: return t || '';
    }
  }

  function escapeHtml(s) {
    const map = { '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#039;' };
    return String(s == null ? '' : s).replace(/[&<>\"']/g, ch => map[ch] || ch);
  }

  // ---------------------------
  // Inicialización y eventos globales
  // ---------------------------
  function initBindings() {
    const hb = $('hamburgerBtn');
    if (hb) {
      hb.addEventListener('click', () => { toggleHamburger(); updateCollapseButtonLabel(); });
      updateCollapseButtonLabel();
    }
    window.addEventListener('resize', updateCollapseButtonLabel);




    // Toggle mostrar/ocultar contraseña en login
    const pwInput = $('loginPassword');
    const togglePwBtn = $('togglePasswordBtn');
    if (pwInput && togglePwBtn) {
      togglePwBtn.addEventListener('click', () => {
        const isHidden = pwInput.type === 'password';
        pwInput.type = isHidden ? 'text' : 'password';
        togglePwBtn.textContent = isHidden ? 'Ocultar' : 'Mostrar';
        togglePwBtn.setAttribute('aria-label', isHidden ? 'Ocultar contraseña' : 'Mostrar contraseña');
      });
    }

    bindCreateUserForm();
    bindAdminSettings();
    bindQuestionBuilder();
    bindCreateTestForm();
    bindAssignForm();
    bindContactForm();

    // Botón Refrescar en Asignaciones (consultor)
    const refreshAssignmentsBtn = $('refreshAssignmentsBtn');
    if (refreshAssignmentsBtn) {
      refreshAssignmentsBtn.addEventListener('click', renderAssignmentsTable);
    }

    // Refrescar vistas relevantes cuando cambie la "BD" (evento disparado desde DB_API)
    window.addEventListener('db:changed', () => {
      try {
        // Dashboard (siempre seguro)
        renderDashboard();

        // Re-render condicional según secciones visibles
        const sec = (id) => document.getElementById(id);
        const isVisible = (el) => el && !el.classList.contains('hidden');

        const sAssign = sec(SECTIONS.consultorAssign);
        if (isVisible(sAssign)) renderAssignmentsTable();

        const sResults = sec(SECTIONS.consultorResults);
        if (isVisible(sResults)) renderConsultorResults();

        const sAssignedToMe = sec(SECTIONS.consultanteAssigned);
        if (isVisible(sAssignedToMe)) renderAssignedToMe();

        const sMyResults = sec(SECTIONS.consultanteMyResults);
        if (isVisible(sMyResults)) renderMyResults();

        const sMyTests = sec(SECTIONS.consultorCreateTest);
        if (isVisible(sMyTests)) renderMyTestsTable();
      } catch (e) {
      }
    });
  }

  function initRoutingAfterAuth() {
    buildMenu();
    // Mostrar menú lateral al estar autenticado
    const sidebar = $('sidebar');
    if (sidebar) sidebar.classList.remove('hidden');

    // Redirección inicial según rol
    if (StorageAPI.isAdmin()) {
      // Admin entra a Dashboard
      showSection(SECTIONS.dashboard);
    } else if (StorageAPI.isConsultor()) {
      // Consultor entra a "Crear Prueba"
      showSection(SECTIONS.consultorCreateTest);
    } else if (StorageAPI.isConsultante()) {
      // Consultante entra a "Pruebas Asignadas"
      showSection(SECTIONS.consultanteAssigned);
    } else {
      showSection(SECTIONS.dashboard);
    }
  }

  window.addEventListener('auth:login', () => {
    // Mostrar el sidebar al autenticarse
    const sidebar = $('sidebar');
    if (sidebar) sidebar.classList.remove('hidden');
    // Mostrar burger solo cuando hay sesión
    const hb = $('hamburgerBtn');
    if (hb) hb.style.display = 'inline-flex';
    initRoutingAfterAuth();
    renderDashboard();
  });

  window.addEventListener('auth:logout', () => {
    const list = $('menuList');
    if (list) list.innerHTML = '';
    // Ocultar sidebar al cerrar sesión y resetear estados
    const sidebar = $('sidebar');
    if (sidebar) {
      sidebar.classList.remove('open');
      sidebar.classList.add('hidden');
    }
    document.body.classList.remove('mobile-menu-open');
    document.body.classList.remove('sidebar-collapsed');
    const hb = $('hamburgerBtn');
    if (hb) {
      hb.setAttribute('aria-expanded', 'false');
      hb.style.display = 'none';
    }
    showSection(SECTIONS.login);
  });

  document.addEventListener('DOMContentLoaded', () => {
    // Inicializar tema antes de renderizar UI
    initTheme();
    // Inicializar DB y Auth bindings, luego navegación
    Promise.resolve()
      .then(() => DB_API.initDB())
      .then(() => {
        AuthAPI.initAuthBindings();
        initBindings();
        // Burger solo visible si hay sesión
        const hb = $('hamburgerBtn');
        if (hb) hb.style.display = StorageAPI.isAuthenticated() ? 'inline-flex' : 'none';
        if (StorageAPI.isAuthenticated()) {
          initRoutingAfterAuth();
        } else {
          showSection(SECTIONS.login);
        }
      })
      .catch(err => {
        showSection(SECTIONS.login);
      });
  });
})();
