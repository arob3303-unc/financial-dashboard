import type { Metadata } from "next";

import { SectionStub } from "@/components/SectionStub";
import { SECTIONS } from "@/lib/nav";

const section = SECTIONS.find((entry) => entry.href === "/options")!;

export const metadata: Metadata = {
  title: `${section.title} — Extro`,
  description: section.blurb,
};

export default function OptionsPage() {
  return (
    <SectionStub section={section}>
      <p>
        An option is a contract giving you the right, but not the obligation, to buy
        (a call) or sell (a put) a stock at a set price before a set date. You pay a
        premium for that right. If the trade goes against you, the premium is the whole
        loss; you simply let the contract expire.
      </p>
      <p>
        That asymmetry is the entire point. A share can fall much further than you expect,
        and the loss keeps pace all the way down. A bought option has a floor decided the
        moment you open it. It is the cleanest way to take a position where the downside is
        a number you chose in advance rather than one the market chooses for you.
      </p>
      <p>
        The cost of that floor is time: options expire, and premium decays whether or not
        you are right. Being right too late is indistinguishable from being wrong.
      </p>
    </SectionStub>
  );
}
