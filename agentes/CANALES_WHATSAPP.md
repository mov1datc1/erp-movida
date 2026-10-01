# Canal oficial de WhatsApp para agentes

## Decisión de arquitectura

Movida debe integrar WhatsApp mediante WhatsApp Business Platform Cloud API, con un número dedicado, webhooks verificados y trazabilidad dentro del ERP. No se utilizarán robots que controlen WhatsApp Web ni librerías no oficiales: son frágiles y pueden comprometer la sesión o el número.

## Limitación de los grupos actuales

No se debe asumir que la API oficial puede incorporar un bot y leer libremente los grupos ordinarios existentes “Soporte” y “Gastos”. El acceso oficial a grupos es restringido, tiene requisitos de elegibilidad y está pensado para grupos gestionados mediante la API. Por ello, la primera versión operará con conversaciones individuales autorizadas y mantendrá correo en paralelo.

Si Movida obtiene acceso oficial a Groups API, se evaluará crear grupos nuevos administrados por la API y migrar el proceso. La migración no debe realizarse hasta verificar elegibilidad, límites de participantes, consentimiento y compatibilidad del número.

## Primera versión recomendada

1. Crear un número técnico exclusivo para el agente Movida.
2. Registrar consentimiento y lista blanca de Edgar, Mayra, Jonathan y Ricardo.
3. El ERP crea una solicitud con identificador único.
4. Envía el mismo requerimiento por WhatsApp individual y correo.
5. El webhook recibe respuestas y las relaciona por solicitud, persona y contexto.
6. El agente interpreta la respuesta y muestra la acción propuesta.
7. El aprobador autoriza en el ERP o mediante una respuesta inequívoca habilitada para su rol.
8. El sistema ejecuta, verifica y registra el resultado.

Mientras se mantienen los grupos actuales, una persona puede reenviar al número técnico un mensaje o comprobante relevante. El agente lo procesa, pero exige confirmar cliente/proyecto y autorización antes de modificar el ERP.

## Datos de configuración necesarios

- Meta Business Portfolio y WhatsApp Business Account.
- Aplicación de Meta y número dedicado.
- `Phone Number ID` y `WhatsApp Business Account ID`.
- Token de acceso almacenado como secreto del servidor.
- Secreto de aplicación y token de verificación del webhook.
- Plantillas aprobadas para mensajes iniciados por la empresa.
- Teléfonos autorizados, rol, zona horaria y reglas de escalamiento.

## Estructura mínima de cada solicitud

- `request_id` único y visible.
- agente y proceso.
- destinatario y rol esperado.
- entidad: ticket, factura, pago o gasto.
- pregunta concreta y opciones válidas.
- fecha de envío, vencimiento y número de recordatorios.
- canal de respuesta y mensaje original.
- interpretación, confianza y evidencia.
- aprobación, acción ejecutada y verificación.

## Reglas de seguridad y operación

- Validar la firma de todos los webhooks.
- Cifrar tokens y restringirlos al servidor.
- Aceptar instrucciones solo desde números autorizados.
- Aplicar idempotencia a mensajes y adjuntos.
- Analizar archivos como contenido no confiable.
- No mostrar números de cuenta completos ni secretos en mensajes.
- Definir retención de mensajes y comprobantes.
- Mantener una pausa manual por agente, proceso y contacto.
- Respetar ventanas de conversación y usar plantillas aprobadas cuando corresponda.
- El silencio, un emoji o una reacción no equivalen a aprobación.

## Fases

### Fase 1 — LexLatin

- Consultas individuales a Edgar por WhatsApp y correo.
- Alertas de tickets sin atención a Edgar, Mayra y Jonathan.
- Respuestas cortas estructuradas y correlacionadas con Jira.
- Aprobación previa antes de cambiar Jira o escribir al cliente.

### Fase 2 — Gastos

- Recepción individual o reenvío autorizado de comprobantes del grupo “Gastos”.
- OCR, clasificación y confirmación con Ricardo/Jonathan.
- Registro de borradores y conciliación con aprobación.

### Fase 3 — Grupos oficiales

- Solicitar y verificar acceso a Groups API.
- Crear grupos gestionados por la API si Movida cumple los requisitos.
- Ejecutar un piloto pequeño antes de migrar “Soporte” o “Gastos”.

## Criterios de aceptación

- Una respuesta por WhatsApp actualiza la solicitud correcta, nunca otra.
- Un mensaje duplicado no genera dos acciones.
- El correo paralelo se cierra al recibir una respuesta válida por WhatsApp.
- Toda acción externa muestra quién respondió y quién aprobó.
- La caída de WhatsApp no detiene el proceso: correo y bandeja del ERP siguen disponibles.

