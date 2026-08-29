import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { IS_PRODUCTION, SESSION_SECRET } from "./config";

const SESSION_COOKIE = "pk_session";
const CHALLENGE_COOKIE = "pk_challenge";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
/** WebAuthn ceremonies are short-lived; so is the challenge that anchors them. */
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

type Envelope<T> = { data: T; exp: number };

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payload: string): string {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
}

function sign<T>(data: T, ttlMs: number): string {
  const envelope: Envelope<T> = { data, exp: Date.now() + ttlMs };
  const payload = base64url(JSON.stringify(envelope));
  return `${payload}.${signPayload(payload)}`;
}

function unsign<T>(token: string | undefined): T | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = signPayload(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const envelope = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Envelope<T>;
    if (envelope.exp < Date.now()) return null;
    return envelope.data;
  } catch {
    return null;
  }
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: IS_PRODUCTION,
  path: "/",
};

/* -------------------------------------------------------------------------- */
/* Session                                                                     */
/* -------------------------------------------------------------------------- */

export async function setSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, sign({ userId }, SESSION_TTL_MS), {
    ...cookieOptions,
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const data = unsign<{ userId: string }>(store.get(SESSION_COOKIE)?.value);
  return data?.userId ?? null;
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/* -------------------------------------------------------------------------- */
/* Challenge                                                                   */
/* -------------------------------------------------------------------------- */

export type ChallengeRecord = {
  challenge: string;
  type: "registration" | "authentication";
  /** Present during registration so verify knows which account to create. */
  username?: string;
  userId?: string;
};

/**
 * The challenge lives in a signed, httpOnly cookie rather than server memory.
 * That keeps the demo stateless across serverless instances -- and it means a
 * cold start between "get options" and "verify" can't break the ceremony.
 */
export async function setChallenge(record: ChallengeRecord): Promise<void> {
  const store = await cookies();
  store.set(CHALLENGE_COOKIE, sign(record, CHALLENGE_TTL_MS), {
    ...cookieOptions,
    maxAge: CHALLENGE_TTL_MS / 1000,
  });
}

export async function consumeChallenge(): Promise<ChallengeRecord | null> {
  const store = await cookies();
  const record = unsign<ChallengeRecord>(store.get(CHALLENGE_COOKIE)?.value);
  store.delete(CHALLENGE_COOKIE);
  return record;
}
