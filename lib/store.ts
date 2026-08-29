import { promises as fs } from "node:fs";
import path from "node:path";

import { emptyDatabase, type Database, type StoredUser } from "./types";

/**
 * A deliberately tiny persistence layer.
 *
 * Two drivers, picked automatically:
 *
 *  - `redis`  -- Upstash / Vercel KV over its REST API. Used when the relevant
 *                env vars exist. This is what you want for the live demo,
 *                because serverless instances don't share memory or disk and a
 *                cold start mid-talk would otherwise lose the passkey you just
 *                registered.
 *  - `file`   -- a JSON file on disk. Fine for local development.
 *
 * The active driver is surfaced in the UI so it's obvious during a rehearsal
 * whether the deployment will actually remember anything.
 */

const KEY = "passkey-demo:db";

const redisUrl =
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? null;
const redisToken =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? null;

export const storeDriver: "redis" | "file" =
  redisUrl && redisToken ? "redis" : "file";

const dataDir =
  process.env.DATA_DIR ??
  (process.env.VERCEL
    ? path.join("/tmp", "passkey-demo")
    : path.join(process.cwd(), ".data"));

const dataFile = path.join(dataDir, "db.json");

async function redisCommand<T>(command: unknown[]): Promise<T> {
  const response = await fetch(redisUrl!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Redis command failed (${response.status}): ${await response.text()}`,
    );
  }

  const payload = (await response.json()) as { result: T };
  return payload.result;
}

async function readFileDatabase(): Promise<Database> {
  try {
    const raw = await fs.readFile(dataFile, "utf8");
    return JSON.parse(raw) as Database;
  } catch {
    return emptyDatabase();
  }
}

async function writeFileDatabase(db: Database): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(db, null, 2), "utf8");
}

export async function readDatabase(): Promise<Database> {
  if (storeDriver === "redis") {
    const raw = await redisCommand<string | null>(["GET", KEY]);
    if (!raw) return emptyDatabase();
    try {
      return JSON.parse(raw) as Database;
    } catch {
      return emptyDatabase();
    }
  }

  return readFileDatabase();
}

export async function writeDatabase(db: Database): Promise<void> {
  if (storeDriver === "redis") {
    await redisCommand(["SET", KEY, JSON.stringify(db)]);
    return;
  }

  await writeFileDatabase(db);
}

export async function resetDatabase(): Promise<void> {
  await writeDatabase(emptyDatabase());
}

export async function findUserByUsername(
  username: string,
): Promise<StoredUser | null> {
  const db = await readDatabase();
  const normalized = username.trim().toLowerCase();
  return db.users.find((user) => user.username === normalized) ?? null;
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  const db = await readDatabase();
  return db.users.find((user) => user.id === id) ?? null;
}

/** Locate the owner of a credential ID returned by the browser during sign-in. */
export async function findUserByCredentialId(
  credentialId: string,
): Promise<{ user: StoredUser; db: Database } | null> {
  const db = await readDatabase();
  const user = db.users.find((candidate) =>
    candidate.credentials.some((credential) => credential.id === credentialId),
  );
  return user ? { user, db } : null;
}

/**
 * Read-modify-write against the whole database. Not something you'd do in a
 * real app, but there is exactly one user of this demo at a time.
 */
export async function updateDatabase(
  mutate: (db: Database) => void | Promise<void>,
): Promise<Database> {
  const db = await readDatabase();
  await mutate(db);
  await writeDatabase(db);
  return db;
}
