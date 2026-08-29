import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";

/**
 * Everything the server keeps about one passkey.
 *
 * Note what is *not* here: no password, no password hash, no salt, no shared
 * secret of any kind. `publicKey` is public by definition -- a database dump
 * gives an attacker nothing they can sign with.
 */
export type StoredCredential = {
  /** Base64URL credential ID. Handed back by the browser on every sign-in. */
  id: string;
  /** Base64URL COSE-encoded public key. The only key material we hold. */
  publicKey: string;
  /** Signature counter, used to detect cloned authenticators. */
  counter: number;
  transports?: AuthenticatorTransportFuture[];
  /** `multiDevice` means the passkey syncs (iCloud Keychain, Google Password Manager). */
  deviceType: "singleDevice" | "multiDevice";
  backedUp: boolean;
  /** Authenticator model identifier. All zeroes when attestation is "none". */
  aaguid: string;
  /** Human label we derive from the transports, e.g. "Phone or tablet". */
  nickname: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type StoredUser = {
  /** Base64URL user handle. This is the `userHandle` returned during sign-in. */
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
  credentials: StoredCredential[];
};

export type Database = {
  users: StoredUser[];
};

export const emptyDatabase = (): Database => ({ users: [] });
