import type { StudyPack } from "../core";
import { slug } from "./util";

const quote = (s: string) => `"${s.replaceAll('"', '""')}"`;

/**
 * CSV de importação de texto do Anki: UTF-8 com BOM, cabeçalhos de arquivo,
 * colunas frente; verso; etiquetas (coluna 3).
 */
export function flashcardsToAnkiCsv(pack: StudyPack): { blob: Blob; fileName: string } {
  const lines = [
    "#separator:Semicolon",
    "#html:false",
    "#tags column:3",
    ...pack.flashcards.map((c) => [c.front, c.back, `studybuddy p${c.page}`].map(quote).join(";")),
  ];
  const blob = new Blob([`﻿${lines.join("\n")}\n`], { type: "text/csv;charset=utf-8" });
  return { blob, fileName: `${slug(pack.title)}-anki.csv` };
}
