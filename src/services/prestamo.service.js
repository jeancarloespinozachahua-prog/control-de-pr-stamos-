const { Op, UniqueConstraintError } = require('sequelize');
const { sequelize, Equipo, Prestamo, Usuario, CONDICIONES_PRESTABLES } = require('../models');
const AppError = require('../utils/AppError');
const { hoy } = require('../utils/fechas');

const incluir = [
  { model: Equipo, as: 'equipo', attributes: ['id', 'codigo', 'nombre'] },
  { model: Usuario, as: 'registrado_por', attributes: ['id', 'nombre'] },
];

const conflictoActivo = () =>
  new AppError(409, 'EQUIPO_NO_DISPONIBLE', 'El equipo ya tiene un préstamo activo. Registre su devolución antes de prestarlo nuevamente');

/**
 * Registra un préstamo. Protección contra préstamos duplicados en TRES capas:
 *  1) Bloqueo de la fila del equipo (SELECT ... FOR UPDATE) dentro de una transacción:
 *     dos solicitudes simultáneas para el mismo equipo se ponen en fila.
 *  2) Verificación explícita de que no exista un préstamo sin devolución.
 *  3) Índice único en la base de datos (columna generada equipo_activo_id) como última barrera.
 */
async function crearPrestamo(datos, usuario) {
  try {
    const id = await sequelize.transaction(async (t) => {
      const equipo = await Equipo.findByPk(datos.equipo_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!equipo) throw new AppError(404, 'EQUIPO_NO_ENCONTRADO', `No existe un equipo con id ${datos.equipo_id}`);

      if (!CONDICIONES_PRESTABLES.includes(equipo.condicion_uso)) {
        throw new AppError(409, 'EQUIPO_NO_PRESTABLE', `El equipo está en condición '${equipo.condicion_uso}' y no puede prestarse`);
      }

      const activo = await Prestamo.findOne({ where: { equipo_id: equipo.id, fecha_devolucion: null }, transaction: t });
      if (activo) throw conflictoActivo();

      const fechaPrestamo = datos.fecha_prestamo || hoy();
      if (datos.fecha_prevista < fechaPrestamo) {
        throw new AppError(400, 'DATOS_INVALIDOS', "La 'fecha_prevista' no puede ser anterior a la 'fecha_prestamo'", [
          { campo: 'fecha_prevista', mensaje: "La 'fecha_prevista' no puede ser anterior a la fecha del préstamo (hoy, si no se indica 'fecha_prestamo')" },
        ]);
      }

      const nuevo = await Prestamo.create(
        {
          equipo_id: equipo.id,
          usuario_id: usuario.id, // el responsable es SIEMPRE el usuario autenticado
          prestatario: datos.prestatario,
          fecha_prestamo: fechaPrestamo,
          fecha_prevista: datos.fecha_prevista,
        },
        { transaction: t }
      );
      return nuevo.id;
    });
    return Prestamo.findByPk(id, { include: incluir });
  } catch (error) {
    if (error instanceof UniqueConstraintError) throw conflictoActivo();
    throw error;
  }
}

async function registrarDevolucion(id, { fecha_devolucion, condicion_uso }) {
  await sequelize.transaction(async (t) => {
    const prestamo = await Prestamo.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!prestamo) throw new AppError(404, 'PRESTAMO_NO_ENCONTRADO', `No existe un préstamo con id ${id}`);
    if (prestamo.fecha_devolucion) {
      throw new AppError(409, 'PRESTAMO_YA_DEVUELTO', `El préstamo ya fue devuelto el ${prestamo.fecha_devolucion}`);
    }

    const fecha = fecha_devolucion || hoy();
    if (fecha < prestamo.fecha_prestamo) {
      throw new AppError(400, 'DATOS_INVALIDOS', "La 'fecha_devolucion' no puede ser anterior a la fecha del préstamo", [
        { campo: 'fecha_devolucion', mensaje: `No puede ser anterior a la fecha del préstamo (${prestamo.fecha_prestamo})` },
      ]);
    }

    await prestamo.update({ fecha_devolucion: fecha }, { transaction: t });

    // Si el equipo vuelve con daños, se puede actualizar su condición en la misma operación.
    if (condicion_uso) {
      await Equipo.update({ condicion_uso }, { where: { id: prestamo.equipo_id }, transaction: t });
    }
  });
  return Prestamo.findByPk(id, { include: incluir });
}

function construirFiltro({ activos, vencidos, equipo_id, prestatario }) {
  const where = {};
  if (equipo_id) where.equipo_id = equipo_id;
  if (prestatario) where.prestatario = { [Op.like]: `%${prestatario.replace(/[%_\\]/g, '\\$&')}%` };
  if (activos === true) where.fecha_devolucion = null;
  if (activos === false) where.fecha_devolucion = { [Op.ne]: null };
  if (vencidos === true) {
    where.fecha_devolucion = null;
    where.fecha_prevista = { [Op.lt]: hoy() };
  }
  return where;
}

async function listar(filtros, { limit, offset }) {
  return Prestamo.findAndCountAll({
    where: construirFiltro(filtros),
    include: incluir,
    order: [['fecha_prestamo', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
  });
}

const obtener = (id) => Prestamo.findByPk(id, { include: incluir });

module.exports = { crearPrestamo, registrarDevolucion, listar, obtener, incluir };
