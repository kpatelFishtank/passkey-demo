import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";

import type { StoredCredential, StoredUser } from "./types";

/**
 * Best-effort human label for a credential, derived from the transports the
 * browser reported.
 *
 * `hybrid` is the interesting one: it means the credential was created or used
 * over the cross-device flow -- the QR code plus Bluetooth proximity check that
 * lets a phone authenticate a desktop session.
 */
export function describeAuthenticator(
  transports: AuthenticatorTransportFuture[] | undefined,
): string {
  const list = transports ?? [];

  if (list.includes("hybrid")) return "Phone or tablet (cross-device)";
  if (list.includes("internal")) return "This device (built-in)";
  if (list.includes("usb") || list.includes("nfc") || list.includes("ble")) {
    return "Security key";
  }
  return "Unknown authenticator";
}

/** True when the credential was registered over the cross-device (QR) flow. */
export function isCrossDevice(credential: StoredCredential): boolean {
  return (credential.transports ?? []).includes("hybrid");
}

export type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
  credentials: StoredCredential[];
};

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    createdAt: user.createdAt,
    credentials: user.credentials,
  };
}
