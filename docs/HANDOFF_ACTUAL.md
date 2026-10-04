# Handoff actual — ERP Movida y agentes

Documento de continuidad para retomar el proyecto después de reiniciar una sesión.

Actualizado: **2026-10-04**  
Rama activa: **`dev`**  
Último commit funcional revisado: **`fb4c7fa`**

## Leer primero

1. [`KI_AGENTES_MOVIDA.md`](./KI_AGENTES_MOVIDA.md)
2. [`../agentes/README.md`](../agentes/README.md)
3. [`../agentes/14-reporte-lexlatin.md`](../agentes/14-reporte-lexlatin.md)
4. [`../CHANGELOG.md`](../CHANGELOG.md)

## Estado del entorno

- Preview de Vercel asociado a `dev`: `https://erp-movida-git-dev-jhons-projects-2d167afe.vercel.app`.
- OpenAI está configurado en Preview mediante la variable sensible `API_OPENAI_ERP` y la prueba de conexión fue exitosa.
- Jira/Atlassian está conectado al sitio `https://lexlatin.atlassian.net`, proyecto `MDS`.
- SMTP e IMAP de SiteGround están configurados con la cuenta `agente.soporte@movidatci.com`.
- No escribir valores de tokens, claves o contraseñas en este archivo.

## LexLatin implementado

- Sincronización mensual desde Jira.
- Exclusión de cancelados en indicadores productivos.
- Zona horaria `America/Mexico_City`.
- Separación entre esfuerzo efectivo y tiempo calendario de resolución.
- Worklogs estándar como fuente de horas trabajadas.
- Campo `Impact` separado de la complejidad.
- Métricas mensuales, backlog, calidad de datos, complejidad y top de esfuerzo.
- Exportación Excel, PowerPoint y PDF.
- Persistencia del último reporte sincronizado.
- Envío de prueba controlada a Edgar.
- Lectura IMAP de respuestas correlacionadas por folio.
- Persistencia de solicitudes y respuestas.
- Evidencia SMTP visible: remitente, destinatario, `Message-ID`, aceptados/rechazados y respuesta del servidor cuando exista.
- Migración automática del aprobador legado `edgar.jaen@movidatci.com` a `edgar.reyes@movidatci.com`.

## Incidente de correo resuelto

El primer intento se dirigió por error a `edgar.jaen@movidatci.com`, dirección inexistente. Se corrigió a `edgar.reyes@movidatci.com` en código, configuración persistida y documentación.

En el siguiente intento, Nodemailer completó `sendMail()`, pero el ERP falló después al ejecutar `.map()` sobre el campo opcional `pending`. El commit `fb4c7fa` hace tolerantes los campos SMTP opcionales. Ese intento pudo haber llegado a Edgar aunque el ERP mostrara error, pero no quedó persistido porque el fallo ocurrió antes de guardar la solicitud.

## Validación pendiente inmediata

1. Confirmar con Edgar si recibió la prueba más reciente y revisar spam.
2. Si no la recibió, recargar completamente el Preview y enviar **una sola** prueba.
3. Comprobar que el ERP muestre:
   - destinatario `edgar.reyes@movidatci.com`;
   - estado `Aceptado por SMTP`;
   - `Message-ID`;
   - ningún destinatario rechazado.
4. Edgar debe responder el mismo correo sin cambiar el asunto.
5. Pulsar `Revisar respuestas` y verificar que el estado cambie a `Respuesta recibida`.
6. Documentar el resultado en `agentes/14-reporte-lexlatin.md` y en el changelog.

## Lo que aún no está implementado

- Monitor automático de Jira cada 15 minutos.
- Alertas por tickets pendientes durante 4 horas.
- Detección y cancelación asistida de duplicados.
- Escritura automática de comentarios, worklogs o estados en Jira.
- Procesamiento semántico completo de la respuesta de Edgar y propuesta de cambios.
- Scheduler/worker 24/7, cola durable, reintentos e idempotencia general.
- WhatsApp Cloud API.
- Orquestador multiagente ejecutable.
- Panel visual tipo “empresa agentizada”.
- Skills de runtime basadas en `SKILL.md` para cada rol.
- Agente financiero/conciliador y agentes de marketing.

## Próximo incremento recomendado

Después de validar el correo de Edgar, completar un circuito LexLatin de extremo a extremo:

`detectar faltante → preguntar → recibir respuesta → estructurar propuesta → aprobar → actualizar Jira → verificar → regenerar reporte`.

La primera automatización programada debe ser de bajo riesgo: monitorizar tickets pendientes y crear alertas internas. No debe modificar Jira automáticamente hasta validar permisos, idempotencia y aprobación.

## Commits clave

| Commit | Cambio |
|---|---|
| `58254c6` | Configuración segura de correo y OpenAI |
| `28a92ba` | Reporte LexLatin y soporte de variable OpenAI |
| `97584df` | Precisión del reporte mensual |
| `8c6bc43` | Circuito controlado de correo y respuestas |
| `bbd2d04` | Diagnóstico SMTP/IMAP de SiteGround |
| `6e659ac` | Separación esfuerzo vs. resolución |
| `fe150ee` | Persistencia del reporte y top de esfuerzo |
| `746c9b5` | Evidencia de aceptación SMTP |
| `0886ceb` | Correo correcto de Edgar Reyes |
| `fb4c7fa` | Manejo de campos SMTP opcionales |

