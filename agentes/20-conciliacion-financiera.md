# A20 — Conciliación financiera y gastos

## Propósito

Convertir comprobantes y mensajes de pagos en movimientos estructurados, conciliarlos contra clientes, proveedores, facturas y cuentas por pagar, y mantener saldos pendientes sin depender de revisión manual continua.

Este agente queda documentado para una fase posterior; no forma parte todavía del agente LexLatin.

## Fuente WhatsApp

Ricardo y Jonathan reenvían al número técnico de Movida las capturas del banco, Binance u otros medios con monto, divisa y contexto. El [buzón transversal](./01-buzon-whatsapp.md) las clasifica y entrega a este agente. Los grupos quedan fuera de la integración.

## Datos que debe extraer

- Fecha y hora del pago.
- Pagador y cuenta de origen, sin almacenar credenciales.
- Beneficiario o proveedor.
- Cliente/proyecto relacionado: Cube, GAT, ARGlobal u otro.
- Monto y moneda original.
- Monto normalizado y tipo de cambio aplicado.
- Medio: banco, Binance, PayPal, Wise u otro.
- Referencia, concepto y comprobante.
- Factura, cuenta por pagar o periodo asociado.

Para pagos en USDT se puede aplicar la regla operativa `1 USDT = 1 USD`, pero siempre se conserva `USDT` como moneda original y se identifica la regla utilizada.

## Flujo

1. Recibe imagen, PDF o mensaje desde un canal autorizado.
2. Calcula una huella del archivo para impedir registros duplicados.
3. Extrae texto y campos mediante OCR y análisis visual.
4. Busca coincidencias con proveedor, cliente, factura, cuenta por pagar y pagos anteriores.
5. Calcula confianza por campo y marca discrepancias.
6. Solicita confirmación corta a Ricardo o Jonathan.
7. Con aprobación, registra un borrador conciliado en el ERP.
8. Actualiza pagado, saldo pendiente, comisión y moneda correspondiente.
9. Conserva el comprobante y la cadena de aprobación.
10. Escala diferencias de monto, moneda, beneficiario o posible duplicado.

## Confirmación sugerida

```text
🤖 Movida · gasto G-2026-00128
Detecté: Deproing · USD 2,400 · Cube · 30/sep · Wells Fargo.
¿CONFIRMAR? Si algo cambia responde: monto / moneda / proveedor / cliente / fecha.
```

## Reglas especiales iniciales

- Cube y GAT: Ricardo autoriza y paga.
- ARGlobal: Jonathan ejecuta desde Bank of America y Ricardo autoriza.
- Los pagos parciales no cierran la obligación mientras exista saldo.
- Las comisiones se registran separadas del ingreso o egreso bruto.
- No contabilizar solo por reconocer texto en una imagen; se requiere la aprobación definida.

## Indicadores

- Comprobantes recibidos, procesados y pendientes.
- Conciliación automática confirmada.
- Falsos positivos y duplicados evitados.
- Monto pendiente por cliente/proveedor.
- Tiempo entre comprobante, confirmación y registro.
