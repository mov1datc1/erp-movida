# Instrucciones de continuidad — Movida ERP

Antes de modificar este repositorio:

1. Leer `docs/HANDOFF_ACTUAL.md` completo.
2. Leer `docs/KI_AGENTES_MOVIDA.md` completo.
3. Si la tarea afecta un agente, leer su archivo en `agentes/` y actualizarlo cuando cambie el comportamiento.
4. Registrar cambios funcionales en `CHANGELOG.md`.

Reglas del proyecto:

- La rama de integración y Preview es `dev`; no hacer merge a `main` sin autorización explícita.
- No escribir claves, tokens, contraseñas ni datos bancarios sensibles en código, documentación o logs.
- Conservar aprobaciones humanas para acciones externas o sensibles.
- Usar `America/Mexico_City` en procesos operativos y reportes LexLatin.
- No confundir los manuales Markdown de `agentes/` con Skills ejecutables; una Skill requiere `SKILL.md`, herramientas conectadas y pruebas.
- Al finalizar una fase relevante, actualizar `docs/HANDOFF_ACTUAL.md` con el estado real y el siguiente paso.

