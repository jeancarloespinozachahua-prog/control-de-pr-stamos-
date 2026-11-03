// Lectura y validación centralizada de variables de entorno.
// Si falta algo crítico (por ejemplo el secreto JWT) el servidor no arranca: "falla rápido".
require('dotenv').config({ quiet: true });

const entorno = process.env.NODE_ENV || 'development';

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && entorno === 'test') {
  jwtSecret = 'secreto-solo-para-pruebas-automaticas-0123456789abcdef';
}
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error(
    'JWT_SECRET no está definido o es demasiado corto (mínimo 32 caracteres). Revise su archivo .env (vea .env.example).'
  );
}

const lista = (valor) =>
  (valor || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

module.exports = {
  entorno,
  esTest: entorno === 'test',
  esProduccion: entorno === 'production',
  puerto: Number(process.env.PORT) || 3000,
  zonaHoraria: process.env.APP_TIMEZONE || 'America/Lima',
  corsOrigenes: lista(process.env.CORS_ORIGINS),
  // Acceso libre: cualquier correo y contraseña entra (solo para laboratorio/demostración). Nunca en producción.
  accesoLibre: process.env.ACCESO_LIBRE === 'true' && entorno !== 'production' && entorno !== 'test',
  jwt: {
    secreto: jwtSecret,
    expiracion: process.env.JWT_EXPIRES_IN || '2h',
    algoritmo: 'HS256',
  },
  bcryptRondas: Number(process.env.BCRYPT_ROUNDS) || 12,
  limites: {
    auth: Number(process.env.RATE_LIMIT_AUTH_MAX) || 20,
    api: Number(process.env.RATE_LIMIT_API_MAX) || 300,
  },
};
