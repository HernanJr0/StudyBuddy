/**
 * Textos da interface. Cada módulo declara as próprias mensagens com
 * defineMessages, no próprio diretório, para que frentes paralelas não
 * editem o mesmo arquivo. Parâmetros usam chaves: "Página {n}".
 */
export type Params = Record<string, string | number>;

export function format(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in params ? String(params[key]) : whole,
  );
}

export function defineMessages<T extends Record<string, string>>(messages: T) {
  return (key: keyof T, params?: Params): string => format(messages[key] as string, params);
}

/** Plural simples em português: plural(2, "questão", "questões") → "2 questões". */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
