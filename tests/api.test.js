const request = require('supertest');
const jwt = require('jsonwebtoken');
const { Sequelize } = require('sequelize');
const app = require('../src/app');
const { sequelize, Prestamo } = require('../src/models');
const config = require('../src/config/env');
const dbConfig = require('../src/config/database').test;

const api = () => request(app);
const HOY = new Intl.DateTimeFormat('en-CA', { timeZone: config.zonaHoraria }).format(new Date());
const sumar = (dias) => {
  const d = new Date(`${HOY}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

let token;
const auth = (req) => req.set('Authorization', `Bearer ${token}`);
const crearEquipo = async (extra = {}) => {
  const n = Math.random().toString(36).slice(2, 8).toUpperCase();
  const r = await auth(api().post('/api/equipos')).send({ codigo: `T-${n}`, nombre: 'Equipo de prueba', categoria: 'Pruebas', ...extra });
  expect(r.status).toBe(201);
  return r.body.data;
};

beforeAll(async () => {
  await sequelize.query('DELETE FROM prestamos');
  await sequelize.query('DELETE FROM equipos');
  await sequelize.query('DELETE FROM usuarios');
});
afterAll(async () => { await sequelize.close(); });

describe('Autenticación', () => {
  const usuario = { nombre: 'Alumno Prueba', correo: 'Alumno@Correo.test', contrasena: 'Clave12345' };

  test('registro válido responde 201 y NO expone el hash', async () => {
    const r = await api().post('/api/auth/registro').send(usuario);
    expect(r.status).toBe(201);
    expect(r.body.data.correo).toBe('alumno@correo.test'); // normalizado a minúsculas
    expect(JSON.stringify(r.body)).not.toMatch(/hash|\$2[aby]\$/);
  });

  test('la contraseña se guarda con hash bcrypt (no en texto plano)', async () => {
    const [[fila]] = await sequelize.query("SELECT contrasena_hash FROM usuarios WHERE correo = 'alumno@correo.test'");
    expect(fila.contrasena_hash).toMatch(/^\$2[aby]\$/);
    expect(fila.contrasena_hash).not.toContain('Clave12345');
  });

  test('correo repetido responde 409 (aunque cambie mayúsculas)', async () => {
    const r = await api().post('/api/auth/registro').send({ ...usuario, correo: 'ALUMNO@correo.test' });
    expect(r.status).toBe(409);
    expect(r.body.error.codigo).toBe('CORREO_DUPLICADO');
  });

  test.each([
    [{ nombre: 'A', correo: 'x@y.test', contrasena: 'Clave12345' }, 'nombre'],
    [{ nombre: 'Alumno', correo: 'no-es-correo', contrasena: 'Clave12345' }, 'correo'],
    [{ nombre: 'Alumno', correo: 'b@y.test', contrasena: 'corta1' }, 'contrasena'],
    [{ nombre: 'Alumno', correo: 'b@y.test', contrasena: 'soloLetrasAqui' }, 'contrasena'],
    [{ nombre: 'Alumno', correo: 'b@y.test' }, 'contrasena'],
    [{ nombre: 'Alumno', correo: 'b@y.test', contrasena: 'Clave12345', rol: 'admin' }, '(cuerpo)'],
  ])('registro inválido %j responde 400 indicando el campo', async (cuerpo, campo) => {
    const r = await api().post('/api/auth/registro').send(cuerpo);
    expect(r.status).toBe(400);
    expect(r.body.error.detalles.map((d) => d.campo)).toContain(campo);
  });

  test('JSON mal formado responde 400', async () => {
    const r = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{"correo": ');
    expect(r.status).toBe(400);
    expect(r.body.error.codigo).toBe('JSON_INVALIDO');
  });

  test('login correcto entrega un JWT firmado con expiración', async () => {
    const r = await api().post('/api/auth/login').send({ correo: 'alumno@correo.test', contrasena: 'Clave12345' });
    expect(r.status).toBe(200);
    const decodificado = jwt.verify(r.body.data.token, config.jwt.secreto, { algorithms: ['HS256'] });
    expect(decodificado.exp).toBeGreaterThan(decodificado.iat);
    token = r.body.data.token;
  });

  test('login con contraseña o correo incorrectos responde 401 con el mismo mensaje', async () => {
    const a = await api().post('/api/auth/login').send({ correo: 'alumno@correo.test', contrasena: 'Equivocada1' });
    const b = await api().post('/api/auth/login').send({ correo: 'nadie@correo.test', contrasena: 'Clave12345' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error.mensaje).toBe(b.body.error.mensaje); // no revela si el correo existe
  });
});

describe('Seguridad JWT: acceso sin token o con token inválido → 401', () => {
  const rutas = [
    ['get', '/api/equipos'], ['post', '/api/equipos'], ['get', '/api/equipos/1'], ['put', '/api/equipos/1'],
    ['delete', '/api/equipos/1'], ['get', '/api/prestamos'], ['post', '/api/prestamos'], ['put', '/api/prestamos/1/devolucion'],
  ];

  test.each(rutas)('%s %s sin token', async (metodo, ruta) => {
    const r = await api()[metodo](ruta).send({});
    expect(r.status).toBe(401);
    expect(r.body.ok).toBe(false);
  });

  test('token con basura', async () => {
    const r = await api().get('/api/equipos').set('Authorization', 'Bearer abc.def.ghi');
    expect(r.status).toBe(401);
    expect(r.body.error.codigo).toBe('TOKEN_INVALIDO');
  });

  test('token firmado con otro secreto', async () => {
    const falso = jwt.sign({ sub: '1' }, 'otro-secreto-distinto-de-32-caracteres-o-mas!!');
    const r = await api().get('/api/equipos').set('Authorization', `Bearer ${falso}`);
    expect(r.status).toBe(401);
  });

  test('token con algoritmo "none" es rechazado', async () => {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const sinFirma = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: '1' })}.`;
    const r = await api().get('/api/equipos').set('Authorization', `Bearer ${sinFirma}`);
    expect(r.status).toBe(401);
  });

  test('token expirado responde 401 TOKEN_EXPIRADO', async () => {
    const viejo = jwt.sign({ sub: '1' }, config.jwt.secreto, { algorithm: 'HS256', expiresIn: -10 });
    const r = await api().get('/api/equipos').set('Authorization', `Bearer ${viejo}`);
    expect(r.status).toBe(401);
    expect(r.body.error.codigo).toBe('TOKEN_EXPIRADO');
  });

  test('token válido de un usuario que ya no existe responde 401', async () => {
    const huerfano = jwt.sign({ sub: '99999' }, config.jwt.secreto, { algorithm: 'HS256', expiresIn: '1h' });
    const r = await api().get('/api/equipos').set('Authorization', `Bearer ${huerfano}`);
    expect(r.status).toBe(401);
  });

  test('esquema distinto de Bearer es rechazado', async () => {
    const r = await api().get('/api/equipos').set('Authorization', `Basic ${token}`);
    expect(r.status).toBe(401);
  });

  test('perfil con token válido', async () => {
    const r = await auth(api().get('/api/auth/perfil'));
    expect(r.status).toBe(200);
    expect(r.body.data.correo).toBe('alumno@correo.test');
  });
});

describe('Equipos (CRUD)', () => {
  let equipo;

  test('crear equipo → 201, código normalizado a mayúsculas y disponible', async () => {
    const r = await auth(api().post('/api/equipos')).send({ codigo: ' eq-100 ', nombre: 'Osciloscopio', categoria: 'Electrónica' });
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({ codigo: 'EQ-100', condicion_uso: 'bueno', disponible: true });
    equipo = r.body.data;
  });

  test('código repetido → 409 (sin distinguir mayúsculas)', async () => {
    const r = await auth(api().post('/api/equipos')).send({ codigo: 'eq-100', nombre: 'Otro', categoria: 'X' });
    expect(r.status).toBe(409);
    expect(r.body.error.codigo).toBe('CODIGO_DUPLICADO');
  });

  test('datos incompletos o inválidos → 400 con el detalle de cada campo', async () => {
    const r = await auth(api().post('/api/equipos')).send({ codigo: 'a b', condicion_uso: 'roto' });
    expect(r.status).toBe(400);
    const campos = r.body.error.detalles.map((d) => d.campo);
    expect(campos).toEqual(expect.arrayContaining(['codigo', 'nombre', 'categoria', 'condicion_uso']));
  });

  test('consultar por id incluye disponible y prestamo_activo', async () => {
    const r = await auth(api().get(`/api/equipos/${equipo.id}`));
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ codigo: 'EQ-100', disponible: true, prestamo_activo: null });
  });

  test('actualizar (PUT) cambia solo lo enviado', async () => {
    const r = await auth(api().put(`/api/equipos/${equipo.id}`)).send({ nombre: 'Osciloscopio 200 MHz' });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ nombre: 'Osciloscopio 200 MHz', categoria: 'Electrónica' });
  });

  test('actualizar con cuerpo vacío → 400; con código ajeno → 409', async () => {
    const otro = await crearEquipo();
    expect((await auth(api().put(`/api/equipos/${equipo.id}`)).send({})).status).toBe(400);
    const r = await auth(api().put(`/api/equipos/${equipo.id}`)).send({ codigo: otro.codigo });
    expect(r.status).toBe(409);
  });

  test('id inexistente → 404 en consultar, actualizar y eliminar', async () => {
    expect((await auth(api().get('/api/equipos/987654'))).status).toBe(404);
    expect((await auth(api().put('/api/equipos/987654')).send({ nombre: 'X' })).status).toBe(404);
    expect((await auth(api().delete('/api/equipos/987654'))).status).toBe(404);
  });

  test('id con formato inválido → 400 (no 500)', async () => {
    const r = await auth(api().get('/api/equipos/abc'));
    expect(r.status).toBe(400);
  });

  test('listar con búsqueda, filtros y paginación', async () => {
    await crearEquipo({ categoria: 'Redes', condicion_uso: 'regular' });
    const r = await auth(api().get('/api/equipos?categoria=Redes&limit=1&page=1'));
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveLength(1);
    expect(r.body.meta).toMatchObject({ page: 1, limit: 1 });
    const q = await auth(api().get('/api/equipos?q=eq-100'));
    expect(q.body.data.map((e) => e.codigo)).toEqual(['EQ-100']);
    expect((await auth(api().get('/api/equipos?limit=1000'))).status).toBe(400);
  });

  test('un patrón con % no se interpreta como comodín (se escapa)', async () => {
    const r = await auth(api().get('/api/equipos?q=%25'));
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveLength(0);
  });

  test("una cadena con comillas SQL se trata como dato, no como código (ORM)", async () => {
    const r = await auth(api().get("/api/equipos?q=' OR '1'='1"));
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveLength(0);
  });

  test('eliminar un equipo sin historial → 200', async () => {
    const e = await crearEquipo();
    const r = await auth(api().delete(`/api/equipos/${e.id}`));
    expect(r.status).toBe(200);
    expect((await auth(api().get(`/api/equipos/${e.id}`))).status).toBe(404);
  });
});

describe('Préstamos y reglas de negocio', () => {
  test('préstamo válido → 201, queda persistido, responsable = usuario autenticado y equipo NO disponible', async () => {
    const e = await crearEquipo();
    const r = await auth(api().post('/api/prestamos')).send({ equipo_id: e.id, prestatario: 'Ana Torres', fecha_prevista: sumar(5) });
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({ prestatario: 'Ana Torres', fecha_prestamo: HOY, fecha_devolucion: null, estado: 'activo' });
    expect(r.body.data.registrado_por.nombre).toBe('Alumno Prueba');

    const det = await auth(api().get(`/api/equipos/${e.id}`));
    expect(det.body.data.disponible).toBe(false);
    expect(det.body.data.prestamo_activo.id).toBe(r.body.data.id);
    const disp = await auth(api().get('/api/equipos?disponible=true'));
    expect(disp.body.data.map((x) => x.id)).not.toContain(e.id);
  });

  test('segundo préstamo activo del mismo equipo → 409 y NO se duplica', async () => {
    const e = await crearEquipo();
    const body = { equipo_id: e.id, prestatario: 'Luis Ramos', fecha_prevista: sumar(3) };
    expect((await auth(api().post('/api/prestamos')).send(body)).status).toBe(201);
    const r = await auth(api().post('/api/prestamos')).send({ ...body, prestatario: 'Otra Persona' });
    expect(r.status).toBe(409);
    expect(r.body.error.codigo).toBe('EQUIPO_NO_DISPONIBLE');
    expect(await Prestamo.count({ where: { equipo_id: e.id } })).toBe(1);
  });

  test('CONCURRENCIA: 12 solicitudes simultáneas por el mismo equipo → exactamente 1 éxito', async () => {
    const e = await crearEquipo();
    const intentos = Array.from({ length: 12 }, (_, i) =>
      auth(api().post('/api/prestamos')).send({ equipo_id: e.id, prestatario: `Persona ${i + 1}`, fecha_prevista: sumar(2) })
    );
    const respuestas = await Promise.all(intentos);
    const estados = respuestas.map((r) => r.status);
    expect(estados.filter((s) => s === 201)).toHaveLength(1);
    expect(estados.filter((s) => s === 409)).toHaveLength(11);
    expect(await Prestamo.count({ where: { equipo_id: e.id, fecha_devolucion: null } })).toBe(1);
  });

  test('la BASE DE DATOS misma rechaza un segundo préstamo activo (índice único), incluso saltando la API', async () => {
    const e = await crearEquipo();
    const [[u]] = await sequelize.query('SELECT id FROM usuarios LIMIT 1');
    const insertar = () => sequelize.query(
      `INSERT INTO prestamos (equipo_id, usuario_id, prestatario, fecha_prestamo, fecha_prevista) VALUES (${e.id}, ${u.id}, 'Directo SQL', '${HOY}', '${sumar(1)}')`
    );
    await insertar();
    await expect(insertar()).rejects.toMatchObject({ name: 'SequelizeUniqueConstraintError' });
  });

  test('la BASE DE DATOS rechaza fechas incoherentes (CHECK)', async () => {
    const e = await crearEquipo();
    const [[u]] = await sequelize.query('SELECT id FROM usuarios LIMIT 1');
    await expect(sequelize.query(
      `INSERT INTO prestamos (equipo_id, usuario_id, prestatario, fecha_prestamo, fecha_prevista) VALUES (${e.id}, ${u.id}, 'X', '${sumar(5)}', '${sumar(1)}')`
    )).rejects.toThrow(/ck_prestamos_fechas|CONSTRAINT/i);
  });

  test('devolución habilita el equipo y permite un nuevo préstamo', async () => {
    const e = await crearEquipo();
    const p1 = (await auth(api().post('/api/prestamos')).send({ equipo_id: e.id, prestatario: 'Primero', fecha_prevista: sumar(2) })).body.data;

    const dev = await auth(api().put(`/api/prestamos/${p1.id}/devolucion`)).send({});
    expect(dev.status).toBe(200);
    expect(dev.body.data).toMatchObject({ fecha_devolucion: HOY, estado: 'devuelto' });

    expect((await auth(api().get(`/api/equipos/${e.id}`))).body.data.disponible).toBe(true);
    const p2 = await auth(api().post('/api/prestamos')).send({ equipo_id: e.id, prestatario: 'Segundo', fecha_prevista: sumar(4) });
    expect(p2.status).toBe(201);
    expect(p2.body.data.id).not.toBe(p1.id);
  });

  test('devolver dos veces → 409; préstamo inexistente → 404', async () => {
    const e = await crearEquipo();
    const p = (await auth(api().post('/api/prestamos')).send({ equipo_id: e.id, prestatario: 'Persona', fecha_prevista: sumar(2) })).body.data;
    expect((await auth(api().put(`/api/prestamos/${p.id}/devolucion`)).send({})).status).toBe(200);
    const r = await auth(api().put(`/api/prestamos/${p.id}/devolucion`)).send({});
    expect(r.status).toBe(409);
    expect(r.body.error.codigo).toBe('PRESTAMO_YA_DEVUELTO');
    expect((await auth(api().put('/api/prestamos/987654/devolucion')).send({})).status).toBe(404);
    expect((await auth(api().get('/api/prestamos/987654'))).status).toBe(404);
  });

  test('devolución con fecha anterior al préstamo → 400', async () => {
    const e = await crearEquipo();
    const p = (await auth(api().post('/api/prestamos')).send({ equipo_id: e.id, prestatario: 'Persona', fecha_prevista: sumar(2) })).body.data;
    const r = await auth(api().put(`/api/prestamos/${p.id}/devolucion`)).send({ fecha_devolucion: sumar(-3) });
    expect(r.status).toBe(400);
    expect(r.body.error.detalles[0].campo).toBe('fecha_devolucion');
  });

  test('devolver indicando condicion_uso actualiza el equipo (p. ej. a mantenimiento)', async () => {
    const e = await crearEquipo();
    const p = (await auth(api().post('/api/prestamos')).send({ equipo_id: e.id, prestatario: 'Persona', fecha_prevista: sumar(2) })).body.data;
    await auth(api().put(`/api/prestamos/${p.id}/devolucion`)).send({ condicion_uso: 'en_mantenimiento' });
    expect((await auth(api().get(`/api/equipos/${e.id}`))).body.data.condicion_uso).toBe('en_mantenimiento');
    const r = await auth(api().post('/api/prestamos')).send({ equipo_id: e.id, prestatario: 'Otro', fecha_prevista: sumar(2) });
    expect(r.status).toBe(409);
    expect(r.body.error.codigo).toBe('EQUIPO_NO_PRESTABLE');
  });

  test.each([
    [{}, ['equipo_id', 'prestatario', 'fecha_prevista']],
    [{ equipo_id: 1, prestatario: 'Ana', fecha_prevista: '2026-02-31' }, ['fecha_prevista']],
    [{ equipo_id: 1, prestatario: 'Ana', fecha_prevista: 'mañana' }, ['fecha_prevista']],
    [{ equipo_id: 1, prestatario: 'Ana', fecha_prestamo: '2026-12-10', fecha_prevista: '2026-12-01' }, ['fecha_prevista']],
    [{ equipo_id: 1, prestatario: ' ', fecha_prevista: '2026-12-01' }, ['prestatario']],
    [{ equipo_id: 1, prestatario: 'Ana', fecha_prevista: '2026-12-01', usuario_id: 7 }, ['(cuerpo)']],
  ])('datos incompletos o incoherentes %j → 400', async (cuerpo, campos) => {
    const r = await auth(api().post('/api/prestamos')).send(cuerpo);
    expect(r.status).toBe(400);
    expect(r.body.error.detalles.map((d) => d.campo)).toEqual(expect.arrayContaining(campos));
  });

  test('fecha prevista anterior a hoy cuando no se indica fecha de préstamo → 400', async () => {
    const e = await crearEquipo();
    const r = await auth(api().post('/api/prestamos')).send({ equipo_id: e.id, prestatario: 'Ana', fecha_prevista: sumar(-1) });
    expect(r.status).toBe(400);
  });

  test('préstamo de un equipo inexistente → 404', async () => {
    const r = await auth(api().post('/api/prestamos')).send({ equipo_id: 987654, prestatario: 'Ana', fecha_prevista: sumar(2) });
    expect(r.status).toBe(404);
  });

  test('no se puede marcar como no prestable un equipo que está prestado', async () => {
    const e = await crearEquipo();
    await auth(api().post('/api/prestamos')).send({ equipo_id: e.id, prestatario: 'Ana', fecha_prevista: sumar(2) });
    const r = await auth(api().put(`/api/equipos/${e.id}`)).send({ condicion_uso: 'fuera_de_servicio' });
    expect(r.status).toBe(409);
  });

  test('NO se puede eliminar un equipo con historial de préstamos → 409', async () => {
    const e = await crearEquipo();
    const p = (await auth(api().post('/api/prestamos')).send({ equipo_id: e.id, prestatario: 'Ana', fecha_prevista: sumar(2) })).body.data;
    await auth(api().put(`/api/prestamos/${p.id}/devolucion`)).send({});
    const r = await auth(api().delete(`/api/equipos/${e.id}`));
    expect(r.status).toBe(409);
    expect(r.body.error.codigo).toBe('EQUIPO_CON_HISTORIAL');
    expect((await auth(api().get(`/api/equipos/${e.id}`))).status).toBe(200);
  });
});

describe('Consultas e historial', () => {
  let equipoA;
  beforeAll(async () => {
    equipoA = await crearEquipo();
    const p1 = (await auth(api().post('/api/prestamos')).send({ equipo_id: equipoA.id, prestatario: 'Historial Uno', fecha_prestamo: sumar(-10), fecha_prevista: sumar(-8) })).body.data;
    await auth(api().put(`/api/prestamos/${p1.id}/devolucion`)).send({ fecha_devolucion: sumar(-9) });
    await auth(api().post('/api/prestamos')).send({ equipo_id: equipoA.id, prestatario: 'Vencido Dos', fecha_prestamo: sumar(-5), fecha_prevista: sumar(-1) });
  });

  test('filtro activos=true solo trae préstamos sin devolver', async () => {
    const r = await auth(api().get('/api/prestamos?activos=true'));
    expect(r.status).toBe(200);
    expect(r.body.data.length).toBeGreaterThan(0);
    expect(r.body.data.every((p) => p.fecha_devolucion === null)).toBe(true);
  });

  test('filtro por equipo trae su historial completo (activos y devueltos)', async () => {
    const r = await auth(api().get(`/api/prestamos?equipo_id=${equipoA.id}`));
    expect(r.body.data.map((p) => p.prestatario).sort()).toEqual(['Historial Uno', 'Vencido Dos']);
  });

  test('filtros combinados: activos=true + equipo_id', async () => {
    const r = await auth(api().get(`/api/prestamos?activos=true&equipo_id=${equipoA.id}`));
    expect(r.body.data).toHaveLength(1);
    expect(r.body.data[0].estado).toBe('vencido');
  });

  test('filtro vencidos=true', async () => {
    const r = await auth(api().get('/api/prestamos?vencidos=true'));
    expect(r.body.data.some((p) => p.prestatario === 'Vencido Dos')).toBe(true);
    expect(r.body.data.every((p) => p.estado === 'vencido')).toBe(true);
  });

  test('historial por equipo: /api/equipos/:id/historial', async () => {
    const r = await auth(api().get(`/api/equipos/${equipoA.id}/historial`));
    expect(r.status).toBe(200);
    expect(r.body.data.equipo.codigo).toBe(equipoA.codigo);
    expect(r.body.data.prestamos).toHaveLength(2);
    expect((await auth(api().get('/api/equipos/987654/historial'))).status).toBe(404);
  });

  test('filtros inválidos → 400 con mensaje claro', async () => {
    const r = await auth(api().get('/api/prestamos?activos=quizas'));
    expect(r.status).toBe(400);
    expect(r.body.error.mensaje).toMatch(/activos/);
  });
});

describe('Persistencia y manejo general', () => {
  test('los registros permanecen en MySQL tras "reiniciar" (conexión nueva e independiente)', async () => {
    const antes = await Prestamo.count();
    const otra = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig); // simula un proceso nuevo
    const [[fila]] = await otra.query('SELECT COUNT(*) AS n FROM prestamos');
    await otra.close();
    expect(Number(fila.n)).toBe(antes);
    expect(antes).toBeGreaterThan(0);
  });

  test('ruta inexistente → 404 JSON', async () => {
    const r = await api().get('/api/no-existe');
    expect(r.status).toBe(404);
    expect(r.body.ok).toBe(false);
  });

  test('cabeceras de seguridad de helmet presentes y sin X-Powered-By', async () => {
    const r = await api().get('/api/health');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-powered-by']).toBeUndefined();
  });

  test('CORS: un origen no permitido no recibe cabecera de autorización', async () => {
    const r = await api().get('/api/health').set('Origin', 'http://sitio-malicioso.test');
    expect(r.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('cuerpo demasiado grande → 413', async () => {
    const r = await api().post('/api/auth/login').send({ correo: 'a@b.test', contrasena: 'x'.repeat(20000) });
    expect(r.status).toBe(413);
  });
});
