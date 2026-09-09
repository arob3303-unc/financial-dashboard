import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Section } from "@/lib/nav";

/**
 * Shared shell for a section that exists as a route but whose content is still being
 * written. Its job is to make a click from the home page land somewhere deliberate
 * rather than on a 404.
 */
export function SectionStub({
  section,
  children,
}: {
  section: Section;
  children: React.ReactNode;
}) {
  const Icon = section.icon;

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
        <Icon className="text-muted-foreground size-6 shrink-0" aria-hidden />
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          {section.title}
        </h1>
      </div>
      <p className="text-muted-foreground mt-2">{section.tagline}</p>

      <div className="mt-8 space-y-4 text-pretty">{children}</div>

      <Card className="mt-10">
        <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Badge variant="secondary">In progress</Badge>
          <p className="text-muted-foreground text-sm">
            The full write-up for this section is still being written.
          </p>
        </CardContent>
      </Card>

      <p className="text-muted-foreground mt-10 text-xs">
        Extro is a simulation. Nothing here is financial advice.
      </p>
    </div>
  );
}
