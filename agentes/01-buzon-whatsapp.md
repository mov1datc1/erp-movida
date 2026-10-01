# A01 — Buzón y enrutador transversal de WhatsApp

## Propósito

Recibir mensajes, capturas, documentos y notas enviados a un único número técnico de Movida; identificar el proceso correspondiente y entregar la información al agente especializado sin depender de grupos de WhatsApp.

## Áreas iniciales

- Soporte y tickets: identifica ticket, cliente, urgencia, respuesta o evidencia y lo envía a los agentes Jira.
- Gastos: extrae proveedor, monto, moneda, fecha, cuenta, cliente/proyecto y comprobante.
- Ingresos: identifica cliente, factura, monto recibido, moneda, fecha y cuenta receptora.
- Marketing: clasifica lead, campaña, consulta, pieza o evidencia y la dirige al flujo autorizado.

Se podrán agregar áreas sin cambiar el número. Cada área tendrá reglas, responsables y permisos independientes.

## Flujo

1. Recibe el webhook oficial con remitente, texto y referencia de los archivos.
2. Verifica firma, número autorizado, duplicidad y tamaño de los adjuntos.
3. Descarga el archivo de forma temporal y segura.
4. Extrae texto y datos mediante OCR, análisis visual y contexto del mensaje.
5. Clasifica área, cliente, proyecto y tipo de operación con un nivel de confianza.
6. Si falta contexto, hace una pregunta breve antes de continuar.
7. Crea una solicitud interna con folio único y conserva el mensaje original como evidencia.
8. Entrega la solicitud al agente especializado.
9. El agente especializado prepara la acción y obtiene las aprobaciones que correspondan.
10. Responde al remitente con recepción, falta de datos o resultado, según sus permisos.

## Pregunta de clasificación

```text
🤖 Movida · REC-000184
Recibí la captura. ¿Qué representa?
1 Gasto | 2 Ingreso | 3 Ticket/soporte | 4 Marketing | 5 Otro
```

## Reglas

- No contabilizar, cerrar tickets ni publicar contenido únicamente por recibir una imagen.
- Si el remitente no está autorizado, conservar el evento mínimo para seguridad y no procesar el adjunto.
- Una huella del archivo y el identificador de WhatsApp evitan procesar dos veces un reenvío.
- La clasificación automática de baja confianza siempre pregunta.
- Las autorizaciones dependen del proceso, no de quién reenvió la captura.

## Indicadores

- Mensajes por área y tipo.
- Clasificaciones correctas y corregidas.
- Tiempo desde recepción hasta registro o resolución.
- Solicitudes pendientes de información o aprobación.
- Archivos duplicados y eventos rechazados por seguridad.

