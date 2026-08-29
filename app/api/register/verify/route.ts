import {
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";

import { EXPECTED_ORIGINS, RP_ID } from "@/lib/config";
import { describeAuthenticator, toPublicUser } from "@/lib/credentials";
import { consumeChallenge, setSession } from "@/lib/session";
import { updateDatabase } from "@/lib/store";
import type { StoredCredential, StoredUser } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    response?: RegistrationResponseJSON;
  };

  if (!body.response) {
    return Response.json(
      { error: "Missing registration response." },
      { status: 400 },
    );
  }

  const pending = await consumeChallenge();
  if (!pending || pending.type !== "registration") {
    return Response.json(
      { error: "No registration in progress, or it expired. Start again." },
      { status: 400 },
    );
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      // The server picked this random value moments ago. The signature has to
      // cover it, which is what makes the response impossible to replay.
      expectedChallenge: pending.challenge,
      expectedOrigin: EXPECTED_ORIGINS,
      expectedRPID: RP_ID,
      requireUserVerification: false,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Verification failed." },
      { status: 400 },
    );
  }

  if (!verification.verified) {
    return Response.json(
      { error: "Registration could not be verified." },
      { status: 400 },
    );
  }

  const info = verification.registrationInfo;
  const now = new Date().toISOString();

  const credential: StoredCredential = {
    id: info.credential.id,
    // Uint8Array on the way in, base64url on the way to storage.
    publicKey: isoBase64URL.fromBuffer(info.credential.publicKey),
    counter: info.credential.counter,
    transports: info.credential.transports,
    deviceType: info.credentialDeviceType,
    backedUp: info.credentialBackedUp,
    aaguid: info.aaguid,
    nickname: describeAuthenticator(info.credential.transports),
    createdAt: now,
    lastUsedAt: null,
  };

  let savedUser: StoredUser | undefined;

  await updateDatabase((db) => {
    let user = db.users.find((candidate) => candidate.id === pending.userId);

    if (!user) {
      user = {
        id: pending.userId!,
        username: pending.username!,
        displayName: pending.username!,
        createdAt: now,
        credentials: [],
      };
      db.users.push(user);
    }

    user.credentials.push(credential);
    savedUser = user;
  });

  await setSession(savedUser!.id);

  return Response.json({
    verified: true,
    user: toPublicUser(savedUser!),
    credential,
    // Echoed back so the wire inspector can show what the server derived from
    // the attestation, rather than just "ok".
    serverDerived: {
      credentialId: credential.id,
      publicKeyBase64Url: credential.publicKey,
      attestationFormat: info.fmt,
      aaguid: info.aaguid,
      credentialDeviceType: info.credentialDeviceType,
      credentialBackedUp: info.credentialBackedUp,
      userVerified: info.userVerified,
      origin: info.origin,
      rpID: info.rpID,
    },
  });
}
