// Formato uniforme de respuestas JSON.
const ok = (res, datos, estado = 200, meta) =>
  res.status(estado).json(meta ? { ok: true, data: datos, meta } : { ok: true, data: datos });

const paginar = ({ page, limit }) => ({ limit, offset: (page - 1) * limit });

const metaPaginacion = ({ page, limit }, total) => ({
  total,
  page,
  limit,
  paginas: Math.max(1, Math.ceil(total / limit)),
});

module.exports = { ok, paginar, metaPaginacion };
