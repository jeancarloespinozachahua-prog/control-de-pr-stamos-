const { sequelize } = require('../models');

async function runMigration() {
  try {
    await sequelize.authenticate();
    console.log('Conexión a MySQL establecida correctamente.');

    await sequelize.sync({ alter: true });
    console.log('¡Tablas creadas y migradas con éxito!');
  } catch (error) {
    console.error('Error al migrar la base de datos:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

runMigration();
