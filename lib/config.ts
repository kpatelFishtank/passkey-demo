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

/**
 * Origins the server will accept a ceremony from. Comma-separated so a single
 * deployment can serve both the local dev origin and the public one.
 */
export const EXPECTED_ORIGINS = (
  process.env.NEXT_PUBLIC_ORIGINS ?? "http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim())
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
