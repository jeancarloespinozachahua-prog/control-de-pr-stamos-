// Error controlado de la aplicación: lleva el código HTTP y un código interno legible.
class AppError extends Error {
  constructor(estado, codigo, mensaje, detalles) {
    super(mensaje);
    this.name = 'AppError';
    this.estado = estado;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

module.exports = AppError;
