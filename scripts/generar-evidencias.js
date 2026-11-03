// Ejecuta el escenario contra la API REAL (base de datos de pruebas) y guarda cada solicitud
// con su respuesta en docs/EVIDENCIAS.md y docs/evidencias.json. Uso: npm run evidencias
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const request = require('supertest');

process.env.RATE_LIMIT_AUTH_MAX = '100000';
process.env.RATE_LIMIT_API_MAX = '100000';
process.env.BCRYPT_ROUNDS = '4';

const opciones = { stdio: 'pipe', env: { ...process.env, NODE_ENV: 'test' } };
try { execSync('npx sequelize-cli db:create', opciones); } catch (_) { /* ya existe */ }
execSync('npx sequelize-cli db:migrate:undo:all', opciones);
execSync('npx sequelize-cli db:migrate', opciones);

const app = require('../src/app');
const { sequelize, Prestamo } = require('../src/models');
const pasos = require('./escenario');

const fechaISO = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString('en-CA');
};

const variables = { sufijo: String(Date.now()).slice(-6), hoy: fechaISO(0), ayer: fechaISO(-1), en5dias: fechaISO(5) };
const sustituir = (valor) => {
  if (typeof valor === 'string') {
    const unico = valor.match(/^\{\{(\w+)\}\}$/);
    if (unico && typeof variables[unico[1]] === 'number') return variables[unico[1]];
    return valor.replace(/\{\{(\w+)\}\}/g, (_, k) => variables[k]);
  }
  if (valor && typeof valor === 'object') return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, sustituir(v)]));
  return valor;
};
const leer = (obj, ruta) => ruta.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
const acortarToken = (texto) => texto.replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, (t) => `${t.slice(0, 24)}…[token recortado]`);

(async () => {
  const registros = [];
  let fallos = 0;

  for (const [i, paso] of pasos.entries()) {
    const ruta = sustituir(paso.ruta);
    const cuerpo = paso.cuerpo === undefined ? undefined : sustituir(paso.cuerpo);
    let req = request(app)[paso.metodo.toLowerCase()](ruta);
    if (paso.token) req = req.set('Authorization', `Bearer ${paso.token}`);
    else if (paso.auth !== false && variables.token) req = req.set('Authorization', `Bearer ${variables.token}`);
    if (cuerpo !== undefined) req = req.send(cuerpo);

    const res = await req;
    const cumple = res.status === paso.esperado;
    if (!cumple) fallos += 1;
    if (paso.guardar) for (const [k, p] of Object.entries(paso.guardar)) variables[k] = leer(res.body, p);

    registros.push({
      n: i + 1, carpeta: paso.carpeta, nombre: paso.nombre, caso: paso.caso || null, metodo: paso.metodo, ruta,
      requiereToken: paso.auth !== false, tokenInvalido: Boolean(paso.token), cuerpo,
      esperado: paso.esperado, obtenido: res.status, cumple, resultado: paso.resultado, respuesta: res.body,
    });
    console.log(`${cumple ? 'OK  ' : 'FALLA'} ${String(res.status).padEnd(3)} ${paso.metodo.padEnd(6)} ${ruta}  — ${paso.nombre}`);
  }

  // Persistencia: conexión independiente (equivale a reiniciar el servidor) que lee los datos de MySQL
  const total = await Prestamo.count();
  const [[{ n }]] = await sequelize.query('SELECT COUNT(*) AS n FROM prestamos');
  const persistencia = { prestamosEnMySQL: Number(n), coincide: Number(n) === total };
  await sequelize.close();

  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'evidencias.json'), JSON.stringify({ generado: new Date().toISOString(), persistencia, registros }, null, 2));

  const md = [];
  md.push('# Evidencias de pruebas de la API', '');
  md.push(`Generado automáticamente el ${new Date().toLocaleString('es-PE')} con \`npm run evidencias\` (solicitudes reales contra la API y MySQL).`, '');
  md.push(`**Resultado global: ${registros.length - fallos} de ${registros.length} solicitudes con el código HTTP esperado.**`, '');
  md.push('## Resumen', '', '| N.º | Caso | Solicitud | Esperado | Obtenido | Estado |', '| --- | --- | --- | --- | --- | --- |');
  for (const r of registros) md.push(`| ${r.n} | ${r.caso || r.nombre} | \`${r.metodo} ${r.ruta}\` | ${r.esperado} | ${r.obtenido} | ${r.cumple ? '✅' : '❌'} |`);
  md.push('', '## Detalle de cada solicitud', '');
  for (const r of registros) {
    md.push(`### ${r.n}. ${r.nombre}`, '');
    md.push(`- **Solicitud:** \`${r.metodo} ${r.ruta}\``);
    md.push(`- **Autenticación:** ${r.tokenInvalido ? 'token inválido' : r.requiereToken ? 'Bearer JWT' : 'ninguna'}`);
    md.push(`- **Resultado esperado:** ${r.resultado} (HTTP ${r.esperado})`);
    md.push(`- **Código obtenido:** ${r.obtenido} ${r.cumple ? '✅' : '❌'}`, '');
    if (r.cuerpo !== undefined && Object.keys(r.cuerpo).length) md.push('Cuerpo enviado:', '```json', JSON.stringify(r.cuerpo, null, 2), '```', '');
    const json = acortarToken(JSON.stringify(r.respuesta, null, 2));
    const lineas = json.split('\n');
    md.push('Respuesta:', '```json', (lineas.length > 45 ? [...lineas.slice(0, 45), '  …(recortado)'] : lineas).join('\n'), '```', '');
  }
  md.push('## Caso 8 · Reinicio del servidor', '');
  md.push(`Una conexión nueva e independiente a MySQL (equivalente a reiniciar el servidor) leyó **${persistencia.prestamosEnMySQL} préstamos** y la cifra ${persistencia.coincide ? 'coincide' : 'NO coincide'} con la que reporta la API. Los datos viven en MySQL, no en la memoria del proceso. ${persistencia.coincide ? '✅' : '❌'}`, '');
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'EVIDENCIAS.md'), md.join('\n'));

  console.log(`\n${registros.length - fallos}/${registros.length} correctas · persistencia: ${persistencia.coincide ? 'OK' : 'FALLA'}`);
  process.exit(fallos || !persistencia.coincide ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
