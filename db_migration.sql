-- Crear los Enums nuevos (si no existen)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClienteStatus') THEN
        CREATE TYPE "ClienteStatus" AS ENUM ('LEAD', 'ACTIVO', 'INACTIVO');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EtapaOportunidad') THEN
        CREATE TYPE "EtapaOportunidad" AS ENUM ('PROSPECTO', 'CONTACTADO', 'NEGOCIACION', 'GANADO', 'PERDIDO');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FacturaStatus') THEN
        CREATE TYPE "FacturaStatus" AS ENUM ('PENDIENTE', 'PAGADA', 'VENCIDA', 'CANCELADA');
    END IF;
END$$;

-- Crear Tabla Cliente (Nueva)
CREATE TABLE IF NOT EXISTS "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "empresa" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "rfc_taxid" TEXT,
    "estatus" "ClienteStatus" NOT NULL DEFAULT 'LEAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- Crear Tabla Oportunidad (Nueva)
CREATE TABLE IF NOT EXISTS "Oportunidad" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "valor_estimado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "etapa" "EtapaOportunidad" NOT NULL DEFAULT 'PROSPECTO',
    "cliente_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Oportunidad_pkey" PRIMARY KEY ("id")
);

-- Crear Tabla Factura (Nueva)
CREATE TABLE IF NOT EXISTS "Factura" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "fecha_emision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" TIMESTAMP(3),
    "monto_total" DOUBLE PRECISION NOT NULL,
    "estatus" "FacturaStatus" NOT NULL DEFAULT 'PENDIENTE',
    "cliente_id" TEXT NOT NULL,
    "cotizacion_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- Índices Únicos para Factura
CREATE UNIQUE INDEX IF NOT EXISTS "Factura_folio_key" ON "Factura"("folio");

-- Alterar Tabla Proyecto (Existente) para agregar cliente_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Proyecto' AND column_name='cliente_id') THEN
        ALTER TABLE "Proyecto" ADD COLUMN "cliente_id" TEXT;
    END IF;
END$$;

-- Alterar Tabla Cotizacion (Existente) para agregar campos de CRM
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Cotizacion' AND column_name='oportunidad_id') THEN
        ALTER TABLE "Cotizacion" ADD COLUMN "oportunidad_id" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Cotizacion' AND column_name='cliente_id') THEN
        ALTER TABLE "Cotizacion" ADD COLUMN "cliente_id" TEXT;
    END IF;
END$$;

-- Agregar Foreign Keys (ignora si ya existen gracias a las condicionales)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Oportunidad_cliente_id_fkey') THEN
        ALTER TABLE "Oportunidad" ADD CONSTRAINT "Oportunidad_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Proyecto_cliente_id_fkey') THEN
        ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Cotizacion_oportunidad_id_fkey') THEN
        ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_oportunidad_id_fkey" FOREIGN KEY ("oportunidad_id") REFERENCES "Oportunidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Cotizacion_cliente_id_fkey') THEN
        ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Factura_cliente_id_fkey') THEN
        ALTER TABLE "Factura" ADD CONSTRAINT "Factura_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Factura_cotizacion_id_fkey') THEN
        ALTER TABLE "Factura" ADD CONSTRAINT "Factura_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "Cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END$$;
