"use client";

import * as React from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

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
import { cn } from "@/lib/utils";

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
 * Take one chapter's quiz, one question at a time.
 *
 * The dialog never reveals which answers were right — not even while stepping between
 * questions. On submit it closes and hands the result up; the score and the new lock
 * state are read off the chapter list instead. The API deliberately does not return a
 * per-question breakdown either, so the answer key is not sitting in the network tab.
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
  const [index, setIndex] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset during render, keyed on the chapter and the open/closed transition, so every
  // reopening starts blank and back on question one — a retake never shows the previous
  // attempt's selections, nor resumes mid-quiz.
  const attemptKey = `${chapter?.number ?? "none"}:${open}`;
  const [activeKey, setActiveKey] = React.useState<string | null>(null);
  if (activeKey !== attemptKey) {
    setActiveKey(attemptKey);
    setAnswers(new Array(chapter?.questions.length ?? 0).fill(null));
    setIndex(0);
    setError(null);
    setSubmitting(false);
  }

  if (!chapter) return null;

  const total = chapter.questions.length;
  const question = chapter.questions[index];
  const answered = answers.filter((answer) => answer !== null).length;
  const allAnswered = total > 0 && answered === total;
  const onFirst = index === 0;
  const onLast = index >= total - 1;

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
            Question {Math.min(index + 1, total)} of {total}. Your score appears in the
            chapter list once you submit.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
          {question && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{question.prompt}</p>

              <RadioGroup
                // Remount per question: without it the group keeps the previous
                // question's roving focus and animates the old selection across.
                key={index}
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
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Could not submit</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous question"
              disabled={onFirst}
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next question"
              disabled={onLast}
              onClick={() => setIndex((current) => Math.min(total - 1, current + 1))}
            >
              <ChevronRight />
            </Button>

            {/* Which questions are still blank — says nothing about correctness. */}
            <div className="ml-1 flex items-center gap-1.5" aria-hidden>
              {answers.map((answer, dotIndex) => (
                <span
                  key={dotIndex}
                  className={cn(
                    "size-1.5 rounded-full transition-colors",
                    answer === null ? "bg-muted-foreground/30" : "bg-primary",
                    dotIndex === index && "ring-ring/60 ring-2 ring-offset-1",
                  )}
                />
              ))}
            </div>

            <span className="text-muted-foreground ml-1 text-xs">
              {answered} of {total} answered
            </span>
          </div>

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
