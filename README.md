# Project Firebird

Putting a Pontiac Firebird back together so Joe Cobb can drive it on his birthday, February 14, 2027.
Crew: Steve and Nick.

**Public build log:** https://crewchiefsteve.github.io/firebird
**Private shop board** (time clock, sprint tasks, parts list): https://claude.ai/artifact/49VWa7BYG1Kg4Gy2aruRJw

## Layout

```
content/project.json      phases, milestones, people, wall of thanks
content/posts/*.md        one Markdown file per build-log post
photos/<date>/*.jpg       web-sized photos (1600px wide is plenty)
photos/people/*.jpg       portraits used on the story page
site/style.css            the public site's stylesheet
build.py                  generates docs/ from the above
docs/                     generated site, served by GitHub Pages
```

## Posting an update

1. Drop photos into `photos/YYYY-MM-DD/`. Phone HEIC files convert with:

   ```
   ffmpeg -i IMG.heic -filter_complex "[0:v]scale=1600:-1[o]" -map "[o]" -q:v 4 photos/2026-09-15/floor-cut.jpg
   ```

2. Write `content/posts/YYYY-MM-DD-slug.md`:

   ```
   ---
   title: Floors are out
   date: 2026-09-15
   phase: rust
   photos:
     - photos/2026-09-15/floor-cut.jpg
   summary: One sentence that shows under the headline and on Facebook.
   ---

   Body text in simple Markdown. **Bold**, *italic*, and - bullet lists work.
   ```

3. Update `pct` and `status` for the phase in `content/project.json` (`done`, `active`, `up-next`, `later`).
4. Build, commit, push:

   ```
   python build.py
   git add -A && git commit -m "Post: floors are out" && git push
   ```

The post page carries Open Graph tags, so pasting its link into Facebook shows the first photo as a big card.

## Private data

Hours, parts, and costs live only in the shop board artifact, never in this repo.
