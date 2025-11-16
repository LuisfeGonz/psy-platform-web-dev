// js/db.js
// Simulación de Base de Datos con JSON + LocalStorage
// Cumple con: carga inicial desde JSON, respaldo en LocalStorage, CRUD en memoria

(function () {
  'use strict';

  const LS_APP_KEY = 'appData'; // respaldo completo de la "BD" en LocalStorage

  // Configuración por colección para acceder a la estructura anidada
  const COLLECTIONS = {
    users:        { root: 'users',        array: 'users',        file: 'users.json',        idPrefix: 'user'   },
    tests:        { root: 'tests',        array: 'tests',        file: 'tests.json',        idPrefix: 'test'   },
    assignments:  { root: 'assignments',  array: 'assignments',  file: 'assignments.json',  idPrefix: 'assign' },
    results:      { root: 'results',      array: 'results',      file: 'results.json',      idPrefix: 'result' }
  };

  // ---------------------------
  // Inicialización / Carga
  // ---------------------------

  // Verifica LocalStorage y devuelve el objeto parseado o null
  function checkLocalStorage() {
    try {
      const localData = localStorage.getItem(LS_APP_KEY);
      if (!localData) return null;
      const parsed = JSON.parse(localData);
      if (parsed && typeof parsed === 'object') return parsed;
      return null;
    } catch (e) {

      return null;
    }
  }

  // Cargar todos los archivos JSON al inicio, o desde LocalStorage si existe
  async function initDB() {
    // Intentar cargar desde LocalStorage primero
    const localData = checkLocalStorage();
    if (localData) {
      window.DB = localData;

      // Métricas rápidas
      try {




      } catch {}
      return window.DB;
    }

    // Cargar desde archivos JSON
    try {

      const users = await fetch('data/users.json', { cache: 'no-cache' }).then(r => r.json());



      const tests = await fetch('data/tests.json', { cache: 'no-cache' }).then(r => r.json());



      const assignments = await fetch('data/assignments.json', { cache: 'no-cache' }).then(r => r.json());



      const results = await fetch('data/results.json', { cache: 'no-cache' }).then(r => r.json());


      window.DB = { users, tests, assignments, results };

      return window.DB;
    } catch (err) {

      // Inicializar vacío pero con estructuras válidas para evitar fallos posteriores
      window.DB = {
        users: { users: [] },
        tests: { tests: [] },
        assignments: { assignments: [] },
        results: { results: [] }
      };
      return window.DB;
    }
  }

  // Sincroniza el estado actual de DB al LocalStorage
  function syncToLocalStorage() {
    try {
      localStorage.setItem(LS_APP_KEY, JSON.stringify(window.DB));

      try {
        window.dispatchEvent(new CustomEvent('db:changed', { detail: { ts: Date.now() } }));
      } catch {}
    } catch (e) {

    }
  }

  // Resetear "BD" a valores iniciales (para Admin)
  function resetDatabase() {
    if (confirm('¿Resetear base de datos a valores iniciales?')) {
      localStorage.removeItem(LS_APP_KEY);
      location.reload();
    }
  }

  // ---------------------------
  // Utilidades de acceso a colecciones
  // ---------------------------

  function getConfig(collection) {
    const cfg = COLLECTIONS[collection];
    if (!cfg) throw new Error('Colección inválida: ' + collection);
    return cfg;
  }

  function getArray(collection) {
    if (!window.DB) throw new Error('DB no inicializada. Llame a initDB() primero.');
    const cfg = getConfig(collection);
    const arr = window.DB[cfg.root] && window.DB[cfg.root][cfg.array];
    if (!Array.isArray(arr)) throw new Error('Estructura inválida en DB para ' + collection);
    return arr;
  }

  function setArray(collection, newArray) {
    const cfg = getConfig(collection);
    window.DB[cfg.root][cfg.array] = Array.isArray(newArray) ? newArray : [];
  }

  // ---------------------------
  // Persistencia simulada
  // ---------------------------

  // Simular guardado en archivo: actualiza memoria, sincroniza LS y (opcional) descarga
  function saveToFile(collection, data, options = { download: false }) {
    const cfg = getConfig(collection);
    // data puede ser el array completo o el objeto raíz de la colección
    if (Array.isArray(data)) {
      window.DB[cfg.root][cfg.array] = data;
    } else if (data && typeof data === 'object') {
      window.DB[cfg.root] = data;
    }
    syncToLocalStorage();


    if (options.download) {
      downloadJSON(cfg.file, window.DB[cfg.root]);
    }
  }

  // ---------------------------
  // CRUD básico y consultas
  // ---------------------------

  // Crear nuevo registro
  function create(collection, data) {
    const cfg = getConfig(collection);
    const arr = getArray(collection);
    const idPrefix = cfg.idPrefix || 'id';
    if (!data.id) data.id = generateId(idPrefix);

    // Defaults por colección
    const now = getCurrentTimestamp();
    if (collection === 'tests') {
      if (!data.createdAt) data.createdAt = now;
      if (!Array.isArray(data.questions)) data.questions = [];
    }
    if (collection === 'assignments') {
      if (!data.assignedDate) data.assignedDate = now;
      if (!data.status) data.status = 'pending';
    }
    if (collection === 'results') {
      if (!data.submittedAt) data.submittedAt = now;
    }
    if (collection === 'users') {
      if (!data.createdAt) data.createdAt = now;
    }

    arr.push(data);
    syncToLocalStorage();


    return data;
  }

  // Obtener todos los registros de una colección
  function getAll(collection) {
    return getArray(collection).slice();
  }

  // Obtener un registro por ID
  function getById(collection, id) {
    return getArray(collection).find(item => item.id === id) || null;
  }

  // Buscar registros con filtro (función)
  function find(collection, filterFn) {
    const arr = getArray(collection);
    if (typeof filterFn !== 'function') return arr.slice();
    return arr.filter(filterFn);
  }

  // Alias: findAll(collection, filterFn)
  function findAll(collection, filter) {
    if (typeof filter === 'function') return find(collection, filter);
    // Si se pasa un objeto simple {campo:valor} como filtro
    if (filter && typeof filter === 'object') {
      return find(collection, item => {
        return Object.keys(filter).every(k => item[k] === filter[k]);
      });
    }
    return getAll(collection);
  }

  // Actualizar registro existente
  function update(collection, id, data) {
    const cfg = getConfig(collection);
    const arr = getArray(collection);
    const idx = arr.findIndex(item => item.id === id);
    if (idx === -1) {

      return null;
    }
    const updateData = Object.assign({}, arr[idx], data);
    arr[idx] = updateData;
    syncToLocalStorage();


    return updateData;
  }

  // Eliminar registro
  function remove(collection, id) {
    const cfg = getConfig(collection);
    const arr = getArray(collection);
    const idx = arr.findIndex(item => item.id === id);
    if (idx === -1) {

      return false;
    }

    arr.splice(idx, 1);
    syncToLocalStorage();

    return true;
  }

  // Validar que un ID existe
  function exists(collection, id) {
    return getArray(collection).some(item => item.id === id);
  }

  // ---------------------------
  // Consultas específicas de dominio
  // ---------------------------

  // Obtener pruebas de un consultor
  function getTestsByConsultor(consultorId) {
    return getArray('tests').filter(t => t.createdBy === consultorId);
  }

  // Obtener asignaciones de un consultante
  function getAssignmentsByConsultant(consultantId) {
    return getArray('assignments').filter(a => a.consultantId === consultantId);
  }

  // Obtener resultado por asignación
  function getResultByAssignment(assignmentId) {
    return getArray('results').find(r => r.assignmentId === assignmentId) || null;
  }

  // ---------------------------
  // Utilidades varias
  // ---------------------------

  // Generar ID único
  function generateId(prefix = 'id') {
    const rand = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${Date.now()}_${rand}`;
    // Si se desea más corto, usar: `${prefix}_${Date.now().toString(36)}`
  }

  // Fecha/hora actual ISO
  function getCurrentTimestamp() {
    return new Date().toISOString();
  }

  // Descargar JSON (opcional)
  function downloadJSON(filename, data) {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

    } catch (e) {

    }
  }

  // Validación de imagen (formatos y tamaño)
  function validateImage(file, maxMB = 2) {
    if (!file) return { ok: true, reason: '' };
    const allowed = ['image/jpeg', 'image/png', 'image/gif'];
    const okType = allowed.includes(file.type);
    const okSize = file.size <= maxMB * 1024 * 1024;
    if (!okType) return { ok: false, reason: 'Formato inválido. Solo JPG/PNG/GIF.' };
    if (!okSize) return { ok: false, reason: `Tamaño máximo ${maxMB}MB.` };
    return { ok: true, reason: '' };
  }

  // Convertir archivo a Base64 (DataURL)
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const v = validateImage(file);
      if (!v.ok) return reject(new Error(v.reason));
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result); // DataURL
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  // Guardar todas las colecciones en una carpeta usando la File System Access API
  async function saveAllCollectionsToDirectory(dirHandle) {
    if (!window.showDirectoryPicker && !dirHandle) {
      throw new Error('File System Access API no disponible en este navegador');
    }
    try {
      const targetDir = dirHandle || await window.showDirectoryPicker({ startIn: 'documents', mode: 'readwrite' });
      const collections = Object.keys(COLLECTIONS);
      for (const col of collections) {
        const cfg = COLLECTIONS[col];
        const filename = cfg.file;
        const fileHandle = await targetDir.getFileHandle(filename, { create: true });
        // Solicitar permiso de escritura si es necesario
        if (fileHandle.requestPermission) {
          await fileHandle.requestPermission({ mode: 'readwrite' });
        }
        const writable = await fileHandle.createWritable();
        const data = window.DB[cfg.root] || {};
        await writable.write(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        await writable.close();
      }
      return true;
    } catch (e) {

      throw e;
    }
  }

  // Auxiliar
  function capitalize(s) {
    return (s || '').charAt(0).toUpperCase() + (s || '').slice(1);
  }

  // Exponer API pública en window
  window.DB_API = {
    // Inicialización
    initDB,
    checkLocalStorage,
    syncToLocalStorage,
    resetDatabase,

    // Lectura
    getAll,
    getById,
    find,
    findAll,

    // Escritura
    create,
    update,
    remove,
    saveToFile,

    // Dominio
    getTestsByConsultor,
    getAssignmentsByConsultant,
    getResultByAssignment,

    // Utilidades
    generateId,
    getCurrentTimestamp,
    exists,
    downloadJSON,
    validateImage,
    fileToBase64,
    saveAllCollectionsToDirectory
  };
})();
