/**
 * Revisão espaçada — VERSÃO PROVISÓRIA (etapa 3).
 * A frente F substitui o conteúdo mantendo as exportações `ReviewPage` e `useDueCount`.
 */
export function ReviewPage() {
  return (
    <div class="flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Revisar hoje</h1>
      <p>Em construção.</p>
    </div>
  );
}

/** Quantidade de flashcards com revisão vencida (para a barra lateral). */
export function useDueCount(): number {
  return 0;
}
