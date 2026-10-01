# Canal oficial de WhatsApp para agentes

## Decisión de arquitectura

Movida debe integrar WhatsApp mediante WhatsApp Business Platform Cloud API, con un número dedicado, webhooks verificados y trazabilidad dentro del ERP. No se utilizarán robots que controlen WhatsApp Web ni librerías no oficiales: son frágiles y pueden comprometer la sesión o el número.

## Decisión sobre grupos

Los agentes no leerán grupos de WhatsApp. Las personas reenviarán las capturas, documentos o mensajes necesarios al número técnico de Movida. Este número funciona como un buzón transversal para soporte, gastos, ingresos, marketing y futuros procesos.

## Primera versión recomendada

1. Crear un número técnico exclusivo para el agente Movida.
2. Registrar consentimiento, lista blanca y rol de cada persona autorizada.
3. El webhook recibe texto, capturas y documentos reenviados al número.
4. El [agente de buzón](./01-buzon-whatsapp.md) clasifica el área y crea una solicitud con identificador único.
5. La solicitud pasa al agente especializado de soporte, gastos, ingresos o marketing.
6. Cuando haga falta información, el agente pregunta por WhatsApp y, si la regla lo exige, por correo en paralelo.
7. El aprobador autoriza en el ERP o mediante una respuesta inequívoca habilitada para su rol.
8. El sistema ejecuta, verifica y registra el resultado.

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

### Fase 2 — Gastos e ingresos

- Recepción de comprobantes reenviados al número técnico.
- OCR, clasificación y confirmación con Ricardo/Jonathan.
- Registro de borradores de egresos o ingresos y conciliación con aprobación.

### Fase 3 — Marketing y más departamentos

- Clasificación de leads, campañas, piezas y solicitudes.
- Enrutamiento a los agentes y responsables del área.
- Incorporación progresiva de nuevos procesos manteniendo el mismo número técnico.

## Criterios de aceptación

- Una respuesta por WhatsApp actualiza la solicitud correcta, nunca otra.
- Un mensaje duplicado no genera dos acciones.
- El correo paralelo se cierra al recibir una respuesta válida por WhatsApp.
- Toda acción externa muestra quién respondió y quién aprobó.
- La caída de WhatsApp no detiene el proceso: correo y bandeja del ERP siguen disponibles.
