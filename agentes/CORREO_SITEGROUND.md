# Correo de agentes en SiteGround

## Configuración recomendada

Para que un agente pueda enviar solicitudes y leer respuestas se utiliza SMTP e IMAP. POP3 no se utiliza porque no es apropiado para sincronizar una bandeja compartida.

| Campo | Valor |
|---|---|
| Usuario SMTP e IMAP | Dirección completa, por ejemplo `agente.soporte@movidatci.com` |
| Contraseña | Contraseña propia de ese buzón en SiteGround |
| Servidor SMTP | Hostname exacto de Site Tools → Email → Accounts → Mail Configuration |
| Puerto SMTP | `465` |
| SMTP seguro | Sí, SSL/TLS |
| Servidor IMAP | Hostname exacto de Mail Configuration |
| Puerto IMAP | `993` |
| IMAP seguro | Sí, SSL/TLS |

Para la cuenta actual el hostname comprobado es `gvam1133.siteground.biz`.

## Problemas conocidos

### `ETIMEDOUT ...:465`

El nombre `mail.movidatci.com` está resolviendo actualmente a direcciones del proxy de Cloudflare. El proxy web normal de Cloudflare no entrega SMTP ni IMAP, por lo que el ERP no llega al servidor de correo. Se debe usar directamente el hostname indicado por SiteGround o corregir el registro DNS para que sea `DNS only` y apunte al servidor de correo.

### `535 Incorrect authentication data`

La conexión llegó correctamente a SiteGround, pero el servidor rechazó las credenciales. Comprobar:

1. Que el buzón exista en Site Tools → Email → Accounts.
2. Que el usuario sea la dirección completa y coincida exactamente con el buzón.
3. Que se utilice la contraseña del buzón, no la del panel de SiteGround.
4. Que la contraseña funcione entrando desde `Log in to Webmail`.
5. Si hay dudas, cambiar la contraseña del buzón, probar Webmail y después actualizarla en el ERP.

## Verificación en el ERP

El botón `Probar correo` ejecuta tres comprobaciones:

1. Autenticación SMTP.
2. Autenticación IMAP y apertura de `INBOX` en modo lectura.
3. Envío de un mensaje de prueba al propio buzón.

La cuenta no queda lista para los agentes hasta superar las tres.

