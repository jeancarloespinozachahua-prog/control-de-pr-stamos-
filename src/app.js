const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config/env');
const rutas = require('./routes');
const { noEncontrada, manejoErrores } = require('./middleware/manejoErrores');

const app = express();

app.set('trust proxy', 1);
// Cabeceras de seguridad HTTP. En desarrollo (http://localhost) se desactiva solo
// "upgrade-insecure-requests", que en algunos navegadores rompe la carga de CSS/JS locales.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: config.esProduccion ? {} : { 'upgrade-insecure-requests': null },
    },
  })
);

// CORS: define qué ORÍGENES de navegador pueden LEER las respuestas.
// No reemplaza a la autenticación: esa la resuelve el JWT.
app.use(
  cors({
    origin: (origen, devolver) => {
      if (!origen) return devolver(null, false); // Postman/curl: no necesitan CORS
      if (config.corsOrigenes.includes(origen)) return devolver(null, true);
      // En desarrollo se permite cualquier localhost/127.0.0.1 (Live Server, Vite...) y archivos abiertos con doble clic.
      const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origen) || origen === 'null';
      return devolver(null, config.entorno === 'development' && local);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

if (!config.esTest) app.use(morgan(config.esProduccion ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));

const limitador = (max) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: { codigo: 'DEMASIADAS_SOLICITUDES', mensaje: 'Demasiadas solicitudes, intente nuevamente más tarde' } },
  });
app.use('/api/auth', limitador(config.limites.auth)); // más estricto: frena fuerza bruta de contraseñas
app.use('/api', limitador(config.limites.api));

// Interfaz web (HTML + CSS + JS) servida por el mismo servidor: http://localhost:PUERTO/
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', rutas);
app.use(noEncontrada);
app.use(manejoErrores);

module.exports = app;
