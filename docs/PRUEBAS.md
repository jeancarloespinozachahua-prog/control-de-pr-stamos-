# Pruebas obligatorias — resumen

Evidencia completa (solicitud y respuesta reales): [`EVIDENCIAS.md`](EVIDENCIAS.md). Pruebas automáticas: `tests/api.test.js`. Colección: [`Coleccion_Postman.json`](Coleccion_Postman.json).

| # | Caso | Resultado esperado | Código | Dónde se prueba |
| --- | --- | --- | --- | --- |
| 1 | Acceso sin token o con token inválido | Operación rechazada | 401 | Postman «Caso 1a/1b»; Jest «Seguridad JWT» (sin token, basura, otro secreto, `alg=none`, expirado) |
| 2 | Correo o código de equipo repetido | Rechazo con mensaje de conflicto | 409 | Postman «Caso 2a/2b»; Jest «Autenticación» y «Equipos» |
| 3 | Préstamo válido | Registro persistente y equipo no disponible | 201 | Postman «Caso 3»; Jest «Préstamos» |
| 4 | Segundo préstamo activo del mismo equipo | Rechazo sin duplicar | 409 | Postman «Caso 4»; Jest (incluye 12 solicitudes simultáneas y prueba directa sobre MySQL) |
| 5 | Devolución y nuevo préstamo | Equipo habilitado tras la devolución | 200 / 201 | Postman «Caso 5a/5b»; Jest «Préstamos» |
| 6 | Datos incompletos o fechas incoherentes | Rechazo con explicación del campo | 400 | Postman «Caso 6a/6b/6c»; Jest (`test.each` de entradas inválidas) |
| 7 | Consulta o modificación de id inexistente | Respuesta 404 | 404 | Postman «Caso 7a/7b»; Jest «Equipos» y «Préstamos» |
| 8 | Reinicio del servidor | Los registros permanecen en MySQL | — | Jest «Persistencia» y sección final de `EVIDENCIAS.md` (conexión nueva e independiente). Prueba manual: detener el servidor con Ctrl+C, iniciarlo de nuevo y repetir `GET /api/equipos`. |
