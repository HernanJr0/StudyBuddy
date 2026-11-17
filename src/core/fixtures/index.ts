import { type StudyPack, StudyPackSchema } from "../schema";
import raw from "./study-pack.example.json";

export { exampleDoc } from "./material.example";

/** Pacote de exemplo, validado pelo esquema. Use para desenvolver e testar a interface. */
export const examplePack: StudyPack = StudyPackSchema.parse(raw);
