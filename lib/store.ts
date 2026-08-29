import { promises as fs } from "node:fs";
import path from "node:path";

import { RP_ID } from "./config";
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

/**
 * Namespaced by RP ID so local development and the deployed demo can point at
 * the same Redis database without mixing credentials -- a passkey registered
 * against `localhost` would never verify against `passkey.karanpatel.ca`, and
 * seeing both listed on /server would just be confusing.
 */
const KEY = `passkey-demo:${RP_ID}:db`;

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
    if (raw === null || raw === undefined || raw === "") return emptyDatabase();

    // Upstash returns the stored string, but be tolerant of a client or proxy
    // that hands back already-parsed JSON.
    if (typeof raw === "object") return raw as Database;

    // Deliberately not caught. Swallowing this would quietly return an empty
    // database, which reads as "your account vanished" rather than "storage is
    // misconfigured" -- a terrible thing to discover mid-demo.
    return JSON.parse(raw) as Database;
  }

  return readFileDatabase();
}

/**
 * Writes a value under a scratch key and reads it back, to prove the store is
 * genuinely round-tripping data. Uses its own key, so it never touches real
 * accounts.
 */
export async function probeStore(
  token: string,
): Promise<{ wrote: string; readBack: string | null }> {
  const payload = JSON.stringify({ token, users: [{ id: token }] });

  if (storeDriver === "redis") {
    await redisCommand(["SET", `${KEY}:probe`, payload]);
    const raw = await redisCommand<string | null>(["GET", `${KEY}:probe`]);
    return {
      wrote: payload,
      readBack: typeof raw === "string" ? raw : raw === null ? null : JSON.stringify(raw),
    };
  }

  const probeFile = path.join(dataDir, "probe.json");
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(probeFile, payload, "utf8");
  return { wrote: payload, readBack: await fs.readFile(probeFile, "utf8") };
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
