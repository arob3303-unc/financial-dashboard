import { BookOpen, LineChart, Sigma, type LucideIcon } from "lucide-react";

/**
 * The three areas of the site, defined once.
 *
 * The header menu and the home page's cards both render from this list, so a section
 * cannot end up described one way in the nav and another way on the landing page.
 * Order is deliberate and matches the argument the home page makes: understand that the
 * extremes are unknowable, learn the instruments for taking defined risk, then apply it
 * over a long horizon.
 */
export type Section = {
  href: string;
  title: string;
  /** Two or three words for the menu row. */
  tagline: string;
  /** One or two sentences for the home page card. */
  blurb: string;
  icon: LucideIcon;
};

export const SECTIONS: Section[] = [
  {
    href: "/black-swan",
    title: "The Black Swan",
    tagline: "Why the tails matter",
    blurb:
      "Nassim Taleb's argument that the rare, unpredictable events are the ones that decide outcomes — and that models built on tidy bell curves badly understate them. Read this first: it is the honest caveat on every forecast this site draws.",
    icon: BookOpen,
  },
  {
    href: "/options",
    title: "Learning Options",
    tagline: "Risk with a known floor",
    blurb:
      "Calls, puts, premium, and payoff asymmetry. Options are how you can take a position where the most you can lose is decided up front — the practical answer to the problem the Black Swan describes.",
    icon: Sigma,
  },
  {
    href: "/long-term",
    title: "Long-term Investing Simulator",
    tagline: "Compounding, on real prices",
    blurb:
      "Pick a ticker and a window and watch what a simulated balance would have done, with a projection and an AI read on the trend. Real market data, fictional money, twenty-year thinking.",
    icon: LineChart,
  },
];
