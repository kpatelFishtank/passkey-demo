import Link from "next/link";

import { AutoRefresh } from "@/components/AutoRefresh";
import { SiteHeader } from "@/components/SiteHeader";
import { getSessionState } from "@/lib/auth";
import { publicConfig } from "@/lib/config";
import { readDatabase, storeDriver } from "@/lib/store";

export const dynamic = "force-dynamic";

function Stat({
  value,
  label,
  emphasis,
}: {
  value: string | number;
  label: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`border-2 p-6 ${
        emphasis ? "border-ink bg-yellow" : "border-ink/25 bg-white/60"
      }`}
    >
      <p className="text-5xl font-semibold tabular-nums">{value}</p>
      <p className="mt-2 text-sm text-gray">{label}</p>
    </div>
  );
}

export default async function ServerState() {
  const db = await readDatabase();
  const session = await getSessionState();

  const credentialCount = db.users.reduce(
    (total, user) => total + user.credentials.length,
    0,
  );

  return (
    <>
      <AutoRefresh />
      <SiteHeader
        rpId={publicConfig.rpId}
        storeDriver={storeDriver}
        signedInAs={session.user?.username ?? null}
      />

      <main className="mx-auto w-full max-w-[1500px] flex-1 space-y-10 px-6 py-10">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">
            Everything the server knows
          </h1>
          <p className="mt-3 max-w-prose text-gray">
            Not a redacted view — this is the whole database. Imagine it leaked
            tomorrow and ask yourself what an attacker could do with it.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat value={db.users.length} label="accounts" />
          <Stat value={credentialCount} label="public keys stored" />
          <Stat value={0} label="passwords stored" emphasis />
          <Stat value={0} label="password hashes stored" emphasis />
        </div>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight">Raw records</h2>
          <p className="mt-2 text-sm text-gray">
            Refreshes every few seconds, so you can leave this open while you
            register in another window.
          </p>
          <pre className="thin-scroll on-dark mt-4 max-h-[520px] overflow-auto border-2 border-ink p-5 font-mono text-[13px] leading-relaxed">
            {JSON.stringify(db, null, 2)}
          </pre>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight">
            Relying Party configuration
          </h2>
          <pre className="thin-scroll on-dark mt-4 overflow-auto border-2 border-ink p-5 font-mono text-[13px] leading-relaxed">
            {JSON.stringify({ ...publicConfig, storeDriver }, null, 2)}
          </pre>
          <p className="mt-3 max-w-prose text-sm text-gray">
            <strong className="text-ink">rpId</strong> is the domain every
            passkey above is bound to. Change it and every existing passkey stops
            working — which is the same reason a look-alike domain can&apos;t use
            them.
          </p>
        </section>

        <Link href="/" className="inline-block text-purple underline">
          Back to sign in
        </Link>
      </main>
    </>
  );
}
