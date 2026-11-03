const router = require('express').Router();
const autenticar = require('../middleware/autenticar');

router.get('/health', (_req, res) => res.json({ ok: true, data: { estado: 'operativo' } }));

router.use('/auth', require('./auth.routes'));
// Todo lo que sigue exige un JWT válido.
router.use('/equipos', autenticar, require('./equipos.routes'));
router.use('/prestamos', autenticar, require('./prestamos.routes'));

module.exports = router;
