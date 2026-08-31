# Guía de Uso: Menciones (@), Comandos (/) y Skills de Movida Factory

Esta guía documenta cómo sacarle el máximo provecho al asistente de desarrollo con IA (Antigravity) en el entorno de **Movida ERP** y todos los proyectos de **Movida TCI**.

---

## 1. Herramientas Principales de la Interfaz

### A. `@` — Menciones de Contexto
El símbolo `@` te permite adjuntar directamente al prompt el contexto exacto que necesita la IA sin copiar y pegar código:
* `@Archivo` (ej. `@EditarTareaModal.tsx`): La IA revisa ese archivo en específico.
* `@Carpeta` (ej. `@src/app/actions`): La IA analiza la estructura completa de esa carpeta.
* `@Imagen` o `@Screenshot`: Puedes subir maquetas de Figma o capturas de pantallas para que la IA replique el diseño.

### B. `/` — Comandos / Slash Commands
Accesos directos para activar flujos de trabajo especializados:
* `/goal`: Pone a la IA en modo de **Alta Autonomía / Larga Duración**. No se detendrá hasta completar todo el requerimiento, correr compilaciones y verificar que no existan errores.
* `/grill-me`: Inicia una **entrevista interactiva de requerimientos** antes de programar para definir reglas de negocio, componentes UI y arquitectura.
* `/schedule`: Programa recordatorios o revisiones recurrentes.
* `/learn`: Guarda patrones de código y correcciones para futuras sesiones.

### C. Panel de Control de Cambios (`Files With Changes`)
Muestra el resumen de archivos modificados por la IA:
* `+` Líneas agregadas / `-` Líneas eliminadas.
* Botón **`Accept All`**: Confirma y acepta todos los cambios en tu espacio de trabajo.
* Botón **`Reject All`**: Deshace los cambios si prefieres intentar otra aproximación.

---

## 2. Tres (3) Ejemplos Funcionales de Alto Valor

### Ejemplo 1: Modificación Rápida y Quirúrgica
> **Prompt**: `@EditarTareaModal.tsx Ajusta los padding del modal y agrega un borde sutil con sombra al botón de cancelar.`
* **Valor**: Ahorras tiempo y previenes cambios colaterales en otros archivos.

### Ejemplo 2: Entrevista de Diseño Pre-Desarrollo
> **Prompt**: `/grill-me Quiero construir un módulo de reportes contables descargables en PDF.`
* **Valor**: La IA te hace preguntas clave sobre formato, filtros de fecha, permisos RBAC y librerías antes de escribir código.

### Ejemplo 3: Desarrollo Nocturno/Autónomo Completo
> **Prompt**: `/goal Implementar paginación y exportación a Excel en todas las vistas de tablas del ERP.`
* **Valor**: La IA investiga, modifica los archivos, ejecuta `npm run build`, corrige errores de compilación y sube los cambios de forma autónoma.

---

## 3. Catálogo de Skills de Movida Factory

Las **Skills** son carpetas de conocimiento estandarizado con la arquitectura premium de **Movida TCI**.

| Nombre de la Skill | Propósito & Capacidades |
| :--- | :--- |
| `movida-ui-system` | Branding institucional, Glassmorphism, modales con blur, dropdowns avanzados, tablas responsivas. |
| `movida-supabase-patterns` | Políticas RLS, funciones RPC, migraciones SQL, connection pooler. |
| `movida-nextjs-patterns` | Server Actions, RBAC, App Router, middleware y manejo de parámetros asíncronos. |
| `movida-stripe-ecommerce` | Checkout Sessions, OXXO Pay, SPEI, webhooks y persistencia de carritos. |
| `movida-shipping` | Integración de cotización e impresión de guías con Paquete Exprés, DHL y FedEx México. |
| `movida-ai-patterns` | LangGraph, Vercel AI SDK, pipelines RAG, generación de documentos DOCX. |
| `movida-deploy` | Despliegue en Vercel, Render y EAS (Mobile). |
| `movida-vps-deploy` | Despliegues auto-hospedados en servidores VPS (OVH/Hetzner) con Docker Compose + Caddy + SSL. |
| `movida-qa-checklist` | Checklist de calidad pre-despliegue (TypeScript, seguridad, performance). |

---

## 4. Ejemplo de Invocación de Skills con `/goal`

Para invocar una skill en un prompt, basta con nombrarla explícitamente o escribir las palabras clave asociadas:

```text
/goal Crea un módulo de cobros en línea usando la skill movida-stripe-ecommerce para procesar tarjetas y OXXO Pay con webhooks automáticos, y aplica la skill movida-ui-system para la interfaz de usuario.
```

---
*Documento generado por Antigravity AI — Movida TCI LLC (Agosto 2026).*
