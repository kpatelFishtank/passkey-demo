import { isCrossDevice } from "@/lib/credentials";
import type { StoredCredential } from "@/lib/types";

function formatDate(value: string | null) {
  if (!value) return "never";
  return new Date(value).toLocaleString();
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray">{label}</dt>
      <dd className="mt-0.5 break-all font-mono text-sm">{children}</dd>
    </div>
  );
}

export function CredentialCard({
  credential,
  highlighted,
}: {
  credential: StoredCredential;
  highlighted?: boolean;
}) {
  const crossDevice = isCrossDevice(credential);

  return (
    <li
      className={`border-2 p-5 ${
        highlighted ? "border-ink bg-yellow" : "border-ink/25 bg-white/60"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold">
          {credential.nickname}
          {crossDevice ? (
            <span className="ml-2 border border-ink px-2 py-0.5 align-middle text-xs font-semibold">
              phone
            </span>
          ) : null}
        </h3>
        {highlighted ? (
          <span className="text-sm font-semibold">just used</span>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Credential ID">
          {credential.id.slice(0, 28)}
          {credential.id.length > 28 ? "…" : ""}
        </Field>
        <Field label="Transports">
          {(credential.transports ?? ["unknown"]).join(", ")}
        </Field>
        <Field label="Type">
          {credential.deviceType === "multiDevice"
            ? "synced (backs up to your password manager)"
            : "device-bound (never leaves this device)"}
        </Field>
        <Field label="Backed up">{credential.backedUp ? "yes" : "no"}</Field>
        <Field label="Signature counter">{credential.counter}</Field>
        <Field label="Last used">{formatDate(credential.lastUsedAt)}</Field>
      </dl>

      <p className="mt-4 break-all border-t border-ink/15 pt-3 text-xs text-gray">
        <span className="uppercase tracking-wide">public key</span>{" "}
        <span className="font-mono">{credential.publicKey}</span>
      </p>
    </li>
  );
}
