import { redirect } from "next/navigation";

import { AuthCard } from "@/components/AuthCard";
import { SiteHeader } from "@/components/SiteHeader";
import { WireInspector } from "@/components/WireInspector";
import { getSessionState } from "@/lib/auth";
import { publicConfig } from "@/lib/config";
import { storeDriver } from "@/lib/store";

export default async function Home() {
  const session = await getSessionState();

  // Only redirect when the account actually exists. A cookie pointing at a
  // missing user renders the sign-in page instead, which is what stops `/` and
  // `/dashboard` bouncing off each other.
  if (session.status === "authenticated") {
    redirect("/dashboard");
  }

  return (
    <>
      {/*
       * Deliberately nothing here announces a hostname mismatch. On the
       * look-alike domain this page is indistinguishable from the real one --
       * which is the phishing demo's whole argument. The reveal lives in
       * AuthCard, after the browser refuses the ceremony.
       */}
      <SiteHeader rpId={publicConfig.rpId} storeDriver={storeDriver} />

      <main className="mx-auto grid w-full max-w-[1500px] flex-1 gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="space-y-8">
          {session.status === "stale" ? (
            <p className="border-2 border-red bg-red/10 p-4 text-sm">
              Your session pointed at an account the server no longer has —
              either the demo was reset, or storage dropped it. Sign in again, or
              create a new account.
            </p>
          ) : null}

          <AuthCard rpId={publicConfig.rpId} />

          <aside className="border-2 border-ink/20 p-6 text-sm leading-relaxed text-gray">
            <h2 className="mb-3 text-base font-semibold text-ink">
              What you&apos;re about to watch
            </h2>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                The server sends a random <strong>challenge</strong>.
              </li>
              <li>
                Your device unlocks a <strong>private key</strong> with your face,
                fingerprint, or PIN, and signs the challenge. The key itself
                never moves.
              </li>
              <li>
                The server checks the signature against the{" "}
                <strong>public key</strong> it stored at registration.
              </li>
            </ol>
            <p className="mt-4">
              Nothing secret crosses the network in either direction. Every byte
              that does is on the right.
            </p>
          </aside>
        </div>

        <div className="min-h-[560px] lg:sticky lg:top-10 lg:h-[calc(100vh-5rem)]">
          <WireInspector />
        </div>
      </main>
    </>
  );
}
