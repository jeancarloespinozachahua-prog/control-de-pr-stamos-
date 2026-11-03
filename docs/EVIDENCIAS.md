# Evidencias de pruebas de la API

Generado automáticamente el 2/11/2026, 11:33:04 p. m. con `npm run evidencias` (solicitudes reales contra la API y MySQL).

**Resultado global: 29 de 29 solicitudes con el código HTTP esperado.**

## Resumen

| N.º | Caso | Solicitud | Esperado | Obtenido | Estado |
| --- | --- | --- | --- | --- | --- |
| 1 | Salud del servicio | `GET /api/health` | 200 | 200 | ✅ |
| 2 | Acceso sin token | `GET /api/equipos` | 401 | 401 | ✅ |
| 3 | Acceso con token inválido | `GET /api/equipos` | 401 | 401 | ✅ |
| 4 | Registrar usuario | `POST /api/auth/registro` | 201 | 201 | ✅ |
| 5 | Registro de correo repetido | `POST /api/auth/registro` | 409 | 409 | ✅ |
| 6 | Registro con datos inválidos | `POST /api/auth/registro` | 400 | 400 | ✅ |
| 7 | Login correcto (guarda el token) | `POST /api/auth/login` | 200 | 200 | ✅ |
| 8 | Login con contraseña incorrecta | `POST /api/auth/login` | 401 | 401 | ✅ |
| 9 | Crear equipo | `POST /api/equipos` | 201 | 201 | ✅ |
| 10 | Código de equipo repetido | `POST /api/equipos` | 409 | 409 | ✅ |
| 11 | Datos incompletos | `POST /api/equipos` | 400 | 400 | ✅ |
| 12 | Listar equipos (paginado y filtrable) | `GET /api/equipos?disponible=true&limit=5` | 200 | 200 | ✅ |
| 13 | Consultar equipo por id | `GET /api/equipos/1` | 200 | 200 | ✅ |
| 14 | Actualizar equipo | `PUT /api/equipos/1` | 200 | 200 | ✅ |
| 15 | Consulta de un id inexistente | `GET /api/equipos/999999` | 404 | 404 | ✅ |
| 16 | Modificación de un id inexistente | `PUT /api/equipos/999999` | 404 | 404 | ✅ |
| 17 | Creación de un préstamo válido | `POST /api/prestamos` | 201 | 201 | ✅ |
| 18 | Equipo no disponible tras el préstamo | `GET /api/equipos/1` | 200 | 200 | ✅ |
| 19 | Segundo préstamo activo | `POST /api/prestamos` | 409 | 409 | ✅ |
| 20 | Fechas incoherentes | `POST /api/prestamos` | 400 | 400 | ✅ |
| 21 | Datos incompletos | `POST /api/prestamos` | 400 | 400 | ✅ |
| 22 | Eliminar equipo con historial (prestado) | `DELETE /api/equipos/1` | 409 | 409 | ✅ |
| 23 | Consultar préstamos activos | `GET /api/prestamos?activos=true` | 200 | 200 | ✅ |
| 24 | Devolución | `PUT /api/prestamos/1/devolucion` | 200 | 200 | ✅ |
| 25 | Devolver un préstamo ya devuelto | `PUT /api/prestamos/1/devolucion` | 409 | 409 | ✅ |
| 26 | Devolución de un préstamo inexistente | `PUT /api/prestamos/999999/devolucion` | 404 | 404 | ✅ |
| 27 | Nuevo préstamo después de la devolución | `POST /api/prestamos` | 201 | 201 | ✅ |
| 28 | Historial del equipo | `GET /api/equipos/1/historial` | 200 | 200 | ✅ |
| 29 | Préstamos filtrados por equipo | `GET /api/prestamos?equipo_id=1` | 200 | 200 | ✅ |

## Detalle de cada solicitud

### 1. Salud del servicio

- **Solicitud:** `GET /api/health`
- **Autenticación:** ninguna
- **Resultado esperado:** El servicio responde operativo. (HTTP 200)
- **Código obtenido:** 200 ✅

Respuesta:
```json
{
  "ok": true,
  "data": {
    "estado": "operativo"
  }
}
```

### 2. Caso 1a · Equipos sin token

- **Solicitud:** `GET /api/equipos`
- **Autenticación:** ninguna
- **Resultado esperado:** Operación rechazada con 401. (HTTP 401)
- **Código obtenido:** 401 ✅

Respuesta:
```json
{
  "ok": false,
  "error": {
    "codigo": "NO_AUTENTICADO",
    "mensaje": "Falta el token. Envíe el encabezado Authorization: Bearer <token>"
  }
}
```

### 3. Caso 1b · Equipos con token inválido

- **Solicitud:** `GET /api/equipos`
- **Autenticación:** token inválido
- **Resultado esperado:** Operación rechazada con 401. (HTTP 401)
- **Código obtenido:** 401 ✅

Respuesta:
```json
{
  "ok": false,
  "error": {
    "codigo": "TOKEN_INVALIDO",
    "mensaje": "El token es inválido"
  }
}
```

### 4. Registrar usuario

- **Solicitud:** `POST /api/auth/registro`
- **Autenticación:** ninguna
- **Resultado esperado:** Usuario creado; la respuesta no incluye contraseña ni hash. (HTTP 201)
- **Código obtenido:** 201 ✅

Cuerpo enviado:
```json
{
  "nombre": "Alumno Demo",
  "correo": "alumno.384636@demo.test",
  "contrasena": "Clave12345"
}
```

Respuesta:
```json
{
  "ok": true,
  "data": {
    "id": 1,
    "nombre": "Alumno Demo",
    "correo": "alumno.384636@demo.test",
    "updatedAt": "2026-11-02T23:33:04.728Z",
    "createdAt": "2026-11-02T23:33:04.728Z"
  }
}
```

### 5. Caso 2a · Registro con correo repetido

- **Solicitud:** `POST /api/auth/registro`
- **Autenticación:** ninguna
- **Resultado esperado:** Rechazo con mensaje de conflicto. (HTTP 409)
- **Código obtenido:** 409 ✅

Cuerpo enviado:
```json
{
  "nombre": "Alumno Demo",
  "correo": "alumno.384636@demo.test",
  "contrasena": "Clave12345"
}
```

Respuesta:
```json
{
  "ok": false,
  "error": {
    "codigo": "CORREO_DUPLICADO",
    "mensaje": "Ya existe un usuario registrado con ese correo"
  }
}
```

### 6. Registro con datos inválidos

- **Solicitud:** `POST /api/auth/registro`
- **Autenticación:** ninguna
- **Resultado esperado:** Rechazo con el detalle de cada campo inválido. (HTTP 400)
- **Código obtenido:** 400 ✅

Cuerpo enviado:
```json
{
  "nombre": "A",
  "correo": "no-es-correo",
  "contrasena": "123"
}
```

Respuesta:
```json
{
  "ok": false,
  "error": {
    "codigo": "DATOS_INVALIDOS",
    "mensaje": "Hay 4 datos inválidos o incompletos",
    "detalles": [
      {
        "campo": "nombre",
        "mensaje": "El campo 'nombre' debe tener al menos 2 caracteres"
      },
      {
        "campo": "correo",
        "mensaje": "El campo 'correo' no tiene un formato válido"
      },
      {
        "campo": "contrasena",
        "mensaje": "El campo 'contrasena' debe tener al menos 8 caracteres"
      },
      {
        "campo": "contrasena",
        "mensaje": "El campo 'contrasena' debe contener letras y números"
      }
    ]
  }
}
```

### 7. Login correcto (guarda el token)

- **Solicitud:** `POST /api/auth/login`
- **Autenticación:** ninguna
- **Resultado esperado:** Se entrega un JWT; queda guardado para los pasos siguientes. (HTTP 200)
- **Código obtenido:** 200 ✅

Cuerpo enviado:
```json
{
  "correo": "alumno.384636@demo.test",
  "contrasena": "Clave12345"
}
```

Respuesta:
```json
{
  "ok": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5…[token recortado]",
    "tipo": "Bearer",
    "expira_en": "2h",
    "usuario": {
      "id": 1,
      "nombre": "Alumno Demo",
      "correo": "alumno.384636@demo.test",
      "createdAt": "2026-11-02T23:33:04.000Z",
      "updatedAt": "2026-11-02T23:33:04.000Z"
    }
  }
}
```

### 8. Login con contraseña incorrecta

- **Solicitud:** `POST /api/auth/login`
- **Autenticación:** ninguna
- **Resultado esperado:** Credenciales rechazadas. (HTTP 401)
- **Código obtenido:** 401 ✅

Cuerpo enviado:
```json
{
  "correo": "alumno.384636@demo.test",
  "contrasena": "Equivocada1"
}
```

Respuesta:
```json
{
  "ok": false,
  "error": {
    "codigo": "CREDENCIALES_INVALIDAS",
    "mensaje": "Correo o contraseña incorrectos"
  }
}
```

### 9. Crear equipo

- **Solicitud:** `POST /api/equipos`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** Equipo creado y disponible. (HTTP 201)
- **Código obtenido:** 201 ✅

Cuerpo enviado:
```json
{
  "codigo": "EQ-384636",
  "nombre": "Osciloscopio digital",
  "categoria": "Electrónica",
  "condicion_uso": "bueno"
}
```

Respuesta:
```json
{
  "ok": true,
  "data": {
    "id": 1,
    "codigo": "EQ-384636",
    "nombre": "Osciloscopio digital",
    "categoria": "Electrónica",
    "condicion_uso": "bueno",
    "updatedAt": "2026-11-02T23:33:04.765Z",
    "createdAt": "2026-11-02T23:33:04.765Z",
    "disponible": true
  }
}
```

### 10. Caso 2b · Crear equipo con código repetido

- **Solicitud:** `POST /api/equipos`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** Rechazo con mensaje de conflicto. (HTTP 409)
- **Código obtenido:** 409 ✅

Cuerpo enviado:
```json
{
  "codigo": "EQ-384636",
  "nombre": "Duplicado",
  "categoria": "Electrónica"
}
```

Respuesta:
```json
{
  "ok": false,
  "error": {
    "codigo": "CODIGO_DUPLICADO",
    "mensaje": "Ya existe un equipo con el código EQ-384636"
  }
}
```

### 11. Caso 6a · Equipo con datos incompletos

- **Solicitud:** `POST /api/equipos`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** Rechazo con explicación de los campos faltantes. (HTTP 400)
- **Código obtenido:** 400 ✅

Cuerpo enviado:
```json
{
  "codigo": "EQ-X"
}
```

Respuesta:
```json
{
  "ok": false,
  "error": {
    "codigo": "DATOS_INVALIDOS",
    "mensaje": "Hay 2 datos inválidos o incompletos",
    "detalles": [
      {
        "campo": "nombre",
        "mensaje": "El campo 'nombre' es obligatorio"
      },
      {
        "campo": "categoria",
        "mensaje": "El campo 'categoria' es obligatorio"
      }
    ]
  }
}
```

### 12. Listar equipos (paginado y filtrable)

- **Solicitud:** `GET /api/equipos?disponible=true&limit=5`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** Lista de equipos con el campo calculado "disponible". (HTTP 200)
- **Código obtenido:** 200 ✅

Respuesta:
```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "codigo": "EQ-384636",
      "nombre": "Osciloscopio digital",
      "categoria": "Electrónica",
      "condicion_uso": "bueno",
      "createdAt": "2026-11-02T23:33:04.000Z",
      "updatedAt": "2026-11-02T23:33:04.000Z",
      "disponible": true
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 5,
    "paginas": 1
  }
}
```

### 13. Consultar equipo por id

- **Solicitud:** `GET /api/equipos/1`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** Detalle del equipo, disponible y sin préstamo activo. (HTTP 200)
- **Código obtenido:** 200 ✅

Respuesta:
```json
{
  "ok": true,
  "data": {
    "id": 1,
    "codigo": "EQ-384636",
    "nombre": "Osciloscopio digital",
    "categoria": "Electrónica",
    "condicion_uso": "bueno",
    "createdAt": "2026-11-02T23:33:04.000Z",
    "updatedAt": "2026-11-02T23:33:04.000Z",
    "disponible": true,
    "prestamo_activo": null
  }
}
```

### 14. Actualizar equipo

- **Solicitud:** `PUT /api/equipos/1`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** Solo cambia el campo enviado. (HTTP 200)
- **Código obtenido:** 200 ✅

Cuerpo enviado:
```json
{
  "nombre": "Osciloscopio digital 200 MHz"
}
```

Respuesta:
```json
{
  "ok": true,
  "data": {
    "id": 1,
    "codigo": "EQ-384636",
    "nombre": "Osciloscopio digital 200 MHz",
    "categoria": "Electrónica",
    "condicion_uso": "bueno",
    "createdAt": "2026-11-02T23:33:04.000Z",
    "updatedAt": "2026-11-02T23:33:04.845Z",
    "disponible": true
  }
}
```

### 15. Caso 7a · Consultar id inexistente

- **Solicitud:** `GET /api/equipos/999999`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** Respuesta 404. (HTTP 404)
- **Código obtenido:** 404 ✅

Respuesta:
```json
{
  "ok": false,
  "error": {
    "codigo": "EQUIPO_NO_ENCONTRADO",
    "mensaje": "No existe un equipo con id 999999"
  }
}
```

### 16. Caso 7b · Modificar id inexistente

- **Solicitud:** `PUT /api/equipos/999999`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** Respuesta 404. (HTTP 404)
- **Código obtenido:** 404 ✅

Cuerpo enviado:
```json
{
  "nombre": "No existe"
}
```

Respuesta:
```json
{
  "ok": false,
  "error": {
    "codigo": "EQUIPO_NO_ENCONTRADO",
    "mensaje": "No existe un equipo con id 999999"
  }
}
```

### 17. Caso 3 · Registrar préstamo válido

- **Solicitud:** `POST /api/prestamos`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** Registro persistente; el responsable es el usuario autenticado. (HTTP 201)
- **Código obtenido:** 201 ✅

Cuerpo enviado:
```json
{
  "equipo_id": 1,
  "prestatario": "Ana Torres Quispe",
  "fecha_prestamo": "2026-11-02",
  "fecha_prevista": "2026-11-07"
}
```

Respuesta:
```json
{
  "ok": true,
  "data": {
    "estado": "activo",
    "id": 1,
    "equipo_id": 1,
    "usuario_id": 1,
    "prestatario": "Ana Torres Quispe",
    "fecha_prestamo": "2026-11-02",
    "fecha_prevista": "2026-11-07",
    "fecha_devolucion": null,
    "createdAt": "2026-11-02T23:33:04.000Z",
    "updatedAt": "2026-11-02T23:33:04.000Z",
    "equipo": {
      "id": 1,
      "codigo": "EQ-384636",
      "nombre": "Osciloscopio digital 200 MHz"
    },
    "registrado_por": {
      "id": 1,
      "nombre": "Alumno Demo"
    }
  }
}
```

### 18. Caso 3 · El equipo ya no está disponible

- **Solicitud:** `GET /api/equipos/1`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** "disponible": false y se muestra el préstamo activo. (HTTP 200)
- **Código obtenido:** 200 ✅

Respuesta:
```json
{
  "ok": true,
  "data": {
    "id": 1,
    "codigo": "EQ-384636",
    "nombre": "Osciloscopio digital 200 MHz",
    "categoria": "Electrónica",
    "condicion_uso": "bueno",
    "createdAt": "2026-11-02T23:33:04.000Z",
    "updatedAt": "2026-11-02T23:33:04.000Z",
    "disponible": false,
    "prestamo_activo": {
      "estado": "activo",
      "id": 1,
      "equipo_id": 1,
      "usuario_id": 1,
      "prestatario": "Ana Torres Quispe",
      "fecha_prestamo": "2026-11-02",
      "fecha_prevista": "2026-11-07",
      "fecha_devolucion": null,
      "createdAt": "2026-11-02T23:33:04.000Z",
      "updatedAt": "2026-11-02T23:33:04.000Z",
      "equipo": {
        "id": 1,
        "codigo": "EQ-384636",
        "nombre": "Osciloscopio digital 200 MHz"
      },
      "registrado_por": {
        "id": 1,
        "nombre": "Alumno Demo"
      }
    }
  }
}
```

### 19. Caso 4 · Segundo préstamo activo del mismo equipo

- **Solicitud:** `POST /api/prestamos`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** Rechazo sin duplicar el préstamo activo. (HTTP 409)
- **Código obtenido:** 409 ✅

Cuerpo enviado:
```json
{
  "equipo_id": 1,
  "prestatario": "Luis Ramos Paredes",
  "fecha_prevista": "2026-11-07"
}
```

Respuesta:
```json
{
  "ok": false,
  "error": {
    "codigo": "EQUIPO_NO_DISPONIBLE",
    "mensaje": "El equipo ya tiene un préstamo activo. Registre su devolución antes de prestarlo nuevamente"
  }
}
```

### 20. Caso 6b · Fechas incoherentes

- **Solicitud:** `POST /api/prestamos`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** Rechazo indicando el campo fecha_prevista. (HTTP 400)
- **Código obtenido:** 400 ✅

Cuerpo enviado:
```json
{
  "equipo_id": 1,
  "prestatario": "Luis Ramos Paredes",
  "fecha_prestamo": "2026-11-07",
  "fecha_prevista": "2026-11-02"
}
```

Respuesta:
```json
{
  "ok": false,
  "error": {
    "codigo": "DATOS_INVALIDOS",
    "mensaje": "La 'fecha_prevista' no puede ser anterior a la 'fecha_prestamo'",
    "detalles": [
      {
        "campo": "fecha_prevista",
        "mensaje": "La 'fecha_prevista' no puede ser anterior a la 'fecha_prestamo'"
      }
    ]
  }
}
```

### 21. Caso 6c · Préstamo con datos incompletos

- **Solicitud:** `POST /api/prestamos`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** Rechazo indicando prestatario y fecha_prevista. (HTTP 400)
- **Código obtenido:** 400 ✅

Cuerpo enviado:
```json
{
  "equipo_id": 1
}
```

Respuesta:
```json
{
  "ok": false,
  "error": {
    "codigo": "DATOS_INVALIDOS",
    "mensaje": "Hay 2 datos inválidos o incompletos",
    "detalles": [
      {
        "campo": "prestatario",
        "mensaje": "El campo 'prestatario' es obligatorio"
      },
      {
        "campo": "fecha_prevista",
        "mensaje": "El campo 'fecha_prevista' es obligatorio"
      }
    ]
  }
}
```

### 22. Eliminar equipo con historial (prestado)

- **Solicitud:** `DELETE /api/equipos/1`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** No se permite eliminar equipos con historial de préstamos. (HTTP 409)
- **Código obtenido:** 409 ✅

Respuesta:
```json
{
  "ok": false,
  "error": {
    "codigo": "EQUIPO_CON_HISTORIAL",
    "mensaje": "No se puede eliminar el equipo: tiene 1 préstamo(s) en su historial"
  }
}
```

### 23. Consultar préstamos activos

- **Solicitud:** `GET /api/prestamos?activos=true`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** Solo préstamos sin fecha de devolución. (HTTP 200)
- **Código obtenido:** 200 ✅

Respuesta:
```json
{
  "ok": true,
  "data": [
    {
      "estado": "activo",
      "id": 1,
      "equipo_id": 1,
      "usuario_id": 1,
      "prestatario": "Ana Torres Quispe",
      "fecha_prestamo": "2026-11-02",
      "fecha_prevista": "2026-11-07",
      "fecha_devolucion": null,
      "createdAt": "2026-11-02T23:33:04.000Z",
      "updatedAt": "2026-11-02T23:33:04.000Z",
      "equipo": {
        "id": 1,
        "codigo": "EQ-384636",
        "nombre": "Osciloscopio digital 200 MHz"
      },
      "registrado_por": {
        "id": 1,
        "nombre": "Alumno Demo"
      }
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "paginas": 1
  }
}
```

### 24. Caso 5a · Registrar devolución

- **Solicitud:** `PUT /api/prestamos/1/devolucion`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** Se registra la fecha de devolución; estado "devuelto". (HTTP 200)
- **Código obtenido:** 200 ✅

Respuesta:
```json
{
  "ok": true,
  "data": {
    "estado": "devuelto",
    "id": 1,
    "equipo_id": 1,
    "usuario_id": 1,
    "prestatario": "Ana Torres Quispe",
    "fecha_prestamo": "2026-11-02",
    "fecha_prevista": "2026-11-07",
    "fecha_devolucion": "2026-11-02",
    "createdAt": "2026-11-02T23:33:04.000Z",
    "updatedAt": "2026-11-02T23:33:04.000Z",
    "equipo": {
      "id": 1,
      "codigo": "EQ-384636",
      "nombre": "Osciloscopio digital 200 MHz"
    },
    "registrado_por": {
      "id": 1,
      "nombre": "Alumno Demo"
    }
  }
}
```

### 25. Devolver un préstamo ya devuelto

- **Solicitud:** `PUT /api/prestamos/1/devolucion`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** Rechazo: el préstamo ya fue devuelto. (HTTP 409)
- **Código obtenido:** 409 ✅

Respuesta:
```json
{
  "ok": false,
  "error": {
    "codigo": "PRESTAMO_YA_DEVUELTO",
    "mensaje": "El préstamo ya fue devuelto el 2026-11-02"
  }
}
```

### 26. Devolución de un préstamo inexistente

- **Solicitud:** `PUT /api/prestamos/999999/devolucion`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** Respuesta 404. (HTTP 404)
- **Código obtenido:** 404 ✅

Respuesta:
```json
{
  "ok": false,
  "error": {
    "codigo": "PRESTAMO_NO_ENCONTRADO",
    "mensaje": "No existe un préstamo con id 999999"
  }
}
```

### 27. Caso 5b · Nuevo préstamo tras la devolución

- **Solicitud:** `POST /api/prestamos`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** El equipo fue habilitado y admite un nuevo préstamo. (HTTP 201)
- **Código obtenido:** 201 ✅

Cuerpo enviado:
```json
{
  "equipo_id": 1,
  "prestatario": "Luis Ramos Paredes",
  "fecha_prevista": "2026-11-07"
}
```

Respuesta:
```json
{
  "ok": true,
  "data": {
    "estado": "activo",
    "id": 2,
    "equipo_id": 1,
    "usuario_id": 1,
    "prestatario": "Luis Ramos Paredes",
    "fecha_prestamo": "2026-11-02",
    "fecha_prevista": "2026-11-07",
    "fecha_devolucion": null,
    "createdAt": "2026-11-02T23:33:04.000Z",
    "updatedAt": "2026-11-02T23:33:04.000Z",
    "equipo": {
      "id": 1,
      "codigo": "EQ-384636",
      "nombre": "Osciloscopio digital 200 MHz"
    },
    "registrado_por": {
      "id": 1,
      "nombre": "Alumno Demo"
    }
  }
}
```

### 28. Historial del equipo

- **Solicitud:** `GET /api/equipos/1/historial`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** Los dos préstamos del equipo, del más reciente al más antiguo. (HTTP 200)
- **Código obtenido:** 200 ✅

Respuesta:
```json
{
  "ok": true,
  "data": {
    "equipo": {
      "id": 1,
      "codigo": "EQ-384636",
      "nombre": "Osciloscopio digital 200 MHz",
      "categoria": "Electrónica",
      "condicion_uso": "bueno",
      "createdAt": "2026-11-02T23:33:04.000Z",
      "updatedAt": "2026-11-02T23:33:04.000Z"
    },
    "prestamos": [
      {
        "estado": "activo",
        "id": 2,
        "equipo_id": 1,
        "usuario_id": 1,
        "prestatario": "Luis Ramos Paredes",
        "fecha_prestamo": "2026-11-02",
        "fecha_prevista": "2026-11-07",
        "fecha_devolucion": null,
        "createdAt": "2026-11-02T23:33:04.000Z",
        "updatedAt": "2026-11-02T23:33:04.000Z",
        "equipo": {
          "id": 1,
          "codigo": "EQ-384636",
          "nombre": "Osciloscopio digital 200 MHz"
        },
        "registrado_por": {
          "id": 1,
          "nombre": "Alumno Demo"
        }
      },
      {
        "estado": "devuelto",
        "id": 1,
        "equipo_id": 1,
        "usuario_id": 1,
        "prestatario": "Ana Torres Quispe",
        "fecha_prestamo": "2026-11-02",
        "fecha_prevista": "2026-11-07",
        "fecha_devolucion": "2026-11-02",
        "createdAt": "2026-11-02T23:33:04.000Z",
        "updatedAt": "2026-11-02T23:33:04.000Z",
  …(recortado)
```

### 29. Préstamos filtrados por equipo

- **Solicitud:** `GET /api/prestamos?equipo_id=1`
- **Autenticación:** Bearer JWT
- **Resultado esperado:** Activos y devueltos del equipo indicado. (HTTP 200)
- **Código obtenido:** 200 ✅

Respuesta:
```json
{
  "ok": true,
  "data": [
    {
      "estado": "activo",
      "id": 2,
      "equipo_id": 1,
      "usuario_id": 1,
      "prestatario": "Luis Ramos Paredes",
      "fecha_prestamo": "2026-11-02",
      "fecha_prevista": "2026-11-07",
      "fecha_devolucion": null,
      "createdAt": "2026-11-02T23:33:04.000Z",
      "updatedAt": "2026-11-02T23:33:04.000Z",
      "equipo": {
        "id": 1,
        "codigo": "EQ-384636",
        "nombre": "Osciloscopio digital 200 MHz"
      },
      "registrado_por": {
        "id": 1,
        "nombre": "Alumno Demo"
      }
    },
    {
      "estado": "devuelto",
      "id": 1,
      "equipo_id": 1,
      "usuario_id": 1,
      "prestatario": "Ana Torres Quispe",
      "fecha_prestamo": "2026-11-02",
      "fecha_prevista": "2026-11-07",
      "fecha_devolucion": "2026-11-02",
      "createdAt": "2026-11-02T23:33:04.000Z",
      "updatedAt": "2026-11-02T23:33:04.000Z",
      "equipo": {
        "id": 1,
        "codigo": "EQ-384636",
        "nombre": "Osciloscopio digital 200 MHz"
      },
      "registrado_por": {
        "id": 1,
        "nombre": "Alumno Demo"
      }
    }
  …(recortado)
```

## Caso 8 · Reinicio del servidor

Una conexión nueva e independiente a MySQL (equivalente a reiniciar el servidor) leyó **2 préstamos** y la cifra coincide con la que reporta la API. Los datos viven en MySQL, no en la memoria del proceso. ✅
