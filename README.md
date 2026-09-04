# Passkeys Demo

A small Next.js app built for a 15-minute talk on passkeys. It does registration
and sign-in with WebAuthn, shows the raw JSON of every exchange as it happens,
and exposes the entire server-side database so an audience can see for
themselves that there is no password in it.

Built on [SimpleWebAuthn](https://simplewebauthn.dev/) v13.

---

## Quick start

```bash
npm install
```

```bash
npm run dev
```

Open <http://localhost:3000>. `localhost` counts as a secure origin for WebAuthn,
so desktop passkeys (Windows Hello, Touch ID) work without HTTPS.

Configuration lives in `.env.local`; see `.env.example` for every option.

---

## What's in it

| Route         | Purpose                                                                     |
| ------------- | --------------------------------------------------------------------------- |
| `/`           | Sign in / create account, with the wire inspector alongside                 |
| `/dashboard`  | Signed-in view: every passkey on the account, and a button to enrol another |
| `/server`     | The whole database, plus the live RP configuration                          |
| `/api/health` | Pre-flight check: proves the store is reachable, writable, and durable      |

Three things are worth pointing at during a talk:

- **The wire inspector** (right-hand panel) logs each step of the ceremony with
  the real payload. The audience can read the challenge and the signature.
- **`/server`** shows `0 passwords, 0 password hashes` next to the public keys.
  Leave it open on a second monitor; it refreshes every few seconds.
- **Transports** on each credential. A passkey enrolled from a phone over the QR
  flow carries `hybrid`, which is how the dashboard labels it as a phone.

---

## Deploying for the live demo

Run the demo from a fixed HTTPS origin, not from `localhost`. A passkey is bound
to its RP ID, so a URL that changes between rehearsal and showtime invalidates
everything you registered in advance — and the cross-device (phone/QR) flow is
much less reliable against `localhost` than against a real domain.

### 1. Deploy to Vercel

```bash
npx vercel --prod
```

Then point `passkey.karanpatel.ca` at the deployment in the Vercel project's
Domains tab.

### 2. Set the environment variables

In Vercel → Settings → Environment Variables:

```
NEXT_PUBLIC_RP_NAME=Passkey Demo
NEXT_PUBLIC_RP_ID=passkey.karanpatel.ca
SESSION_SECRET=<a long random string>
```

`NEXT_PUBLIC_*` values are inlined at build time, so **redeploy after changing
them**.

That's the whole list. The accepted origin is derived from the RP ID, so
`NEXT_PUBLIC_ORIGINS` is only needed if you want to accept more than one — and a
missing `https://` gets filled in either way.

> Pin `NEXT_PUBLIC_RP_ID` to the full hostname. Setting it to `karanpatel.ca`
> would be valid WebAuthn — a registrable suffix — but the passkey would then
> work on _every_ subdomain, including the look-alike one, and the phishing demo
> would fall flat.

### 3. Add persistent storage

Without a Redis URL the app writes to a JSON file. On Vercel that file lives in
`/tmp` on **one** serverless instance. A cold start, or a second instance picking
up a request, loses every passkey registered against the old one. It usually
survives a continuously-active 15 minutes — "usually" being the problem.

The fix is free and takes about two minutes, on any Vercel plan:

1. Sign up at [upstash.com](https://upstash.com) and create a Redis database
   (free tier: 256 MB, plenty for this).
2. Copy the **REST URL** and **REST token** from its dashboard.
3. Add them to the Vercel project as `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN`, then redeploy.

The app reads those names directly, so nothing else changes. Going through the
Vercel Marketplace instead injects `KV_REST_API_URL` / `KV_REST_API_TOKEN`, which
the app also accepts — but signing up with Upstash directly sidesteps any
question of what your Vercel plan allows.

The header shows a `store: file` chip whenever Redis is _not_ configured. If you
see that chip on the deployed site, storage isn't wired up yet.

### 4. Set up the look-alike domain

Point a second hostname at the same Vercel deployment: **`paskey.karanpatel.ca`**
— the real host with one `s` dropped.

1. Add the domain to the same Vercel project, so it gets a valid certificate.
   The "same code, same server, valid padlock" line only lands if the padlock is
   genuinely there.
2. Change nothing else. In particular do **not** add it to
   `NEXT_PUBLIC_ORIGINS`; the RP ID stays `passkey.karanpatel.ca`.

A dropped letter is deliberate. A plural (`passkeys`) is a brand squat — nobody's
finger slips and produces an extra `s` — and it's easy enough to spot that half
the room concludes "I'd have caught that." A missing letter is both the most
common real typo and effectively invisible, which is the argument: the human
check fails, and the browser refuses anyway.

**The app does not label the look-alike host.** On `paskey.karanpatel.ca` the
page is indistinguishable from the real one, because a phishing site would be.
The reveal comes only after you attempt the sign-in: the browser refuses, and
the app then shows both hostnames stacked with the differing character marked —
a caret where the letter is missing, and the letter itself highlighted on the
real host. That's what lets you ask the room to spot it first.

---

## Demo runbook

Fifteen minutes, cold open first.

### Before you walk in

- [ ] Load **`/api/health`** on the deployed URL. You want
      `"ok": true`, `"storeDriver": "redis"`, and
      `"probe": "value written and read back intact"`. It writes a real value to
      the store and reads it back, so it catches the case where the app loads
      fine but nothing actually persists.
- [ ] Register your **laptop** passkey on the deployed URL.
- [ ] Register your **phone** passkey too: sign in on the laptop, go to the
      dashboard, hit **Add another passkey**, choose _Use a phone or tablet_,
      scan the QR. Confirm it appears with the `phone` tag.
- [ ] Confirm the header does **not** show a `store: file` chip.
- [ ] Bluetooth on, on both the laptop and the phone. The cross-device flow uses
      it for a proximity check and silently fails without it.
- [ ] Phone off Wi-Fi-only captive portals; the QR flow needs a real connection.
- [ ] Two browser windows: the demo app, and `/server` on the second monitor.
- [ ] Open `paskey.karanpatel.ca` once and attempt a sign-in, to confirm the
      refusal notice appears and marks the missing letter. Nothing on that page
      announces the mismatch until you try, so this is the only way to check it.
- [ ] A screen recording of the cross-device flow, in case the room's network
      fights you.
- [ ] Sign out — the cold open starts from a signed-out screen.

### Running it

| Beat                   | What you do                                                                  | What to say                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **0:00 Cold open**     | Click the username field, pick your passkey, Hello prompt, you're in.        | "No password. Nothing typed. Nothing that could be stolen." Then sign out and go to slides.                       |
| **7:30 Register**      | Reset the demo, create an account.                                           | Walk the wire inspector: challenge in, public key out.                                                            |
| **8:30 The database**  | Switch to `/server`.                                                         | "Zero passwords. Zero hashes. If this leaks tomorrow, the attacker gets public keys."                             |
| **9:30 Sign in**       | Sign out, click the username field, use the autofill dropdown.               | "No username, no password, no second factor prompt. One gesture."                                                 |
| **10:30 Phishing**     | Open `paskey.karanpatel.ca`. Point at the address bar and ask the room to spot the problem. Wait. Then try to sign in. | "Same code, same server, valid certificate." → "Can anyone see the problem?" → _(let it sit)_ → "One letter. I own both domains and I still can't sign in. And you wouldn't have caught it either." |
| **11:30 Cross-device** | Back on the real domain, sign in → _Use a phone or tablet_ → scan → Face ID. | "My phone never contacted the server. It signed a challenge and passed it back over a Bluetooth-verified tunnel." |

**Reset demo** in the header wipes every account. Note that it does _not_ remove
the passkey from your device's own list — clear those in Windows Settings →
Passkeys, or in Chrome's password manager, if you want a truly clean run.

---

## Questions you should expect

**"What if I lose my phone?"** Passkeys from Apple, Google, and Microsoft sync
through the platform password manager, so a new device gets them after sign-in.
The `Type` field on each credential shows `synced` or `device-bound`. Account
recovery is still a real design problem — it's the hardest part of shipping
passkeys, not an afterthought.

**"Is this 2FA?"** It replaces both factors at once. The private key is
something you have; the biometric or PIN that unlocks it is something you are or
know. The signature is only produced when both are satisfied.

**"Can the site see my fingerprint?"** No. The biometric never leaves the
device and is never transmitted. It unlocks the private key locally; the site
only learns that user verification succeeded — the `userVerified` flag in the
inspector.

**"What stops someone replaying the signature?"** The challenge. It is random,
server-generated, and single-use, and the signature covers it. Replaying an old
response fails verification.

**"Why does the RP ID matter so much?"** It is the domain binding. The browser
refuses to hand a credential to any origin that doesn't match it, which is the
entire phishing-resistance story. That is what the look-alike domain beat shows.

---

## Notes

- The PP Mori webfont and the colour palette are lifted from `tidal-xmcloud`
  (`headapps/nextjs-starter/src/assets/global.scss`) so the demo matches the rest
  of the company's work. Check that the font licence covers this use before
  showing it outside the building.
- Storage is a single JSON blob rewritten on every change. Fine for one presenter
  at a time; not a pattern to copy.
- `/server` intentionally exposes the whole database. Obviously don't do that in
  anything real.
