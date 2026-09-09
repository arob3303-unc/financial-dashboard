import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";

import { ChapterList } from "@/components/black-swan/ChapterList";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toPublicChapters } from "@/lib/black-swan";
import { SECTIONS } from "@/lib/nav";

const section = SECTIONS.find((entry) => entry.href === "/black-swan")!;

/**
 * Canonical short form of the Amazon product URL. The `/ref=sr_1_1?crid=…` tail on a
 * search-result link is single-session tracking that rots and leaks the search context.
 */
const AMAZON_URL = "https://www.amazon.com/dp/081297381X";

export const metadata: Metadata = {
  title: `${section.title} | Extro`,
  description: section.blurb,
};

export default function BlackSwanPage() {
  // Answers are stripped here; the client never receives the key.
  const chapters = toPublicChapters();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Home
      </Link>

      <div className="mt-8 flex items-center gap-3">
        <BookOpen className="text-muted-foreground size-6 shrink-0" aria-hidden />
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          The Black Swan
        </h1>
      </div>
      <p className="text-muted-foreground mt-2">
        Nassim Nicholas Taleb · {section.tagline}
      </p>

      {/* Overview */}
      <div className="mt-8 space-y-4 text-pretty">
        <p>
          A black swan is an event with three properties: nobody saw it coming, it changed
          everything, and afterwards everyone explained why it was obvious. Taleb&rsquo;s
          argument is that these events decide how history, careers
          and portfolios actually turn out, and that almost every tool we use to think about
          the future quietly assumes they do not happen.
        </p>
        <p>
          The core mistake is treating the absence of evidence as evidence of absence. A
          turkey fed every day for a thousand days has excellent statistical grounds for
          confidence in the farmer, right up to the afternoon before Thanksgiving. We build
          models the same way: fit a curve to what has already happened, extend it forward,
          and mistake the smoothness of the line.
        </p>
        <p>
          The reason this belongs on a site about taking risk is that it cuts the opposite
          way to how it first sounds. Taleb is not arguing for caution, he is arguing that
          because you cannot predict the extremes, the thing to control is your{" "}
          <em>exposure</em> to them. Arrange your position so that being wrong is survivable
          and being right is unbounded, and uncertainty stops being a reason to stay out. That
          is a far more useful instinct than trying to forecast better, and it is the mindset
          the rest of Extro is built around!
        </p>
        <p className="text-muted-foreground">
          It is also the honest caveat on this site&rsquo;s own numbers. The projection drawn
          on every chart in the simulator estimates drift and volatility from past returns and
          extends them forward as a tidy band. That is precisely the kind of estimate this book
          tells you not to trust about extremes. Read the band as a description of an ordinary
          week, NEVER as a limit on how bad or how good things can get.
        </p>
      </div>

      {/* Buy it */}
      <Card className="mt-10">
        <CardContent className="space-y-3">
          <h2 className="font-semibold">Read the book first</h2>
          <p className="text-muted-foreground text-sm text-pretty">
            The quizzes below follow the book chapter by chapter, so they only work if you
            actually read it! A paperback is about $11. Genuinely one of the better returns
            you will get on $11, given that the whole point of the book is how to
            think about returns.
          </p>
          <Button asChild>
            <a href={AMAZON_URL} target="_blank" rel="noopener noreferrer">
              Buy on Amazon!
              <ExternalLink />
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Progress + quizzes */}
      <div className="mt-10">
        <ChapterList chapters={chapters} />
      </div>

      <p className="text-muted-foreground mt-12 text-xs">
        Extro is a simulation. Nothing here is financial advice. Extro is not affiliated with
        the author or the publisher, and the link above is a plain product link.
      </p>
    </div>
  );
}
