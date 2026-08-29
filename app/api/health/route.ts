import { randomUUID } from "node:crypto";

import { publicConfig } from "@/lib/config";
import { probeStore, readDatabase, storeDriver } from "@/lib/store";

/**
 * Pre-flight check. Load this before presenting.
 *
 * It proves the store is both readable and writable, which is the thing most
 * likely to be silently broken: the file driver on a serverless host reads and
 * writes happily and still loses your data between requests, so "the app
 * loaded" is not evidence that anything will persist.
 *
 * The write is a no-op round trip -- the database is written back exactly as it
 * was read -- so this is safe to hit mid-demo.
 */
export async function GET() {
  const startedAt = performance.now();

  try {
    // A non-empty payload under a scratch key. An empty round trip would look
    // identical whether the store worked or silently returned nothing.
    const token = randomUUID();
    const probe = await probeStore(token);
    const roundTripped = probe.readBack === probe.wrote;

    const db = await readDatabase();
    const credentialCount = db.users.reduce(
      (total, user) => total + user.credentials.length,
      0,
    );

    return Response.json({
      ok: roundTripped,
      storeDriver,
      durable: storeDriver === "redis",
      roundTripMs: Math.round(performance.now() - startedAt),
      accounts: db.users.length,
      credentials: credentialCount,
      config: publicConfig,
      probe: roundTripped ? "value written and read back intact" : probe,
      warning:
        storeDriver === "file"
          ? "Using the file store. Fine locally; on a serverless host this loses data between instances."
          : undefined,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        storeDriver,
        error: error instanceof Error ? error.message : "Store unreachable.",
      },
      { status: 503 },
    );
  }
}
