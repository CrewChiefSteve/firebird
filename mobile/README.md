# Trans Am (mobile)

The shop board and the public site as a phone app. Expo (SDK 57) + Expo Router, signed in with Clerk (`@clerk/expo`), talking to the same Convex deployment as the website. There is no separate backend: the app imports `../convex/_generated/api` and calls the functions the website already uses.

| Side | Tabs |
|---|---|
| Public (signed out) | The car (story, countdown, progress), Build log, Adopt a part, Crew sign-in |
| Crew (on the `crew` table) | Clock, Jobs, Parts (with pledges), Ledger (snap a receipt, the reader fills the form), More → Sprint & progress, Build log posts (camera uploads), Payroll |

Who can do what follows the website and the Convex functions exactly. Jennifer sees the paid / reimbursed / settle-up buttons; Steve and Nick don't.

## Run it

```
cd mobile
npm install
cp .env.example .env.local     # fill in the dev publishable key (pk_test_..., same as the website's .env.local)
npx expo start                 # scan the QR code with Expo Go, or press w for the browser
```

`.env.local` points at the **dev** Convex deployment (diligent-mongoose-297) and the Clerk development instance.

### Demo mode

The crew screens need a crew sign-in. To look at them without one, open the web build with `?demo` (as Steve) or `?demo=jen` (as Jennifer, the payer):

```
http://localhost:8081/?demo
http://localhost:8081/payroll?demo=jen
```

Demo mode fills the crew screens from typed sample data in `src/lib/demo.ts` and turns writes into no-ops. It only exists in dev builds: release bundles leave the sample data out.

### Checks

```
npm run typecheck      # tsc against the real Convex function types
npx expo-doctor
```

## Layout

```
src/app/(public)/       signed-out tabs: home, log, adopt, crew (sign-in)
src/app/(shop)/         crew-only; _layout.tsx is the gate
  (tabs)/               clock, jobs, parts, ledger, more
  sprint, payroll, posts, post-edit
src/app/post/[slug]     one build log post
src/lib/data.ts         useQ / useM / useA (Convex hooks + demo mode), useMe
src/lib/upload.ts       camera / library / PDF picking, resize, Convex upload
src/components/ui.tsx   the design system: Card, Stat, Btn, Chips, Field, DateField, Sheet…
```

Shared with the website: `../convex` (functions and generated types) and `../lib/project.ts` (milestones, people, phases). The "Why this car" story is copied into `src/lib/story.ts`; keep it in step with `app/page.tsx`. Photos under `public/photos` load from the live site.

`metro.config.js` watches `../convex` and `../lib` and resolves their imports from `mobile/node_modules`, so the build works on EAS where the repo root isn't installed.

## Builds and release (EAS)

Profiles in `eas.json` carry the public env values:

| Profile | Convex | Clerk |
|---|---|---|
| development | dev (diligent-mongoose-297) | development instance |
| preview | prod (capable-shepherd-203) | production (pk_live, clerk.crewchiefsteve.com) |
| production | prod | production |

First time only:

```
npx eas-cli@latest login
npx eas-cli@latest init          # creates the EAS project under the crewchiefsteve account, writes extra.eas.projectId
```

Then:

```
npx eas-cli@latest build --profile preview --platform all      # installable builds for the crew's phones
npx eas-cli@latest build --profile production --platform ios
npx eas-cli@latest submit --platform ios
```

Bundle id / package: `com.crewchiefsteve.firebird`. Deep-link scheme: `firebird`.

### Clerk dashboard, before the first device build

On the **Firebird** app, Production instance → Configure → Native applications:

1. Make sure **Enable Native API** is on (also on the Development instance if you test against dev).
2. Add the iOS app: your Apple Team ID + `com.crewchiefsteve.firebird`. Add the Android app: package `com.crewchiefsteve.firebird` + its SHA-256 (from `eas credentials` after the first Android build).
3. For "Continue with Google": add `firebird://sso-callback` under **Allowlist for mobile SSO redirect**.

Email-code sign-in needs only step 1.

## Not done yet

- Push notifications (new pledge, someone clocked in) — Expo push + a Convex action would slot in cleanly.
- Not yet tried on a real device: camera, photo uploads, and Google sign-in. Everything else was checked in the web build.
