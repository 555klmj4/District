import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { signToken, COOKIE_NAME } from "@/lib/auth";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const passphrase: unknown = body?.passphrase;

  if (typeof passphrase !== "string" || passphrase.trim().length < 1) {
    return NextResponse.json(
      { error: "Passphrase cannot be empty" },
      { status: 400 }
    );
  }

  const allUsers = await db.select().from(users);

  let matchedId: string | null = null;
  for (const user of allUsers) {
    if (await bcrypt.compare(passphrase, user.passphrase_hash)) {
      matchedId = user.id;
      break;
    }
  }

  const created = matchedId === null;
  if (created) {
    const hash = await bcrypt.hash(passphrase, 12);
    const [newUser] = await db.insert(users).values({ passphrase_hash: hash }).returning();
    matchedId = newUser.id;
  }

  const token = await signToken(matchedId!);

  const res = NextResponse.json({ created });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: THIRTY_DAYS,
    path: "/",
  });
  return res;
}
