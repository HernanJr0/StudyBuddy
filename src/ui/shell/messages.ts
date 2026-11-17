import { defineMessages } from "../../core";

/** Textos da casca da aplicação: layout, início, configurações, histórico e páginas de texto. */
export const t = defineMessages({
  /* Layout */
  skipLink: "Pular para o conteúdo",
  navMain: "Principal",
  navInfo: "Informações",
  navHome: "Início",
  navHistory: "Histórico",
  navSettings: "Configurações",

  /* Barra lateral (histórico) */
  sideCreate: "Criar",
  sideSearchLabel: "Buscar no histórico",
  sideSearchPlaceholder: "Buscar…",
  sideFilterAll: "Todos",
  sideFilterGenerated: "Criados",
  sideFilterImported: "Importados",
  sideCollapse: "Minimizar histórico",
  sideExpand: "Expandir histórico",
  sideOpenMobile: "Abrir histórico",
  sideEmpty: "Nenhum pacote encontrado.",
  sideCount: "{n} pacotes",
  sideCount1: "1 pacote",
  sideFilterGroup: "Filtrar por origem",
  footerGuide: "Uso responsável",
  footerPrivacy: "Privacidade",
  footerAbout: "Sobre",
  titleReview: "Revisar hoje",
  footerNotice:
    "O StudyBuddy é um projeto de extensão de código aberto. Não é um serviço comercial.",

  /* Títulos das rotas */
  titleHome: "Início",
  titleSettings: "Configurações",
  titleHistory: "Histórico",
  titlePack: "Pacote de estudo",
  titleOpen: "Abrir pacote",
  titleExample: "Pacote de exemplo",
  titleKit: "Componentes base",
  titleGuide: "Como usar IA para estudar",
  titlePrivacy: "Privacidade",
  titleAbout: "Sobre",
  titleNotFound: "Página não encontrada",

  /* Não encontrada */
  notFoundText: "Este endereço não existe no StudyBuddy. Ele pode ter sido digitado errado.",
  goHome: "Ir para o início",

  /* Início */
  homeTitle: "Seu PDF de estudo vira resumo, flashcards e quiz em segundos",
  homeIntro:
    "O StudyBuddy transforma o seu material (um PDF ou um texto) em resumo, flashcards e questões de múltipla escolha. Tudo roda no seu navegador, sem cadastro.",
  homeNoProviderTitle: "Falta configurar a inteligência artificial",
  homeNoProviderText:
    "Para gerar pacotes, o StudyBuddy usa a chave de API do próprio usuário, de um provedor de IA que você escolhe. A chave fica só neste aparelho.",
  homeGoSettings: "Ir para Configurações",
  homeOthersTitle: "Sem gerar nada agora",
  homeOthersText: "Você pode conhecer o StudyBuddy ou abrir um material que alguém compartilhou.",
  homeExample: "Ver um pacote de exemplo",

  /* Abrir pacote recebido */
  importLabel: "Abrir um pacote recebido",
  importHint: "Escolha o arquivo .json que você recebeu. Ele será salvo neste aparelho.",
  importBusy: "Abrindo o pacote…",

  /* Formulário de geração */
  genTitle: "Gerar pacote de estudo",
  genSourceLegend: "Como quer enviar o material?",
  genSourcePdf: "Enviar PDF",
  genSourceText: "Colar texto",
  genFileLabel: "Arquivo PDF",
  genFileHint: "Até {mb} MB e {pages} páginas. O PDF precisa ter texto selecionável.",
  genFileChosen: "Arquivo escolhido: {name} ({size})",
  genFileMissing: "Escolha um arquivo PDF.",
  genTextLabel: "Texto do material",
  genTextHint: "Cole aqui o conteúdo que você quer estudar.",
  genTextMissing: "Cole o texto do material.",
  genCardsLabel: "Quantidade de flashcards",
  genQuestionsLabel: "Quantidade de questões",
  genCountHint: "De {min} a {max}. Padrão: {default}.",
  genCountError: "Digite um número inteiro de {min} a {max}.",
  genSubmit: "Gerar pacote de estudo",
  genCancel: "Cancelar",
  genStep: "Etapa {n} de {total}: {text}",
  genStagePreparing: "Lendo o material…",
  genStageRequesting: "Enviando ao provedor e esperando a resposta…",
  genStageValidating: "Conferindo a resposta…",
  genStageVerifying: "Verificando os trechos de origem…",
  genStageDone: "Salvando o pacote…",
  genCancelled: "Geração cancelada. Seu material continua no formulário.",
  genDone: "Pacote gerado.",
  genErrorTitle: "Não foi possível gerar o pacote",
  genErrorSettingsLink: "Abrir Configurações",
  genManyPages: "muitas",

  /* Consentimento */
  consentTitle: "Antes de enviar o seu material",
  consentSend: "O texto do seu material será enviado para {provider} para gerar o pacote.",
  consentDirect:
    "O envio sai direto do seu navegador para o provedor. O StudyBuddy não guarda nada em servidor.",
  consentTrain:
    "No nível gratuito, {provider} pode usar o conteúdo enviado para treinar modelos, e revisores humanos podem ler. Por isso, não envie material com dados pessoais.",
  consentOnce: "Você vê este aviso só na primeira vez com cada provedor.",
  consentConfirm: "Entendi, continuar",

  /* Configurações */
  setTitle: "Configurações",
  setProviderTitle: "Provedor de IA",
  setProviderLabel: "Provedor",
  setCreateKey: "Criar uma chave",
  setTerms: "Termos do provedor",
  setNewTab: "(abre em nova aba)",
  setFreeTier: "Tem nível gratuito",
  setFreeTierNote: "O nível gratuito pode mudar ou acabar. Confira no site do provedor.",
  setTrainTitle: "Privacidade no nível gratuito",
  setTrainText:
    "Neste provedor, o nível gratuito pode usar o conteúdo enviado para treinar modelos, e revisores humanos podem ler. Não envie material com dados pessoais.",
  setKeyRule:
    "A chave é sua e fica só neste aparelho. Criar a chave e seguir os termos do provedor, inclusive a idade mínima (em geral, 18 anos), é responsabilidade de quem cria a chave.",
  setKeyLabel: "Chave de API",
  setKeyLabelOptional: "Chave de API (opcional)",
  setKeyHint: "Cole a chave que você criou no site do provedor.",
  setKeyMissing: "Informe a chave de API.",
  setShowKey: "Mostrar",
  setHideKey: "Ocultar",
  setRemember: "Lembrar neste aparelho",
  setRememberHint: "Desmarcado, a chave vale só até você fechar a aba.",
  setBaseUrlLabel: "Endereço da API",
  setBaseUrlHint:
    "Por exemplo, http://localhost:11434/v1. O endereço deve ser compatível com a API da OpenAI.",
  setBaseUrlInvalid: "Informe um endereço que comece com http:// ou https://.",
  setModelTitle: "Modelo",
  setFetchModels: "Buscar modelos",
  setModelsFound: "{n} modelos encontrados. Escolha um na lista.",
  setModelsNone: "O provedor não listou modelos. Digite o nome do modelo manualmente.",
  setModelsSelect: "Modelos encontrados",
  setModelsPlaceholder: "Escolha um modelo",
  setModelLabel: "Nome do modelo",
  setModelHint: "Escolha na lista acima ou digite o nome. Alguns endereços não listam modelos.",
  setModelMissing: "Escolha ou digite o nome de um modelo.",
  setTestConnection: "Testar conexão",
  setTestOk: "Conexão funcionando. Chave e modelo foram aceitos.",
  setBusyModels: "Buscando modelos…",
  setBusyTest: "Testando…",
  setSave: "Salvar",
  setSaved: "Configurações salvas neste aparelho.",
  setDeleteKey: "Apagar minha chave",
  setDeleteKeyTitle: "Apagar a chave de API?",
  setDeleteKeyText:
    "As chaves salvas neste aparelho serão apagadas. Você poderá informar uma chave de novo quando quiser.",
  setDeleteKeyConfirm: "Apagar chave",
  setDeleteKeyDone: "Chave apagada deste aparelho.",
  setOrConnect: "Conectar com OpenRouter",
  setOrConnectHint:
    "Você faz login no OpenRouter e a chave volta sozinha para este aparelho, sem copiar e colar.",
  setOrConnecting: "Conectando ao OpenRouter…",
  setOrOk: "Conectado ao OpenRouter. Agora escolha um modelo.",
  setOrError: "Não foi possível conectar ao OpenRouter. Tente de novo ou cole uma chave.",
  setAppearanceTitle: "Aparência",
  setThemeLabel: "Tema",
  setThemeSystem: "Do aparelho",
  setThemeLight: "Claro",
  setThemeDark: "Escuro",
  setFontLabel: "Tamanho do texto",
  setFont1: "Normal",
  setFont115: "Grande",
  setFont13: "Muito grande",
  setDataTitle: "Dados deste aparelho",
  setDataText: "Pacotes, notas e progresso ficam só neste navegador. Você pode apagar tudo.",
  setClearAll: "Apagar todos os pacotes e notas deste aparelho",
  setClearAllTitle: "Apagar todos os pacotes e notas?",
  setClearAllText:
    "Todos os pacotes, notas de quiz e marcações de flashcards deste aparelho serão apagados. Isso não pode ser desfeito. Sua chave e suas configurações continuam salvas.",
  setClearAllConfirm: "Apagar tudo",
  setClearAllDone: "Pacotes e notas apagados deste aparelho.",

  /* Histórico */
  histTitle: "Histórico",
  histIntro: "Pacotes salvos neste aparelho.",
  histEmptyTitle: "Nenhum pacote ainda",
  histEmptyText: "Quando você gerar ou abrir um pacote, ele aparece aqui.",
  histGoHome: "Gerar meu primeiro pacote",
  histOriginGenerated: "Gerado aqui",
  histOriginImported: "Recebido",
  histSaved: "Salvo em {date}",
  histCards: "{n} cartões",
  histCards1: "1 cartão",
  histQuestions: "{n} questões",
  histQuestions1: "1 questão",
  histLastScore: "Última nota: {correct} de {total}",
  histDelete: "Excluir",
  histDeleteTitle: "Excluir este pacote?",
  histDeleteText:
    "“{title}” será apagado deste aparelho, com as notas dele. Isso não pode ser desfeito.",
  histDeleted: "Pacote excluído.",
  histLoadError: "Não foi possível ler o histórico.",
  histLoading: "Carregando o histórico…",

  /* Abrir link e exemplo */
  openLoading: "Abrindo o pacote…",
  openErrorTitle: "Não foi possível abrir este link",
  exampleLoading: "Abrindo o pacote de exemplo…",

  /* Uso responsável */
  guideTitle: "Como usar IA para estudar",
  guideIntro:
    "O StudyBuddy cria resumo, flashcards e questões a partir do seu material. Isso ajuda muito, mas só se você usar do jeito certo.",
  guideH1: "Reler não basta; testar-se funciona",
  guideP1:
    "Reler e grifar dão a sensação de que você sabe, mas fixam pouco. Tentar lembrar o conteúdo sem olhar (prática de recuperação) e estudar um pouco a cada dia, em vez de tudo na véspera (estudo espaçado), funcionam bem melhor.",
  guideH2: "Responda antes de ver a resposta",
  guideP2:
    "Em cada cartão e em cada questão, tente responder de cabeça primeiro. Errar faz parte: é assim que a memória se fortalece. Volte, em outros dias, aos itens que você errou.",
  guideH3: "A IA erra: confira",
  guideL1: "Compare com o seu material. Cada item mostra a página de origem.",
  guideL2: "Se o trecho de origem estiver marcado como não verificado, desconfie mais.",
  guideL3: "Edite ou exclua os itens ruins. O pacote é seu.",
  guideH4: "O que não fazer",
  guideL4:
    "Não use para colar respostas de trabalhos ou provas. Você perde o treino e pode quebrar regras da sua escola ou faculdade.",
  guideL5:
    "Não envie dados pessoais, seus ou de outras pessoas (nomes, documentos, informações de saúde, notas).",
  guideH5: "Na educação básica",
  guideP5:
    "Se você está no ensino fundamental ou médio, use com a orientação de um professor ou de um responsável. As diretrizes do Conselho Nacional de Educação (CNE) de 2026 pedem uso mediado da inteligência artificial.",

  /* Privacidade */
  privTitle: "Privacidade",
  privIntro: "Resumo direto do que o StudyBuddy faz com os seus dados.",
  privH1: "O que não existe aqui",
  privP1: "Não há cadastro, não há cookies e não há rastreamento. Também não há anúncios.",
  privH2: "O que fica no seu aparelho",
  privP2:
    "Os pacotes, as notas e a chave de API ficam só no navegador deste aparelho. Se você não marcar “Lembrar neste aparelho”, a chave vale só até fechar a aba.",
  privH3: "O que é enviado e para onde",
  privP3:
    "O texto do seu material vai do navegador direto para o provedor de IA que você escolheu, sob os termos dele. O StudyBuddy não tem servidor que receba esse texto ou a sua chave.",
  privH4: "Links de compartilhamento",
  privP4:
    "O link de um pacote carrega o conteúdo no próprio endereço, depois do símbolo #. Essa parte não é enviada ao servidor do site. Quem receber o link poderá ler o pacote, então compartilhe com cuidado.",
  privH5: "Como apagar tudo",
  privP5:
    "Em Configurações, use “Apagar minha chave” e “Apagar todos os pacotes e notas deste aparelho”. Limpar os dados do site no navegador também remove tudo.",
  privGoSettings: "Abrir Configurações",

  /* Sobre */
  aboutTitle: "Sobre o StudyBuddy",
  aboutIntro:
    "O StudyBuddy é um projeto de extensão do curso de Ciência da Computação da Uninorte (Manaus), da disciplina Atividades Práticas Interdisciplinares de Extensão III.",
  aboutTeamTitle: "Equipe",
  aboutOpenTitle: "Código aberto",
  aboutOpenText: "O código é aberto, com licença MIT, e está em",
  aboutScienceTitle: "Base científica",
  aboutScienceText:
    "A ideia de testar-se e estudar em intervalos vem de pesquisas sobre aprendizagem (Dunlosky et al., 2013; Roediger e Karpicke, 2006).",
});
