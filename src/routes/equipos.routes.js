const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const validar = require('../middleware/validar');
const esquemas = require('../validators/esquemas');
const ctrl = require('../controllers/equipo.controller');

router.get('/', validar({ query: esquemas.equipoListar }), asyncHandler(ctrl.listar));
router.post('/', validar({ body: esquemas.equipoCrear }), asyncHandler(ctrl.crear));
router.get('/:id', validar({ params: esquemas.params.id }), asyncHandler(ctrl.obtener));
router.put('/:id', validar({ params: esquemas.params.id, body: esquemas.equipoActualizar }), asyncHandler(ctrl.actualizar));
router.delete('/:id', validar({ params: esquemas.params.id }), asyncHandler(ctrl.eliminar));
router.get('/:id/historial', validar({ params: esquemas.params.id, query: esquemas.paginacion }), asyncHandler(ctrl.historial));

module.exports = router;
