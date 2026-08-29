"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { clearWire } from "@/lib/wire";

type Props = {
  rpId: string;
  storeDriver: "redis" | "file";
  signedInAs?: string | null;
};

export function SiteHeader({ rpId, storeDriver, signedInAs }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch("/api/session", { method: "DELETE" });
    clearWire();
    router.replace("/");
    router.refresh();
    setBusy(false);
  }

  async function resetDemo() {
    if (
      !window.confirm(
        "Delete every account and passkey on the server? Your device will still show the old passkeys in its own list until you remove them there.",
      )
    ) {
      return;
    }
    setBusy(true);
    await fetch("/api/server-state", { method: "DELETE" });
    clearWire();
    router.replace("/");
    router.refresh();
    setBusy(false);
  }

  return (
    <header className="border-b-2 border-ink">
      <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          Passkeys Demo
        </Link>

        <span
          className="border border-ink/25 bg-yellow px-2.5 py-1 font-mono text-xs"
          title="The domain every passkey here is cryptographically bound to."
        >
          rpId: {rpId}
        </span>

        {storeDriver === "file" ? (
          <span
            className="border border-ink/25 px-2.5 py-1 font-mono text-xs text-gray"
            title="No Redis configured. Fine locally; on a serverless host a cold start can lose registered passkeys."
          >
            store: file
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-3 text-sm">
          {signedInAs ? (
            <>
              <span className="text-gray">
                signed in as <strong className="text-ink">{signedInAs}</strong>
              </span>
              <button
                type="button"
                onClick={signOut}
                disabled={busy}
                className="border-2 border-ink px-3 py-1.5 font-semibold transition hover:bg-ink hover:text-cream disabled:opacity-40"
              >
                Sign out
              </button>
            </>
          ) : null}

          <Link
            href="/server"
            className="border-2 border-ink px-3 py-1.5 font-semibold transition hover:bg-ink hover:text-cream"
          >
            Server data
          </Link>

          <button
            type="button"
            onClick={resetDemo}
            disabled={busy}
            className="border-2 border-red px-3 py-1.5 font-semibold text-red transition hover:bg-red hover:text-cream disabled:opacity-40"
          >
            Reset demo
          </button>
        </div>
      </div>
    </header>
  );
}
