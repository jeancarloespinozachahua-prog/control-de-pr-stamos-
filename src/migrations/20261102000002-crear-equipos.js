'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('equipos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      codigo: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(120), allowNull: false },
      categoria: { type: Sequelize.STRING(60), allowNull: false },
      condicion_uso: {
        type: Sequelize.ENUM('bueno', 'regular', 'en_mantenimiento', 'fuera_de_servicio'),
        allowNull: false,
        defaultValue: 'bueno',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('equipos', ['categoria'], { name: 'idx_equipos_categoria' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('equipos');
  },
};
