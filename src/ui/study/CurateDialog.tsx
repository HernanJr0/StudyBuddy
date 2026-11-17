import { useEffect, useState } from "preact/hooks";
import {
  type Flashcard,
  FlashcardSchema,
  type Question,
  QuestionSchema,
  tCommon,
} from "../../core";
import { Button, Dialog, Select, TextArea, TextInput } from "../kit";
import { t } from "./messages";

type Errors = Record<string, string>;

/** Converte os problemas do Zod em mensagens simples, por campo. */
function collectErrors(
  issues: ReadonlyArray<{ path: PropertyKey[]; code: string; maximum?: unknown }>,
): Errors {
  const out: Errors = {};
  for (const issue of issues) {
    const [first, second] = issue.path;
    const key =
      first === "options" && typeof second === "number" ? `option${second}` : String(first);
    if (out[key]) continue;
    if (issue.code === "too_small") out[key] = t("errorRequired");
    else if (issue.code === "too_big") out[key] = t("errorTooLong", { max: String(issue.maximum) });
    else out[key] = t("errorInvalid");
  }
  return out;
}

interface CardDialogProps {
  open: boolean;
  card: Flashcard;
  onClose: () => void;
  onSave: (card: Flashcard) => void;
}

export function CardEditDialog({ open, card, onClose, onSave }: CardDialogProps) {
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (open) {
      setFront(card.front);
      setBack(card.back);
      setErrors({});
    }
  }, [open, card]);

  function save() {
    const result = FlashcardSchema.safeParse({ ...card, front: front.trim(), back: back.trim() });
    if (!result.success) {
      setErrors(collectErrors(result.error.issues));
      return;
    }
    onSave(result.data);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("editCardTitle")}
      actions={
        <>
          <Button onClick={onClose}>{tCommon("cancel")}</Button>
          <Button variant="primary" onClick={save}>
            {tCommon("save")}
          </Button>
        </>
      }
    >
      <TextArea
        label={t("fieldFront")}
        value={front}
        error={errors.front}
        onInput={(e) => setFront(e.currentTarget.value)}
      />
      <TextArea
        label={t("fieldBack")}
        value={back}
        error={errors.back}
        onInput={(e) => setBack(e.currentTarget.value)}
      />
    </Dialog>
  );
}

interface QuestionDialogProps {
  open: boolean;
  question: Question;
  onClose: () => void;
  onSave: (question: Question) => void;
}

export function QuestionEditDialog({ open, question, onClose, onSave }: QuestionDialogProps) {
  const [stem, setStem] = useState(question.stem);
  const [options, setOptions] = useState<string[]>(question.options);
  const [correct, setCorrect] = useState(question.correctIndex);
  const [explanation, setExplanation] = useState(question.explanation);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (open) {
      setStem(question.stem);
      setOptions(question.options);
      setCorrect(question.correctIndex);
      setExplanation(question.explanation);
      setErrors({});
    }
  }, [open, question]);

  function save() {
    const result = QuestionSchema.safeParse({
      ...question,
      stem: stem.trim(),
      options: options.map((o) => o.trim()),
      correctIndex: correct,
      explanation: explanation.trim(),
    });
    if (!result.success) {
      setErrors(collectErrors(result.error.issues));
      return;
    }
    onSave(result.data);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("editQuestionTitle")}
      actions={
        <>
          <Button onClick={onClose}>{tCommon("cancel")}</Button>
          <Button variant="primary" onClick={save}>
            {tCommon("save")}
          </Button>
        </>
      }
    >
      <TextArea
        label={t("fieldStem")}
        value={stem}
        error={errors.stem}
        onInput={(e) => setStem(e.currentTarget.value)}
      />
      {options.map((value, i) => (
        <TextInput
          key={i}
          label={t("fieldOption", { n: i + 1 })}
          value={value}
          error={errors[`option${i}`]}
          onInput={(e) => {
            const next = [...options];
            next[i] = e.currentTarget.value;
            setOptions(next);
          }}
        />
      ))}
      <Select
        label={t("fieldCorrect")}
        value={String(correct)}
        onChange={(e) => setCorrect(Number(e.currentTarget.value))}
      >
        {options.map((_, i) => (
          <option key={i} value={String(i)}>
            {t("fieldCorrectOption", { n: i + 1 })}
          </option>
        ))}
      </Select>
      <TextArea
        label={t("fieldExplanation")}
        value={explanation}
        error={errors.explanation}
        onInput={(e) => setExplanation(e.currentTarget.value)}
      />
    </Dialog>
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  /** Trecho do item, para a pessoa conferir o que está excluindo. */
  excerpt: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmRemoveDialog({ open, title, excerpt, onClose, onConfirm }: ConfirmProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          <Button onClick={onClose}>{tCommon("cancel")}</Button>
          <Button variant="danger" icon="trash" onClick={onConfirm}>
            {tCommon("delete")}
          </Button>
        </>
      }
    >
      {open && (
        <>
          <p class="font-semibold">{excerpt}</p>
          <p>{t("confirmRemoveText")}</p>
        </>
      )}
    </Dialog>
  );
}
