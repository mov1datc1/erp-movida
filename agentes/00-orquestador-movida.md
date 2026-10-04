# A00 — Orquestador Movida

## Propósito

Ser el punto único al que Jonathan o un responsable le solicita un resultado. Interpreta la solicitud, selecciona los agentes especializados, coordina dependencias y devuelve un estado consolidado sin saltarse aprobaciones.

## Dirección técnica

El Orquestador será el plano de control de Movida, no un modelo específico. Debe poder asignar cada tarea al modelo o runtime más apropiado sin mover fuera del ERP las reglas, permisos, auditoría y estado del negocio.

- OpenAI Agents API es el candidato principal para sesiones durables, Skills y subagentes.
- Claude puede emplearse en análisis documental, cumplimiento o tareas técnicas especializadas.
- Grok puede emplearse en investigación de tendencias, X y procesos de marketing en tiempo real.
- Los cálculos críticos y las acciones sensibles permanecen gobernados por código y aprobaciones del ERP.

Estado actual: **diseñado, no ejecutable todavía**.

## Entradas

- Solicitud escrita desde el ERP, correo o un canal autorizado.
- Identidad, rol y permisos del solicitante.
- Estado de agentes, tareas pendientes y alertas.
- Reglas vigentes en esta carpeta y configuración del ERP.

## Flujo

1. Identifica intención, cliente, proceso, periodo y urgencia.
2. Comprueba si el solicitante tiene acceso al proceso y sus datos.
3. Divide el objetivo en tareas con identificadores únicos.
4. Asigna cada tarea al agente especializado correspondiente.
5. Vigila tiempos, dependencias, respuestas humanas y errores.
6. Solicita una decisión humana cuando una regla así lo exige.
7. Consolida resultados y evidencia en una sola respuesta.
8. Marca la solicitud como verificada únicamente después de comprobar el efecto de las acciones.

## Límites

- No aprueba en nombre de Edgar, Jonathan, Ricardo u otro responsable.
- No publica, paga, factura, cancela ni modifica sistemas externos si el flujo exige aprobación.
- No expone información de un departamento a usuarios sin permiso.

## Indicadores

- Porcentaje de tareas completadas sin intervención manual adicional.
- Tiempo promedio por solicitud.
- Tareas bloqueadas y causa.
- Acciones revertidas o corregidas.
- Cumplimiento de aprobaciones y trazabilidad.
