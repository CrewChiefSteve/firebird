# Store launch: Trans Am on Google Play and the App Store

Written 2026-10-15. This follows the company template (`C:\citedbrain\docs\STORE_LAUNCH.md`). The app is free,
with no purchases, ads or tracking, so the RevenueCat, subscription and payments-profile steps from that template don't apply.

Both listings belong to **CrewChiefSteve Technologies, Inc.** (the company's Play developer account and Apple team).
Because the Play account is an organization account, Play's 12-tester / 14-day closed-test rule does not apply.

## Where things stand

| | State |
|---|---|
| App code | Ready for review: in-app account deletion, App Review sign-in, Google sign-in only on Android (guideline 4.8), iPhone-only, trimmed Android permissions, privacy and support links in the app |
| Website | `/privacy`, `/support`, `/delete-account` pages. They deploy with the website when this branch merges to `main` |
| EAS | Project `@crewchiefsteve/firebird`. iOS production builds 4 and 5 (Oct 11) predate these changes, so build again. No Android production (AAB) build yet |
| App Store Connect | App record exists (`ascAppId` 6821679783 in `eas.json`) |
| Play Console | Check whether the app exists. If it doesn't, create it (step 4) |
| Store graphics | `mobile/store/`: Play icon, feature graphic, phone screenshots |

Everything below marked **(Steve)** needs a password, the company's legal identity, or a console button. Claude can't do those.

## Risks to know before submitting

1. **App Store guideline 4.2 (minimum functionality) and 4.2.x (limited audience).** Apple rejects apps that are mostly
   a website, and apps meant for a handful of people. Our case for approval: the public side is native
   (story, live progress, build log, Adopt a part with an in-app form, share sheet), and the crew side is a working
   tool with the camera, receipt reading and offline-friendly forms. If Apple still says 4.2, the fallbacks are:
   ship iOS to the crew through TestFlight only (90-day builds, no review beyond beta review), or Apple's Unlisted
   App Distribution (request form at developer.apple.com/support/unlisted-app-distribution). Play is much less strict.
2. **Trademark.** "Trans Am", "Firebird" and "Pontiac" are GM trademarks. The listing describes a restoration of one
   car, which is fair use, and the app and listing say it isn't affiliated with GM. Apple 5.2.1 and Play's
   impersonation policy could still flag the app name. If either store objects, rename the listing to something like
   "Joe's 80th Birthday Build" (the home-screen label can stay "Trans Am").
3. **Adopt a part.** The pledge form takes no money. It sends Jennifer a name and email. Apple's donation rules
   (3.2.1(vi), 3.2.2(iv)) are about collecting money in the app, so they shouldn't apply, but the review notes say so up front.

## 1. Merge and deploy (Claude or Steve)

- [ ] Merge the `store/launch-prep` PR. GitHub Actions deploys Convex and the website.
- [ ] Open https://firebird.crewchiefsteve.com/privacy, `/support` and `/delete-account` signed out. All three must load.

## 2. Clerk, production instance (Steve)

dashboard.clerk.com → **Firebird** → Production:

- [ ] Configure → **Native applications**: **Enable Native API** is on.
- [ ] **Allow users to delete their accounts** is on. It already is: `actions.delete_self` is `true` in
      https://clerk.crewchiefsteve.com/v1/environment.
- [ ] **Create the App Review account:** Users → Create user, email **`appreview@crewchiefsteve.ai`**, a password of
      15 characters or more (the instance minimum). Don't add it to the crew table. The app recognizes this address
      (`EXPO_PUBLIC_REVIEW_EMAIL` in `eas.json`) and shows the crew screens with **sample data, writes off**, so
      reviewers never see or change the real hours, wages and receipts. If you'd rather use another address,
      change it in `eas.json` before building.
- [ ] Make sure a password sign-in on a new phone doesn't ask for an emailed code (reviewers can't read that inbox).
      Configure → Sessions / Attack protection: **Client trust** (device verification) off, or the review account's
      email must forward to you. Check by signing in with the review account on the emulator or a phone.
- [ ] Optional, Google sign-in on Android: under Native applications, add the Android app (package
      `com.crewchiefsteve.firebird` + SHA-256 from `npx eas-cli@latest credentials -p android`), and
      `firebird://sso-callback` under the allowlist for mobile SSO redirects. The emailed code works without this.

## 3. Builds (Claude can run these once you say go; they use EAS build credits)

```bash
cd mobile
npx eas-cli@latest build --platform all --profile production
npx eas-cli@latest submit --platform ios --latest       # to TestFlight
```

The **first** Android upload has to go through Play Console by hand (step 4). After that,
`npx eas-cli@latest submit --platform android --latest` works once a Play service account JSON is set up
(the company one from `C:\citedbrain\docs\PLAY_SUBMISSION_RUNBOOK.md`, granted on this app).

Before submitting, test on a phone: sign in with the review account → the crew tabs show sample data with the
"Sample data" label on More → More → Your account → **Delete my account** works and lands on the public side.
Then recreate the review account in Clerk (step 2) so it exists for the reviewers.

## 4. Google Play Console (Steve)

- [ ] **Create app:** name **Trans Am: Joe's 80th Build** (or see the naming risk above), default language English (US),
      App, **Free**, declarations accepted.
- [ ] **Production → Countries / regions:** United States.
- [ ] **Testing → Internal testing → Create release:** upload the `.aab` from step 3 (download it from the EAS build page).
      Add yourself as a tester and install it from the Play link once.
- [ ] **Store presence → Main store listing:** text from "Listing copy" below. Graphics from `mobile/store/play/`:
      `icon-512.png`, `feature-graphic.png`, and the phone screenshots in `screenshots/`. When Play asks for the
      AI asset declaration: these are real app captures and our own photos, so choose "Don't label assets".
      App category **Auto & Vehicles**, contact email steve@crewchiefsteve.ai, website https://firebird.crewchiefsteve.com.
- [ ] **App content:**
  - Privacy policy: `https://firebird.crewchiefsteve.com/privacy`
  - Ads: **No**
  - App access: **All or some functionality is restricted** → add instructions: name "Crew (App Review)",
    username `appreview@crewchiefsteve.ai`, the password, and the note from "Review notes" below.
  - Content rating: category **All Other App Types**. Answer **No** to violence, sexuality, language, controlled
    substances, crude humor, gambling, and location sharing. "Users can interact or exchange content": **No** (only
    the three-person crew posts. The pledge form is a private note to Jennifer). "Digital purchases": **No**.
    Expected result: Everyone / PEGI 3.
  - Target audience: **18 and over**. That keeps the app out of the Families policy, and the pledge form collects an email.
  - News app **No**, government app **No**, financial features **None**, health **No**.
  - **Data safety:** collects data: Yes. Encrypted in transit: Yes. Account creation method: username and password /
    other (emailed code) and OAuth (Google). Account deletion URL `https://firebird.crewchiefsteve.com/delete-account`.
    Data types. All are *collected*, *not shared* (Convex, Clerk, Resend, OpenAI and Vercel are service providers),
    *not processed ephemerally*, and *optional*, except where noted:
    - Personal info → **Name**, **Email address**: App functionality, Account management. (Pledge form and crew sign-in.)
    - Personal info → **User IDs**: Account management. Required for crew.
    - Financial info → **Other financial info** (the crew's ledger, payroll and payments): App functionality.
    - Photos and videos → **Photos**: App functionality.
    - Files and docs: App functionality (PDF receipts).
    - App activity → **Other user-generated content** (posts, jobs, time entries, pledge notes): App functionality.
    - Nothing for location, contacts, messages, health, audio, calendar, web history, device IDs, or crash and analytics.
- [ ] **Publishing overview → Send for review**, after promoting the internal release to Production.

## 5. App Store Connect (Steve)

App record `6821679783`.

- [ ] **App Information:** name and subtitle from "Listing copy". Category **Lifestyle**, secondary **Entertainment**.
      Content rights: the app shows only content we own. Age rating questionnaire: all **None / No** (no UGC from
      the public, no web browsing, no gambling) → **4+**. License agreement: Apple's standard EULA.
- [ ] **App Privacy:** privacy policy URL `https://firebird.crewchiefsteve.com/privacy`. Data types:
      **Name, Email Address** (Contact Info), **Photos or Videos** and **Other User Content** (User Content),
      **User ID** (Identifiers), and **Other Financial Info** (Financial Info). Each is App Functionality,
      **linked to the user**, **not used for tracking**. **Publish** the labels.
- [ ] **Pricing and Availability:** Free, United States. Turn **off** "iPhone and iPad Apps on Apple Silicon Macs".
      The app is iPhone-only (`supportsTablet: false`).
- [ ] **Version 1.0:** description, keywords, promotional text, support URL `https://firebird.crewchiefsteve.com/support`,
      marketing URL `https://firebird.crewchiefsteve.com`, copyright `2026 CrewChiefSteve Technologies, Inc.`, and
      the build from step 3 (TestFlight → it appears under Build).
- [ ] **Screenshots:** the required slot is **iPhone with Dynamic Island (medium display)** (1206 × 2622 or 1179 × 2556).
      Upload `mobile/store/appstore/` (1179 × 2556, RGB, no alpha). Every PNG must be alpha-free or App Store
      Connect calls it a "dimensions" error.
- [ ] **App Review Information:** sign-in `appreview@crewchiefsteve.ai` + password (the section won't save without the
      password). Add your phone number from the developer account, and paste the notes below.
- [ ] **Add for Review → Submit for Review.**

## Listing copy

**App name (≤30):** `Trans Am: Joe's 80th Build`
**iOS subtitle (≤30):** `A father-daughter restoration`
**Play short description (≤80):** `Follow the rebuild of Jennifer's first car for her dad Joe's 80th birthday.`
**iOS promotional text (≤170):** `Joe Cobb turns 80 on February 14, 2027. His daughter Jennifer and her crew are putting her first car back together so he can drive it. Follow every step.`
**iOS keywords (≤100):** `restoration,classic car,project car,build log,muscle car,1975,garage,rebuild,car restoration,hot rod`

**Description (both stores):**

> Her first car. His 80th birthday. A crew of three.
>
> Joe Cobb bought a Trans Am for his wife Connie. Their daughter Jennifer learned to drive it on his lap, got it for her sixteenth birthday, and raced it at the high school drags. Then it sat behind the house for decades. Now NASCAR driver Jennifer Jo Cobb, Crew Chief Steve and Nick are putting it back together so Joe can drive it on his 80th birthday, February 14, 2027.
>
> This app follows the whole build:
> • The story of the car and the family behind it
> • A live countdown to Joe's birthday drive
> • Progress on every phase, from rust repair to paint
> • The build log: every update, with photos from the shop
> • Adopt a part: pick a part the car still needs and put your name on it. Nothing is paid in the app; Jennifer gets in touch by email.
>
> The crew runs the restoration from the Crew tab: time clock, job board, parts list, a ledger of every dollar spent with receipt photos, the build-log editor and payroll.
>
> A family project, not affiliated with or endorsed by General Motors. Pontiac, Firebird and Trans Am are trademarks of General Motors.

**What's new (1.0):** `First release.`

## Review notes (paste into App Review Information and Play's App access)

> Trans Am follows a family car restoration. Everything on the first three tabs (The car, Build log, Adopt a part)
> works without an account.
>
> The Crew tab is for the three people doing the work. To review it, tap Crew → "Sign in with a password" and use
> the account above. That account sees the crew tools filled with sample data, and nothing you change is saved,
> so you can try every button: time clock, job board, parts, ledger (the camera button photographs a receipt), and
> under More: sprint, build-log posts and payroll. More → Your account → Delete my account deletes the account.
>
> Adopt a part takes no payment. The form sends the family a name and email, and they arrange the rest themselves. It is
> not a charity and the app never handles money.
>
> On iPhone, sign-in is by emailed code or password only (no third-party sign-in).

## After approval

- [ ] Keep the review account (Apple re-reviews every update). If a reviewer deleted it, recreate it before the next submission.
- [ ] Add more countries when you want them. The privacy page doesn't address GDPR yet, so update it before opening the EU or UK.
