const bcrypt = require('bcryptjs');
const { UniqueConstraintError } = require('sequelize');
const { Usuario } = require('../models');
const AppError = require('../utils/AppError');
const { firmarToken } = require('../utils/jwt');
const { ok } = require('../utils/respuestas');
const { bcryptRondas, accesoLibre, jwt: cfgJwt } = require('../config/env');

// Hash de relleno: se compara aunque el correo no exista para que el tiempo de respuesta
// no revele qué correos están registrados.
const HASH_RELLENO = bcrypt.hashSync('relleno-para-igualar-tiempos', bcryptRondas);

const conflictoCorreo = () => new AppError(409, 'CORREO_DUPLICADO', 'Ya existe un usuario registrado con ese correo');

exports.registro = async (req, res) => {
  const { nombre, correo, contrasena } = req.valid.body;

  if (await Usuario.findOne({ where: { correo } })) throw conflictoCorreo();

  try {
    const usuario = await Usuario.create({
      nombre,
      correo,
      contrasena_hash: await bcrypt.hash(contrasena, bcryptRondas),
    });
    return ok(res, usuario, 201);
  } catch (error) {
    if (error instanceof UniqueConstraintError) throw conflictoCorreo();
    throw error;
  }
};

exports.login = async (req, res) => {
  const { correo, contrasena } = req.valid.body;
  const usuario = await Usuario.findOne({ where: { correo } });

  const coincide = await bcrypt.compare(contrasena, usuario ? usuario.contrasena_hash : HASH_RELLENO);
  if (!usuario || !coincide) throw new AppError(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos');

  return ok(res, { token: firmarToken(usuario), tipo: 'Bearer', expira_en: cfgJwt.expiracion, usuario });
};

exports.perfil = (req, res) => ok(res, req.usuario);

// Acceso libre (solo laboratorio): acepta cualquier correo y contraseña. Si el usuario no existe lo crea.
exports.acceso = async (req, res) => {
  if (!accesoLibre) throw new AppError(403, 'ACCESO_LIBRE_DESACTIVADO', 'El acceso libre está desactivado (ACCESO_LIBRE=true en .env)');

  const cuerpo = req.body || {};
  const correo = String(cuerpo.correo || '').trim().toLowerCase().slice(0, 150) || 'invitado@laboratorio.test';
  const contrasena = String(cuerpo.contrasena || '') || 'acceso-libre';
  const nombre = (correo.split('@')[0] || 'Invitado').slice(0, 100);

  let usuario = await Usuario.findOne({ where: { correo } });
  if (!usuario) {
    try {
      usuario = await Usuario.create({ nombre, correo, contrasena_hash: await bcrypt.hash(contrasena, bcryptRondas) });
    } catch (error) {
      if (!(error instanceof UniqueConstraintError)) throw error;
      usuario = await Usuario.findOne({ where: { correo } });
    }
  }
  return ok(res, { token: firmarToken(usuario), tipo: 'Bearer', expira_en: cfgJwt.expiracion, usuario });
};
