const jwt = require('jsonwebtoken');
const { jwt: cfg } = require('../config/env');

const firmarToken = (usuario) =>
  jwt.sign({ sub: String(usuario.id), correo: usuario.correo }, cfg.secreto, {
    algorithm: cfg.algoritmo,
    expiresIn: cfg.expiracion,
  });

// Se fija el algoritmo permitido para impedir ataques con alg=none o cambio de algoritmo.
const verificarToken = (token) =>
  jwt.verify(token, cfg.secreto, { algorithms: [cfg.algoritmo] });

module.exports = { firmarToken, verificarToken };
