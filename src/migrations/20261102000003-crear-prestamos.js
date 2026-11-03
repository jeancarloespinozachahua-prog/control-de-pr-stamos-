'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('prestamos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      equipo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'equipos', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'RESTRICT',
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'RESTRICT',
      },
      prestatario: { type: Sequelize.STRING(120), allowNull: false },
      fecha_prestamo: { type: Sequelize.DATEONLY, allowNull: false },
      fecha_prevista: { type: Sequelize.DATEONLY, allowNull: false },
      fecha_devolucion: { type: Sequelize.DATEONLY, allowNull: true, defaultValue: null },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('prestamos', ['equipo_id', 'fecha_devolucion'], {
      name: 'idx_prestamos_equipo_devolucion',
    });
    await queryInterface.addIndex('prestamos', ['usuario_id'], { name: 'idx_prestamos_usuario' });

    // REGLA DE NEGOCIO A NIVEL DE BASE DE DATOS: "un equipo no puede tener dos préstamos activos".
    // La columna generada vale equipo_id mientras el préstamo está activo (sin fecha de devolución)
    // y NULL cuando ya fue devuelto. Como un índice UNIQUE permite varios NULL, el historial
    // se puede repetir, pero solo puede existir UN préstamo activo por equipo.
    // Aunque el código de la aplicación fallara (o dos peticiones llegaran al mismo tiempo),
    // MySQL rechazaría el segundo registro.
    await queryInterface.sequelize.query(`
      ALTER TABLE prestamos
        ADD COLUMN equipo_activo_id INT
          GENERATED ALWAYS AS (IF(fecha_devolucion IS NULL, equipo_id, NULL)) STORED,
        ADD UNIQUE KEY uq_prestamos_un_activo_por_equipo (equipo_activo_id),
        ADD CONSTRAINT ck_prestamos_fechas CHECK (
          fecha_prevista >= fecha_prestamo
          AND (fecha_devolucion IS NULL OR fecha_devolucion >= fecha_prestamo)
        )
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('prestamos');
  },
};
