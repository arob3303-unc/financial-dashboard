import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { PASS_MARK, TOTAL_CHAPTERS, getChapter, grade } from "@/lib/black-swan";

export const runtime = "nodejs";

/**
 * Reading progress for The Black Swan, stored on the user's Clerk account.
 *
 * Two things worth knowing about this route:
 *
 * 1. **The server grades the quiz.** The client posts the chosen answer indexes, never a
 *    score. The answer key lives in `@/lib/black-swan`, which is `server-only`, so it is
 *    not in the browser bundle and the 80% gate cannot be walked past by editing a
 *    request body.
 * 2. **`updateUserMetadata` deep-merges.** Writing `{ blackSwan: { "3": … } }` leaves the
 *    stored `balance` and every other chapter untouched, so this route and
 *    `/api/balance` can share `publicMetadata` without clobbering each other.
 */

export type ChapterProgress = {
  /** Best percentage achieved, 0-100. */
  best: number;
  passed: boolean;
  /** ISO timestamp of the best attempt. */
  at: string;
};

export type Progress = Record<string, ChapterProgress>;

const METADATA_KEY = "blackSwan";

function readProgress(metadata: unknown): Progress {
  const raw = (metadata as Record<string, unknown> | null)?.[METADATA_KEY];
  if (!raw || typeof raw !== "object") return {};

  const progress: Progress = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const entry = value as Partial<ChapterProgress> | null;
    if (!entry || typeof entry.best !== "number" || !Number.isFinite(entry.best)) continue;

    progress[key] = {
      best: Math.max(0, Math.min(100, Math.round(entry.best))),
      passed: entry.passed === true,
      at: typeof entry.at === "string" ? entry.at : "",
    };
  }
  return progress;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return NextResponse.json({ progress: readProgress(user.publicMetadata) });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    chapter?: unknown;
    answers?: unknown;
  } | null;

  const chapterNumber = Number(body?.chapter);
  if (
    !Number.isInteger(chapterNumber) ||
    chapterNumber < 1 ||
    chapterNumber > TOTAL_CHAPTERS
  ) {
    return NextResponse.json(
      { error: `Chapter must be a number between 1 and ${TOTAL_CHAPTERS}.` },
      { status: 400 },
    );
  }

  if (!Array.isArray(body?.answers)) {
    return NextResponse.json({ error: "Answers must be an array." }, { status: 400 });
  }

  const chapter = getChapter(chapterNumber);
  if (!chapter || chapter.questions.length === 0) {
    return NextResponse.json(
      { error: "That chapter has no questions yet." },
      { status: 409 },
    );
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const progress = readProgress(user.publicMetadata);

  // Enforce the gate on the server too: a chapter is only takeable if it is the first
  // or the previous one has been passed. Otherwise the lock is only a UI suggestion.
  const previous = progress[String(chapterNumber - 1)];
  if (chapterNumber > 1 && !previous?.passed) {
    return NextResponse.json(
      { error: `Pass chapter ${chapterNumber - 1} first.` },
      { status: 403 },
    );
  }

  const result = grade(chapter, body.answers as unknown[]);

  const existing = progress[String(chapterNumber)];
  const isBest = !existing || result.score > existing.best;
  const entry: ChapterProgress = isBest
    ? { best: result.score, passed: result.passed, at: new Date().toISOString() }
    : { ...existing, passed: existing.passed || result.passed };

  await client.users.updateUserMetadata(userId, {
    publicMetadata: { [METADATA_KEY]: { [String(chapterNumber)]: entry } },
  });

  // Deliberately no per-question breakdown: the answers are never revealed, so shipping
  // `result.questions` would leak the key into the network tab for nothing.
  return NextResponse.json({
    score: result.score,
    passed: result.passed,
    correctCount: result.correctCount,
    total: result.total,
    passMark: PASS_MARK,
    best: entry.best,
    unlockedNext: entry.passed && chapterNumber < TOTAL_CHAPTERS,
  });
}
