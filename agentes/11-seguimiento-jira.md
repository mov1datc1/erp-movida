# A11 — Gestor de seguimiento Jira

## Propósito

Convertir respuestas rápidas del equipo en información estructurada y mantener el ticket correctamente actualizado.

## Flujo

1. Recibe una alerta del supervisor o del control de calidad.
2. Reúne el contexto mínimo: clave, título, último comentario, estado y pregunta pendiente.
3. Formula una sola pregunta precisa a Edgar por WhatsApp y correo.
4. Relaciona la respuesta mediante el identificador de solicitud y la clave Jira.
5. Extrae estado, tiempo trabajado, estimación, fecha objetivo o comentario.
6. Si la respuesta es ambigua, devuelve una pregunta de confirmación corta.
7. Prepara la modificación de Jira y muestra exactamente qué campos cambiarán.
8. Obtiene la aprobación operativa requerida.
9. Actualiza Jira, verifica la lectura posterior y guarda la evidencia.

## Reglas de canal

- WhatsApp y correo comparten la misma solicitud; responder en cualquiera resuelve la pregunta.
- La primera respuesta válida gana. Una respuesta contradictoria posterior reabre la solicitud para revisión.
- El texto original se conserva; la versión normalizada nunca sustituye la evidencia.
- Adjuntos y enlaces se analizan únicamente desde remitentes autorizados.

## Acciones posibles

- Proponer cambio a `En curso`, `Pending`, `Resuelta` o el estado configurado.
- Agregar comentario interno o público según aprobación.
- Registrar worklog o el campo acordado de tiempo trabajado.
- Registrar estimación y fecha objetivo.
- Escalar a Mayra o Jonathan.

