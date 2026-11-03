const { Sequelize } = require('sequelize');
const configuraciones = require('../config/database');
const definirEquipo = require('./equipo');

const entorno = process.env.NODE_ENV || 'development';
const cfg = configuraciones[entorno];

const sequelize = new Sequelize(cfg.database, cfg.username, cfg.password, cfg);

const Usuario = require('./usuario')(sequelize);
const Equipo = definirEquipo(sequelize);
const Prestamo = require('./prestamo')(sequelize);

// Relaciones: un usuario registra varios préstamos; un equipo conserva su historial de préstamos.
// ON DELETE RESTRICT: la base de datos impide borrar equipos o usuarios que tengan préstamos.
Usuario.hasMany(Prestamo, { foreignKey: 'usuario_id', as: 'prestamos', onDelete: 'RESTRICT' });
Prestamo.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'registrado_por' });

Equipo.hasMany(Prestamo, { foreignKey: 'equipo_id', as: 'prestamos', onDelete: 'RESTRICT' });
Prestamo.belongsTo(Equipo, { foreignKey: 'equipo_id', as: 'equipo' });

module.exports = {
  sequelize,
  Sequelize,
  Usuario,
  Equipo,
  Prestamo,
  CONDICIONES: definirEquipo.CONDICIONES,
  CONDICIONES_PRESTABLES: definirEquipo.CONDICIONES_PRESTABLES,
};
