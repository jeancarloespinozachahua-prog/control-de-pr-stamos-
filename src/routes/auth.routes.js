const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const validar = require('../middleware/validar');
const autenticar = require('../middleware/autenticar');
const esquemas = require('../validators/esquemas');
const ctrl = require('../controllers/auth.controller');

router.post('/registro', validar({ body: esquemas.registro }), asyncHandler(ctrl.registro));
router.post('/login', validar({ body: esquemas.login }), asyncHandler(ctrl.login));
router.post('/acceso', asyncHandler(ctrl.acceso));
router.get('/perfil', autenticar, ctrl.perfil);

module.exports = router;
