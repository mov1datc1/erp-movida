export interface OpenAIConfigView {
  activa: boolean;
  apiKeyConfigurada: boolean;
  apiKeyUltimos4?: string;
  organizationId: string;
  projectId: string;
  modeloRapido: string;
  modeloEquilibrado: string;
  modeloComplejo: string;
  limiteMensualUsd: number;
  limitePorEjecucionUsd: number;
  fechaRotacion?: string;
  updatedAt?: string;
}

export interface OpenAIConfigInput extends Omit<OpenAIConfigView, 'apiKeyConfigurada' | 'apiKeyUltimos4' | 'updatedAt'> {
  apiKey?: string;
}
