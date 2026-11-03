'use strict';

/* Interfaz del Control de Préstamos de Laboratorio.
 * Todo el contenido que viene de la API se inserta con textContent (nunca innerHTML)
 * para evitar XSS. */

const API = '/api';
let apiBase = ''; // vacío = mismo servidor que sirve la página
const LIMITE = 10;
const PRESTABLES = ['bueno', 'regular'];
const ETIQUETA_CONDICION = {
  bueno: 'Bueno',
  regular: 'Regular',
  en_mantenimiento: 'En mantenimiento',
  fuera_de_servicio: 'Fuera de servicio',
};
const CLASE_CONDICION = { bueno: 'verde', regular: 'azul', en_mantenimiento: 'naranja', fuera_de_servicio: 'rojo' };
const CLASE_ESTADO = { activo: 'azul', vencido: 'rojo', devuelto: 'verde' };

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

/* ---------- Sesión (localStorage puede fallar: se protege) ---------- */
const memoria = {};
const guardar = {
  leer(k) { try { return localStorage.getItem(k); } catch { return memoria[k] || null; } },
  poner(k, v) { try { localStorage.setItem(k, v); } catch { memoria[k] = v; } },
  quitar(k) { try { localStorage.removeItem(k); } catch { delete memoria[k]; } },
};

const estado = {
  token: guardar.leer('token'),
  usuario: null,
  equipos: { page: 1, filtros: {} },
  prestamos: { page: 1, filtros: {} },
  prestamoEnCurso: null, // equipo a prestar
  devolucionEnCurso: null, // préstamo a devolver
  equipoEnEdicion: null,
};

/* ---------- Utilidades ---------- */
function h(tag, props = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const hijo of hijos.flat()) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo.nodeType ? hijo : document.createTextNode(String(hijo)));
  }
  return el;
}

const hoyISO = () => new Date().toLocaleDateString('en-CA'); // AAAA-MM-DD en hora local
const sumarDias = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString('en-CA');
};
const fechaCorta = (iso) => {
  if (!iso) return '—';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
};

function insignia(texto, clase) {
  return h('span', { class: `insignia ${clase || ''}` }, texto);
}

function aviso(mensaje, tipo = 'ok') {
  const t = h('div', { class: `toast ${tipo === 'error' ? 'error' : ''}`, role: 'status' }, mensaje);
  $('#toasts').append(t);
  setTimeout(() => t.remove(), 4500);
}

class ErrorApi extends Error {
  constructor(mensaje, estadoHttp, detalles) {
    super(mensaje);
    this.estadoHttp = estadoHttp;
    this.detalles = detalles;
  }
}

function textoError(err) {
  if (err instanceof ErrorApi && Array.isArray(err.detalles) && err.detalles.length > 1) {
    return err.detalles.map((d) => `• ${d.mensaje}`).join('\n');
  }
  return err.message || 'Ocurrió un error inesperado';
}

async function api(ruta, { metodo = 'GET', cuerpo, params } = {}) {
  const url = new URL(apiBase + API + ruta, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== '' && v !== null && v !== undefined) url.searchParams.set(k, v);
    }
  }
  const cabeceras = {};
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
  if (estado.token) cabeceras.Authorization = `Bearer ${estado.token}`;

  let resp;
  try {
    resp = await fetch(url, { method: metodo, headers: cabeceras, body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined });
  } catch {
    throw new ErrorApi('No se pudo conectar con el servidor. ¿Está encendido (npm run dev)?', 0);
  }
  let json = null;
  try { json = await resp.json(); } catch { /* respuesta sin JSON */ }

  if (!resp.ok || !json || json.ok === false) {
    if (resp.status === 401 && estado.token && !ruta.startsWith('/auth/login')) {
      cerrarSesion();
      aviso('Su sesión expiró. Ingrese nuevamente.', 'error');
    }
    const e = json && json.error;
    throw new ErrorApi(e ? e.mensaje : `Error ${resp.status}`, resp.status, e && e.detalles);
  }
  return json;
}

/* ---------- Diálogos ---------- */
function abrir(dlg) { if (!dlg.open) dlg.showModal(); }
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-cerrar]');
  if (btn) btn.closest('dialog').close();
});

function confirmar({ titulo, texto, boton = 'Eliminar' }) {
  return new Promise((resolver) => {
    const dlg = $('#dlg-confirmar');
    $('#confirmar-titulo').textContent = titulo;
    $('#confirmar-texto').textContent = texto;
    $('#confirmar-ok').textContent = boton;
    let respuesta = false;
    const form = $('form', dlg);
    const alEnviar = (ev) => { ev.preventDefault(); respuesta = true; dlg.close(); };
    const alCerrar = () => {
      form.removeEventListener('submit', alEnviar);
      dlg.removeEventListener('close', alCerrar);
      resolver(respuesta);
    };
    form.addEventListener('submit', alEnviar);
    dlg.addEventListener('close', alCerrar);
    abrir(dlg);
  });
}

/* Ejecuta una acción de formulario mostrando errores dentro del propio formulario. */
async function enviarFormulario(form, accion) {
  const zonaError = $('[data-error]', form);
  const boton = $('button[type="submit"]', form);
  zonaError.textContent = '';
  boton.disabled = true;
  try {
    await accion();
    return true;
  } catch (err) {
    zonaError.textContent = textoError(err);
    return false;
  } finally {
    boton.disabled = false;
  }
}

/* ---------- Vistas ---------- */
function mostrarAuth() {
  $('#vista-app').hidden = true;
  $('#vista-auth').hidden = false;
}

function mostrarApp() {
  $('#vista-auth').hidden = true;
  $('#vista-app').hidden = false;
  $('#usuario-nombre').textContent = estado.usuario ? estado.usuario.nombre : '';
  cargarResumen();
  cargarEquipos();
  cargarPrestamos();
}

function cerrarSesion() {
  estado.token = null;
  estado.usuario = null;
  guardar.quitar('token');
  mostrarAuth();
}

function cambiarSeccion(nombre) {
  $$('.nav-btn').forEach((b) => b.classList.toggle('activa', b.dataset.seccion === nombre));
  $('#sec-equipos').hidden = nombre !== 'equipos';
  $('#sec-prestamos').hidden = nombre !== 'prestamos';
}

/* ---------- Detección del servidor ---------- */
async function responde(base) {
  try {
    const r = await fetch(`${base}${API}/health`);
    const j = await r.json();
    return j && j.ok === true;
  } catch { return false; }
}

// Si la página no la sirve la API (Live Server, archivo abierto con doble clic...), busca la API en localhost:3000-3010.
async function detectarApi() {
  const candidatos = [''];
  for (let p = 3000; p <= 3010; p++) candidatos.push(`http://localhost:${p}`);
  for (const base of candidatos) {
    if (await responde(base)) { apiBase = base; return true; }
  }
  return false;
}

/* ---------- Autenticación (acceso libre) ---------- */
async function entrar(correo, contrasena) {
  const r = await api('/auth/acceso', { metodo: 'POST', cuerpo: { correo, contrasena } });
  estado.token = r.data.token;
  estado.usuario = r.data.usuario;
  guardar.poner('token', estado.token);
  mostrarApp();
}

$('#form-login').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  enviarFormulario(f, async () => {
    if (!(await detectarApi())) {
      throw new ErrorApi('No se encontró el servidor. Ejecute "npm run dev" en la carpeta del proyecto.', 0);
    }
    await entrar(f.correo.value.trim(), f.contrasena.value);
  });
});

$('#btn-salir').addEventListener('click', cerrarSesion);
$$('.nav-btn').forEach((b) => b.addEventListener('click', () => cambiarSeccion(b.dataset.seccion)));

/* ---------- Resumen ---------- */
async function cargarResumen() {
  try {
    const total = (ruta, params) => api(ruta, { params: { ...params, limit: 1 } }).then((r) => r.meta.total);
    const [equipos, disponibles, sinDevolver, vencidos] = await Promise.all([
      total('/equipos'),
      total('/equipos', { disponible: 'true' }),
      total('/prestamos', { activos: 'true' }),
      total('/prestamos', { vencidos: 'true' }),
    ]);
    $('#res-equipos').textContent = equipos;
    $('#res-disponibles').textContent = disponibles;
    $('#res-prestados').textContent = sinDevolver;
    $('#res-vencidos').textContent = vencidos;
  } catch { /* el resumen es informativo; los errores se ven en las tablas */ }
}

/* ---------- Paginación ---------- */
function dibujarPaginacion(cont, meta, alCambiar) {
  cont.replaceChildren(
    h('button', { class: 'btn btn-secundario btn-chico', disabled: meta.page <= 1, onclick: () => alCambiar(meta.page - 1) }, '← Anterior'),
    h('span', {}, `Página ${meta.page} de ${meta.paginas} · ${meta.total} registro(s)`),
    h('button', { class: 'btn btn-secundario btn-chico', disabled: meta.page >= meta.paginas, onclick: () => alCambiar(meta.page + 1) }, 'Siguiente →')
  );
}

function filaVacia(columnas, texto) {
  return h('tr', {}, h('td', { class: 'vacio', colspan: columnas }, texto));
}

/* ---------- Equipos ---------- */
async function cargarEquipos(page = estado.equipos.page) {
  estado.equipos.page = page;
  const cuerpo = $('#tbody-equipos');
  try {
    const r = await api('/equipos', { params: { ...estado.equipos.filtros, page, limit: LIMITE } });
    if (!r.data.length) {
      cuerpo.replaceChildren(filaVacia(6, 'No hay equipos que coincidan.'));
    } else {
      cuerpo.replaceChildren(...r.data.map(filaEquipo));
    }
    dibujarPaginacion($('#pag-equipos'), r.meta, cargarEquipos);
    const categorias = [...new Set(r.data.map((e) => e.categoria))];
    $('#lista-categorias').replaceChildren(...categorias.map((c) => h('option', { value: c })));
  } catch (err) {
    cuerpo.replaceChildren(filaVacia(6, textoError(err)));
  }
}

function filaEquipo(eq) {
  const prestable = PRESTABLES.includes(eq.condicion_uso);
  return h('tr', {},
    h('td', {}, h('strong', {}, eq.codigo)),
    h('td', {}, eq.nombre),
    h('td', {}, eq.categoria),
    h('td', {}, insignia(ETIQUETA_CONDICION[eq.condicion_uso] || eq.condicion_uso, CLASE_CONDICION[eq.condicion_uso])),
    h('td', {}, eq.disponible ? insignia('Disponible', 'verde') : insignia('Prestado', 'naranja')),
    h('td', { class: 'acciones' },
      h('button', {
        class: 'btn btn-primario btn-chico',
        disabled: !eq.disponible || !prestable,
        title: !prestable ? 'La condición del equipo no permite prestarlo' : !eq.disponible ? 'Ya está prestado' : '',
        onclick: () => abrirPrestamo(eq),
      }, 'Prestar'),
      h('button', { class: 'btn btn-secundario btn-chico', onclick: () => abrirHistorial(eq) }, 'Historial'),
      h('button', { class: 'btn btn-secundario btn-chico', onclick: () => abrirEquipo(eq) }, 'Editar'),
      h('button', { class: 'btn btn-secundario btn-chico', onclick: () => eliminarEquipo(eq) }, 'Eliminar')
    )
  );
}

$('#filtros-equipos').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  estado.equipos.filtros = { q: f.q.value.trim(), condicion_uso: f.condicion_uso.value, disponible: f.disponible.value };
  cargarEquipos(1);
});

function abrirEquipo(eq = null) {
  estado.equipoEnEdicion = eq;
  const f = $('#form-equipo');
  $('#dlg-equipo-titulo').textContent = eq ? `Editar equipo ${eq.codigo}` : 'Nuevo equipo';
  f.codigo.value = eq ? eq.codigo : '';
  f.nombre.value = eq ? eq.nombre : '';
  f.categoria.value = eq ? eq.categoria : '';
  f.condicion_uso.value = eq ? eq.condicion_uso : 'bueno';
  $('[data-error]', f).textContent = '';
  abrir($('#dlg-equipo'));
  f.codigo.focus();
}

$('#btn-nuevo-equipo').addEventListener('click', () => abrirEquipo());

$('#form-equipo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const datos = { codigo: f.codigo.value.trim(), nombre: f.nombre.value.trim(), categoria: f.categoria.value.trim(), condicion_uso: f.condicion_uso.value };
  const edicion = estado.equipoEnEdicion;
  const ok = await enviarFormulario(f, () =>
    edicion ? api(`/equipos/${edicion.id}`, { metodo: 'PUT', cuerpo: datos }) : api('/equipos', { metodo: 'POST', cuerpo: datos })
  );
  if (ok) {
    $('#dlg-equipo').close();
    aviso(edicion ? 'Equipo actualizado' : 'Equipo creado');
    cargarEquipos();
    cargarResumen();
  }
});

async function eliminarEquipo(eq) {
  const si = await confirmar({ titulo: 'Eliminar equipo', texto: `¿Eliminar el equipo ${eq.codigo} — ${eq.nombre}? Esta acción no se puede deshacer.` });
  if (!si) return;
  try {
    await api(`/equipos/${eq.id}`, { metodo: 'DELETE' });
    aviso(`Equipo ${eq.codigo} eliminado`);
    cargarEquipos();
    cargarResumen();
  } catch (err) {
    aviso(textoError(err), 'error');
  }
}

/* ---------- Historial de un equipo ---------- */
async function abrirHistorial(eq) {
  $('#historial-titulo').textContent = `Historial de ${eq.codigo} — ${eq.nombre}`;
  const cuerpo = $('#tbody-historial');
  cuerpo.replaceChildren(filaVacia(6, 'Cargando…'));
  abrir($('#dlg-historial'));
  try {
    const r = await api(`/equipos/${eq.id}/historial`, { params: { limit: 100 } });
    const lista = r.data.prestamos;
    cuerpo.replaceChildren(
      ...(lista.length
        ? lista.map((p) =>
            h('tr', {},
              h('td', {}, p.id),
              h('td', {}, p.prestatario),
              h('td', {}, fechaCorta(p.fecha_prestamo)),
              h('td', {}, fechaCorta(p.fecha_prevista)),
              h('td', {}, fechaCorta(p.fecha_devolucion)),
              h('td', {}, insignia(p.estado, CLASE_ESTADO[p.estado]))
            ))
        : [filaVacia(6, 'Este equipo todavía no tiene préstamos.')])
    );
  } catch (err) {
    cuerpo.replaceChildren(filaVacia(6, textoError(err)));
  }
}

/* ---------- Registrar préstamo ---------- */
function abrirPrestamo(eq) {
  estado.prestamoEnCurso = eq;
  const f = $('#form-prestamo');
  $('#prestamo-equipo').textContent = `${eq.codigo} — ${eq.nombre}`;
  f.prestatario.value = '';
  f.fecha_prestamo.value = hoyISO();
  f.fecha_prevista.value = sumarDias(7);
  $('[data-error]', f).textContent = '';
  abrir($('#dlg-prestamo'));
  f.prestatario.focus();
}

$('#form-prestamo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const ok = await enviarFormulario(f, () =>
    api('/prestamos', {
      metodo: 'POST',
      cuerpo: {
        equipo_id: estado.prestamoEnCurso.id,
        prestatario: f.prestatario.value.trim(),
        fecha_prestamo: f.fecha_prestamo.value,
        fecha_prevista: f.fecha_prevista.value,
      },
    })
  );
  if (ok) {
    $('#dlg-prestamo').close();
    aviso('Préstamo registrado');
    cargarEquipos();
    cargarPrestamos();
    cargarResumen();
  }
});

/* ---------- Préstamos ---------- */
function paramsPrestamos(f) {
  const p = {};
  if (f.prestatario) p.prestatario = f.prestatario;
  if (f.estado === 'sin_devolver') p.activos = 'true';
  if (f.estado === 'devueltos') p.activos = 'false';
  if (f.estado === 'vencidos') p.vencidos = 'true';
  return p;
}

async function cargarPrestamos(page = estado.prestamos.page) {
  estado.prestamos.page = page;
  const cuerpo = $('#tbody-prestamos');
  try {
    const r = await api('/prestamos', { params: { ...paramsPrestamos(estado.prestamos.filtros), page, limit: LIMITE } });
    cuerpo.replaceChildren(...(r.data.length ? r.data.map(filaPrestamo) : [filaVacia(8, 'No hay préstamos que coincidan.')]));
    dibujarPaginacion($('#pag-prestamos'), r.meta, cargarPrestamos);
  } catch (err) {
    cuerpo.replaceChildren(filaVacia(8, textoError(err)));
  }
}

function filaPrestamo(p) {
  return h('tr', {},
    h('td', {}, p.id),
    h('td', {}, p.equipo ? `${p.equipo.codigo} · ${p.equipo.nombre}` : `#${p.equipo_id}`),
    h('td', {}, p.prestatario),
    h('td', {}, fechaCorta(p.fecha_prestamo)),
    h('td', {}, fechaCorta(p.fecha_prevista)),
    h('td', {}, fechaCorta(p.fecha_devolucion)),
    h('td', {}, insignia(p.estado, CLASE_ESTADO[p.estado])),
    h('td', { class: 'acciones' },
      p.fecha_devolucion ? null : h('button', { class: 'btn btn-primario btn-chico', onclick: () => abrirDevolucion(p) }, 'Devolver')
    )
  );
}

$('#filtros-prestamos').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  estado.prestamos.filtros = { prestatario: f.prestatario.value.trim(), estado: f.estado.value };
  cargarPrestamos(1);
});

function abrirDevolucion(p) {
  estado.devolucionEnCurso = p;
  const f = $('#form-devolucion');
  $('#devolucion-info').textContent = `${p.equipo ? p.equipo.codigo + ' — ' : ''}prestado a ${p.prestatario}`;
  f.fecha_devolucion.value = hoyISO();
  f.condicion_uso.value = '';
  $('[data-error]', f).textContent = '';
  abrir($('#dlg-devolucion'));
}

$('#form-devolucion').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const cuerpo = { fecha_devolucion: f.fecha_devolucion.value };
  if (f.condicion_uso.value) cuerpo.condicion_uso = f.condicion_uso.value;
  const ok = await enviarFormulario(f, () => api(`/prestamos/${estado.devolucionEnCurso.id}/devolucion`, { metodo: 'PUT', cuerpo }));
  if (ok) {
    $('#dlg-devolucion').close();
    aviso('Devolución registrada');
    cargarEquipos();
    cargarPrestamos();
    cargarResumen();
  }
});

/* ---------- Arranque ---------- */
async function arrancar() {
  if (!estado.token) return mostrarAuth();
  try {
    if (!(await detectarApi())) throw new Error('sin servidor');
    const r = await api('/auth/perfil');
    estado.usuario = r.data;
    mostrarApp();
  } catch {
    cerrarSesion();
  }
}

arrancar();
