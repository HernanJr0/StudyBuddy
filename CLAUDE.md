# StudyBuddy — regras para agentes

Aplicação estática (Preact + Vite + Tailwind 4 + Zod 4), 100% no navegador. Prioridades: leveza, acessibilidade (WCAG 2.2 AA), flexibilidade.

## Contratos
- `src/core/` é a fonte de verdade (esquema, interfaces, erros, provedores). **Não altere `src/core/`** sem ser o integrador; se algo faltar, relate.
- Cada módulo exporta um objeto pelo `index.ts`: `pdf: PdfModule`, `llm: LlmModule`, `store: StoreModule`. A interface importa só desses `index.ts` e de `src/core`.
- Erros: lance `AppError` com um código de `core/errors.ts`. Nunca coloque chave, texto do material ou resposta do provedor em mensagens ou logs.

## Trabalho em paralelo
- Escreva só na pasta da sua frente. Não edite `package.json` à mão: instale dependências com `npm install <pacote>` e relate o que instalou.
- Textos da interface ficam em um `messages.ts` na própria pasta, com `defineMessages` (`core/i18n.ts`). Português do Brasil, linguagem simples.

## Interface
- Use os componentes de `src/ui/kit` (veja `#/kit`). Todo campo usa `Field`/`TextInput`/`Select`/`TextArea`.
- Cores só pelos tokens (`bg-bg`, `text-fg`, `text-muted`, `bg-primary`, `text-ok`, `text-bad`...). Alvos de toque de 44 px (`min-h-11`). Certo e errado nunca só por cor.
- Mudanças de estado: `announce()` ou `Notice live`. Tudo operável por teclado. Layout a partir de 320 px.
- O leitor de PDF e outras dependências pesadas entram por `import()` dinâmico. Orçamento: 80 KB de JS inicial (gzip).

## Antes de entregar
`npm run check` e, se mexeu em interface, `npm run test:e2e`. Testes unitários ficam ao lado do código (`*.test.ts`). Nenhuma chave real no repositório. Commits em Conventional Commits, sem rodapé de coautoria.
