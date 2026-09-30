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

const DEFAULT_OPENAI_CONFIG: Omit<StoredOpenAIConfig, 'apiKeyUltimos4' | 'updatedAt'> = {
  activa: true,
  apiKeyEncrypted: '',
  organizationId: '',
  projectId: '',
  modeloRapido: 'gpt-6-luna',
  modeloEquilibrado: 'gpt-6.1-sol',
  modeloComplejo: 'gpt-6-astra',
  limiteMensualUsd: 100,
  limitePorEjecucionUsd: 2,
};

export function getEnvironmentOpenAIApiKey(): string | null {
  return process.env.OPENAI_API_KEY?.trim()
    || process.env.API_OPENAI_ERP?.trim()
    || null;
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
  const storedConfig = await getStoredOpenAIConfig();
  const environmentApiKey = getEnvironmentOpenAIApiKey();
  const config: StoredOpenAIConfig = storedConfig || {
    ...DEFAULT_OPENAI_CONFIG,
    apiKeyUltimos4: environmentApiKey?.slice(-4),
    updatedAt: new Date().toISOString(),
  };

  if (!config.activa) throw new Error('La integración de OpenAI está inactiva.');

  const apiKey = environmentApiKey
    || (config.apiKeyEncrypted ? decryptSecret(config.apiKeyEncrypted) : null);
  if (!apiKey) throw new Error('No hay una API key de OpenAI configurada en el servidor ni en el ERP.');

  const client = new OpenAI({
    apiKey,
    organization: config.organizationId || undefined,
    project: config.projectId || undefined,
  });

  return { client, config };
}
