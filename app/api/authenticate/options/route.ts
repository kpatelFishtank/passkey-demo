import { generateAuthenticationOptions } from "@simplewebauthn/server";

import { RP_ID } from "@/lib/config";
import { setChallenge } from "@/lib/session";
import { findUserByUsername } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
  };

  const username = (body.username ?? "").trim().toLowerCase();

  // With no username we send an empty allowCredentials list. That is the
  // "usernameless" flow: the authenticator already knows which passkeys it
  // holds for this domain and lets the user pick one. It is what makes the
  // browser autofill dropdown work.
  const user = username ? await findUserByUsername(username) : null;

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "preferred",
    allowCredentials: user
      ? user.credentials.map((credential) => ({
          id: credential.id,
          transports: credential.transports,
        }))
      : undefined,
  });

  await setChallenge({ challenge: options.challenge, type: "authentication" });

  return Response.json(options);
}
