import type { AppError, ErrorCode } from "./errors";
import { defineMessages, type Params } from "./i18n";
import { LIMITS } from "./schema";

/** Mensagens de erro, em linguagem simples: o que houve e o que fazer. */
const errorMessages: Record<ErrorCode, string> = {
  "pdf/invalid": "Não consegui abrir este arquivo. Confira se ele é um PDF e tente de novo.",
  "pdf/too-large": "O arquivo passa de {mb} MB. Envie um PDF menor ou divida o material.",
  "pdf/too-many-pages":
    "O PDF tem {pages} páginas e o limite é {max}. Divida o material em partes.",
  "pdf/no-text":
    "Este PDF parece ser uma imagem escaneada, sem texto para ler. Use um PDF com texto selecionável ou cole o texto.",
  "pdf/empty-text": "O texto está vazio ou curto demais para gerar um pacote de estudo.",
  "llm/no-config": "Antes de gerar, escolha um provedor e informe sua chave nas Configurações.",
  "llm/invalid-key":
    "O provedor recusou a chave. Confira se ela foi copiada inteira e se ainda está ativa.",
  "llm/quota":
    "Sua cota neste provedor acabou ou o limite por minuto foi atingido. Espere um pouco, troque de modelo ou use outro provedor.",
  "llm/network": "Não consegui falar com o provedor. Confira sua conexão e tente de novo.",
  "llm/too-long":
    "O material é grande demais para este modelo. Envie menos páginas ou escolha um modelo com limite maior.",
  "llm/blocked":
    "O provedor se recusou a processar este material. Tente outro modelo ou outro provedor.",
  "llm/model-not-found":
    "O modelo escolhido não existe mais ou sua chave não tem acesso a ele. Escolha outro nas Configurações.",
  "llm/invalid-response":
    "O modelo devolveu uma resposta fora do formato esperado. Tente de novo ou escolha outro modelo.",
  "llm/cancelled": "Geração cancelada.",
  "llm/no-vision":
    "O modelo escolhido não lê imagens. Para PDFs escaneados, escolha um modelo com visão (por exemplo, da família Gemini, GPT ou Claude).",
  "llm/unknown": "Algo deu errado ao gerar o pacote. Tente de novo.",
  "share/invalid": "Este arquivo ou link não é um pacote do StudyBuddy válido.",
  "share/too-new":
    "Este pacote foi criado em uma versão mais nova do StudyBuddy. Atualize a página e tente de novo.",
  "store/unavailable":
    "Seu navegador não permitiu salvar dados neste aparelho. O modo anônimo costuma causar isso.",
};

const tError = defineMessages(errorMessages);

const defaultParams: Params = {
  mb: LIMITS.maxFileBytes / 1024 / 1024,
  max: LIMITS.maxPages,
};

export function errorMessage(error: AppError, params?: Params): string {
  return tError(error.code, { ...defaultParams, ...params });
}

/** Textos compartilhados por mais de um módulo. */
export const tCommon = defineMessages({
  appName: "StudyBuddy",
  aiNotice:
    "Conteúdo gerado por inteligência artificial. Pode conter erros: confira no seu material.",
  page: "Página {n}",
  pageShort: "p. {n}",
  unverified: "Trecho de origem não verificado",
  cancel: "Cancelar",
  close: "Fechar",
  save: "Salvar",
  delete: "Excluir",
  back: "Voltar",
  tryAgain: "Tentar de novo",
  loading: "Carregando…",
});
