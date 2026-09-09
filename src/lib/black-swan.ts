import "server-only";

/**
 * Quiz content for The Black Swan, one quiz per chapter.
 *
 * `import "server-only"` is load-bearing, not decoration. The correct answers live in
 * this file, and the build will fail if a client component ever imports it — which is
 * what keeps the answer key out of the browser bundle and makes the 80% gate mean
 * something. Client code gets `toPublicChapters()` instead, and grading happens in
 * `src/app/api/black-swan/progress/route.ts`.
 *
 * To add a quiz: fill in the `questions` array for that chapter. `answer` is the index
 * into `choices`. Six to eight questions per chapter is the intended size. A chapter
 * left with an empty array renders as "questions coming soon" and cannot be taken, so
 * partially-filled content is safe to ship.
 */

export type Question = {
  prompt: string;
  choices: string[];
  /** Index into `choices`. */
  answer: number;
  /**
   * Not currently surfaced anywhere — the quiz deliberately never reveals which answers
   * were right. Kept because it is useful if you later decide to show explanations once
   * a chapter has been passed. It stays server-side either way.
   */
  explanation?: string;
};

export type Chapter = {
  number: number;
  part: string;
  title: string;
  questions: Question[];
};

/** A chapter with the answer key removed, safe to hand to the browser. */
export type PublicChapter = {
  number: number;
  part: string;
  title: string;
  questionCount: number;
  questions: { prompt: string; choices: string[] }[];
};

export const PASS_MARK = 80;

const PART_ONE = "Part One — Umberto Eco's Antilibrary";
const PART_TWO = "Part Two — We Just Can't Predict";
const PART_THREE = "Part Three — Those Gray Swans of Extremistan";
const PART_FOUR = "Part Four — The End";

/*
 * Chapter titles are transcribed from the book. Worth checking against your copy —
 * a wrong title here is a one-line fix and affects nothing but the label.
 */
export const CHAPTERS: Chapter[] = [
  {
    number: 1,
    part: PART_ONE,
    title: "The Apprenticeship of an Empirical Skeptic",
    // ---------------------------------------------------------------------------
    // SAMPLE — these six exist so the lock → score → unlock flow can be tested.
    // Delete them when you write the real chapter 1 quiz.
    // ---------------------------------------------------------------------------
    questions: [
      {
        prompt: "In Taleb's definition, a Black Swan has three attributes. Which is NOT one of them?",
        choices: [
          "It is an outlier, outside regular expectations",
          "It carries an extreme impact",
          "It is explained and made predictable after the fact",
          "It occurs on a predictable schedule",
        ],
        answer: 3,
        explanation:
          "The three attributes are rarity, extreme impact, and retrospective (not prospective) predictability. Schedulability is the opposite of the idea.",
      },
      {
        prompt: "What historical event from Taleb's own life anchors his skepticism?",
        choices: [
          "The 1987 stock market crash",
          "The Lebanese civil war",
          "The fall of the Berlin Wall",
          "The dot-com bubble",
        ],
        answer: 1,
        explanation:
          "Lebanon's sudden collapse from a stable, cosmopolitan society into a long war is his formative example of a system nobody saw coming.",
      },
      {
        prompt: "What does Taleb mean by 'retrospective predictability'?",
        choices: [
          "Events become obvious in hindsight even though nobody predicted them",
          "Historians can reliably forecast the next crisis",
          "Past data always predicts future data",
          "Predictions improve as more data accumulates",
        ],
        answer: 0,
        explanation:
          "After the fact we construct an explanation that makes the event feel inevitable, which hides how blind we actually were.",
      },
      {
        prompt: "Why does Taleb argue that history is 'opaque'?",
        choices: [
          "Records of the past are usually destroyed",
          "We see outcomes but not the process that generated them",
          "Historians deliberately obscure the truth",
          "There is not enough historical data to analyse",
        ],
        answer: 1,
        explanation:
          "You observe what happened, not the machine that produced it — so you mistake one realised path for the only possible one.",
      },
      {
        prompt: "What is Taleb's objection to the phrase 'this has never happened before'?",
        choices: [
          "It is usually factually wrong",
          "It treats absence of evidence as evidence of absence",
          "It is too pessimistic about the future",
          "It relies too heavily on statistics",
        ],
        answer: 1,
        explanation:
          "Not having observed something is weak evidence that it cannot occur — the core error the whole book attacks.",
      },
      {
        prompt: "What practical stance does Taleb take toward prediction?",
        choices: [
          "Predict harder using better models",
          "Ignore the future entirely",
          "Build exposure that survives being wrong",
          "Trust expert consensus",
        ],
        answer: 2,
        explanation:
          "The book's constructive half is about robustness: arrange things so a surprise cannot ruin you, rather than trying to foresee it.",
      },
    ],
  },
  { number: 2, part: PART_ONE, title: "Yevgenia's Black Swan", questions: [] },
  { number: 3, part: PART_ONE, title: "The Speculator and the Prostitute", questions: [] },
  {
    number: 4,
    part: PART_ONE,
    title: "One Thousand and One Days, or How Not to Be a Sucker",
    questions: [],
  },
  { number: 5, part: PART_ONE, title: "Confirmation Shmonfirmation!", questions: [] },
  { number: 6, part: PART_ONE, title: "The Narrative Fallacy", questions: [] },
  { number: 7, part: PART_ONE, title: "Living in the Antechamber of Hope", questions: [] },
  {
    number: 8,
    part: PART_ONE,
    title: "Giacomo Casanova's Unfailing Luck: The Problem of Silent Evidence",
    questions: [],
  },
  {
    number: 9,
    part: PART_ONE,
    title: "The Ludic Fallacy, or the Uncertainty of the Nerd",
    questions: [],
  },
  { number: 10, part: PART_TWO, title: "The Scandal of Prediction", questions: [] },
  { number: 11, part: PART_TWO, title: "How to Look for Bird Poop", questions: [] },
  { number: 12, part: PART_TWO, title: "Epistemocracy, a Dream", questions: [] },
  {
    number: 13,
    part: PART_TWO,
    title: "Appelles the Painter, or What Do You Do If You Cannot Predict?",
    questions: [],
  },
  {
    number: 14,
    part: PART_THREE,
    title: "From Mediocristan to Extremistan, and Back",
    questions: [],
  },
  {
    number: 15,
    part: PART_THREE,
    title: "The Bell Curve, That Great Intellectual Fraud",
    questions: [],
  },
  { number: 16, part: PART_THREE, title: "The Aesthetics of Randomness", questions: [] },
  {
    number: 17,
    part: PART_THREE,
    title: "Locke's Madmen, or Bell Curves in the Wrong Places",
    questions: [],
  },
  { number: 18, part: PART_THREE, title: "The Uncertainty of the Phony", questions: [] },
  {
    number: 19,
    part: PART_FOUR,
    title: "Half and Half, or How to Be Even with the Black Swan",
    questions: [],
  },
];

export const TOTAL_CHAPTERS = CHAPTERS.length;

export function getChapter(number: number): Chapter | undefined {
  return CHAPTERS.find((chapter) => chapter.number === number);
}

/** Strip the answer key. Everything crossing to the client goes through here. */
export function toPublicChapters(): PublicChapter[] {
  return CHAPTERS.map((chapter) => ({
    number: chapter.number,
    part: chapter.part,
    title: chapter.title,
    questionCount: chapter.questions.length,
    questions: chapter.questions.map((question) => ({
      prompt: question.prompt,
      choices: question.choices,
    })),
  }));
}

export type GradedQuestion = {
  correct: boolean;
  correctAnswer: number;
  explanation?: string;
};

export type GradeResult = {
  score: number;
  passed: boolean;
  correctCount: number;
  total: number;
  questions: GradedQuestion[];
};

/**
 * Grade an attempt. `answers[i]` is the chosen index for question `i`; anything that is
 * not a valid index counts as unanswered and therefore wrong.
 */
export function grade(chapter: Chapter, answers: unknown[]): GradeResult {
  const questions = chapter.questions.map((question, index) => {
    const given = answers[index];
    return {
      correct: typeof given === "number" && given === question.answer,
      correctAnswer: question.answer,
      explanation: question.explanation,
    };
  });

  const total = questions.length;
  const correctCount = questions.filter((question) => question.correct).length;
  const score = total === 0 ? 0 : Math.round((correctCount / total) * 100);

  return { score, passed: total > 0 && score >= PASS_MARK, correctCount, total, questions };
}
