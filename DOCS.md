# Documentación Técnica — ERP Movida TCI

> **Versión actual**: `v1.8.1`  
> **Última actualización**: 30 de Julio de 2026  
> **Repositorio**: [github.com/mov1datc1/erp-movida](https://github.com/mov1datc1/erp-movida)  
> **Producción**: [erp-movida.vercel.app](https://erp-movida.vercel.app)

---

## Índice

1. [Stack Tecnológico](#stack-tecnológico)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Módulos del Sistema](#módulos-del-sistema)
4. [Modelo de Datos (Prisma)](#modelo-de-datos-prisma)
5. [Autenticación y RBAC](#autenticación-y-rbac)
6. [Integraciones Externas](#integraciones-externas)
7. [Estructura del Proyecto](#estructura-del-proyecto)
8. [Flujo de Deploy](#flujo-de-deploy)
9. [Scripts Utilitarios](#scripts-utilitarios)
10. [Convenciones de Desarrollo](#convenciones-de-desarrollo)
11. [Historial de Versiones](#historial-de-versiones)

---

## Stack Tecnológico

| Componente | Tecnología | Versión |
|------------|-----------|---------|
| **Framework** | Next.js (App Router) | 16.2.7 |
| **Runtime** | React | 19.2.4 |
| **Lenguaje** | TypeScript | 5.x |
| **Base de Datos** | PostgreSQL (Supabase) | — |
| **ORM** | Prisma Client | 7.8.0 |
| **DB Adapter** | @prisma/adapter-pg | 7.8.0 |
| **Autenticación** | Supabase Auth (SSR) | 0.10.3 |
| **CSS** | Tailwind CSS | 4.x |
| **Gráficas** | Recharts | 3.9.1 |
| **Iconos** | Lucide React | 1.17.0 |
| **Facturación MX** | Facturapi SDK | 4.18.0 |
| **Email** | Resend | 6.17.0 |
| **QR Codes** | react-qr-code | 2.2.0 |
| **Excel** | SheetJS (xlsx) | 0.18.5 |
| **Deploy** | Vercel | Auto-deploy from `main` |

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                     VERCEL (Hosting)                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Next.js 16 (App Router)              │  │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │  │
│  │  │  Server   │  │  Client  │  │  Server       │   │  │
│  │  │Components │  │Components│  │  Actions      │   │  │
│  │  └─────┬─────┘  └────┬─────┘  └──────┬────────┘  │  │
│  │        │              │               │           │  │
│  │        └──────────────┴───────┬───────┘           │  │
│  │                               │                   │  │
│  │                    ┌──────────▼─────────┐         │  │
│  │                    │   Prisma Client    │         │  │
│  │                    │  (pg adapter)      │         │  │
│  │                    └──────────┬─────────┘         │  │
│  └───────────────────────────────┼───────────────────┘  │
└──────────────────────────────────┼───────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │    Supabase (PostgreSQL)     │
                    │  ┌────────┐  ┌───────────┐  │
                    │  │  Auth  │  │  Database  │  │
                    │  └────────┘  └───────────┘  │
                    └─────────────────────────────┘
```

### Patrón de datos

- **Server Components** (`page.tsx`): Consultan Prisma directamente, pasan datos como props.
- **Client Components** (`*Client.tsx`): Reciben datos via props, usan Server Actions para mutaciones.
- **Server Actions** (`actions.ts`): Lógica de negocio + Prisma + `revalidatePath()`.

---

## Módulos del Sistema

### 1. Dashboard (`/dashboard`, `/page.tsx`)
- KPIs financieros: ingresos, egresos, balance, margen
- Gráficas con Recharts (barras, líneas, pie)
- Filtro interactivo de fechas (7d, 15d, mes, trimestre, semestre)
- Conversión automática USD→MXN para métricas
- Visibilidad condicionada por rol (admin vs user)

### 2. CRM (`/crm`)

#### Clientes (`/crm/clientes`)
- CRUD completo con perfil estilo HubSpot
- Timeline de actividades (emails, reuniones, llamadas)
- Campos: nombre, empresa, email, teléfono, RFC, razón social, dirección completa
- Acciones de cambio de estatus en fila

#### Oportunidades (`/crm/oportunidades`)
- Pipeline de ventas con etapas editables
- Monto estimado y probabilidad de cierre

#### Cotizaciones (`/crm/cotizaciones`)
- Generación desde catálogo de productos
- Detalle con ítems, PDF descargable
- Cambio de estatus (Borrador → Enviada → Aceptada/Rechazada)

#### Facturación (`/crm/facturacion`)
- **Prefacturas**: Cuentas por cobrar manuales o desde cotización
- **CFDI 4.0**: Timbrado SAT via Facturapi (uso CFDI, régimen, forma/método de pago)
- **Facturas USA**: Numeración auto-incremental desde 1573, PDF con QR, pagos mixtos USD/MXN
- **Facturas MX**: Solicitudes de Pago con numeración `YYYYMM##`, template profesional
- Favoritos/Frecuentes para cobros recurrentes
- Pagos parciales con tracking de monto pagado
- Exportación CSV y PDF de tabla
- Selector de Proyecto Asociado

### 3. Módulo Contable (`/contable`)
- Registro de movimientos financieros (ingresos/egresos)
- Categorías: Ventas y Servicios, Subarrendamiento, Nómina, Staffing, etc.
- Arquitectura COGS vs OPEX para staffing
- Estado de Resultados (P&L) con márgenes y descarga PDF
- Filtros globales de fecha sincronizados
- Integración automática con pagos de facturación

### 4. Cuentas por Pagar (`/cuentas-por-pagar`)
- CRUD de egresos con categorías
- Sistema de favoritos recurrentes (ej: renta mensual)
- Selector de Proyecto Asociado
- Pagos parciales

### 5. Proyectos (`/proyectos`)
- Grid de tarjetas con código auto-generado (`PROJ-M###`)
- Hitos con porcentaje de avance
- Modal de edición y eliminación con confirmación premium
- Vinculación con facturación y CXP

### 6. Tareas (`/tareas`)
- Vista Kanban drag-and-drop estilo Trello
- Asignación de múltiples encargados
- Dropdown premium searchable para selección de clientes
- Portal de React para modals (evitar CSS containment)

### 7. Líneas de Productos (`/lineas-productos`)
- Catálogo de servicios/productos con sub-productos
- KPIs financieros por línea

### 8. Recordatorios (`/recordatorios`)
- Creación de recordatorios con fecha y hora
- Envío automático de correos via Resend

### 9. Configuración (`/configuracion`)
- Gestión de usuarios y roles
- Reset de contraseña desde modal de edición
- Integraciones (Facturapi, etc.)

---

## Modelo de Datos (Prisma)

### Modelos principales

| Modelo | Descripción | Relaciones clave |
|--------|-------------|------------------|
| `Profile` | Usuarios del sistema | → AppRole, Tarea, HitoProyecto |
| `Cliente` | Clientes del CRM | → Factura, Cotizacion, Tarea |
| `Factura` | Prefacturas, USA, MX, CFDI | → Cliente, Cotizacion, LineaProducto, Proyecto, PagoParcial |
| `MovimientoFinanciero` | Ingresos y egresos | → LineaProducto |
| `Proyecto` | Proyectos con código | → HitoProyecto, Factura, CuentaPorPagar |
| `Tarea` | Tareas con Kanban | → Proyecto, Profile, Cliente |
| `Cotizacion` | Presupuestos | → Cliente, CotizacionItem, Factura |
| `LineaProducto` | Catálogo de servicios | → Producto, Factura, MovimientoFinanciero |
| `AppRole` | Roles RBAC | → AppPermission, Profile |
| `CuentaPorPagar` | Egresos/CXP | → Proveedor, Proyecto |
| `Recordatorio` | Alertas con email | → Profile |
| `TransaccionFrecuente` | Favoritos (CXC/CXP) | → Cliente |

### Enums

| Enum | Valores |
|------|---------|
| `Role` | USER, ADMIN, SUPERADMIN |
| `FacturaStatus` | PENDIENTE, PAGADA_PARCIALMENTE, PAGADA, VENCIDA, CANCELADA |
| `EstatusCFDI` | EN_BORRADOR, FACTURADO, CANCELADO |
| `MetodoPagoCFDI` | PUE, PPD |
| `CotizacionStatus` | BORRADOR, ENVIADA, ACEPTADA, RECHAZADA |

---

## Autenticación y RBAC

```
Supabase Auth (SSR)
       │
       ▼
   Profile.auth_id ──► Profile.app_role_id ──► AppRole
                                                  │
                                          AppPermission[]
                                          (module + action)
```

- **Roles**: USER (lectura), ADMIN (CRUD), SUPERADMIN (todo)
- **Permisos granulares**: Por módulo (`crm`, `contable`, `facturacion`, etc.) y acción (`read`, `write`, `delete`, `admin`)
- **Sidebar dinámico**: Filtra opciones de menú según permisos del rol
- **Dashboard**: Oculta métricas sensibles para usuarios no-admin

---

## Integraciones Externas

| Servicio | Uso | Configuración |
|----------|-----|---------------|
| **Facturapi** | Timbrado CFDI 4.0 (SAT) | API Key en `.env` → `FACTURAPI_API_KEY` |
| **Resend** | Envío de correos (recordatorios) | API Key en `.env` → `RESEND_API_KEY` |
| **n8n** | Webhooks de leads (Meta/Google Ads) | Self-hosted, ver `GUIA_HOSTING_N8N.md` |
| **Supabase** | Auth + PostgreSQL | URLs y keys en `.env.local` |

---

## Estructura del Proyecto

```
movida-erp/
├── prisma/
│   └── schema.prisma          # Modelo de datos (612 líneas, ~35 modelos)
├── public/
│   └── logo.png               # Logo para PDFs
├── scripts/
│   ├── importar_transacciones.ts  # ETL de CSV histórico
│   └── assign-legacy-codes.ts    # Asignación de códigos PROJ-M###
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx           # Dashboard principal
│   │   │   ├── contable/          # Módulo contable
│   │   │   ├── crm/
│   │   │   │   ├── clientes/      # CRM Clientes
│   │   │   │   ├── cotizaciones/  # Cotizaciones
│   │   │   │   ├── facturacion/   # Facturación (PRE/USA/MX/CFDI)
│   │   │   │   └── oportunidades/ # Pipeline de ventas
│   │   │   ├── cuentas-por-pagar/ # CXP
│   │   │   ├── proyectos/        # Proyectos
│   │   │   ├── tareas/           # Kanban de tareas
│   │   │   ├── lineas-productos/ # Catálogo
│   │   │   ├── recordatorios/    # Alertas + email
│   │   │   └── configuracion/    # Roles y usuarios
│   │   ├── actions/              # Server Actions compartidas
│   │   └── login/                # Página de login
│   ├── components/               # Componentes reutilizables
│   └── lib/
│       ├── prisma.ts             # Cliente Prisma (pg adapter)
│       ├── facturapi.ts          # Cliente Facturapi
│       └── supabase/             # Helpers de auth
├── CHANGELOG.md                  # ← Historial de cambios
├── DOCS.md                       # ← Este archivo
├── package.json
├── vercel.json
└── tsconfig.json
```

---

## Flujo de Deploy

```
dev (desarrollo)
  │
  ├── git commit -m "feat/fix: descripción"
  ├── git push origin dev
  │
  ▼
main (producción)
  │
  ├── git checkout main
  ├── git merge dev
  ├── git push origin main
  │
  ▼
Vercel (auto-deploy)
  │
  └── Build: next build
      └── Live en: erp-movida.vercel.app
```

### Variables de entorno en Vercel

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Connection string PostgreSQL (Supabase pooler) |
| `DIRECT_URL` | Direct connection (para migraciones) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase |
| `FACTURAPI_API_KEY` | API key de Facturapi (CFDI) |
| `RESEND_API_KEY` | API key de Resend (emails) |

---

## Scripts Utilitarios

| Script | Comando | Descripción |
|--------|---------|-------------|
| ETL CSV | `npx tsx scripts/importar_transacciones.ts` | Importa transacciones históricas desde CSV |
| Legacy Codes | `npx tsx scripts/assign-legacy-codes.ts` | Asigna códigos PROJ-M### a proyectos existentes |

---

## Convenciones de Desarrollo

### Commits
```
feat: nueva funcionalidad
fix: corrección de bug
chore: mantenimiento, refactor
docs: documentación
style: cambios de UI sin lógica
```

### Archivos por módulo
```
modulo/
├── page.tsx          # Server Component (data fetching)
├── ModuloClient.tsx  # Client Component (UI + interacción)
└── actions.ts        # Server Actions (mutations)
```

### UI Patterns
- **Dropdowns**: Custom searchable con backdrop overlay (no `<select>` nativo)
- **Modals**: Con backdrop blur, `animate-in zoom-in-95`, y `z-50`
- **Confirmaciones**: Inline popup dentro del modal (no `window.confirm`)
- **Notificaciones**: Toast overlay con auto-dismiss a 3 segundos
- **Favoritos**: Sidebar colapsable con búsqueda dentro del modal

---

## Historial de Versiones

| Versión | Fecha | Highlights |
|---------|-------|------------|
| **v1.8.1** | 2026-07-30 | Fix botón Generar en Facturas MX |
| **v1.8.0** | 2026-07-29 | Códigos PROJ-M###, proyecto en Facturación/CXP |
| **v1.7.0** | 2026-07-28 | Analítica financiera avanzada, Staffing COGS/OPEX |
| **v1.6.0** | 2026-07-25 | Facturas MX, ETL histórico |
| **v1.5.0** | 2026-07-22 | Facturas USA horas/orden, Recordatorios |
| **v1.4.0** | 2026-07-18 | Dashboard filtros, campos dirección, monto MXN |
| **v1.3.0** | 2026-07-14 | Facturas USA, CFDI 4.0, CRM avanzado, Leads |
| **v1.2.0** | 2026-07-08 | Pagos parciales, CXP, P&L, Kanban |
| **v1.1.0** | 2026-07-02 | Líneas de productos, Kanban, acciones CRM |
| **v1.0.0** | 2026-06-25 | Launch inicial completo |

> Para el detalle completo de cada versión, ver [CHANGELOG.md](./CHANGELOG.md).
