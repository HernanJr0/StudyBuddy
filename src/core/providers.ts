/**
 * Provedores de LLM suportados. Nenhum nome de modelo fica fixo no código:
 * a lista vem do próprio provedor (SPEC 5.1). `protocol` define qual
 * adaptador conversa com ele.
 */
export type ProviderId = "gemini" | "openai" | "openrouter" | "groq" | "anthropic" | "custom";

export type Protocol = "gemini" | "openai" | "anthropic";

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  protocol: Protocol;
  /** Endereço base da API. Em "custom" o usuário informa o próprio. */
  baseUrl: string;
  /** Onde o usuário cria a chave. */
  keyUrl?: string;
  termsUrl?: string;
  /** Tem nível gratuito no momento da escrita (pode mudar; não é garantia). */
  freeTier: boolean;
  /** O provedor pode usar o conteúdo enviado para treino no nível gratuito. */
  trainsOnFreeTier: boolean;
  /** A chave é opcional (ex.: modelo local). */
  keyOptional?: boolean;
}

export const PROVIDERS: readonly ProviderInfo[] = [
  {
    id: "gemini",
    label: "Google Gemini",
    protocol: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    keyUrl: "https://aistudio.google.com/apikey",
    termsUrl: "https://aistudio.google.com/docs/terms",
    freeTier: true,
    trainsOnFreeTier: true,
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    protocol: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    keyUrl: "https://openrouter.ai/settings/keys",
    termsUrl: "https://openrouter.ai/terms",
    freeTier: true,
    trainsOnFreeTier: true,
  },
  {
    id: "groq",
    label: "Groq",
    protocol: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    keyUrl: "https://console.groq.com/keys",
    termsUrl: "https://groq.com/terms-of-use",
    freeTier: true,
    trainsOnFreeTier: false,
  },
  {
    id: "openai",
    label: "OpenAI",
    protocol: "openai",
    baseUrl: "https://api.openai.com/v1",
    keyUrl: "https://platform.openai.com/api-keys",
    termsUrl: "https://openai.com/policies/terms-of-use",
    freeTier: false,
    trainsOnFreeTier: false,
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    protocol: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    keyUrl: "https://console.anthropic.com/settings/keys",
    termsUrl: "https://www.anthropic.com/legal/commercial-terms",
    freeTier: false,
    trainsOnFreeTier: false,
  },
  {
    id: "custom",
    label: "Outro (compatível com OpenAI)",
    protocol: "openai",
    baseUrl: "",
    freeTier: false,
    trainsOnFreeTier: false,
    keyOptional: true,
  },
];

export function getProvider(id: ProviderId): ProviderInfo {
  const p = PROVIDERS.find((x) => x.id === id);
  if (!p) throw new Error(`Provedor desconhecido: ${id}`);
  return p;
}

/** Configuração completa para chamar um provedor. A chave nunca sai do aparelho. */
export interface ProviderConfig {
  provider: ProviderId;
  apiKey: string;
  model: string;
  /** Só para "custom"; nos demais vale o baseUrl do catálogo. */
  baseUrl?: string;
}

export function resolveBaseUrl(config: Pick<ProviderConfig, "provider" | "baseUrl">): string {
  const info = getProvider(config.provider);
  const url = config.provider === "custom" ? (config.baseUrl ?? "") : info.baseUrl;
  return url.replace(/\/+$/, "");
}
