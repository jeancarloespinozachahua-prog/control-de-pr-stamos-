const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Usuario = sequelize.define(
    'Usuario',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(100), allowNull: false },
      correo: { type: DataTypes.STRING(150), allowNull: false, unique: true },
      contrasena_hash: { type: DataTypes.STRING(100), allowNull: false },
    },
    { tableName: 'usuarios', timestamps: true }
  );

  // Nunca se devuelve el hash en una respuesta JSON.
  Usuario.prototype.toJSON = function toJSON() {
    const { contrasena_hash: _oculto, ...resto } = this.get();
    return resto;
  };

  return Usuario;
};
