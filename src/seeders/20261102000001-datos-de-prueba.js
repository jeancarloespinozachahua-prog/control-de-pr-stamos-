'use strict';
// Datos de prueba 100 % FICTICIOS. Usuario de demostración:
//   correo: demo@laboratorio.test   contraseña: Demo12345
const bcrypt = require('bcryptjs');
const { hoy } = require('../utils/fechas');

const sumarDias = (fecha, dias) => {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

module.exports = {
  async up(queryInterface) {
    const ahora = new Date();
    const hash = await bcrypt.hash('Demo12345', 10);

    await queryInterface.bulkInsert('usuarios', [
      { id: 1, nombre: 'Usuario Demo', correo: 'demo@laboratorio.test', contrasena_hash: hash, created_at: ahora, updated_at: ahora },
    ]);

    const eq = (id, codigo, nombre, categoria, condicion_uso) => ({
      id, codigo, nombre, categoria, condicion_uso, created_at: ahora, updated_at: ahora,
    });
    await queryInterface.bulkInsert('equipos', [
      eq(1, 'LAB-001', 'Osciloscopio digital 100 MHz', 'Electrónica', 'bueno'),
      eq(2, 'LAB-002', 'Multímetro de banco', 'Electrónica', 'bueno'),
      eq(3, 'LAB-003', 'Fuente de poder regulable 30 V', 'Electrónica', 'regular'),
      eq(4, 'LAB-004', 'Laptop de laboratorio 14"', 'Cómputo', 'bueno'),
      eq(5, 'LAB-005', 'Switch administrable 24 puertos', 'Redes', 'bueno'),
      eq(6, 'LAB-006', 'Router inalámbrico', 'Redes', 'en_mantenimiento'),
      eq(7, 'LAB-007', 'Proyector portátil', 'Audiovisual', 'bueno'),
      eq(8, 'LAB-008', 'Estación de soldadura', 'Electrónica', 'fuera_de_servicio'),
    ]);

    const h = hoy();
    const pr = (id, equipo_id, prestatario, f1, f2, f3) => ({
      id, equipo_id, usuario_id: 1, prestatario,
      fecha_prestamo: f1, fecha_prevista: f2, fecha_devolucion: f3,
      created_at: ahora, updated_at: ahora,
    });
    await queryInterface.bulkInsert('prestamos', [
      // Historial: ya devuelto
      pr(1, 1, 'Ana Torres Quispe', sumarDias(h, -20), sumarDias(h, -15), sumarDias(h, -16)),
      pr(2, 4, 'Luis Ramos Paredes', sumarDias(h, -12), sumarDias(h, -8), sumarDias(h, -8)),
      // Activo y dentro del plazo
      pr(3, 2, 'Carla Mendoza Rojas', sumarDias(h, -1), sumarDias(h, 4), null),
      // Activo y vencido
      pr(4, 3, 'Jorge Salas Huamán', sumarDias(h, -10), sumarDias(h, -3), null),
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('prestamos', null, {});
    await queryInterface.bulkDelete('equipos', null, {});
    await queryInterface.bulkDelete('usuarios', null, {});
  },
};
