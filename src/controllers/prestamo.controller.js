const AppError = require('../utils/AppError');
const { ok, paginar, metaPaginacion } = require('../utils/respuestas');
const servicio = require('../services/prestamo.service');

exports.listar = async (req, res) => {
  const { page, limit, ...filtros } = req.valid.query;
  const { rows, count } = await servicio.listar(filtros, paginar({ page, limit }));
  return ok(res, rows, 200, metaPaginacion({ page, limit }, count));
};

exports.obtener = async (req, res) => {
  const prestamo = await servicio.obtener(req.valid.params.id);
  if (!prestamo) throw new AppError(404, 'PRESTAMO_NO_ENCONTRADO', `No existe un préstamo con id ${req.valid.params.id}`);
  return ok(res, prestamo);
};

exports.crear = async (req, res) => {
  const prestamo = await servicio.crearPrestamo(req.valid.body, req.usuario);
  return ok(res, prestamo, 201);
};

exports.devolver = async (req, res) => {
  const prestamo = await servicio.registrarDevolucion(req.valid.params.id, req.valid.body);
  return ok(res, prestamo);
};
