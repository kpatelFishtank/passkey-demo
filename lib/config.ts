/**
 * Relying Party configuration.
 *
 * The RP ID is the single most important value in this file: it is the domain a
 * passkey is cryptographically bound to. A credential created for
 * `passkey.example.com` cannot be used on any other host, which is what makes
 * passkeys phishing-resistant.
 *
 * It must be either the exact hostname the app is served from, or a
 * registrable suffix of it. Setting it to `example.com` would let the passkey
 * work across *every* subdomain -- that is legitimate WebAuthn behaviour, and
 * exactly why the phishing demo pins it to the full hostname instead.
 */
export const RP_NAME = process.env.NEXT_PUBLIC_RP_NAME ?? "Passkey Demo";

export const RP_ID = process.env.NEXT_PUBLIC_RP_ID ?? "localhost";

const isLocal = (host: string) =>
  host === "localhost" ||
  host.startsWith("localhost:") ||
  host.startsWith("127.0.0.1");

/**
 * WebAuthn compares the *origin* -- scheme, host, and port -- not the hostname.
 * A bare `passkey.example.com` in the env var is the easy mistake to make, so
 * fill in the scheme rather than failing verification with a confusing message.
 */
function normalizeOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${isLocal(trimmed) ? "http://" : "https://"}${trimmed}`;
}

/**
 * Origins the server will accept a ceremony from. Comma-separated so a single
 * deployment can serve both the local dev origin and the public one.
 *
 * Left unset, it is derived from the RP ID -- which is the only value that
 * really has to be configured.
 */
const configuredOrigins =
  process.env.NEXT_PUBLIC_ORIGINS ??
  (RP_ID === "localhost" ? "http://localhost:3000" : `https://${RP_ID}`);

export const EXPECTED_ORIGINS = configuredOrigins
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

/** Used to sign the session and challenge cookies. */
export const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "insecure-development-secret-do-not-ship";

export const IS_PRODUCTION = process.env.NODE_ENV === "production";

/** Surfaced in the UI so the audience can see what the server is enforcing. */
export const publicConfig = {
  rpName: RP_NAME,
  rpId: RP_ID,
  origins: EXPECTED_ORIGINS,
};
