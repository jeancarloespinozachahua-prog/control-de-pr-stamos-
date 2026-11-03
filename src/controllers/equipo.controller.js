const { Op, Sequelize } = require('sequelize');
const { Equipo, Prestamo } = require('../models');
const AppError = require('../utils/AppError');
const { ok, paginar, metaPaginacion } = require('../utils/respuestas');
const prestamos = require('../services/prestamo.service');

// Un equipo está disponible cuando NO tiene un préstamo activo (fecha_devolucion vacía).
const SIN_PRESTAMO_ACTIVO = Sequelize.literal(
  'NOT EXISTS (SELECT 1 FROM prestamos p WHERE p.equipo_id = Equipo.id AND p.fecha_devolucion IS NULL)'
);
const CON_PRESTAMO_ACTIVO = Sequelize.literal(
  'EXISTS (SELECT 1 FROM prestamos p WHERE p.equipo_id = Equipo.id AND p.fecha_devolucion IS NULL)'
);

const noEncontrado = (id) => new AppError(404, 'EQUIPO_NO_ENCONTRADO', `No existe un equipo con id ${id}`);

async function buscarOFalla(id) {
  const equipo = await Equipo.findByPk(id);
  if (!equipo) throw noEncontrado(id);
  return equipo;
}

async function prestamoActivoDe(equipoId) {
  return Prestamo.findOne({ where: { equipo_id: equipoId, fecha_devolucion: null }, include: prestamos.incluir });
}

exports.listar = async (req, res) => {
  const { page, limit, q, categoria, condicion_uso, disponible } = req.valid.query;
  const where = [];
  if (q) {
    const patron = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
    where.push({ [Op.or]: [{ codigo: { [Op.like]: patron } }, { nombre: { [Op.like]: patron } }] });
  }
  if (categoria) where.push({ categoria });
  if (condicion_uso) where.push({ condicion_uso });
  if (disponible === true) where.push(SIN_PRESTAMO_ACTIVO);
  if (disponible === false) where.push(CON_PRESTAMO_ACTIVO);

  const { rows, count } = await Equipo.findAndCountAll({
    where: { [Op.and]: where },
    order: [['codigo', 'ASC']],
    ...paginar({ page, limit }),
  });

  // Se agrega el campo calculado "disponible" con una sola consulta adicional.
  const ids = rows.map((e) => e.id);
  const activos = ids.length
    ? await Prestamo.findAll({ attributes: ['equipo_id'], where: { equipo_id: ids, fecha_devolucion: null } })
    : [];
  const ocupados = new Set(activos.map((p) => p.equipo_id));
  const datos = rows.map((e) => ({ ...e.toJSON(), disponible: !ocupados.has(e.id) }));

  return ok(res, datos, 200, metaPaginacion({ page, limit }, count));
};

exports.obtener = async (req, res) => {
  const equipo = await buscarOFalla(req.valid.params.id);
  const activo = await prestamoActivoDe(equipo.id);
  return ok(res, { ...equipo.toJSON(), disponible: !activo, prestamo_activo: activo });
};

exports.crear = async (req, res) => {
  const equipo = await Equipo.create(req.valid.body).catch((error) => {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError(409, 'CODIGO_DUPLICADO', `Ya existe un equipo con el código ${req.valid.body.codigo}`);
    }
    throw error;
  });
  return ok(res, { ...equipo.toJSON(), disponible: true }, 201);
};

exports.actualizar = async (req, res) => {
  const equipo = await buscarOFalla(req.valid.params.id);
  const cambios = req.valid.body;

  const activo = await prestamoActivoDe(equipo.id);
  if (activo && cambios.condicion_uso && !['bueno', 'regular'].includes(cambios.condicion_uso)) {
    throw new AppError(409, 'EQUIPO_EN_PRESTAMO', 'No se puede cambiar la condición a no prestable mientras el equipo está prestado; registre primero la devolución');
  }

  try {
    await equipo.update(cambios);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError(409, 'CODIGO_DUPLICADO', `Ya existe un equipo con el código ${cambios.codigo}`);
    }
    throw error;
  }
  return ok(res, { ...equipo.toJSON(), disponible: !activo });
};

exports.eliminar = async (req, res) => {
  const equipo = await buscarOFalla(req.valid.params.id);
  const historial = await Prestamo.count({ where: { equipo_id: equipo.id } });
  if (historial > 0) {
    throw new AppError(409, 'EQUIPO_CON_HISTORIAL', `No se puede eliminar el equipo: tiene ${historial} préstamo(s) en su historial`);
  }
  await equipo.destroy();
  return ok(res, { mensaje: `Equipo ${equipo.codigo} eliminado correctamente` });
};

exports.historial = async (req, res) => {
  const equipo = await buscarOFalla(req.valid.params.id);
  const { page, limit } = req.valid.query;
  const { rows, count } = await prestamos.listar({ equipo_id: equipo.id }, paginar({ page, limit }));
  return ok(res, { equipo, prestamos: rows }, 200, metaPaginacion({ page, limit }, count));
};

