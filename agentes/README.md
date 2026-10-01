# Agentes operativos de Movida TCI

Esta carpeta es el manual operativo versionado de los agentes del ERP. Cada archivo describe qué hace un agente, qué información necesita, qué puede ejecutar, qué requiere aprobación humana y cómo deja evidencia.

## Índice

| Código | Agente | Estado |
|---|---|---|
| A00 | [Orquestador Movida](./00-orquestador-movida.md) | Diseñado |
| A10 | [Supervisor de Mesa de Servicio](./10-supervisor-mesa-servicio.md) | Diseñado |
| A11 | [Gestor de seguimiento Jira](./11-seguimiento-jira.md) | Diseñado |
| A12 | [Detector de duplicados Jira](./12-detector-duplicados-jira.md) | Diseñado |
| A13 | [Control de calidad Jira](./13-control-calidad-jira.md) | Parcialmente implementado |
| A14 | [Reporte mensual LexLatin](./14-reporte-lexlatin.md) | Parcialmente implementado |
| A20 | [Conciliación financiera](./20-conciliacion-financiera.md) | Diseñado para una fase posterior |
| — | [Canales de WhatsApp](./CANALES_WHATSAPP.md) | Arquitectura propuesta |

## Reglas comunes

1. El agente observa, recopila y prepara acciones automáticamente.
2. Toda acción con impacto externo o irreversible queda sujeta a la aprobación definida para el proceso.
3. Cada ejecución debe registrar: agente, fecha y hora, disparador, fuentes, decisión, nivel de confianza, aprobador, acción y resultado.
4. Las fechas operativas se calculan en `America/Mexico_City`.
5. Correo y WhatsApp son canales de entrada y salida; el ERP es la fuente central del estado y la auditoría.
6. Una respuesta humana recibida por cualquier canal debe relacionarse con un identificador único de solicitud.
7. Ningún agente guarda contraseñas, tokens, capturas bancarias o datos sensibles en logs abiertos.
8. Si falta información o la confianza es insuficiente, el agente pregunta; no inventa ni ejecuta.

## Estados estándar de una tarea de agente

`DETECTADA → RECOPILANDO → ESPERANDO_RESPUESTA → PROPUESTA → ESPERANDO_APROBACION → EJECUTADA → VERIFICADA`

Estados excepcionales: `BLOQUEADA`, `ERROR_REINTENTABLE`, `ESCALADA` y `CANCELADA`.

## Cómo modificar un agente

Todo cambio de comportamiento comienza actualizando su archivo en esta carpeta. Debe indicar:

- regla anterior y regla nueva;
- responsable que aprobó el cambio;
- fecha efectiva;
- campos, plantillas o integraciones afectadas;
- prueba con la que se validará el resultado.

