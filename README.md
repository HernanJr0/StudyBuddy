# StudyBuddy

Estudo ativo com inteligência artificial. Envie um PDF de estudo e receba um resumo em tópicos, flashcards e um quiz com correção, explicação e página de origem.

**Acesse:** https://studybuddy.hernanjunior90.workers.dev

Projeto de extensão do curso de Ciência da Computação da Uninorte (Manaus, AM), na disciplina Atividades Práticas Interdisciplinares de Extensão III.

## Como funciona

- **Sem servidor e sem cadastro.** Tudo roda no navegador. O PDF é lido no próprio aparelho; pacotes, notas e a chave ficam só nele.
- **Chave própria.** A geração usa a chave de API do usuário, no provedor que ele escolher: Google Gemini, OpenRouter, Groq, OpenAI, Anthropic ou qualquer endereço compatível com OpenAI (inclusive modelo local). O texto vai do navegador direto para esse provedor.
- **Compartilhável.** Um pacote vira arquivo `.studybuddy.json` ou link autocontido. Quem recebe estuda sem chave.
- **Confiável.** Cada cartão e questão traz um trecho do material, conferido automaticamente na página indicada. Itens podem ser editados ou excluídos.
- **Revisão espaçada.** Os flashcards avaliados entram em "Revisar hoje", agendados pelo algoritmo FSRS.
- **Funciona offline.** Instalável no celular; pacotes salvos abrem sem internet (gerar exige rede).
- **PDF escaneado.** Sem texto selecionável, as páginas podem ir como imagem para um modelo com visão.
- **OpenRouter em um clique.** Login no OpenRouter devolve a chave para o aparelho, sem copiar e colar.
- **Acessível e leve.** WCAG 2.2 AA (base da ABNT NBR 17225), funciona em 320 px, 64 KB de JavaScript na primeira carga; páginas e leitor de PDF carregam sob demanda.

## Rodar localmente

Requer Node 22 ou mais novo.

```bash
npm install
npm run dev
```

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run check` | Tipos, lint, testes unitários, build e orçamento de tamanho (80 KB) |
| `npm run test:e2e` | Testes no navegador e de acessibilidade (Playwright + axe), celular e desktop |
| `npm run format` | Corrige formatação e lint |
| `npm run deploy` | Publica no Cloudflare; requer `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` |

Nenhum teste usa chave real: os provedores são simulados.

## Estrutura

```
src/core/      contrato de dados (Zod), erros, textos, catálogo de provedores
src/pdf/       extração de texto do PDF (unpdf, carregado sob demanda)
src/llm/       adaptadores dos provedores, prompt, validação, verificação de origem
src/store/     IndexedDB, configurações, arquivo e link, exportação para o Anki
src/ui/kit/    componentes base acessíveis (demonstração em #/kit)
src/ui/study/  resumo, flashcards, quiz e edição
src/ui/review/ revisão espaçada (FSRS)
src/pwa/       registro do service worker (gerado no build por scripts/pwa-plugin.ts)
src/ui/shell/  layout, rotas, geração, configurações, histórico, páginas de texto
tests/e2e/     testes no navegador
```

O formato do pacote está em `src/core/schema.ts` (`StudyPackSchema`, versão 1).

## Licença

MIT.
