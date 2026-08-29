import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";

import { EXPECTED_ORIGINS, RP_ID } from "@/lib/config";
import { isCrossDevice, toPublicUser } from "@/lib/credentials";
import { consumeChallenge, setSession } from "@/lib/session";
import { findUserByCredentialId, writeDatabase } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    response?: AuthenticationResponseJSON;
  };

  if (!body.response) {
    return Response.json(
      { error: "Missing authentication response." },
      { status: 400 },
    );
  }

  const pending = await consumeChallenge();
  if (!pending || pending.type !== "authentication") {
    return Response.json(
      { error: "No sign-in in progress, or it expired. Start again." },
      { status: 400 },
    );
  }

  const match = await findUserByCredentialId(body.response.id);
  if (!match) {
    return Response.json(
      { error: "That passkey is not registered here." },
      { status: 404 },
    );
  }

  const { user, db } = match;
  const credential = user.credentials.find(
    (candidate) => candidate.id === body.response!.id,
  )!;

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: pending.challenge,
      expectedOrigin: EXPECTED_ORIGINS,
      expectedRPID: RP_ID,
      credential: {
        id: credential.id,
        // The stored public key is all we need to check the signature. There
        // is no secret on this side of the exchange.
        publicKey: isoBase64URL.toBuffer(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports,
      },
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
      { error: "Signature did not verify." },
      { status: 401 },
    );
  }

  credential.counter = verification.authenticationInfo.newCounter;
  credential.lastUsedAt = new Date().toISOString();
  await writeDatabase(db);

  await setSession(user.id);

  return Response.json({
    verified: true,
    user: toPublicUser(user),
    usedCredential: credential,
    // A credential registered over the QR flow carries the "hybrid" transport.
    // It's the closest honest signal we have that a phone was involved.
    signedByCrossDeviceAuthenticator: isCrossDevice(credential),
    serverDerived: {
      credentialId: verification.authenticationInfo.credentialID,
      newSignatureCounter: verification.authenticationInfo.newCounter,
      userVerified: verification.authenticationInfo.userVerified,
      credentialDeviceType: verification.authenticationInfo.credentialDeviceType,
      credentialBackedUp: verification.authenticationInfo.credentialBackedUp,
      origin: verification.authenticationInfo.origin,
      rpID: verification.authenticationInfo.rpID,
    },
  });
}
