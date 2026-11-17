# StudyBuddy

Estudo ativo com inteligência artificial. Envie um PDF de estudo e receba um resumo em tópicos, flashcards e um quiz com correção e explicação.

Projeto de extensão do curso de Ciência da Computação da Uninorte (Manaus, AM).

- **Sem servidor e sem cadastro.** Tudo roda no navegador; o histórico fica no aparelho.
- **Chave própria.** A geração usa a chave de API do usuário, no provedor que ele escolher (Gemini, OpenRouter, Groq, OpenAI, Claude ou qualquer endereço compatível com OpenAI).
- **Compartilhável.** Um pacote gerado vira arquivo ou link; quem recebe estuda sem chave.

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
| `npm run check` | Tipos, lint, testes unitários, build e orçamento de tamanho |
| `npm run test:e2e` | Testes de ponta a ponta e de acessibilidade (Playwright + axe) |
| `npm run format` | Corrige formatação e lint |

## Estrutura

```
src/core/      contrato de dados, erros, textos, catálogo de provedores
src/pdf/       extração de texto do PDF
src/llm/       provedores de IA, prompt, validação
src/store/     dados locais, compartilhamento, exportação
src/ui/kit/    componentes base acessíveis (demonstração em #/kit)
src/ui/study/  resumo, flashcards, quiz
src/ui/shell/  layout, rotas, envio, configurações, histórico
```

## Licença

MIT.
