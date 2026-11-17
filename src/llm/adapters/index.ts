import { getProvider, type ProviderId } from "../../core";
import { anthropicAdapter } from "./anthropic";
import { geminiAdapter } from "./gemini";
import { openaiAdapter } from "./openai";
import type { Adapter } from "./types";

export function adapterFor(provider: ProviderId): Adapter {
  switch (getProvider(provider).protocol) {
    case "gemini":
      return geminiAdapter;
    case "anthropic":
      return anthropicAdapter;
    default:
      return openaiAdapter;
  }
}
