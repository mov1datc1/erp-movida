# A14 — Reporte mensual LexLatin

## Propósito

Conciliar Jira y generar el Excel, PowerPoint y PDF mensual para LexLatin, con métricas comprensibles y evidencia verificable.

## Estado actual

El ERP ya sincroniza Jira, muestra el tablero mensual y genera Excel, PowerPoint y PDF. También separa horas del mes y acumuladas, usa la zona horaria de Ciudad de México, excluye cancelados/duplicados y presenta complejidad y backlog.

## Corte y responsables

- Ejecución: primeros 5 días del mes siguiente.
- Zona horaria: `America/Mexico_City`.
- Aprobación de datos y cambios en Jira: Edgar Jaén.
- Aprobación del informe y correo final: Jonathan Palacios.
- Destinataria principal: Edith Santos.

## Flujo

1. Sincroniza el periodo cerrado y el backlog existente al último día del mes.
2. Excluye tickets cancelados y duplicados de los indicadores productivos.
3. Separa:
   - creados y resueltos durante el mes;
   - backlog al cierre;
   - horas registradas durante el mes;
   - horas históricas acumuladas del ticket.
4. Calcula por separado el esfuerzo promedio (`horas del mes ÷ tickets con tiempo registrado`) y el tiempo calendario entre creación y resolución.
5. Lee el impacto informado en Jira como una dimensión independiente del esfuerzo o complejidad.
6. Genera la tabla de complejidad con nivel, cantidad, claves, títulos y horas.
7. Ejecuta las validaciones de calidad y solicita a Edgar la información faltante.
8. Regenera los archivos después de las correcciones.
9. Solicita la aprobación operativa de Edgar.
10. Presenta a Jonathan los entregables, alertas restantes y borrador del correo.
11. Después de su aprobación, envía y registra destinatarios, adjuntos, fecha y resultado.

## Entregables mínimos

- Resumen ejecutivo.
- Casos creados, resueltos y backlog al cierre.
- Creación y resolución por día.
- Tiempo promedio y mediana de resolución.
- Horas mensuales y acumuladas claramente etiquetadas.
- Distribución y detalle por complejidad.
- Backlog con antigüedad, estimación y fecha objetivo.
- Excepciones o datos faltantes.
- Excel de detalle, presentación y PDF.

## Indicadores del agente

- Reportes emitidos dentro de los primeros 5 días.
- Diferencias entre Jira y entregables.
- Tickets excluidos y razón.
- Observaciones posteriores de Edith.
- Número de regeneraciones antes de aprobación.
