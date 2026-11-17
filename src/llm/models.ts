/** Filtro e ordenação de modelos por heurística de nome. */
import type { ModelInfo } from "../core";

const NOT_TEXT =
  /embed|whisper|tts|transcri|speech|audio|realtime|dall-e|image|imagen|veo|video|moderation|guard|rerank|aqa|lyria|robotics|computer-use|sora|davinci|babbage|ada-/i;
const PRE_RELEASE = /preview|exp|beta|alpha|deprecated|legacy/i;
const SNAPSHOT = /\d{4}-\d{2}-\d{2}|-\d{8}$|-\d{4}$/;
const SPECIAL = /thinking|search|vision|instruct-\d|customtools|:free$/i;

export function isTextModel(id: string): boolean {
  return !NOT_TEXT.test(id);
}

function score(id: string): number {
  let s = 0;
  if (PRE_RELEASE.test(id)) s -= 2;
  if (SNAPSHOT.test(id)) s -= 1;
  if (SPECIAL.test(id)) s -= 1;
  return s;
}

/** Mais indicados primeiro: versões estáveis e mais novas antes de prévias e snapshots. */
export function sortModels(models: ModelInfo[]): ModelInfo[] {
  const seen = new Set<string>();
  return models
    .filter((m) => {
      if (!m.id || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    })
    .sort((a, b) => {
      const d = score(b.id) - score(a.id);
      if (d !== 0) return d;
      return b.id.localeCompare(a.id, "en", { numeric: true });
    });
}
