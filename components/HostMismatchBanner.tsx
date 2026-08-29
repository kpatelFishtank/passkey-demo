"use client";

import { useClientValue } from "@/lib/useClientValue";

/**
 * Persistent strip shown when the app is being served from a host that is not
 * its RP ID -- i.e. the look-alike domain used for the phishing demo.
 *
 * It's deliberately honest rather than theatrical: a real phishing site would
 * never label itself, and the point of the demo is that it wouldn't need to.
 */
export function HostMismatchBanner({ rpId }: { rpId: string }) {
  const host = useClientValue(() => window.location.hostname);

  if (!host || host === rpId) return null;

  return (
    <div className="border-b-2 border-red bg-red px-6 py-3 text-cream">
      <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <strong className="font-semibold">Look-alike domain.</strong>
        <span>
          You are on <span className="font-mono">{host}</span>. The passkeys for
          this demo belong to <span className="font-mono">{rpId}</span>.
        </span>
        <span className="opacity-80">Try signing in and watch what happens.</span>
      </div>
    </div>
  );
}
