"use client";

import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
} from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  CeremonyError,
  registerPasskey,
  signInWithPasskey,
} from "@/lib/ceremonies";
import { diffHosts } from "@/lib/hostDiff";
import { useClientValue } from "@/lib/useClientValue";

type Status =
  | { kind: "idle" }
  | { kind: "busy"; message: string }
  | { kind: "error"; message: string; originMismatch: boolean };

/*
 * React's StrictMode runs effects twice in development. Two autofill ceremonies
 * starting back to back can leave the server-side challenge cookie describing a
 * different ceremony than the one the browser is actually running, which makes
 * autofill fail intermittently during a local rehearsal. One at a time.
 */
let autofillInFlight = false;

export function AuthCard({ rpId }: { rpId: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [autofillArmed, setAutofillArmed] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  const supported = useClientValue(browserSupportsWebAuthn);

  /*
   * Conditional UI, a.k.a. autofill sign-in. We start an authentication
   * ceremony immediately on load and let it sit dormant; the browser surfaces
   * any passkey for this domain inside the username field's own dropdown. The
   * user never presses a "sign in" button at all.
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!(await browserSupportsWebAuthnAutofill())) return;
      if (cancelled || autofillInFlight) return;

      autofillInFlight = true;
      setAutofillArmed(true);

      try {
        const result = await signInWithPasskey({ useBrowserAutofill: true });
        if (cancelled) return;
        router.replace(
          `/dashboard?via=autofill&credential=${result.usedCredential.id}`,
        );
        router.refresh();
      } catch {
        // An aborted autofill ceremony is the normal outcome when the user
        // instead clicks a button, so this is intentionally silent.
      } finally {
        autofillInFlight = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSignIn() {
    setStatus({ kind: "busy", message: "Waiting for your passkey…" });
    try {
      const result = await signInWithPasskey({ username });
      router.replace(`/dashboard?credential=${result.usedCredential.id}`);
      router.refresh();
    } catch (error) {
      const ceremonyError = error as CeremonyError;
      if (ceremonyError.isCancelled) {
        setStatus({ kind: "idle" });
        return;
      }
      setStatus({
        kind: "error",
        message: ceremonyError.message,
        originMismatch: ceremonyError.isOriginMismatch,
      });
    }
  }

  async function handleRegister() {
    if (!username.trim()) {
      setStatus({
        kind: "error",
        message: "Pick a username first.",
        originMismatch: false,
      });
      usernameRef.current?.focus();
      return;
    }

    setStatus({ kind: "busy", message: "Creating a passkey…" });
    try {
      await registerPasskey(username);
      router.replace("/dashboard?via=registration");
      router.refresh();
    } catch (error) {
      const ceremonyError = error as CeremonyError;
      if (ceremonyError.isCancelled) {
        setStatus({ kind: "idle" });
        return;
      }
      setStatus({
        kind: "error",
        message: ceremonyError.message,
        originMismatch: ceremonyError.isOriginMismatch,
      });
    }
  }

  const busy = status.kind === "busy";

  return (
    <section className="border-2 border-ink bg-white/60 p-8">
      <h1 className="text-4xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-gray">
        There is no password field on this page. There is no password column in
        the database either.
      </p>

      {supported === false ? (
        <p className="mt-6 border-2 border-red bg-red/10 p-4 text-sm">
          This browser doesn&apos;t support WebAuthn. Try a current version of
          Chrome, Edge, Safari, or Firefox.
        </p>
      ) : null}

      <div className="mt-8 space-y-3">
        <label htmlFor="username" className="block text-sm font-semibold">
          Username
        </label>
        <input
          id="username"
          ref={usernameRef}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          // The "webauthn" token is what lets the browser put a passkey into
          // this field's autofill dropdown.
          autoComplete="username webauthn"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="ada"
          disabled={busy}
          className="w-full border-2 border-ink bg-white px-4 py-3 text-lg outline-none focus:ring-4 focus:ring-yellow"
        />
        {autofillArmed ? (
          <p className="text-sm text-gray">
            Click the field above — if this device already has a passkey for{" "}
            <span className="font-mono">{rpId}</span>, your browser offers it
            right in the dropdown.
          </p>
        ) : null}
      </div>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={handleSignIn}
          disabled={busy || supported === false}
          className="w-full border-2 border-ink bg-ink px-5 py-4 text-lg font-semibold text-cream transition hover:bg-cream hover:text-ink disabled:opacity-40"
        >
          Sign in with a passkey
        </button>

        <p className="text-sm text-gray">
          Leave the username blank and the authenticator will offer whichever
          passkeys it holds for this site. In the prompt, choose{" "}
          <strong className="text-ink">“Use a phone or tablet”</strong> to scan a
          QR code and sign in with a passkey stored on your phone.
        </p>
      </div>

      <div className="my-8 flex items-center gap-4 text-sm text-gray">
        <span className="h-px flex-1 bg-ink/20" />
        first time here?
        <span className="h-px flex-1 bg-ink/20" />
      </div>

      <button
        type="button"
        onClick={handleRegister}
        disabled={busy || supported === false}
        className="w-full border-2 border-ink bg-yellow px-5 py-4 text-lg font-semibold transition hover:bg-ink hover:text-cream disabled:opacity-40"
      >
        Create an account with a passkey
      </button>

      {status.kind === "busy" ? (
        <p className="pk-fade-in mt-6 text-sm text-gray">{status.message}</p>
      ) : null}

      {status.kind === "error" ? (
        status.originMismatch ? (
          <OriginMismatchNotice rpId={rpId} />
        ) : (
          <p className="pk-fade-in mt-6 border-2 border-red bg-red/10 p-4 text-sm">
            {status.message}
          </p>
        )
      ) : null}
    </section>
  );
}

/**
 * Shown when the browser refuses the ceremony because the page's origin does
 * not match the configured RP ID. This is the phishing demo's payoff.
 *
 * Nothing on this page announces the mismatch beforehand — a real phishing site
 * wouldn't, and the demo works by letting the room fail to spot it first. The
 * reveal, including which character differs, arrives only after the attempt.
 */
function OriginMismatchNotice({ rpId }: { rpId: string }) {
  const host = useClientValue(() => window.location.hostname) ?? "";
  const diff = diffHosts(host, rpId);

  return (
    <div className="pk-fade-in mt-6 border-2 border-red">
      <p className="bg-red px-4 py-2 font-semibold text-cream">
        The browser blocked it.
      </p>

      <div className="space-y-4 p-5">
        <dl className="space-y-2 font-mono text-xl sm:text-2xl">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <dt className="w-36 shrink-0 font-sans text-xs uppercase tracking-wide text-gray">
              this page
            </dt>
            <dd>
              {diff.actual.prefix}
              {diff.actual.middle ? (
                <span className="bg-red px-0.5 text-cream">
                  {diff.actual.middle}
                </span>
              ) : (
                // A character was dropped. Mark the gap where it should be.
                <span className="text-red" aria-label="missing character">
                  ‸
                </span>
              )}
              {diff.actual.suffix}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3">
            <dt className="w-36 shrink-0 font-sans text-xs uppercase tracking-wide text-gray">
              passkeys here
            </dt>
            <dd>
              {diff.expected.prefix}
              {diff.expected.middle ? (
                <span className="bg-yellow px-0.5">{diff.expected.middle}</span>
              ) : null}
              {diff.expected.suffix}
            </dd>
          </div>
        </dl>

        <p className="text-sm">
          The browser refused before any prompt appeared. Nothing was sent to
          the server, and no amount of convincing design on this page could have
          changed that — the check happens below the page, in the browser
          itself.
        </p>
        <p className="text-sm text-gray">
          A password would have been typed straight into this form.
        </p>
      </div>
    </div>
  );
}
