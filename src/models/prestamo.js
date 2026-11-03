const { DataTypes } = require('sequelize');
const { hoy } = require('../utils/fechas');

module.exports = (sequelize) =>
  sequelize.define(
    'Prestamo',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      equipo_id: { type: DataTypes.INTEGER, allowNull: false },
      usuario_id: { type: DataTypes.INTEGER, allowNull: false },
      prestatario: { type: DataTypes.STRING(120), allowNull: false },
      fecha_prestamo: { type: DataTypes.DATEONLY, allowNull: false },
      fecha_prevista: { type: DataTypes.DATEONLY, allowNull: false },
      fecha_devolucion: { type: DataTypes.DATEONLY, allowNull: true, defaultValue: null },
      // Campo calculado (no existe en la tabla): activo | vencido | devuelto
      estado: {
        type: DataTypes.VIRTUAL,
        get() {
          if (this.getDataValue('fecha_devolucion')) return 'devuelto';
          return this.getDataValue('fecha_prevista') < hoy() ? 'vencido' : 'activo';
        },
      },
    },
    { tableName: 'prestamos', timestamps: true }
  );
