import { generateRegistrationOptions } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { randomBytes } from "node:crypto";

import { RP_ID, RP_NAME } from "@/lib/config";
import { setChallenge } from "@/lib/session";
import { findUserByUsername } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
  };

  const username = (body.username ?? "").trim().toLowerCase();
  if (!username) {
    return Response.json({ error: "A username is required." }, { status: 400 });
  }

  // An existing account can add more passkeys -- that is how you'd enrol a
  // phone alongside a laptop. Reuse the same user handle so both credentials
  // resolve to one account.
  const existing = await findUserByUsername(username);
  const userId = existing?.id ?? isoBase64URL.fromBuffer(randomBytes(32));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: username,
    userDisplayName: username,
    userID: isoBase64URL.toBuffer(userId),
    // "none" means we don't ask the authenticator to prove its make and model.
    // Consumer apps almost always want this; enterprises that need to allow-list
    // specific hardware would use "direct" instead.
    attestationType: "none",
    // Stop the user creating a second passkey on an authenticator that already
    // holds one for this account.
    excludeCredentials:
      existing?.credentials.map((credential) => ({
        id: credential.id,
        transports: credential.transports,
      })) ?? [],
    authenticatorSelection: {
      // "required" makes this a *discoverable* credential: the authenticator
      // stores the username itself, which is what enables the usernameless
      // autofill sign-in on the next screen.
      residentKey: "required",
      userVerification: "preferred",
    },
  });

  await setChallenge({
    challenge: options.challenge,
    type: "registration",
    username,
    userId,
  });

  return Response.json(options);
}
