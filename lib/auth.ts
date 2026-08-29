import { getSessionUserId } from "./session";
import { findUserById } from "./store";
import type { StoredUser } from "./types";

export type SessionState =
  /** No session cookie at all. */
  | { status: "anonymous"; user: null }
  /** Valid cookie, and the account it names still exists. */
  | { status: "authenticated"; user: StoredUser }
  /**
   * Valid cookie naming an account the server no longer has. Happens after a
   * demo reset in another window -- and it used to happen every time the file
   * store lost its data between two serverless instances, which sent `/` and
   * `/dashboard` redirecting at each other forever. Resolve the user, not just
   * the cookie, and that loop cannot form.
   */
  | { status: "stale"; user: null };

export async function getSessionState(): Promise<SessionState> {
  const userId = await getSessionUserId();
  if (!userId) return { status: "anonymous", user: null };

  const user = await findUserById(userId);
  if (!user) return { status: "stale", user: null };

  return { status: "authenticated", user };
}
