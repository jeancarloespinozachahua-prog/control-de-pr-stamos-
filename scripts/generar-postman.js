// Genera docs/Coleccion_Postman.json (Postman v2.1) a partir de scripts/escenario.js.
// Cada solicitud incluye pruebas automáticas (pm.test) del código HTTP esperado. Uso: npm run postman
const fs = require('fs');
const path = require('path');
const pasos = require('./escenario');

const ESPERADO_TXT = (p) => `${p.caso ? `**Caso obligatorio:** ${p.caso}\n\n` : ''}**Resultado esperado:** ${p.resultado} (HTTP ${p.esperado})`;

const itemDe = (p) => {
  const lineasTest = [
    `pm.test('Código HTTP ${p.esperado}', function () { pm.response.to.have.status(${p.esperado}); });`,
  ];
  for (const [variable, ruta] of Object.entries(p.guardar || {})) {
    lineasTest.push(`pm.collectionVariables.set('${variable}', pm.response.json().${ruta});`);
  }
  const cabeceras = [];
  if (p.cuerpo !== undefined) cabeceras.push({ key: 'Content-Type', value: 'application/json' });
  if (p.token) cabeceras.push({ key: 'Authorization', value: `Bearer ${p.token}` });

  const requerida = p.auth !== false && !p.token;
  const [rutaSola, consulta] = p.ruta.split('?');
  const item = {
    name: p.nombre,
    event: [{ listen: 'test', script: { type: 'text/javascript', exec: lineasTest } }],
    request: {
      method: p.metodo,
      header: cabeceras,
      description: ESPERADO_TXT(p),
      url: {
        raw: `{{baseUrl}}${p.ruta}`,
        host: ['{{baseUrl}}'],
        path: rutaSola.split('/').filter(Boolean),
        ...(consulta ? { query: consulta.split('&').map((q) => { const [key, value] = q.split('='); return { key, value }; }) } : {}),
      },
    },
  };
  if (p.cuerpo !== undefined) {
    item.request.body = { mode: 'raw', raw: JSON.stringify(p.cuerpo, null, 2), options: { raw: { language: 'json' } } };
  }
  if (requerida) item.request.auth = { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] };
  else item.request.auth = { type: 'noauth' };
  return item;
};

const carpetas = [];
for (const p of pasos) {
  let c = carpetas.find((x) => x.name === p.carpeta);
  if (!c) { c = { name: p.carpeta, item: [] }; carpetas.push(c); }
  c.item.push(itemDe(p));
}

const coleccion = {
  info: {
    name: 'Préstamos de laboratorio — API REST',
    description: 'Ejecute la colección completa con el Collection Runner (en orden). El login guarda el token automáticamente. Cada solicitud verifica su código HTTP esperado.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  event: [{
    listen: 'prerequest',
    script: {
      type: 'text/javascript',
      exec: [
        '// Fechas dinámicas y sufijo único para evitar conflictos al repetir la colección.',
        "const f = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toLocaleDateString('en-CA'); };",
        "pm.collectionVariables.set('hoy', f(0));",
        "pm.collectionVariables.set('ayer', f(-1));",
        "pm.collectionVariables.set('en5dias', f(5));",
        "if (!pm.collectionVariables.get('sufijo')) pm.collectionVariables.set('sufijo', String(Date.now()).slice(-6));",
      ],
    },
  }],
  variable: [
    { key: 'baseUrl', value: 'http://localhost:3000' },
    { key: 'token', value: '' }, { key: 'equipoId', value: '' }, { key: 'prestamoId', value: '' }, { key: 'sufijo', value: '' },
    { key: 'hoy', value: '' }, { key: 'ayer', value: '' }, { key: 'en5dias', value: '' },
  ],
  item: carpetas,
};

fs.writeFileSync(path.join(__dirname, '..', 'docs', 'Coleccion_Postman.json'), JSON.stringify(coleccion, null, 2));
console.log(`Colección generada con ${pasos.length} solicitudes en docs/Coleccion_Postman.json`);
