// Envuelve controladores async para que cualquier error llegue al middleware de errores.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
