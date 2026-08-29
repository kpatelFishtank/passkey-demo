"use client";

import {
  startAuthentication,
  startRegistration,
  WebAuthnError,
} from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

import { logWire } from "./wire";
import type { PublicUser } from "./credentials";

export class CeremonyError extends Error {
  /** Set when the failure is the phishing-resistance property doing its job. */
  readonly isOriginMismatch: boolean;
  readonly isCancelled: boolean;

  constructor(
    message: string,
    options: { isOriginMismatch?: boolean; isCancelled?: boolean } = {},
  ) {
    super(message);
    this.name = "CeremonyError";
    this.isOriginMismatch = options.isOriginMismatch ?? false;
    this.isCancelled = options.isCancelled ?? false;
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `Request to ${url} failed with ${response.status}`;
    throw new CeremonyError(message);
  }

  return payload as T;
}

function translate(error: unknown): CeremonyError {
  if (error instanceof CeremonyError) return error;

  if (error instanceof WebAuthnError) {
    switch (error.code) {
      case "ERROR_INVALID_RP_ID":
      case "ERROR_INVALID_DOMAIN":
        return new CeremonyError(
          "The browser refused to use a passkey for this domain.",
          { isOriginMismatch: true },
        );
      case "ERROR_CEREMONY_ABORTED":
        return new CeremonyError("Cancelled.", { isCancelled: true });
      case "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED":
        return new CeremonyError(
          "This device already holds a passkey for that account. Try signing in instead.",
        );
      default:
        return new CeremonyError(error.message);
    }
  }

  if (error instanceof Error) {
    if (error.name === "NotAllowedError") {
      return new CeremonyError(
        "No passkey was used. The prompt was dismissed or timed out.",
        { isCancelled: true },
      );
    }
    if (error.name === "SecurityError") {
      return new CeremonyError(
        "The browser refused to use a passkey for this domain.",
        { isOriginMismatch: true },
      );
    }
    return new CeremonyError(error.message);
  }

  return new CeremonyError("Something went wrong.");
}

export type RegistrationResult = {
  verified: true;
  user: PublicUser;
  serverDerived: Record<string, unknown>;
};

export async function registerPasskey(
  username: string,
): Promise<RegistrationResult> {
  try {
    logWire("request", "POST /api/register/options", { username });

    const options = await postJson<PublicKeyCredentialCreationOptionsJSON>(
      "/api/register/options",
      { username },
    );

    logWire(
      "response",
      "Server returns registration options",
      options,
      "The challenge is a fresh random value. The signature we get back has to cover it, so this exchange cannot be replayed later.",
    );

    // The only moment a key pair is created. The private key is generated
    // inside the authenticator and never becomes visible to this page.
    const attestation = await startRegistration({ optionsJSON: options });

    logWire(
      "device",
      "Authenticator creates the key pair",
      attestation,
      "The private key stays on the device. What comes back is the public key plus proof it was created here.",
    );

    logWire("request", "POST /api/register/verify", {
      response: attestation,
    });

    const result = await postJson<RegistrationResult>("/api/register/verify", {
      response: attestation,
    });

    logWire(
      "response",
      "Server verifies and stores the public key",
      result,
      "This is the entire database record. No password, no hash, nothing worth stealing.",
    );

    return result;
  } catch (error) {
    const translated = translate(error);
    if (!translated.isCancelled) {
      logWire("error", "Registration failed", { message: translated.message });
    }
    throw translated;
  }
}

export type AuthenticationResult = {
  verified: true;
  user: PublicUser;
  usedCredential: { id: string; nickname: string };
  signedByCrossDeviceAuthenticator: boolean;
  serverDerived: Record<string, unknown>;
};

export async function signInWithPasskey({
  username,
  useBrowserAutofill = false,
}: {
  username?: string;
  useBrowserAutofill?: boolean;
} = {}): Promise<AuthenticationResult> {
  try {
    if (!useBrowserAutofill) {
      logWire("request", "POST /api/authenticate/options", {
        username: username || "(none - usernameless)",
      });
    }

    const options = await postJson<PublicKeyCredentialRequestOptionsJSON>(
      "/api/authenticate/options",
      { username },
    );

    if (!useBrowserAutofill) {
      logWire(
        "response",
        "Server returns a challenge",
        options,
        options.allowCredentials?.length
          ? "We named the credentials this account owns."
          : "No credential list: the authenticator itself knows which passkeys it holds for this domain.",
      );
    }

    const assertion = await startAuthentication({
      optionsJSON: options,
      useBrowserAutofill,
    });

    logWire(
      "device",
      "Authenticator signs the challenge",
      assertion,
      "A signature over the challenge and the origin. The private key did the signing without ever leaving the device.",
    );

    logWire("request", "POST /api/authenticate/verify", {
      response: assertion,
    });

    const result = await postJson<AuthenticationResult>(
      "/api/authenticate/verify",
      { response: assertion },
    );

    logWire(
      "response",
      "Server checks the signature against the stored public key",
      result,
      "Verified with public key material only. The server never had a secret to lose.",
    );

    return result;
  } catch (error) {
    const translated = translate(error);
    if (!translated.isCancelled && !useBrowserAutofill) {
      logWire("error", "Sign-in failed", { message: translated.message });
    }
    throw translated;
  }
}
