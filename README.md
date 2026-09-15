# Project Firebird

Putting a Pontiac Firebird back together so Joe Cobb can drive it on his birthday, February 14, 2027.
It was Jennifer Jo Cobb's first car. Crew: Jennifer, Steve, and Nick.

- **Public site:** https://firebird.crewchiefsteve.com (story, progress, build log)
- **Shop board:** https://firebird.crewchiefsteve.com/shop (crew sign-in; time clock, sprint, parts, post editor, payroll)

## Stack

| Piece | What |
|---|---|
| App | Next.js 15 (App Router), deployed on Vercel project `firebird` (team crewchiefsteveAI) |
| Auth | Clerk app "Firebird". Only emails in the Convex `crew` table get past `/shop`. |
| Data | Convex project `firebird`. Prod: capable-shepherd-203. Dev: diligent-mongoose-297. |
| Photos | New uploads go to Convex file storage. The original photos live in `public/photos/`. |

## Running it

```
npm install
npx convex dev        # pushes convex/ to the dev deployment, keeps types fresh
npm run dev           # http://localhost:3000
```

`.env.local` holds the Convex URL and Clerk keys. It is git-ignored. Vercel has the same values as environment variables.

## Deploying

```
npx convex deploy -y                  # backend to production
vercel deploy --prod --yes            # app to production
```

## Who can do what

`crew` rows (seeded by `convex/seed.ts`):

| Person | Clocks in | Marks hours paid |
|---|---|---|
| Steve | yes | no |
| Nick | yes | no |
| Jennifer | no | yes |

Anyone on the crew can punch anyone who clocks in, add hours by hand, edit tasks, parts, and posts, and move the public progress bars.

## Layout

```
app/                Next.js pages: / (public), /log/[slug], /shop, /sign-in
app/shop/           shop board tabs (Clock, Board, Parts, Posts, Payroll)
convex/             schema, functions, seed
lib/project.ts      story copy, people, gallery, milestones (edit here)
public/photos/      original web-sized photos
content/, docs/, build.py, site/   the old static site, kept until the domain flips to Vercel
```
