const { ZodError } = require('zod');
const { UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');
const AppError = require('../utils/AppError');
const { esTest } = require('../config/env');

const noEncontrada = (req, _res, next) =>
  next(new AppError(404, 'RUTA_NO_ENCONTRADA', `La ruta ${req.method} ${req.originalUrl} no existe`));

// Middleware final: convierte cualquier error en una respuesta JSON coherente.
// eslint-disable-next-line no-unused-vars
const manejoErrores = (err, req, res, _next) => {
  let estado = 500;
  let codigo = 'ERROR_INTERNO';
  let mensaje = 'Ocurrió un error interno del servidor';
  let detalles;

  if (err instanceof AppError) {
    ({ estado, codigo, detalles } = err);
    mensaje = err.message;
  } else if (err instanceof ZodError) {
    estado = 400;
    codigo = 'DATOS_INVALIDOS';
    detalles = err.issues.map((i) => ({ campo: i.path.join('.') || '(cuerpo)', mensaje: i.message }));
    mensaje = detalles.length === 1 ? detalles[0].mensaje : `Hay ${detalles.length} datos inválidos o incompletos`;
  } else if (err.type === 'entity.parse.failed') {
    estado = 400;
    codigo = 'JSON_INVALIDO';
    mensaje = 'El cuerpo de la solicitud no es un JSON válido';
  } else if (err.type === 'entity.too.large') {
    estado = 413;
    codigo = 'CUERPO_DEMASIADO_GRANDE';
    mensaje = 'El cuerpo de la solicitud es demasiado grande';
  } else if (err instanceof UniqueConstraintError) {
    estado = 409;
    codigo = 'CONFLICTO';
    mensaje = 'Ya existe un registro con ese valor único';
  } else if (err instanceof ForeignKeyConstraintError) {
    estado = 409;
    codigo = 'CONFLICTO';
    mensaje = 'La operación viola una relación entre tablas';
  }

  if (estado >= 500 && !esTest) console.error(err);

  res.status(estado).json({ ok: false, error: { codigo, mensaje, ...(detalles ? { detalles } : {}) } });
};

module.exports = { noEncontrada, manejoErrores };
