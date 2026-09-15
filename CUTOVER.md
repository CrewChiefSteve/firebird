# Cutover checklist: GitHub Pages → Vercel, Clerk dev → production

Everything below is already built. These are the only steps left, in order.
Steps marked **(Steve)** need your logins. The rest is one command each.

## 1. DNS records in Route 53, zone crewchiefsteve.com **(Steve)**

| Purpose | Name | Type | Value |
|---|---|---|---|
| The site moves to Vercel | `firebird` | A | `76.76.21.21` (delete the existing CNAME to crewchiefsteve.github.io first) |
| Clerk frontend API | `clerk` | CNAME | `frontend-api.clerk.services` |
| Clerk account portal | `accounts` | CNAME | `accounts.clerk.services` |
| Clerk email | `clkmail` | CNAME | `mail.ql5kiugdim9t.clerk.services` |
| Clerk email DKIM 1 | `clk._domainkey` | CNAME | `dkim1.ql5kiugdim9t.clerk.services` |
| Clerk email DKIM 2 | `clk2._domainkey` | CNAME | `dkim2.ql5kiugdim9t.clerk.services` |

Clerk normalizes the production domain to the root, so its records sit on
crewchiefsteve.com, not on the firebird subdomain. That's by design and it
works for every subdomain. Only one Clerk production instance can own a
root domain, and none currently does.

After the records are in, Clerk verifies them from
dashboard.clerk.com → Firebird → Production → Configure → Domains.
Vercel verifies the A record on its own and issues the certificate.

## 2. Production Clerk secret key into Vercel **(Steve)**

Clerk → Firebird → **Production** instance → Configure → API keys → reveal
the secret key (`sk_live_…`), then from `C:\firebird`:

```bash
printf '%s' 'sk_live_PASTE_HERE' | vercel env rm CLERK_SECRET_KEY production --yes --scope crewchiefsteveai-projects; printf '%s' 'sk_live_PASTE_HERE' | vercel env add CLERK_SECRET_KEY production --scope crewchiefsteveai-projects
```

## 3. Switch the app to the production Clerk instance (Claude or Steve)

Run once the DNS records from step 1 resolve:

```bash
cd /c/firebird && vercel env rm NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production --yes --scope crewchiefsteveai-projects; printf '%s' 'pk_live_Y2xlcmsuY3Jld2NoaWVmc3RldmUuY29tJA' | vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production --scope crewchiefsteveai-projects && npx convex env set --prod CLERK_JWT_ISSUER_DOMAIN https://clerk.crewchiefsteve.com && vercel deploy --prod --yes --scope crewchiefsteveai-projects
```

The production instance already has the `convex` JWT template. Its issuer
is https://clerk.crewchiefsteve.com.

## 4. Google sign-in on production (optional) **(Steve)**

Clerk production instances need your own Google OAuth client. Email codes
work without it. If you want the Google button: Google Cloud Console →
Credentials → OAuth client (Web) with redirect URI
`https://clerk.crewchiefsteve.com/v1/oauth_callback`, then paste the client
ID and secret into Clerk → Production → Configure → SSO connections → Google.

## 5. Retire the old pieces

- The GitHub Pages site was removed from the repo and Pages turned off on
  September 15, 2026, once the A record was live.
- The old Claude artifact shop board is superseded. Delete it from
  claude.ai/code/artifacts or with `/artifacts` in the terminal.

## Already done

- Convex production deployment `capable-shepherd-203` with data migrated.
- Clerk app "Firebird": development instance (live now on the vercel.app
  URL) and production instance `ins_3JLRyRq3RFtFmSooxCyTrQHLRtr` with the
  Convex JWT template.
- Vercel project `firebird` with the custom domain attached and all env vars.
- GitHub Actions deploys Convex and Vercel on every push to `main`
  (secrets: `CONVEX_DEPLOY_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
  `VERCEL_PROJECT_ID`).
