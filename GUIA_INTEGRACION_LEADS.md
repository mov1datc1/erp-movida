# 📘 Guía: Integración Meta Ads Lead Forms → Movida ERP CRM

## Información del Endpoint

| Campo | Valor |
|---|---|
| **URL** | `https://erp-movida.vercel.app/api/webhooks/leads` |
| **Método** | `POST` |
| **Auth** | `Authorization: Bearer <tu_WEBHOOK_SECRET>` |
| **Content-Type** | `application/json` |

### Formato del Body (JSON)

```json
{
  "nombre": "Nombre del Lead (OBLIGATORIO)",
  "email": "correo@ejemplo.com",
  "telefono": "+52 555 123 4567",
  "empresa": "Empresa del Lead",
  "fuente": "Meta Ads",
  "notas": "Campaña: Lanzamiento Q3 - Ad Set: Interesados Logística"
}
```

---

## Opción 1: Vía Make.com (Recomendado para empezar rápido)

### Paso 1: Crear Escenario en Make
1. Ve a [make.com](https://www.make.com) → **Create a new scenario**.
2. Busca el módulo **"Facebook Lead Ads"** → Selecciona **"Watch New Leads"**.

### Paso 2: Conectar tu cuenta de Facebook
1. Make te pedirá autorizar tu cuenta de Facebook.
2. Selecciona la **Página** que tiene los Lead Forms.
3. Selecciona el **Form** específico del que quieres capturar leads.

### Paso 3: Agregar módulo HTTP
1. Agrega un segundo módulo: **HTTP → Make a request**.
2. Configúralo así:

| Campo | Valor |
|---|---|
| URL | `https://erp-movida.vercel.app/api/webhooks/leads` |
| Method | `POST` |
| Headers | `Authorization` → `Bearer TU_WEBHOOK_SECRET_AQUI` |
| Headers | `Content-Type` → `application/json` |
| Body type | `Raw` |
| Content type | `JSON (application/json)` |

3. En el body, mapea los campos del lead de Facebook:

```json
{
  "nombre": "{{full_name}}",
  "email": "{{email}}",
  "telefono": "{{phone_number}}",
  "empresa": "{{company_name}}",
  "fuente": "Meta Ads",
  "notas": "Campaña: {{campaign_name}} | Ad Set: {{adset_name}} | Form: {{form_name}}"
}
```

> **Nota:** Los nombres de los campos (`full_name`, `email`, etc.) aparecerán en el panel de Make cuando hagas un "test run". Solo arrastra los campos del módulo de Facebook al body JSON.

### Paso 4: Activar el escenario
1. Haz clic en **"Run once"** para probarlo con un lead de prueba.
2. Verifica que el lead aparezca en tu CRM (erp-movida.vercel.app → CRM/Clientes).
3. Activa el escenario en modo **"ON"** con schedule cada **15 minutos** (o inmediato si lo prefieres).

---

## Opción 2: Webhook Directo Meta → ERP (Sin intermediarios)

> Esta opción requiere más configuración inicial pero elimina la dependencia de Make.com.

### Paso 1: Crear App en Meta for Developers

1. Ve a [developers.facebook.com](https://developers.facebook.com/).
2. Haz clic en **"Mis Apps"** → **"Crear app"**.
3. Selecciona **"Business"** como tipo de app.
4. Nombre: `Movida ERP Leads` → Clic en **"Crear app"**.

### Paso 2: Agregar producto Webhooks

1. En el panel lateral de tu app, ve a **"Agregar producto"**.
2. Busca **"Webhooks"** → Clic en **"Configurar"**.
3. En el dropdown de objetos, selecciona **"Page"**.
4. Haz clic en **"Suscribirse a este objeto"**.

### Paso 3: Configurar la URL del Webhook

1. En la sección de Webhooks → Page, haz clic en **"Editar suscripción"**.
2. Rellena:

| Campo | Valor |
|---|---|
| **Callback URL** | `https://erp-movida.vercel.app/api/webhooks/leads` |
| **Verify Token** | El mismo valor de tu `WEBHOOK_SECRET` en Vercel |

3. Haz clic en **"Verificar y guardar"**.
   - Meta hará un `GET` a tu URL con `hub.verify_token` y esperará que devuelvas el `hub.challenge`. Tu endpoint ya soporta esto automáticamente.

4. Suscríbete al campo **"leadgen"** marcando la casilla correspondiente.

### Paso 4: Obtener permisos de la página

1. Ve a **"Configuración de la app"** → **"Permisos avanzados"**.
2. Solicita los siguientes permisos:
   - `pages_manage_metadata`
   - `pages_read_engagement`
   - `leads_retrieval`
   - `ads_management`

3. Para testing en modo desarrollo, puedes generar un **Page Access Token** temporal desde el **Graph API Explorer**.

### Paso 5: Suscribir tu página al webhook

Ejecuta este comando en el **Graph API Explorer** o con `curl`:

```bash
curl -X POST "https://graph.facebook.com/v21.0/{PAGE_ID}/subscribed_apps" \
  -d "subscribed_fields=leadgen" \
  -d "access_token={PAGE_ACCESS_TOKEN}"
```

Reemplaza:
- `{PAGE_ID}` con el ID de tu página de Facebook.
- `{PAGE_ACCESS_TOKEN}` con el token de la página (del Graph API Explorer).

### Paso 6: Configurar variables de entorno en Vercel

1. Ve a [vercel.com](https://vercel.com) → tu proyecto `erp-movida`.
2. **Settings** → **Environment Variables**.
3. Agrega:

| Variable | Valor |
|---|---|
| `WEBHOOK_SECRET` | Una cadena secreta segura (ej: `movida-erp-2026-secret-key`) |
| `META_PAGE_ACCESS_TOKEN` | El token de tu página de Facebook (para el futuro fetch de leads) |

4. Haz **Redeploy** del proyecto para que tome las variables.

### Paso 7: Probar con un lead de prueba

En el **Graph API Explorer**:
```
POST /{PAGE_ID}/leadgen_forms
```

O simplemente llena un formulario de lead real desde un anuncio de prueba en Meta Ads Manager.

---

## Opción 3: WordPress Landing Page (Google Ads)

### Con plugin "Contact Form to API"

1. Instala el plugin **"Contact Form to API"** desde WordPress.
2. En los ajustes del plugin, configura:

| Campo | Valor |
|---|---|
| API URL | `https://erp-movida.vercel.app/api/webhooks/leads` |
| Method | `POST` |
| Header Name | `Authorization` |
| Header Value | `Bearer TU_WEBHOOK_SECRET_AQUI` |

3. Mapea los campos del formulario:
   - `nombre` → campo nombre del form
   - `email` → campo email del form
   - `telefono` → campo teléfono del form
   - `empresa` → campo empresa del form (si aplica)
   - `fuente` → valor fijo: `Google Ads` o `WordPress`

### Con plugin "RT Webhook for Contact Form 7"

1. Instala **"RT Webhook for CF7"** desde WordPress.
2. En cada formulario, agrega una nueva acción webhook:

| Campo | Valor |
|---|---|
| Webhook URL | `https://erp-movida.vercel.app/api/webhooks/leads` |
| Method | `POST` |
| Headers | `Authorization: Bearer TU_WEBHOOK_SECRET_AQUI` |
| Body Format | `JSON` |

3. Mapea los tags del CF7 a los campos JSON:
```json
{
  "nombre": "[your-name]",
  "email": "[your-email]",
  "telefono": "[your-phone]",
  "empresa": "[your-company]",
  "fuente": "WordPress - Google Ads",
  "notas": "Landing: [_post_url] | Campaign: [utm_campaign]"
}
```

---

## Testing Rápido con curl

Puedes probar el endpoint desde tu terminal:

```bash
curl -X POST https://erp-movida.vercel.app/api/webhooks/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_WEBHOOK_SECRET_AQUI" \
  -d '{
    "nombre": "Lead de Prueba",
    "email": "test@movida.com",
    "telefono": "+52 555 000 0000",
    "empresa": "Empresa Test",
    "fuente": "Meta Ads",
    "notas": "Campaña: Test Q3 2026"
  }'
```

Respuesta esperada:
```json
{
  "success": true,
  "action": "created",
  "id": "uuid-del-lead",
  "message": "Nuevo lead creado: Lead de Prueba"
}
```

---

## Resumen de Arquitectura

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────────────┐
│  Meta Ads    │────▶│  Make.com     │────▶│                              │
│  Lead Forms  │     │  (temporal)   │     │  POST /api/webhooks/leads    │
└──────────────┘     └──────────────┘     │  (Bearer Token Auth)         │
                                          │                              │
┌──────────────┐                          │  ┌──────────────────┐       │
│  Meta Ads    │─────────────────────────▶│  │  Prisma Create   │       │
│  Direct Hook │                          │  │  Cliente (LEAD)  │       │
└──────────────┘                          │  └──────────────────┘       │
                                          │                              │
┌──────────────┐     ┌──────────────┐     │  ┌──────────────────┐       │
│  WordPress   │────▶│  CF7 Plugin  │────▶│  │  Deduplicación   │       │
│  Landing     │     │  Webhook     │     │  │  por Email       │       │
└──────────────┘     └──────────────┘     │  └──────────────────┘       │
                                          └──────────────────────────────┘
                                                       │
                                                       ▼
                                          ┌──────────────────────────────┐
                                          │  CRM / Clientes Dashboard    │
                                          │  Badge: 📘 Meta Ads          │
                                          │  Badge: 🟢 Google Ads        │
                                          │  Badge: 🟣 WordPress         │
                                          └──────────────────────────────┘
```
