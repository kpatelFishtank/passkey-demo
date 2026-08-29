import { publicConfig } from "@/lib/config";
import { clearSession } from "@/lib/session";
import { readDatabase, resetDatabase, storeDriver } from "@/lib/store";

/**
 * The "show them the database" endpoint. It returns literally everything the
 * server holds, which is the point: there is no password column to redact.
 *
 * Obviously you would never expose this in a real application.
 */
export async function GET() {
  const db = await readDatabase();

  return Response.json({
    config: { ...publicConfig, storeDriver },
    users: db.users,
    summary: {
      userCount: db.users.length,
      credentialCount: db.users.reduce(
        (total, user) => total + user.credentials.length,
        0,
      ),
      passwordCount: 0,
      passwordHashCount: 0,
    },
  });
}

/** Wipes every account. Bound to the "Reset demo" button. */
export async function DELETE() {
  await resetDatabase();
  await clearSession();
  return Response.json({ ok: true });
}
