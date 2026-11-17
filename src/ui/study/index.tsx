/**
 * Telas de estudo — VERSÃO PROVISÓRIA (Etapa 0).
 * A frente D substitui o conteúdo mantendo a exportação `PackScreen`.
 */
import type { PackTab } from "../../core";

export interface PackScreenProps {
  packId: string;
  tab?: PackTab | undefined;
}

export function PackScreen({ packId, tab }: PackScreenProps) {
  return (
    <p>
      Pacote {packId}, aba {tab ?? "resumo"} (em construção).
    </p>
  );
}
