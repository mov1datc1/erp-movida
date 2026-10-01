# A10 — Supervisor de Mesa de Servicio LexLatin

## Propósito

Vigilar continuamente la cola `MDS` de Jira y evitar que un caso nuevo permanezca sin atención o sin una expectativa clara.

## Responsables humanos

- Operación técnica: Edgar Reyes.
- Atención al cliente: Mayra García.
- Supervisión: Jonathan Palacios.

## Disparadores

- Revisión periódica recomendada: cada 15 minutos.
- Ticket en estado pendiente durante 4 horas sin respuesta inicial.
- Ticket sin responsable, estimación o fecha objetivo.
- Cambio de prioridad, reapertura o comentario del cliente.

El umbral de 4 horas, horario laboral, festivos y destinatarios deben ser configurables. Todos los cálculos usan `America/Mexico_City`.

## Flujo

1. Consulta tickets abiertos o actualizados desde la última ejecución.
2. Determina si ya hubo respuesta humana válida al cliente.
3. Comprueba responsable, prioridad, estado, antigüedad y datos de planificación.
4. Si vence el umbral, crea una solicitud corta y correlacionada para Edgar.
5. Envía la pregunta por WhatsApp y correo en paralelo sin crear dos tareas independientes.
6. Notifica a Mayra y Jonathan según la regla de escalamiento.
7. Procesa la primera respuesta válida; las respuestas posteriores se anexan como evidencia.
8. Propone respuesta inicial, transición o escalamiento.
9. Ejecuta en Jira solamente cuando la acción tenga la aprobación requerida.
10. Verifica el cambio y cierra la alerta.

## Pregunta breve sugerida

```text
🤖 Movida · MDS-1627 · SOL-000123
Lleva 4 h pendiente. ¿Ya lo estás trabajando?
Responde: 1 En curso | 2 Espera cliente | 3 Duplicado de MDS-____ | 4 Otro: ____
```

## Salvaguardas

- Una alerta activa por ticket y motivo; no repetir mensajes en cada ciclo.
- Escalamiento progresivo configurable, no bombardeo de mensajes.
- La respuesta automática al cliente debe usar una plantilla aprobada.
- El agente nunca interpreta silencio como autorización.

## Indicadores

- Tiempo hasta primera respuesta.
- Tickets que superaron 4 horas.
- Tiempo de Edgar para responder consultas del agente.
- Alertas repetidas, falsas alarmas y casos escalados.
