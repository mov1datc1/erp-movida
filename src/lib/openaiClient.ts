import 'server-only';

import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { decryptSecret } from '@/lib/secretEncryption';

export interface StoredOpenAIConfig {
  activa: boolean;
  apiKeyEncrypted: string;
  apiKeyUltimos4?: string;
  organizationId: string;
  projectId: string;
  modeloRapido: string;
  modeloEquilibrado: string;
  modeloComplejo: string;
  limiteMensualUsd: number;
  limitePorEjecucionUsd: number;
  fechaRotacion?: string;
  updatedAt: string;
}

export async function getStoredOpenAIConfig(): Promise<StoredOpenAIConfig | null> {
  const integration = await prisma.integracion.findUnique({
    where: { proveedor: 'OPENAI' },
  });

  if (!integration?.config || typeof integration.config !== 'object' || Array.isArray(integration.config)) {
    return null;
  }

  return integration.config as unknown as StoredOpenAIConfig;
}

export async function getOpenAIClient() {
  const config = await getStoredOpenAIConfig();
  if (!config?.activa) throw new Error('La integración de OpenAI está inactiva.');
  if (!config.apiKeyEncrypted) throw new Error('No hay una API key de OpenAI configurada.');

  const client = new OpenAI({
    apiKey: decryptSecret(config.apiKeyEncrypted),
    organization: config.organizationId || undefined,
    project: config.projectId || undefined,
  });

  return { client, config };
}
