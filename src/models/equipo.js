const { DataTypes } = require('sequelize');

// Condiciones de uso. Solo 'bueno' y 'regular' permiten prestar el equipo.
const CONDICIONES = ['bueno', 'regular', 'en_mantenimiento', 'fuera_de_servicio'];
const CONDICIONES_PRESTABLES = ['bueno', 'regular'];

const definirEquipo = (sequelize) =>
  sequelize.define(
    'Equipo',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      nombre: { type: DataTypes.STRING(120), allowNull: false },
      categoria: { type: DataTypes.STRING(60), allowNull: false },
      condicion_uso: {
        type: DataTypes.ENUM(...CONDICIONES),
        allowNull: false,
        defaultValue: 'bueno',
      },
    },
    { tableName: 'equipos', timestamps: true }
  );

module.exports = definirEquipo;
module.exports.CONDICIONES = CONDICIONES;
module.exports.CONDICIONES_PRESTABLES = CONDICIONES_PRESTABLES;
