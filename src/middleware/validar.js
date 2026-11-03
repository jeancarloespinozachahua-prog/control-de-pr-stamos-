// Valida params, query y body con esquemas Zod. Deja los datos limpios en req.valid.
module.exports = (esquemas) => (req, _res, next) => {
  try {
    req.valid = {};
    for (const parte of ['params', 'query', 'body']) {
      if (esquemas[parte]) req.valid[parte] = esquemas[parte].parse(req[parte] ?? {});
    }
    next();
  } catch (error) {
    next(error);
  }
};
