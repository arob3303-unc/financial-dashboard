"use client";

import * as React from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type PublicChapter = {
  number: number;
  part: string;
  title: string;
  questionCount: number;
  questions: { prompt: string; choices: string[] }[];
};

export type AttemptResult = {
  chapter: number;
  score: number;
  passed: boolean;
  correctCount: number;
  total: number;
  passMark: number;
  best: number;
  unlockedNext: boolean;
};

/**
 * Take one chapter's quiz.
 *
 * The dialog never reveals which answers were right. On submit it closes and hands the
 * result up; the score and the new lock state are read off the chapter list instead. The
 * API deliberately does not return a per-question breakdown either, so the answer key is
 * not sitting in the network tab.
 */
export function QuizDialog({
  chapter,
  open,
  onOpenChange,
  onSubmitted,
}: {
  chapter: PublicChapter | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: (result: AttemptResult) => void;
}) {
  const [answers, setAnswers] = React.useState<(number | null)[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset during render, keyed on the chapter and the open/closed transition, so every
  // reopening starts blank — a retake never shows the previous attempt's selections.
  const attemptKey = `${chapter?.number ?? "none"}:${open}`;
  const [activeKey, setActiveKey] = React.useState<string | null>(null);
  if (activeKey !== attemptKey) {
    setActiveKey(attemptKey);
    setAnswers(new Array(chapter?.questions.length ?? 0).fill(null));
    setError(null);
    setSubmitting(false);
  }

  if (!chapter) return null;

  const answered = answers.filter((answer) => answer !== null).length;
  const allAnswered = answered === chapter.questions.length;

  async function submit() {
    if (!chapter) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/black-swan/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter: chapter.number, answers }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ?? `The quiz could not be graded (${response.status}).`,
        );
      }

      onSubmitted({ ...(payload as Omit<AttemptResult, "chapter">), chapter: chapter.number });
      onOpenChange(false);
    } catch (failure) {
      // Stay open on failure: closing would look like a silent pass.
      setError(failure instanceof Error ? failure.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Chapter {chapter.number} — {chapter.title}
          </DialogTitle>
          <DialogDescription>
            {chapter.questions.length} questions. Your score appears in the chapter list
            once you submit.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
          {chapter.questions.map((question, index) => (
            <div key={question.prompt} className="space-y-3">
              <p className="text-sm font-medium">
                <span className="text-muted-foreground mr-2">{index + 1}.</span>
                {question.prompt}
              </p>

              <RadioGroup
                value={answers[index] === null ? undefined : String(answers[index])}
                onValueChange={(value) =>
                  setAnswers((current) => {
                    const next = [...current];
                    next[index] = Number(value);
                    return next;
                  })
                }
                className="gap-2"
              >
                {question.choices.map((choice, choiceIndex) => (
                  <div
                    key={choice}
                    className="hover:bg-accent/40 flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors"
                  >
                    <RadioGroupItem
                      value={String(choiceIndex)}
                      id={`q${index}-c${choiceIndex}`}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={`q${index}-c${choiceIndex}`}
                      className="flex-1 cursor-pointer text-sm leading-snug font-normal"
                    >
                      {choice}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}

          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Could not submit</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <span className="text-muted-foreground text-xs">
            {answered} of {chapter.questions.length} answered
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!allAnswered || submitting} onClick={submit}>
              {submitting && <Loader2 className="animate-spin" />}
              Submit
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
