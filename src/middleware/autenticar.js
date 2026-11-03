const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { verificarToken } = require('../utils/jwt');
const { Usuario } = require('../models');

// Exige un JWT válido en "Authorization: Bearer <token>" y carga al usuario responsable.
module.exports = asyncHandler(async (req, _res, next) => {
  const [esquema, token] = (req.headers.authorization || '').split(' ');
  if (esquema !== 'Bearer' || !token) {
    throw new AppError(401, 'NO_AUTENTICADO', 'Falta el token. Envíe el encabezado Authorization: Bearer <token>');
  }

  let payload;
  try {
    payload = verificarToken(token);
  } catch (error) {
    const expirado = error.name === 'TokenExpiredError';
    throw new AppError(401, expirado ? 'TOKEN_EXPIRADO' : 'TOKEN_INVALIDO', expirado ? 'El token ha expirado, inicie sesión nuevamente' : 'El token es inválido');
  }

  const usuario = await Usuario.findByPk(payload.sub);
  if (!usuario) throw new AppError(401, 'TOKEN_INVALIDO', 'El usuario del token ya no existe');

  req.usuario = usuario;
  next();
});
