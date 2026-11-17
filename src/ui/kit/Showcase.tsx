import { useState } from "preact/hooks";
import { tCommon } from "../../core";
import {
  announce,
  applyFontScale,
  applyTheme,
  Button,
  ButtonLink,
  Dialog,
  FONT_SCALES,
  Notice,
  Progress,
  Select,
  Tabs,
  TextArea,
  TextInput,
} from "./index";

type TabId = "resumo" | "flashcards" | "quiz";

/**
 * Página de demonstração dos componentes base (#/kit). Serve de referência
 * para as frentes de interface e é auditada pelos testes de acessibilidade.
 */
export function Showcase() {
  const [tab, setTab] = useState<TabId>("resumo");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  return (
    <div class="flex flex-col gap-8">
      <h1 class="text-2xl font-bold">Componentes base</h1>

      <section class="flex flex-col gap-3" aria-labelledby="kit-botoes">
        <h2 id="kit-botoes" class="text-xl font-bold">
          Botões
        </h2>
        <div class="flex flex-wrap gap-2">
          <Button variant="primary" icon="upload">
            Principal
          </Button>
          <Button>Secundário</Button>
          <Button variant="ghost">Discreto</Button>
          <Button variant="danger" icon="trash">
            Excluir
          </Button>
          <Button disabled>Desativado</Button>
          <ButtonLink href="#/">Link</ButtonLink>
        </div>
      </section>

      <section class="flex flex-col gap-3" aria-labelledby="kit-avisos">
        <h2 id="kit-avisos" class="text-xl font-bold">
          Avisos
        </h2>
        <Notice tone="info">{tCommon("aiNotice")}</Notice>
        <Notice tone="ok" title="Resposta correta">
          A fotossíntese libera oxigênio.
        </Notice>
        <Notice tone="bad" title="Resposta incorreta">
          A alternativa certa era a B.
        </Notice>
        <Notice tone="warn">{tCommon("unverified")}</Notice>
      </section>

      <section class="flex flex-col gap-3" aria-labelledby="kit-campos">
        <h2 id="kit-campos" class="text-xl font-bold">
          Campos
        </h2>
        <TextInput
          label="Nome do pacote"
          hint="Aparece no histórico."
          value={name}
          onInput={(e) => setName(e.currentTarget.value)}
          error={name.length > 20 ? "Use no máximo 20 caracteres." : undefined}
        />
        <Select label="Provedor">
          <option>Google Gemini</option>
          <option>OpenRouter</option>
        </Select>
        <TextArea label="Texto do material" hint="Cole aqui o conteúdo para estudar." />
      </section>

      <section class="flex flex-col gap-3" aria-labelledby="kit-abas">
        <h2 id="kit-abas" class="text-xl font-bold">
          Abas
        </h2>
        <Tabs<TabId>
          label="Partes do pacote"
          selected={tab}
          onSelect={setTab}
          tabs={[
            { id: "resumo", label: "Resumo", content: <p>Conteúdo do resumo.</p> },
            { id: "flashcards", label: "Flashcards", content: <p>Conteúdo dos flashcards.</p> },
            { id: "quiz", label: "Quiz", content: <p>Conteúdo do quiz.</p> },
          ]}
        />
      </section>

      <section class="flex flex-col gap-3" aria-labelledby="kit-progresso">
        <h2 id="kit-progresso" class="text-xl font-bold">
          Progresso
        </h2>
        <Progress label="Lendo o PDF" value={0.4} />
        <Progress label="Gerando o pacote" />
      </section>

      <section class="flex flex-col gap-3" aria-labelledby="kit-dialogo">
        <h2 id="kit-dialogo" class="text-xl font-bold">
          Diálogo e anúncios
        </h2>
        <div class="flex flex-wrap gap-2">
          <Button onClick={() => setOpen(true)}>Abrir diálogo</Button>
          <Button onClick={() => announce("Pacote gerado.")}>Anunciar ao leitor de tela</Button>
        </div>
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          title="Excluir este pacote?"
          actions={
            <>
              <Button onClick={() => setOpen(false)}>{tCommon("cancel")}</Button>
              <Button variant="danger" onClick={() => setOpen(false)}>
                {tCommon("delete")}
              </Button>
            </>
          }
        >
          <p>As notas deste pacote também serão apagadas deste aparelho.</p>
        </Dialog>
      </section>

      <section class="flex flex-col gap-3" aria-labelledby="kit-tema">
        <h2 id="kit-tema" class="text-xl font-bold">
          Tema e tamanho do texto
        </h2>
        <div class="flex flex-wrap gap-2">
          <Button onClick={() => applyTheme("light")}>Claro</Button>
          <Button onClick={() => applyTheme("dark")}>Escuro</Button>
          <Button onClick={() => applyTheme("system")}>Do aparelho</Button>
          {FONT_SCALES.map((s) => (
            <Button key={s} onClick={() => applyFontScale(s)}>
              Texto {Math.round(s * 100)}%
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
