const { zonaHoraria } = require('../config/env');

// Fecha de hoy (AAAA-MM-DD) en la zona horaria del laboratorio, no en la del servidor.
function hoy() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// Comprueba que una cadena AAAA-MM-DD sea una fecha real (rechaza 2026-02-31).
function esFechaReal(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const d = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

module.exports = { hoy, esFechaReal };
