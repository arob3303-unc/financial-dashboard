"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { Moon, Settings2, Sun, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteNav } from "@/components/SiteNav";
import { useBalance } from "@/components/BalanceProvider";
import { formatCurrency } from "@/lib/api";

function BalanceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { balance, saving, setBalance } = useBalance();
  // Seeded once per mount; the caller remounts this via `key` when the dialog opens or
  // the stored balance changes, which is cheaper than syncing it back in an effect.
  const [draft, setDraft] = React.useState(String(balance));

  const parsed = Number(draft);
  const valid = Number.isFinite(parsed) && parsed >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Simulated balance</DialogTitle>
          <DialogDescription>
            The fictional amount Extro invests in each scenario. Every profit figure
            on the dashboard is calculated from this number.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="balance">Amount (USD)</Label>
          <Input
            id="balance"
            type="number"
            min={0}
            step={100}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && valid) {
                void setBalance(parsed);
                onOpenChange(false);
              }
            }}
          />
          {!valid && (
            <p className="text-destructive text-xs">Enter a number of 0 or more.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid || saving}
            onClick={() => {
              void setBalance(parsed);
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {/* Chosen by CSS, not by a mount flag: next-themes stamps the `dark` class before
          hydration, so the right icon paints immediately and no effect is needed. */}
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </Button>
  );
}

function BalanceButton({ onOpen }: { onOpen: () => void }) {
  const { balance, loading } = useBalance();

  if (loading) return <Skeleton className="h-9 w-28" />;

  return (
    <Button variant="outline" onClick={onOpen} className="tabular-nums">
      <Wallet />
      {formatCurrency(balance, 0)}
      <Settings2 className="text-muted-foreground" />
    </Button>
  );
}

/** The simulated balance only drives numbers on the dashboard, so it only shows there. */
const BALANCE_ROUTE = "/long-term";

export function AppHeader() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { balance } = useBalance();
  const showBalance = usePathname() === BALANCE_ROUTE;

  return (
    <header className="bg-background/80 sticky top-0 z-50 border-b backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-semibold tracking-tight">Extro</span>
          <span className="text-muted-foreground hidden text-xs sm:inline">
            stock forecaster
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {showBalance && (
            <Show when="signed-in">
              <BalanceButton onOpen={() => setDialogOpen(true)} />
            </Show>
          )}
          <ThemeToggle />
          {/* One check instead of two: the signed-out branch is the fallback. */}
          <Show
            when="signed-in"
            fallback={
              <SignInButton mode="modal">
                <Button size="sm">Sign in</Button>
              </SignInButton>
            }
          >
            <UserButton />
          </Show>
          <SiteNav />
        </div>
      </div>

      {showBalance && (
        <BalanceDialog
          key={`${dialogOpen}:${balance}`}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </header>
  );
}
