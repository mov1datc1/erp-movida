# Changelog — ERP Movida TCI

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/)
y este proyecto sigue [Versionado Semántico](https://semver.org/lang/es/).

---

## [1.8.1] — 2026-07-30

### Fixed
- **Facturación MX**: El botón "Generar" quedaba deshabilitado al crear una nueva Solicitud de Pago MX porque `printData` retenía datos de una factura previamente vista. Se limpia `printData` en todos los flujos de "nueva factura" y se ajustó la condición `disabled` del botón submit para solo validar estatus al editar (`editingId`).

---

## [1.8.0] — 2026-07-29

### Added
- **Proyectos**: Auto-generación de códigos `PROJ-M###` para proyectos nuevos.
- **Facturación**: Selector de Proyecto Asociado en el modal de creación de prefacturas, facturas USA y facturas MX.
- **Cuentas por Pagar**: Selector de Proyecto Asociado en el modal de CXP.
- **Proyectos**: Modal de edición y confirmación premium para eliminar tarjetas de proyecto.
- **Contable**: Sub-servicios y vinculación de proyecto en formulario de movimientos financieros.
- **Proyectos**: Campo de código de proyecto (`codigo`) en el modelo de datos.

---

## [1.7.0] — 2026-07-28

### Added
- **Contable**: Arquitectura de Staffing con separación COGS vs OPEX.
- **Contable**: ETL con auto-aprendizaje para clasificación inteligente de transacciones.
- **Finanzas**: Analítica financiera avanzada, vistas duales, márgenes CAPEX y líneas de negocio.

### Fixed
- **ETL**: Fallback a columna `PAGO 1` si `CANTIDAD` está vacía en importación CSV.
- **ETL**: Lógica optimizada para ingresos y egresos usando solo `CANTIDAD` sin pagos parciales.
- **Contable**: "Histórico" añadido como opción de categoría en MovimientoModal.
- **Contable**: Flag `es_fiscal` pasado correctamente al cliente para edición.

---

## [1.6.0] — 2026-07-25

### Added
- **ETL**: Script de importación de data histórica desde CSV (`scripts/importar_transacciones.ts`).
- **Facturación MX**: Módulo completo de Solicitudes de Pago MX con numeración `YYYYMM##`, template de impresión profesional con sidebar decorativo azul, y campos de mes/tipo de servicio/plataformas.

### Fixed
- **Facturación**: Clases de print mode para facturas.
- **Facturación MX**: Logo y numeración en PDF de factura MX.

---

## [1.5.0] — 2026-07-22

### Added
- **Facturación USA**: Campos de detalle de horas y número de orden en facturas de exportación.
- **Recordatorios**: Módulo de recordatorios con envío de correos automáticos vía Resend.

### Fixed
- **Facturación USA**: Ajustes en layout de orden/horas y logo en PDF.
- **Facturación**: Error de tipo en `setFormData`.
- **Prisma**: Importación nombrada correcta del cliente Prisma.

---

## [1.4.0] — 2026-07-18

### Added
- **Dashboard**: Filtro interactivo de fechas con dropdown premium.
- **Dashboard**: Métricas avanzadas con conversión a MXN para facturas USA.
- **Facturación**: Número USA autoincrementado desde 1573, monto en letras en PDF, prioridad a razón social.
- **CRM Clientes**: Campos de dirección (calle, colonia, ciudad, CP) en perfil y facturas.
- **Facturación**: Campo `monto_mxn_estimado` en modelo Factura y UI/analítica.
- **Facturación**: Columna de acciones rápidas (imprimir/eliminar) en tabla.
- **Facturación USA**: Modal de creación con labels USD y template PDF nativo con QR.

### Fixed
- **Dashboard**: Conversión de métricas a MXN para facturas USA.
- **CRM**: Propiedad `address` faltante en interfaz `Cliente`.
- **Facturación**: Errores de TypeScript en `setPagoFormData` y renderizado de tab USA.

---

## [1.3.0] — 2026-07-14

### Added
- **Facturación USA**: Módulo completo de Facturas USA con PDF nativo y pagos mixtos (USD/MXN).
- **Facturación CFDI**: Módulo de facturación CFDI 4.0 con API de Facturapi, UI replica ASPEL y catálogos SAT.
- **CRM**: Perfil avanzado estilo HubSpot con timeline y UI para email/meetings.
- **Integración Leads**: Webhook CRM para Meta Ads, Google Ads, WordPress con badges de origen y workflow n8n.

### Fixed
- **CRM**: Await de dynamic params en Next.js 15+ para página de detalle de cliente (404).
- **Facturación**: Múltiples errores de tipo en `setFormData` y `facturacion`.

---

## [1.2.0] — 2026-07-08

### Added
- **Contable**: Optimización de P&L con categorías y fórmulas de margen, descarga PDF.
- **Facturación**: Pagos parciales con movimientos contables automáticos.
- **Facturación**: Categorías de ingreso en CXC y CXP.
- **CXP**: Módulo completo de Cuentas por Pagar con sistema de favoritos recurrentes.
- **Facturación**: Acción "Marcar como Pagada" con integración automática al módulo contable.
- **Facturación**: Catálogo de productos, exportación CSV, impresión de tabla y filtros de fecha.
- **Facturación**: Edición de prefacturas, fecha de vencimiento y descarga PDF.
- **Facturación**: Flujo completo de generación de facturas desde cotizaciones y prefacturas manuales.
- **Cotizaciones**: Click-to-detail, cambio de estatus y función de impresión PDF.

### Fixed
- **UI**: Dropdowns premium, alertas inline, highlighting dinámico de vencidas.
- **Contable**: Ocultar elementos UI durante impresión PDF.
- **Facturación**: Layout de impresión (sidebar, márgenes, columna empresa).
- **KPIs**: Conteo correcto de proyectos activos y datos reales para gráfica financiera.

---

## [1.1.0] — 2026-07-02

### Added
- **Líneas de Productos**: Módulo de catálogo de líneas de productos y KPIs financieros semanales.
- **Tareas**: Vista Kanban estilo Trello con drag-and-drop y reordenamiento.
- **CRM**: Acciones de cambio de estatus en fila de clientes.
- **UI**: Dropdowns premium searchable en modals de tareas.
- **Tareas**: Eliminar encargados con popup de confirmación.

### Fixed
- **Tareas**: Sincronización de estado local con Kanban para reflejar cambios inmediatamente.
- **Tareas**: Portal de React para EditarTareaModal (prevenir issues de CSS containment).
- **CRM**: Menú de acciones se abre hacia arriba dinámicamente.

---

## [1.0.0] — 2026-06-25

### Added
- **Core**: Commit inicial del ERP Movida Moderno.
- **Dashboard**: Panel principal con métricas, gráficas (Recharts) y resumen financiero.
- **CRM**: Módulo de clientes, oportunidades y cotizaciones.
- **Contable**: Módulo contable con origen, monto USD y reportes.
- **Tareas**: Módulo de gestión de tareas con asignación de encargados.
- **Proyectos**: Módulo de gestión de proyectos con hitos.
- **Configuración**: Control de roles, usuarios e integraciones.
- **Auth**: Autenticación Supabase con RBAC granular (USER/ADMIN/SUPERADMIN).
- **UI**: Sidebar con nombre de usuario/correo real y botón de logout.

### Fixed
- **Next.js 16**: Renombrar middleware a proxy, fix de imports y dynamic params.
- **Vercel**: Exclusión de scripts en tsconfig para evitar fallos de build.
- **TypeScript**: Múltiples fixes de tipado para deploy exitoso.

---

## Convención de Commits

| Prefijo | Uso |
|---------|-----|
| `feat:` | Nueva funcionalidad |
| `fix:` | Corrección de bug |
| `chore:` | Mantenimiento, refactor, deploy |
| `docs:` | Documentación |
| `style:` | Cambios de UI sin lógica |

---

> **Nota**: Las versiones anteriores a 1.0.0 corresponden a iteraciones de desarrollo pre-launch.
