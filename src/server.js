const app = require('./app');
const config = require('./config/env');
const { sequelize } = require('./models');

function escuchar(puerto, reintentos) {
  return new Promise((resolver, rechazar) => {
    const servidor = app.listen(puerto);
    servidor.once('listening', () => resolver(servidor));
    servidor.once('error', (error) => {
      if (error.code === 'EADDRINUSE' && reintentos > 0) {
        console.warn(`El puerto ${puerto} está ocupado, probando con el ${puerto + 1}...`);
        resolver(escuchar(puerto + 1, reintentos - 1));
      } else if (error.code === 'EADDRINUSE') {
        rechazar(new Error(`El puerto ${puerto} está ocupado. Cierre el otro proceso o cambie PORT en .env`));
      } else {
        rechazar(error);
      }
    });
  });
}

async function iniciar() {
  try {
    await sequelize.authenticate();
  } catch (error) {
    console.error('No se pudo conectar a MySQL. Revise las variables DB_* del archivo .env');
    console.error(error.message);
    process.exit(1);
  }

  // Si el puerto está ocupado (típico: otra terminal con "npm run dev" abierta),
  // en desarrollo se prueba automáticamente con el siguiente puerto libre.
  const servidor = await escuchar(config.puerto, config.esProduccion ? 0 : 10);
  const puertoReal = servidor.address().port;
  console.log(`API de préstamos lista en http://localhost:${puertoReal}/api (entorno: ${config.entorno})`);

  // Cierre ordenado: termina las solicitudes en curso y libera la conexión a MySQL.
  const cerrar = (senal) => {
    console.log(`\nRecibida ${senal}, cerrando...`);
    servidor.close(async () => {
      await sequelize.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => cerrar('SIGINT'));
  process.on('SIGTERM', () => cerrar('SIGTERM'));
}

iniciar().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
