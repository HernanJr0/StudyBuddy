import type { ExtractedDoc } from "../contracts";

/** Material de exemplo (4 páginas) do qual a fixture de pacote foi derivada. */
export const exampleDoc: ExtractedDoc = {
  fileName: "fotossintese.pdf",
  pageCount: 4,
  charCount: 0,
  pages: [
    {
      page: 1,
      text: "Fotossíntese. A fotossíntese é o processo pelo qual plantas, algas e algumas bactérias transformam energia luminosa em energia química. Nesse processo, o organismo usa gás carbônico e água para produzir glicose e liberar oxigênio. A equação geral é: 6 CO2 + 6 H2O + luz → C6H12O6 + 6 O2.",
    },
    {
      page: 2,
      text: "Onde ocorre. Nas plantas, a fotossíntese acontece nos cloroplastos, organelas presentes principalmente nas células das folhas. Dentro dos cloroplastos ficam os tilacoides, membranas que contêm a clorofila. A clorofila absorve principalmente luz azul e vermelha e reflete a luz verde, o que explica a cor das folhas.",
    },
    {
      page: 3,
      text: "Etapas. A fotossíntese tem duas etapas. Na fase clara, que ocorre nos tilacoides, a luz é usada para quebrar moléculas de água, liberando oxigênio e produzindo ATP e NADPH. No ciclo de Calvin, que ocorre no estroma, o ATP e o NADPH são usados para fixar o gás carbônico e formar glicose. O ciclo de Calvin não usa luz diretamente, mas depende dos produtos da fase clara.",
    },
    {
      page: 4,
      text: "Fatores que influenciam. A taxa de fotossíntese depende da intensidade da luz, da concentração de gás carbônico e da temperatura. Aumentar a luz acelera o processo até o ponto de saturação luminosa; depois disso, mais luz não aumenta a taxa. Temperaturas muito altas reduzem a fotossíntese porque desnaturam as enzimas envolvidas.",
    },
  ],
};
exampleDoc.charCount = exampleDoc.pages.reduce((n, p) => n + p.text.length, 0);
