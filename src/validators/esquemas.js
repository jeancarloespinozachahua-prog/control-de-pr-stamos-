// Validación de entradas con Zod. Todos los esquemas de cuerpo son "strict":
// rechazan campos desconocidos (evita que el cliente envíe, por ejemplo, usuario_id).
const { z } = require('zod');
const { CONDICIONES } = require('../models');
const { esFechaReal } = require('../utils/fechas');

const texto = (campo, { min = 1, max = 100 } = {}) =>
  z
    .string({
      required_error: `El campo '${campo}' es obligatorio`,
      invalid_type_error: `El campo '${campo}' debe ser texto`,
    })
    .trim()
    .min(min, min === 1 ? `El campo '${campo}' no puede estar vacío` : `El campo '${campo}' debe tener al menos ${min} caracteres`)
    .max(max, `El campo '${campo}' no puede superar ${max} caracteres`);

const entero = (campo) =>
  z.coerce
    .number({ invalid_type_error: `El campo '${campo}' debe ser un número entero positivo`, required_error: `El campo '${campo}' es obligatorio` })
    .int(`El campo '${campo}' debe ser un número entero positivo`)
    .positive(`El campo '${campo}' debe ser un número entero positivo`);

const fecha = (campo) =>
  z
    .string({ required_error: `El campo '${campo}' es obligatorio`, invalid_type_error: `El campo '${campo}' debe ser una fecha AAAA-MM-DD` })
    .refine(esFechaReal, `El campo '${campo}' debe ser una fecha válida con formato AAAA-MM-DD`);

const booleanoQuery = (campo) =>
  z
    .enum(['true', 'false'], { errorMap: () => ({ message: `El parámetro '${campo}' debe ser true o false` }) })
    .transform((v) => v === 'true')
    .optional();

const condicion = z.enum(CONDICIONES, {
  errorMap: () => ({ message: `El campo 'condicion_uso' debe ser uno de: ${CONDICIONES.join(', ')}` }),
});

const codigoEquipo = texto('codigo', { max: 30 })
  .transform((v) => v.toUpperCase())
  .refine((v) => /^[A-Z0-9][A-Z0-9_-]*$/.test(v), "El campo 'codigo' solo admite letras, números, guion y guion bajo");

const paginacion = {
  page: z.coerce.number().int().min(1, "El parámetro 'page' debe ser 1 o mayor").default(1),
  limit: z.coerce.number().int().min(1).max(100, "El parámetro 'limit' no puede superar 100").default(20),
};

const params = { id: z.object({ id: entero('id') }) };

// ---- Autenticación ----
const registro = z
  .object({
    nombre: texto('nombre', { min: 2, max: 100 }),
    correo: texto('correo', { max: 150 }).toLowerCase().pipe(z.string().email("El campo 'correo' no tiene un formato válido")),
    contrasena: z
      .string({ required_error: "El campo 'contrasena' es obligatorio", invalid_type_error: "El campo 'contrasena' debe ser texto" })
      .min(8, "El campo 'contrasena' debe tener al menos 8 caracteres")
      .max(72, "El campo 'contrasena' no puede superar 72 caracteres")
      .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "El campo 'contrasena' debe contener letras y números"),
  })
  .strict();

const login = z
  .object({
    correo: texto('correo', { max: 150 }).toLowerCase(),
    contrasena: z.string({ required_error: "El campo 'contrasena' es obligatorio", invalid_type_error: "El campo 'contrasena' debe ser texto" }).min(1, "El campo 'contrasena' no puede estar vacío").max(72),
  })
  .strict();

// ---- Equipos ----
const equipoCrear = z
  .object({
    codigo: codigoEquipo,
    nombre: texto('nombre', { max: 120 }),
    categoria: texto('categoria', { max: 60 }),
    condicion_uso: condicion.default('bueno'),
  })
  .strict();

const equipoActualizar = z
  .object({
    codigo: codigoEquipo.optional(),
    nombre: texto('nombre', { max: 120 }).optional(),
    categoria: texto('categoria', { max: 60 }).optional(),
    condicion_uso: condicion.optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: 'Envíe al menos un campo para actualizar' });

const equipoListar = z.object({
  ...paginacion,
  q: z.string().trim().max(100).optional(),
  categoria: z.string().trim().max(60).optional(),
  condicion_uso: condicion.optional(),
  disponible: booleanoQuery('disponible'),
});

// ---- Préstamos ----
const prestamoCrear = z
  .object({
    equipo_id: entero('equipo_id'),
    prestatario: texto('prestatario', { min: 2, max: 120 }),
    fecha_prestamo: fecha('fecha_prestamo').optional(),
    fecha_prevista: fecha('fecha_prevista'),
  })
  .strict()
  .superRefine((o, ctx) => {
    if (o.fecha_prestamo && o.fecha_prevista < o.fecha_prestamo) {
      ctx.addIssue({
        code: 'custom',
        path: ['fecha_prevista'],
        message: "La 'fecha_prevista' no puede ser anterior a la 'fecha_prestamo'",
      });
    }
  });

const prestamoListar = z.object({
  ...paginacion,
  activos: booleanoQuery('activos'),
  vencidos: booleanoQuery('vencidos'),
  equipo_id: entero('equipo_id').optional(),
  prestatario: z.string().trim().max(120).optional(),
});

const devolucion = z
  .object({
    fecha_devolucion: fecha('fecha_devolucion').optional(),
    condicion_uso: condicion.optional(),
  })
  .strict();

module.exports = {
  params,
  paginacion: z.object(paginacion),
  registro,
  login,
  equipoCrear,
  equipoActualizar,
  equipoListar,
  prestamoCrear,
  prestamoListar,
  devolucion,
};
