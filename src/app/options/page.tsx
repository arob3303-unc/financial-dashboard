import type { Metadata } from "next";

import { SectionStub } from "@/components/SectionStub";
import { SECTIONS } from "@/lib/nav";

const section = SECTIONS.find((entry) => entry.href === "/options")!;

export const metadata: Metadata = {
  title: `${section.title} | Extro`,
  description: section.blurb,
};

export default function OptionsPage() {
  return (
    <SectionStub section={section}>
      <p>
        
      </p>
    </SectionStub>
  );
}
