import { publicConfig } from "@/lib/config";
import { toPublicUser } from "@/lib/credentials";
import { clearSession, getSessionUserId } from "@/lib/session";
import { findUserById, storeDriver } from "@/lib/store";

export async function GET() {
  const userId = await getSessionUserId();
  const user = userId ? await findUserById(userId) : null;

  return Response.json({
    user: user ? toPublicUser(user) : null,
    config: { ...publicConfig, storeDriver },
  });
}

export async function DELETE() {
  await clearSession();
  return Response.json({ ok: true });
}
