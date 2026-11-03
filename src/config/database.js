// Configuración de conexión usada por Sequelize (aplicación) y por sequelize-cli (migraciones/seeders).
// Los valores se leen desde variables de entorno (.env); no se guardan credenciales en el código.
require('dotenv').config({ quiet: true });

const nombreBase = process.env.DB_NAME || 'laboratorio_prestamos';

const comun = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || null,
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  dialect: 'mysql',
  logging: false,
  timezone: '+00:00',
  define: {
    underscored: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
};

module.exports = {
  development: { ...comun, database: nombreBase },
  test: { ...comun, database: process.env.DB_NAME_TEST || `${nombreBase}_test` },
  production: { ...comun, database: nombreBase },
};
