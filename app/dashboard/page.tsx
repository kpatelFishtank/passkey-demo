import { redirect } from "next/navigation";

import { AddPasskeyButton } from "@/components/AddPasskeyButton";
import { CredentialCard } from "@/components/CredentialCard";
import { SiteHeader } from "@/components/SiteHeader";
import { WireInspector } from "@/components/WireInspector";
import { getSessionState } from "@/lib/auth";
import { publicConfig } from "@/lib/config";
import { storeDriver } from "@/lib/store";

export default async function Dashboard({
  searchParams,
}: PageProps<"/dashboard">) {
  const session = await getSessionState();
  if (session.status !== "authenticated") redirect("/");

  const user = session.user;
  const params = await searchParams;
  const via = typeof params.via === "string" ? params.via : null;
  const usedCredentialId =
    typeof params.credential === "string" ? params.credential : null;

  const headline =
    via === "registration"
      ? "Passkey created. You're signed in."
      : via === "autofill"
        ? "Signed in from the autofill dropdown."
        : "Signed in.";

  return (
    <>
      <SiteHeader
        rpId={publicConfig.rpId}
        storeDriver={storeDriver}
        signedInAs={user.username}
      />

      <main className="mx-auto grid w-full max-w-[1500px] flex-1 gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="space-y-8">
          <section className="border-2 border-ink bg-yellow p-8">
            <h1 className="text-4xl font-semibold tracking-tight">{headline}</h1>
            <p className="mt-3 max-w-prose">
              No password was typed, transmitted, or stored. The server proved
              who you are by checking a signature against a public key.
            </p>
          </section>

          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight">
                Passkeys on this account
              </h2>
              <span className="text-sm text-gray">
                {user.credentials.length} registered
              </span>
            </div>

            <ul className="mt-5 space-y-4">
              {user.credentials.map((credential) => (
                <CredentialCard
                  key={credential.id}
                  credential={credential}
                  highlighted={credential.id === usedCredentialId}
                />
              ))}
            </ul>

            <div className="mt-6">
              <AddPasskeyButton username={user.username} />
            </div>
          </section>
        </div>

        <div className="min-h-[560px] lg:sticky lg:top-10 lg:h-[calc(100vh-5rem)]">
          <WireInspector />
        </div>
      </main>
    </>
  );
}
