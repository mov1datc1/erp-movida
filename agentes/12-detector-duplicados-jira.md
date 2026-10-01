# A12 — Detector de duplicados Jira

## Propósito

Detectar tickets generados al responder cadenas enviadas a `movida@lexlatin.atlassian.net`, conservar un caso principal y evitar que los duplicados distorsionen operación y reportes.

## Señales de comparación

- Asunto normalizado sin `RE`, `RV`, `FW` ni etiquetas automáticas.
- Remitente, destinatarios y participantes.
- Encabezados `Message-ID`, `In-Reply-To` y `References`, cuando Jira los exponga.
- Texto, enlaces, adjuntos y similitud semántica.
- Cercanía temporal.
- Ticket citado en el asunto o cuerpo.

## Flujo

1. Compara cada ticket nuevo con tickets recientes y abiertos.
2. Calcula un nivel de confianza y explica las coincidencias.
3. Identifica el caso canónico con mayor historial útil.
4. Si la confianza es alta, prepara la propuesta de duplicado.
5. Si es media, pregunta a Edgar indicando los dos tickets.
6. Con aprobación, enlaza ambos casos, copia únicamente la información faltante y cancela el duplicado con la razón acordada.
7. Verifica que el caso principal conserve comentarios y adjuntos necesarios.
8. Excluye el duplicado de KPIs e informes, conservándolo en la auditoría.

## Pregunta sugerida

```text
🤖 Movida · posible duplicado · DUP-000045
MDS-1653 parece continuación de MDS-1652.
¿Conservamos MDS-1652 y cancelamos MDS-1653? Responde SÍ o indica el principal.
```

## Salvaguardas

- La primera etapa siempre exige aprobación de Edgar.
- Nunca cancelar solo por similitud del título.
- No borrar tickets ni adjuntos.
- Registrar puntaje, evidencia, caso canónico, aprobador y resultado.

## Indicadores

- Duplicados confirmados por mes.
- Precisión de las sugerencias.
- Tiempo manual ahorrado.
- Duplicados incorrectos revertidos.

