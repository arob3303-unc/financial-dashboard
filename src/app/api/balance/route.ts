import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_BALANCE = 5000;
const MAX_BALANCE = 1_000_000_000;

/**
 * The simulated balance lives in Clerk's `publicMetadata` rather than a database.
 * It is per-user, survives restarts, and needs no extra infrastructure.
 */
function readBalance(metadata: unknown): number {
  const raw = (metadata as { balance?: unknown } | null)?.balance;
  const value = typeof raw === "string" ? Number(raw) : raw;
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : DEFAULT_BALANCE;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return NextResponse.json({ balance: readBalance(user.publicMetadata) });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const raw = (body as { balance?: unknown } | null)?.balance;
  const balance = typeof raw === "string" ? Number(raw) : raw;

  if (
    typeof balance !== "number" ||
    !Number.isFinite(balance) ||
    balance < 0 ||
    balance > MAX_BALANCE
  ) {
    return NextResponse.json(
      { error: `Balance must be a number between 0 and ${MAX_BALANCE}.` },
      { status: 400 },
    );
  }

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { balance: Math.round(balance) },
  });

  return NextResponse.json({ balance: Math.round(balance) });
}
