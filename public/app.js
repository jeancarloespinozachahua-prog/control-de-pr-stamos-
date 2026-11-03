const API = '/api';
const tokenKey = 'labcontrol_token';
const userKey = 'labcontrol_user';
let token = localStorage.getItem(tokenKey);
let user = JSON.parse(localStorage.getItem(userKey) || 'null');
let authMode = 'login';
let equipment = [];
let loans = [];
let toastTimer;

const byId = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const localDate = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};
const prettyDate = (date) => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
};
const conditionLabels = {
  bueno: 'Bueno',
  regular: 'Regular',
  en_mantenimiento: 'En mantenimiento',
  fuera_de_servicio: 'Fuera de servicio',
};

function showToast(message, isError = false) {
  const toast = byId('toast');
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3600);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${API}${path}`, { ...options, headers });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica que la API esté iniciada.');
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`El servidor respondió con un formato inesperado (${response.status}).`);
  }
  if (!response.ok) {
    if (response.status === 401 && token) logout(false);
    const error = result.error;
    const details = error?.detalles?.map((item) => item.mensaje).filter(Boolean).join('. ');
    throw new Error(details || error?.mensaje || 'Ocurrió un error al procesar la solicitud.');
  }
  return result.data;
}

function setAuthMode(mode) {
  authMode = mode;
  byId('nameField').classList.toggle('hidden', mode !== 'register');
  byId('authTitle').textContent = mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta';
  byId('authSubtitle').textContent = mode === 'login' ? 'Ingresa tus datos para continuar.' : 'Regístrate para gestionar el laboratorio.';
  byId('authSubmitText').textContent = mode === 'login' ? 'Entrar al sistema' : 'Crear cuenta';
  byId('authForm').elements.contrasena.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  document.querySelectorAll('[data-auth-mode]').forEach((button) => {
    button.classList.toggle('active', button.dataset.authMode === mode);
  });
}

function showApp() {
  byId('authView').classList.add('hidden');
  byId('appView').classList.remove('hidden');
  if (user) {
    const name = user.nombre || user.correo || 'Usuario';
    const initial = name.trim().charAt(0).toUpperCase();
    byId('userName').textContent = name;
    byId('userEmail').textContent = user.correo || '';
    byId('userAvatar').textContent = initial;
    byId('topAvatar').textContent = initial;
    byId('welcomeTitle').textContent = `${welcomeMessage()}, ${name.split(' ')[0]} 👋`;
  }
  byId('todayLabel').textContent = new Intl.DateTimeFormat('es-PE', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date());
  refreshDashboard().catch((error) => showToast(error.message, true));
}

function welcomeMessage() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function logout(showMessage = true) {
  token = null;
  user = null;
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
  byId('appView').classList.add('hidden');
  byId('authView').classList.remove('hidden');
  if (showMessage) showToast('Sesión cerrada correctamente.');
}

async function loadDashboardData() {
  const [equipmentData, loanData] = await Promise.all([
    api('/equipos?limit=100'),
    api('/prestamos?limit=100'),
  ]);
  equipment = equipmentData;
  loans = loanData;
}

function loanState(loan) {
  if (loan.fecha_devolucion) return 'returned';
  return loan.fecha_prevista < localDate() ? 'overdue' : 'active';
}

function stateBadge(state) {
  const labels = { available: 'Disponible', unavailable: 'En préstamo', active: 'Activo', overdue: 'Vencido', returned: 'Devuelto' };
  return `<span class="badge ${state}">${labels[state]}</span>`;
}

function equipmentName(loan) {
  return loan.equipo?.nombre || equipment.find((item) => item.id === loan.equipo_id)?.nombre || 'Equipo';
}

function equipmentCode(loan) {
  return loan.equipo?.codigo || equipment.find((item) => item.id === loan.equipo_id)?.codigo || '—';
}

function renderLoans(items, limit = items.length, includeAction = false) {
  const visible = items.slice(0, limit);
  if (!visible.length) return '<div class="empty-state">Todavía no hay préstamos para mostrar.</div>';
  return `<table class="data-table"><thead><tr><th>EQUIPO</th><th>PRESTATARIO</th><th>FECHA DE PRÉSTAMO</th><th>DEVOLUCIÓN PREVISTA</th><th>ESTADO</th>${includeAction ? '<th>ACCIÓN</th>' : ''}</tr></thead><tbody>${visible.map((loan) => {
    const state = loanState(loan);
    return `<tr><td><span class="primary-cell">${escapeHtml(equipmentName(loan))}<span class="secondary-cell">${escapeHtml(equipmentCode(loan))}</span></span></td><td>${escapeHtml(loan.prestatario)}</td><td>${prettyDate(loan.fecha_prestamo)}</td><td>${prettyDate(loan.fecha_prevista)}</td><td>${stateBadge(state)}</td>${includeAction ? `<td>${state !== 'returned' ? `<button type="button" class="row-action" data-return-loan="${loan.id}">Devolver</button>` : '<span class="secondary-cell">Completado</span>'}</td>` : ''}</tr>`;
  }).join('')}</tbody></table>`;
}

function renderEquipment(items, limit = items.length) {
  const visible = items.slice(0, limit);
  if (!visible.length) return '<div class="empty-state">No hay equipos registrados todavía.</div>';
  return `<table class="data-table"><thead><tr><th>EQUIPO</th><th>CATEGORÍA</th><th>CONDICIÓN</th><th>DISPONIBILIDAD</th></tr></thead><tbody>${visible.map((item) => `<tr><td><span class="primary-cell">${escapeHtml(item.nombre)}<span class="secondary-cell"><span class="code-pill">${escapeHtml(item.codigo)}</span></span></span></td><td>${escapeHtml(item.categoria)}</td><td><span class="condition">${escapeHtml(conditionLabels[item.condicion_uso] || item.condicion_uso)}</span></td><td>${stateBadge(item.disponible ? 'available' : 'unavailable')}</td></tr>`).join('')}</tbody></table>`;
}

function renderEquipmentPreview() {
  const items = equipment.slice(0, 6);
  byId('equipmentPreview').innerHTML = items.length
    ? items.map((item) => `<article class="equipment-card"><div class="equipment-icon">▦</div><div class="equipment-card-info"><strong>${escapeHtml(item.nombre)}</strong><span>${escapeHtml(item.codigo)} · ${escapeHtml(item.categoria)}</span></div>${stateBadge(item.disponible ? 'available' : 'unavailable')}</article>`).join('')
    : '<div class="empty-state">Agrega equipos para ver el estado de tu inventario.</div>';
}

function renderDashboard() {
  const active = loans.filter((loan) => loanState(loan) !== 'returned');
  const overdue = active.filter((loan) => loanState(loan) === 'overdue');
  byId('totalEquipment').textContent = equipment.length;
  byId('totalActive').textContent = active.length;
  byId('totalAvailable').textContent = equipment.filter((item) => item.disponible).length;
  byId('totalOverdue').textContent = overdue.length;
  byId('activeLoanBadge').textContent = active.length;
  byId('recentLoans').innerHTML = renderLoans(loans, 5);
  byId('equipmentTable').innerHTML = renderEquipment(filterEquipment());
  byId('equipmentPreview').innerHTML = '';
  renderEquipmentPreview();
  byId('loansTable').innerHTML = renderLoans(filterLoans(), loans.length, true);
  updateLoanEquipmentOptions();
}

async function refreshDashboard() {
  await loadDashboardData();
  renderDashboard();
}

function filterEquipment() {
  const query = byId('equipmentSearch').value.trim().toLowerCase();
  const availability = byId('equipmentAvailability').value;
  return equipment.filter((item) => {
    const matchesText = !query || `${item.nombre} ${item.codigo} ${item.categoria}`.toLowerCase().includes(query);
    const matchesAvailability = availability === '' || String(item.disponible) === availability;
    return matchesText && matchesAvailability;
  });
}

function filterLoans() {
  const query = byId('loanSearch').value.trim().toLowerCase();
  const filter = byId('loanFilter').value;
  return loans.filter((loan) => {
    const matchesText = !query || `${loan.prestatario || ''} ${equipmentName(loan)} ${equipmentCode(loan)}`.toLowerCase().includes(query);
    const state = loanState(loan);
    const matchesState = !filter || (filter === 'active' ? state === 'active' : filter === 'overdue' ? state === 'overdue' : state === 'returned');
    return matchesText && matchesState;
  });
}

function updateLoanEquipmentOptions() {
  const available = equipment.filter((item) => item.disponible && ['bueno', 'regular'].includes(item.condicion_uso));
  byId('loanEquipment').innerHTML = `<option value="">Selecciona un equipo</option>${available.map((item) => `<option value="${item.id}">${escapeHtml(item.codigo)} · ${escapeHtml(item.nombre)}</option>`).join('')}`;
}

function navigate(page) {
  const pages = { overview: 'Resumen', equipment: 'Equipos', loans: 'Préstamos' };
  document.querySelectorAll('.page').forEach((item) => item.classList.toggle('hidden', item.id !== `${page}Page`));
  document.querySelectorAll('.nav-link').forEach((item) => item.classList.toggle('active', item.dataset.page === page));
  byId('pageCrumb').textContent = pages[page] || pages.overview;
}

function openReturnModal(loanId) {
  const loan = loans.find((item) => item.id === Number(loanId));
  if (!loan) return;
  const form = byId('returnForm');
  form.elements.prestamo_id.value = loan.id;
  form.elements.fecha_devolucion.value = localDate();
  form.elements.condicion_uso.value = '';
  byId('returnDescription').textContent = `${equipmentName(loan)} (${equipmentCode(loan)}) será registrado como devuelto por ${loan.prestatario}.`;
  byId('returnModal').showModal();
}

document.querySelectorAll('[data-auth-mode]').forEach((button) => button.addEventListener('click', () => setAuthMode(button.dataset.authMode)));
byId('authForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    if (authMode === 'register') {
      await api('/auth/registro', { method: 'POST', body: JSON.stringify(data) });
      data.correo = data.correo.toLowerCase();
      delete data.nombre;
    }
    const result = await api('/auth/login', { method: 'POST', body: JSON.stringify(data) });
    token = result.token;
    user = result.usuario;
    localStorage.setItem(tokenKey, token);
    localStorage.setItem(userKey, JSON.stringify(user));
    form.reset();
    showApp();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    submit.disabled = false;
  }
});

document.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.page)));
byId('logoutButton').addEventListener('click', () => logout());
document.querySelectorAll('[data-open-modal]').forEach((button) => button.addEventListener('click', () => {
  if (button.dataset.openModal === 'loanModal') {
    byId('loanStartDate').value = localDate();
    const due = new Date();
    due.setDate(due.getDate() + 7);
    byId('loanDueDate').value = localDate(due);
  }
  byId(button.dataset.openModal).showModal();
}));
document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
byId('equipmentSearch').addEventListener('input', () => { byId('equipmentTable').innerHTML = renderEquipment(filterEquipment()); });
byId('equipmentAvailability').addEventListener('change', () => { byId('equipmentTable').innerHTML = renderEquipment(filterEquipment()); });
byId('loanSearch').addEventListener('input', () => { byId('loansTable').innerHTML = renderLoans(filterLoans(), loans.length, true); });
byId('loanFilter').addEventListener('change', () => { byId('loansTable').innerHTML = renderLoans(filterLoans(), loans.length, true); });
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-return-loan]');
  if (button) openReturnModal(button.dataset.returnLoan);
});

byId('equipmentForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await api('/equipos', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    form.reset();
    byId('equipmentModal').close();
    await refreshDashboard();
    showToast('Equipo agregado correctamente.');
  } catch (error) {
    showToast(error.message, true);
  } finally {
    button.disabled = false;
  }
});

byId('loanForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form));
  if (!data.fecha_prestamo) delete data.fecha_prestamo;
  data.equipo_id = Number(data.equipo_id);
  button.disabled = true;
  try {
    await api('/prestamos', { method: 'POST', body: JSON.stringify(data) });
    form.reset();
    byId('loanModal').close();
    await refreshDashboard();
    showToast('Préstamo registrado correctamente.');
  } catch (error) {
    showToast(error.message, true);
  } finally {
    button.disabled = false;
  }
});

byId('returnForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form));
  const loanId = data.prestamo_id;
  delete data.prestamo_id;
  Object.keys(data).forEach((key) => { if (!data[key]) delete data[key]; });
  button.disabled = true;
  try {
    await api(`/prestamos/${loanId}/devolucion`, { method: 'PUT', body: JSON.stringify(data) });
    byId('returnModal').close();
    await refreshDashboard();
    showToast('Devolución registrada correctamente.');
  } catch (error) {
    showToast(error.message, true);
  } finally {
    button.disabled = false;
  }
});

if (token && user) showApp();
