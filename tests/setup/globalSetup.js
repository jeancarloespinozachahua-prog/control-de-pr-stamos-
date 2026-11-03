// Prepara la base de datos de PRUEBAS desde cero con las migraciones reales del proyecto.
const { execSync } = require('child_process');

module.exports = async () => {
  const opciones = { stdio: 'pipe', env: { ...process.env, NODE_ENV: 'test' } };
  try {
    execSync('npx sequelize-cli db:create', opciones); // si ya existe o no hay permiso, continúa
  } catch (_) { /* la base de datos puede existir ya */ }
  execSync('npx sequelize-cli db:migrate:undo:all', opciones);
  execSync('npx sequelize-cli db:migrate', opciones);
};
