// Se ejecuta en cada archivo de prueba: ajusta límites para que no interfieran con las pruebas.
process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_AUTH_MAX = '100000';
process.env.RATE_LIMIT_API_MAX = '100000';
process.env.BCRYPT_ROUNDS = '4';
