"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SECTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * The collapsed section menu that lives in the top-right corner.
 *
 * Deliberately collapsed at every breakpoint rather than expanding into inline links on
 * desktop, so the header reads the same everywhere. Rows come from `SECTIONS`, which the
 * home page's cards also render from.
 */
export function SiteNav() {
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu">
          <Menu />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
          Sections
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const active = pathname === section.href;

          return (
            <DropdownMenuItem key={section.href} asChild>
              <Link href={section.href} className="cursor-pointer gap-3 py-2">
                <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {section.title}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {section.tagline}
                  </span>
                </span>
                <Check
                  className={cn("size-4 shrink-0", !active && "invisible")}
                  aria-hidden
                />
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
