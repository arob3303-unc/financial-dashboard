"use client";

import * as React from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";
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
  const [draft, setDraft] = React.useState(String(balance));

  // Re-seed the field from the stored value each time the dialog opens.
  React.useEffect(() => {
    if (open) setDraft(String(balance));
  }, [open, balance]);

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
  const [mounted, setMounted] = React.useState(false);

  // The resolved theme is unknown during SSR; render a stable placeholder.
  React.useEffect(() => setMounted(true), []);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? <Sun /> : <Moon />}
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

export function AppHeader() {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <header className="bg-background/80 sticky top-0 z-50 border-b backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold tracking-tight">Extro</span>
          <span className="text-muted-foreground hidden text-xs sm:inline">
            stock forecaster
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <SignedIn>
            <BalanceButton onOpen={() => setDialogOpen(true)} />
          </SignedIn>
          <ThemeToggle />
          <SignedOut>
            <SignInButton mode="modal">
              <Button size="sm">Sign in</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </div>

      <BalanceDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </header>
  );
}
