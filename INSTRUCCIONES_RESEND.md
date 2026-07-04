# Configuración del Módulo de Recordatorios Automáticos

Para que el envío automático de correos (Cron) del nuevo módulo de Recordatorios funcione correctamente en el entorno de producción (Vercel), debes realizar los siguientes pasos.

## 1. Configurar Variables de Entorno en Vercel
Entra al panel de configuración de tu proyecto en [Vercel](https://vercel.com/) (Pestaña "Settings" > "Environment Variables") y añade las siguientes claves:

1. **`RESEND_API_KEY`**: 
   - Dirígete a [Resend](https://resend.com/api-keys) y genera una nueva clave de API.
   - Pega esa clave como valor de esta variable.

2. **`CRON_SECRET`**:
   - Genera un string seguro (puede ser un UUID aleatorio o una contraseña alfanumérica larga).
   - Este secreto es utilizado por Vercel para autenticar la ruta del Cron (`/api/cron/recordatorios`) e impedir que personas o bots externos envíen solicitudes para lanzar los correos de manera arbitraria.

3. **`ADMIN_EMAIL`** *(Opcional)*:
   - Puedes definir un correo administrador por defecto (ej. `admin@movidatci.com`) al cual se enviarán notificaciones fallback en caso de no tener el correo del creador del recordatorio.

## 2. Archivo vercel.json
El archivo `vercel.json` ya fue creado y subido al repositorio con la configuración del Cron Job para que se ejecute todos los días a las 13:00 UTC (7:00 AM CST / Hora de México):

```json
{
  "crons": [
    {
      "path": "/api/cron/recordatorios",
      "schedule": "0 13 * * *"
    }
  ]
}
```

No necesitas modificarlo a menos que desees cambiar el horario en que se evalúan los recordatorios.

## 3. Configuración de Roles en el Sistema (ERP)
1. Inicia sesión en el ERP como **SUPERADMIN**.
2. Dirígete a la sección de **Configuración**.
3. Edita los **Roles** (Roles de Aplicación) a los que deseas otorgarles acceso para usar este módulo.
4. Asegúrate de marcar los permisos (`ver`, `crear`, `editar`, `eliminar`) del nuevo módulo "Recordatorios".

¡Con esto el módulo de recordatorios por email estará operando al 100% en el entorno de producción!
