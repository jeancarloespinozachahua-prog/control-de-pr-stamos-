const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const validar = require('../middleware/validar');
const esquemas = require('../validators/esquemas');
const ctrl = require('../controllers/prestamo.controller');

router.get('/', validar({ query: esquemas.prestamoListar }), asyncHandler(ctrl.listar));
router.post('/', validar({ body: esquemas.prestamoCrear }), asyncHandler(ctrl.crear));
router.get('/:id', validar({ params: esquemas.params.id }), asyncHandler(ctrl.obtener));
router.put('/:id/devolucion', validar({ params: esquemas.params.id, body: esquemas.devolucion }), asyncHandler(ctrl.devolver));

module.exports = router;
