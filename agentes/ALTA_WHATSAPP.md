# Alta futura del número técnico de WhatsApp

Este procedimiento queda pendiente hasta adquirir una línea nueva. No bloquea el funcionamiento por correo de los agentes.

## Decisión

El número será un buzón transversal para soporte, gastos, ingresos, marketing y nuevas áreas. No leerá grupos; las personas reenviarán directamente al número técnico las capturas, documentos o mensajes relevantes.

## Pasos del responsable de Movida

1. Comprar una SIM o eSIM nueva que pueda recibir SMS o llamada.
2. No registrar inicialmente el número en la aplicación móvil WhatsApp Business.
3. Confirmar acceso administrativo al portafolio empresarial de Movida en Meta Business Suite.
4. Crear en Meta for Developers una aplicación empresarial llamada `Movida ERP Agentes`.
5. Asociarla al portafolio de Movida y agregar el producto WhatsApp.
6. Probar primero con el número de prueba que proporciona Meta.
7. Agregar el número nuevo en WhatsApp Manager, verificarlo por SMS o llamada y solicitar el nombre visible `Movida TCI Agente`.
8. Definir y conservar el PIN de seis dígitos de la verificación en dos pasos.
9. Obtener App ID, Business Portfolio ID, WABA ID y Phone Number ID.
10. Crear un token de usuario del sistema con `whatsapp_business_messaging` y `whatsapp_business_management`.

Los tokens, App Secret y PIN nunca deben enviarse por correo o chat. Se capturarán directamente en el ERP o como secretos de Vercel.

## Trabajo pendiente en el ERP

- Pestaña `Configuración → WhatsApp`.
- Credenciales cifradas y alternativa mediante variables de entorno.
- URL y validación del webhook.
- Prueba de conexión y mensaje.
- Contactos autorizados y roles.
- Enrutamiento hacia soporte, gastos, ingresos y marketing.
- Descarga segura, OCR, deduplicación y retención de adjuntos.
- Bandeja de solicitudes con evidencia y aprobaciones.

## Criterio para retomar

Retomar esta integración cuando exista la línea nueva. Se puede desarrollar y probar previamente con el número temporal de Meta, pero no se activará recepción productiva hasta verificar el número definitivo.

