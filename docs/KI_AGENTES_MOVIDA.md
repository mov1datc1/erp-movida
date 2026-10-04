# Knowledge Items — Agentes Movida TCI

Este documento conserva las decisiones estables del programa de agentes. Debe leerse junto con [`HANDOFF_ACTUAL.md`](./HANDOFF_ACTUAL.md) al comenzar una sesión nueva.

Última revisión: **2026-10-04**.

## KI-001 — Visión del producto

Movida ERP será el sistema de registro, control y auditoría de una empresa operada progresivamente por agentes. Los agentes no se limitan a sugerir: observan eventos, recopilan información, preparan y ejecutan acciones autorizadas, verifican resultados y dejan evidencia.

La plataforma debe servir primero a Movida TCI y después convertirse en una oferta configurable de agentización para clientes.

## KI-002 — Arquitectura estratégica

- **ERP Movida:** datos, reglas, permisos, aprobaciones, auditoría y panel de supervisión.
- **Runtime de agentes:** se evaluará OpenAI Agents API como motor principal para sesiones durables, herramientas, Skills y subagentes.
- **Modelos reemplazables:** OpenAI como proveedor inicial; Claude y Grok podrán usarse en tareas donde aporten ventajas específicas.
- **Código determinista:** dinero, impuestos, métricas, fechas, conciliaciones y reglas críticas no dependen únicamente del razonamiento de un modelo.
- **Herramientas:** Jira, correo, Facturapi, bancos, WhatsApp y otros sistemas se conectan mediante APIs o MCP cuando sea conveniente.
- **Control humano:** toda acción sensible conserva los responsables y límites definidos por el negocio.

OpenAI Dots, Grok Bot y Claude Managed Agents son referencias de producto e infraestructura, no sustitutos del ERP. La ventaja de Movida es el conocimiento vertical, las integraciones y la trazabilidad del proceso real.

Fuentes de referencia:

- [OpenAI Dots](https://openai.com/index/introducing-dots/)
- [OpenAI Agents API](https://openai.com/index/introducing-the-agents-api/)
- [OpenAI Agent Skills](https://developers.openai.com/api/docs/guides/tools-skills)
- [Grok persistent Bots](https://x.ai/news/designing-grok-bot)
- [Claude: opciones para construir agentes](https://platform.claude.com/docs/en/about-claude/use-case-guides/overview)

## KI-003 — Manuales vs. Skills ejecutables

Los archivos de `agentes/` son actualmente especificaciones operativas versionadas. Todavía no todos son Skills ejecutables.

Para convertir un agente en capacidad de runtime se deberá:

1. crear un directorio propio con `SKILL.md`;
2. definir activación, entradas, herramientas, salidas y límites;
3. separar instrucciones de negocio de credenciales;
4. agregar pruebas y ejemplos;
5. versionar los cambios;
6. registrar la Skill en el runtime seleccionado.

## KI-004 — Reglas transversales

- Zona horaria operativa: `America/Mexico_City`.
- El ERP es la fuente central de estado y auditoría.
- Las credenciales se cifran y nunca se escriben en documentación o logs abiertos.
- Ningún agente interpreta el silencio como aprobación.
- Toda solicitud humana lleva un folio correlacionable.
- Las acciones externas o irreversibles respetan aprobaciones explícitas.
- Los modelos pueden interpretar y proponer; el código verifica condiciones críticas.
- Se deben implementar idempotencia, reintentos controlados y prevención de duplicados antes de automatizar pagos, facturas o modificaciones masivas.

## KI-005 — Responsables LexLatin

- Operación técnica y aprobación de cambios Jira: **Edgar Reyes**, `edgar.reyes@movidatci.com`.
- Atención al cliente: **Mayra García**, `mayra.garcia@movidatci.com`.
- Aprobación del reporte y envío final: **Jonathan Palacios**, `jonathan@movidatci.com`.
- Destinataria principal: **Edith Santos**, `edith.santos@lexlatin.com`.
- Cuenta técnica de Jira: `soporte@movidatci.mx`.
- Cuenta del agente de correo: `agente.soporte@movidatci.com`.
- Proyecto Jira operativo: `MDS`.

El correo `edgar.jaen@movidatci.com` **no existe**. Solo puede aparecer en código como valor legado para migrar configuraciones antiguas o en evidencia histórica de un intento fallido; nunca debe utilizarse para envíos nuevos.

## KI-006 — Reglas del reporte LexLatin

- Excluir tickets cancelados de métricas productivas; normalmente son duplicados.
- Calcular en Ciudad de México.
- Separar creados, resueltos y backlog al cierre.
- `Horas trabajadas` proviene de worklogs estándar de Jira, no del SLA `Time to resolution`.
- `Impact` es una dimensión separada de la complejidad basada en horas.
- Esfuerzo promedio: horas trabajadas en el mes divididas entre tickets con tiempo registrado.
- Tiempo calendario de resolución: diferencia entre creación y resolución; se reporta aparte.
- Mostrar top de casos por horas, complejidad, backlog antiguo y datos faltantes.
- El reporte y las solicitudes del agente deben persistir al cerrar el navegador.

## KI-007 — Correo SiteGround

- SMTP: `gvam1133.siteground.biz`, puerto `465`, conexión segura.
- IMAP: `gvam1133.siteground.biz`, puerto `993`, conexión segura.
- Usuario: dirección completa del buzón.
- `mail.movidatci.com` presentó timeouts desde Vercel y no es el host operativo elegido.
- La aceptación SMTP no equivale necesariamente a entrega en bandeja; deben conservarse `Message-ID`, destinatarios aceptados/rechazados y respuesta del servidor.

## KI-008 — WhatsApp

WhatsApp será un buzón transversal para soporte, gastos, ingresos, marketing y otros procesos. Se usará un número nuevo de WhatsApp Business y la Cloud API oficial de Meta. La línea todavía no ha sido adquirida, por lo que esta integración permanece pendiente.

## KI-009 — Orden de construcción

1. Completar el circuito LexLatin de extremo a extremo.
2. Añadir ejecución programada, cola durable, reintentos y observabilidad.
3. Convertir manuales prioritarios a Skills ejecutables.
4. Implementar supervisor/orquestador y panel de agentes.
5. Construir conciliación financiera y gastos.
6. Completar facturación y cobranza.
7. Incorporar marketing, Ads, LinkedIn, blog y social media.
8. Generalizar la plataforma para clientes de Movida.

