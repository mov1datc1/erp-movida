# A13 — Control de calidad Jira

## Propósito

Asegurar que los tickets tengan la información necesaria para operarlos y para producir un reporte mensual defendible.

## Validaciones

- Ticket resuelto sin tiempo trabajado.
- Ticket abierto sin estimación ni fecha objetivo.
- Caso pendiente sin respuesta inicial.
- Estado incompatible con resolución o fechas.
- Worklog fuera del periodo o inconsistente con el total acumulado.
- Complejidad no determinada.
- Ticket cancelado sin motivo o sin referencia al duplicado.

## Flujo

1. Ejecuta controles diarios y una revisión reforzada antes del corte mensual.
2. Agrupa faltantes por responsable para reducir interrupciones.
3. Pregunta a Edgar por WhatsApp y correo usando una lista corta y accionable.
4. Interpreta respuestas estructuradas o libres y solicita confirmación cuando sea necesario.
5. Prepara cambios de Jira para aprobación operativa.
6. Actualiza y vuelve a consultar Jira para comprobar el resultado.
7. Entrega al agente de reporte una lista de excepciones no resueltas.

## Ejemplo

```text
🤖 Movida · cierre septiembre · CAL-000081
Faltan datos en 3 casos:
1. MDS-1640: horas trabajadas
2. MDS-1627: estimación o fecha objetivo
3. MDS-1614: estimación o fecha objetivo
Responde por número, por ejemplo: “1: 2 h; 2: 6 h; 3: 4/oct”.
```

## Indicadores

- Porcentaje de tickets completos antes del corte.
- Faltantes por tipo.
- Tiempo desde la pregunta hasta la corrección.
- Correcciones rechazadas por el aprobador.

