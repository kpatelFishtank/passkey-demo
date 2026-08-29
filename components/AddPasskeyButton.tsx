"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CeremonyError, registerPasskey } from "@/lib/ceremonies";

/**
 * Adds a second (third, fourth…) passkey to the account that is already signed
 * in. This is how you enrol a phone: click it on the laptop, choose "Use a
 * phone or tablet", scan the QR code, and the phone stores a passkey for this
 * account.
 */
export function AddPasskeyButton({ username }: { username: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "busy" } | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function addPasskey() {
    setStatus({ kind: "busy" });
    try {
      await registerPasskey(username);
      setStatus({ kind: "idle" });
      router.refresh();
    } catch (error) {
      const ceremonyError = error as CeremonyError;
      if (ceremonyError.isCancelled) {
        setStatus({ kind: "idle" });
        return;
      }
      setStatus({ kind: "error", message: ceremonyError.message });
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={addPasskey}
        disabled={status.kind === "busy"}
        className="border-2 border-ink bg-yellow px-5 py-3 font-semibold transition hover:bg-ink hover:text-cream disabled:opacity-40"
      >
        {status.kind === "busy" ? "Waiting…" : "Add another passkey"}
      </button>

      <p className="mt-2 max-w-prose text-sm text-gray">
        In the prompt, pick <strong className="text-ink">“Use a phone or
        tablet”</strong> to enrol a passkey stored on your phone. It will show up
        below with a <span className="font-mono">hybrid</span> transport.
      </p>

      {status.kind === "error" ? (
        <p className="pk-fade-in mt-3 border-2 border-red bg-red/10 p-3 text-sm">
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
