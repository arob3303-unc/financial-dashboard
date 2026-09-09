"use client";

import * as React from "react";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { Check, Lock, PenLine } from "lucide-react";

import {
  QuizDialog,
  type AttemptResult,
  type PublicChapter,
} from "@/components/black-swan/QuizDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ChapterProgress = { best: number; passed: boolean; at: string };
type ProgressMap = Record<string, ChapterProgress>;

/**
 * The 19-chapter path.
 *
 * A chapter is open when it is the first or the one before it has been passed. The same
 * rule is enforced in the API route — this is the readable half of it, not the
 * authoritative half.
 */
export function ChapterList({ chapters }: { chapters: PublicChapter[] }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [progress, setProgress] = React.useState<ProgressMap>({});
  const [loading, setLoading] = React.useState(true);
  const [active, setActive] = React.useState<PublicChapter | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [nonce, setNonce] = React.useState(0);
  /** The attempt just submitted, so its exact score is visible even if it beat nothing. */
  const [lastResult, setLastResult] = React.useState<AttemptResult | null>(
    null,
  );

  // Reset during render rather than inside the effect: signed out there is nothing to
  // fetch, so `loading` must settle without an extra committed render.
  const fetchKey = `${isLoaded}|${isSignedIn}|${nonce}`;
  const [activeFetchKey, setActiveFetchKey] = React.useState<string | null>(
    null,
  );
  if (activeFetchKey !== fetchKey) {
    setActiveFetchKey(fetchKey);
    setLoading(isLoaded && !!isSignedIn);
    if (isLoaded && !isSignedIn) setProgress({});
  }

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch("/api/black-swan/progress", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(String(response.status));
        const payload = await response.json();
        if (!controller.signal.aborted) setProgress(payload.progress ?? {});
      } catch {
        // A failed read just means nothing shows as passed; the API still enforces the gate.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [isLoaded, isSignedIn, nonce]);

  const passedCount = chapters.filter(
    (chapter) => progress[String(chapter.number)]?.passed,
  ).length;

  function isUnlocked(chapter: PublicChapter) {
    if (!isSignedIn) return false;
    if (chapter.number === 1) return true;
    return progress[String(chapter.number - 1)]?.passed === true;
  }

  // Grouped up front: deriving the part headings by mutating a variable mid-map is a
  // render side effect, which the React Compiler rightly rejects.
  const groups = React.useMemo(() => {
    const out: { part: string; items: PublicChapter[] }[] = [];
    for (const chapter of chapters) {
      const last = out[out.length - 1];
      if (last && last.part === chapter.part) last.items.push(chapter);
      else out.push({ part: chapter.part, items: [chapter] });
    }
    return out;
  }, [chapters]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">Chapter quizzes</h2>
            <span className="text-muted-foreground text-sm tabular-nums">
              {passedCount} of {chapters.length} passed
            </span>
          </div>
          <Progress value={(passedCount / chapters.length) * 100} />
          <p className="text-muted-foreground text-xs">
            Read a chapter, then take the quiz. Score 80% or better to unlock
            the next quiz.
          </p>
        </CardContent>
      </Card>

      {isLoaded && !isSignedIn && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              Sign in to take the quizzes, your progress is saved to your
              account.
            </p>
            <SignInButton mode="modal">
              <Button size="sm">Sign in</Button>
            </SignInButton>
          </CardContent>
        </Card>
      )}

      <div className="space-y-1">
        {groups.map((group) => (
          <React.Fragment key={group.part}>
            <h3 className="text-muted-foreground px-1 pt-6 pb-2 text-xs font-semibold tracking-wide uppercase">
              {group.part}
            </h3>

            {group.items.map((chapter) => {
              const entry = progress[String(chapter.number)];
              const unlocked = isUnlocked(chapter);
              const hasQuestions = chapter.questionCount > 0;
              const takeable = unlocked && hasQuestions;
              const justScored =
                lastResult?.chapter === chapter.number ? lastResult : null;

              return (
                <div
                  key={chapter.number}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                    takeable && "hover:bg-accent/40",
                    !unlocked && "opacity-60",
                    justScored && "ring-2 ring-offset-2 ring-offset-background",
                  )}
                  style={
                    justScored
                      ? {
                          // Tailwind can't read a CSS var for ring colour here, so set it directly.
                          ["--tw-ring-color" as string]: justScored.passed
                            ? "var(--gain)"
                            : "var(--loss)",
                        }
                      : undefined
                  }
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                      entry?.passed ? "text-background" : "bg-muted",
                    )}
                    style={
                      entry?.passed
                        ? { backgroundColor: "var(--gain)" }
                        : undefined
                    }
                  >
                    {entry?.passed ? (
                      <Check className="size-4" />
                    ) : (
                      chapter.number
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {chapter.title}
                    </p>
                    {/* Skeleton only when this row has nothing to show yet. The refetch
                        after a submit would otherwise blank the score the user
                        just earned. */}
                    {loading && isSignedIn && !entry && !justScored ? (
                      <Skeleton className="mt-1 h-3 w-24" />
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        {justScored ? (
                          <>
                            <span
                              className="font-medium"
                              style={{
                                color: justScored.passed
                                  ? "var(--gain)"
                                  : "var(--loss)",
                              }}
                            >
                              You scored {justScored.score}%
                              {justScored.passed
                                ? ", passed"
                                : `, ${justScored.passMark}% needed`}
                            </span>
                            {justScored.best !== justScored.score &&
                              ` · best ${justScored.best}%`}
                            {justScored.passed &&
                              justScored.unlockedNext &&
                              " · next chapter unlocked"}
                          </>
                        ) : !hasQuestions ? (
                          "Questions coming soon"
                        ) : entry ? (
                          `Best score ${entry.best}%`
                        ) : (
                          `${chapter.questionCount} questions`
                        )}
                      </p>
                    )}
                  </div>

                  {!unlocked ? (
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <Lock className="size-3" />
                      Locked
                    </Badge>
                  ) : !hasQuestions ? (
                    <Badge variant="outline" className="font-normal">
                      Soon
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant={entry?.passed ? "outline" : "default"}
                      onClick={() => {
                        setActive(chapter);
                        setDialogOpen(true);
                      }}
                    >
                      <PenLine />
                      {entry?.passed ? "Retake" : entry ? "Try again" : "Start"}
                    </Button>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <QuizDialog
        chapter={active}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmitted={(result) => {
          setLastResult(result);
          // Refetch so the lock state and the progress bar reflect the new score.
          setNonce((value) => value + 1);
        }}
      />
    </div>
  );
}
