#!/usr/bin/env python3
"""Build the public Project Firebird site into docs/ (GitHub Pages).

    python build.py

Reads content/project.json and content/posts/*.md, copies photos/ and
site/style.css into docs/, and writes docs/index.html plus one page per post
with Open Graph tags so a shared link shows the photo card on Facebook.
"""
import html, json, re, shutil
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parent
OUT = ROOT / "docs"
PROJECT = json.loads((ROOT / "content" / "project.json").read_text(encoding="utf-8"))
SITE = PROJECT["site_url"].rstrip("/")
FONTS = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800'
         '&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&family=Barlow:wght@400;600;700&display=swap">')
E = html.escape


def parse_post(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not m:
        raise SystemExit(f"{path}: missing front matter")
    meta, body = {}, m.group(2).strip()
    key = None
    for line in m.group(1).splitlines():
        if re.match(r"^\s+-\s", line) and key:
            meta.setdefault(key, []).append(line.split("-", 1)[1].strip())
        elif ":" in line:
            key, _, val = line.partition(":")
            key, val = key.strip(), val.strip()
            meta[key] = val if val else []
    meta["slug"] = path.stem
    meta["body"] = body
    meta["date_obj"] = date.fromisoformat(meta["date"])
    meta["photos"] = meta.get("photos") or []
    return meta


def md_to_html(md: str) -> str:
    """Tiny Markdown: paragraphs, **bold**, *italic*, - lists, [text](url)."""
    def inline(s):
        s = E(s)
        s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
        s = re.sub(r"\*(.+?)\*", r"<em>\1</em>", s)
        s = re.sub(r"\[(.+?)\]\((.+?)\)", r'<a href="\2">\1</a>', s)
        return s
    out, para, items = [], [], []
    def flush():
        nonlocal para, items
        if para: out.append("<p>" + inline(" ".join(para)) + "</p>"); para = []
        if items: out.append("<ul>" + "".join(f"<li>{inline(i)}</li>" for i in items) + "</ul>"); items = []
    for line in md.splitlines():
        if line.startswith("- "):
            if para: out.append("<p>" + inline(" ".join(para)) + "</p>"); para = []
            items.append(line[2:])
        elif line.strip() == "":
            flush()
        else:
            if items: flush()
            para.append(line.strip())
    flush()
    return "\n".join(out)


def nice_date(d: date) -> str:
    return f"{d.strftime('%B')} {d.day}, {d.year}"


def page(title, desc, body, og_image, url, rel="", extra_head=""):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="{E(PROJECT['title'])}">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:image" content="{SITE}/{og_image}">
<meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23B5432A'/%3E%3Ctext x='16' y='23' text-anchor='middle' font-family='Impact,sans-serif' font-size='20' fill='%23F7F6F2'%3EFB%3C/text%3E%3C/svg%3E">
{FONTS}
<link rel="stylesheet" href="{rel}style.css">
{extra_head}
</head>
<body>
{body}
</body>
</html>
"""


def nav(rel=""):
    return f"""<nav class="nav wrap">
  <a class="brand" href="{rel}index.html">Project <b>Firebird</b></a>
  <span class="sp"></span>
  <a href="{rel}index.html#story">The story</a>
  <a href="{rel}index.html#progress">Progress</a>
  <a href="{rel}index.html#log">Build log</a>
</nav>"""


def countdown_html(rel=""):
    ms = {m["id"]: m for m in PROJECT["milestones"]}
    r, b = ms["rolling"], ms["birthday"]
    return f"""<div class="count">
  <div class="c"><div class="n num" data-count="{r['date']}">–</div><div class="t">days to a rolling chassis</div><div class="d">Target {nice_date(date.fromisoformat(r['date']))}</div></div>
  <div class="c gold"><div class="n num" data-count="{b['date']}">–</div><div class="t">days until Joe drives it</div><div class="d">{nice_date(date.fromisoformat(b['date']))} · his birthday</div></div>
</div>"""


COUNT_JS = """<script>
(function(){
  var today=new Date(); today.setHours(0,0,0,0);
  document.querySelectorAll('[data-count]').forEach(function(el){
    var p=el.dataset.count.split('-'); var t=new Date(+p[0],+p[1]-1,+p[2]);
    var d=Math.ceil((t-today)/86400000);
    el.textContent = d>0 ? d : (d===0 ? 'Today' : 'Done');
  });
  var sb=document.getElementById('sharebtn');
  if(sb){ sb.addEventListener('click',function(){ navigator.clipboard&&navigator.clipboard.writeText(location.href).then(function(){ sb.textContent='Link copied'; setTimeout(function(){sb.textContent='Copy link';},1500); }); }); }
})();
</script>"""


def share_html(url, text):
    fb = f"https://www.facebook.com/sharer/sharer.php?u={html.escape(url)}"
    return f"""<div class="share">
  <span class="label">Share this</span>
  <a href="{fb}" target="_blank" rel="noopener">Facebook</a>
  <button type="button" id="sharebtn">Copy link</button>
</div>"""


def build_index(posts):
    ph_html = "".join(
        f"""<div class="ph {p['status']}">
  <div class="pip">{'✓' if p['status']=='done' else i+1}</div>
  <div class="n">{E(p['name'])}</div>
  <div class="b">{E(p['blurb'])}</div>
  <div class="bar"><i style="width:{p['pct']}%"></i></div>
</div>""" for i, p in enumerate(PROJECT["phases"]))

    people = "".join(
        f"""<div class="person"><div class="pics">{''.join(f'<img src="{ph}" alt="">' for ph in pp.get('photos', [pp.get('photo')]))}</div><div><div class="rl">{E(pp['role'])}</div><div class="nm">{E(pp['name'])}</div><div class="bl">{E(pp['blurb'])}</div></div></div>"""
        for pp in PROJECT["people"])

    phase_names = {p["id"]: p["name"] for p in PROJECT["phases"]}
    post_cards = "".join(
        f"""<article class="post">
  <div class="img"><a href="posts/{p['slug']}.html"><img src="{p['photos'][0] if p['photos'] else PROJECT['hero_photo']}" alt=""></a></div>
  <div class="tx">
    <div class="meta"><span class="tag">{E(phase_names.get(p.get('phase',''), 'Update'))}</span><span class="label">{nice_date(p['date_obj'])}</span></div>
    <h3><a href="posts/{p['slug']}.html">{E(p['title'])}</a></h3>
    <p>{E(p.get('summary',''))}</p>
    <a class="more" href="posts/{p['slug']}.html">Read the update →</a>
  </div>
</article>""" for p in posts) or '<p class="empty">First update coming soon.</p>'

    thanks = "".join(f"<span>{E(t)}</span>" for t in PROJECT.get("thanks", []))
    thanks_sec = f"""<section id="thanks"><div class="wrap"><div class="sec-h"><h2>Wall of thanks</h2></div><div class="thanks">{thanks}</div></div></section>""" if thanks else ""

    body = f"""{nav()}
<div class="wrap">
  <div class="hero">
    <img src="{PROJECT['hero_photo']}" alt="The Firebird shell on its dolly in the shop">
    <div class="in">
      <div class="label">A birthday build · Kansas City</div>
      <h1>Joe's <span>Firebird</span></h1>
      <p>{E(PROJECT['tagline'])} Jennifer Jo Cobb's first car is going back together so her dad Joe can drive it on his birthday. Follow along.</p>
    </div>
  </div>
</div>
{countdown_html()}

<section id="story"><div class="wrap">
  <div class="sec-h"><h2>Why this car</h2><span class="label">The story</span></div>
  <div class="story">
    <div>
      <p>Before it was a project car, this Pontiac was Jennifer Jo Cobb's first car. Long before the race trucks and the team with her name on the wall, this was the one in her driveway.</p>
      <p>A few years ago it came apart down to the shell. Every panel off, every bracket bagged and tagged, the body sanded and shot in primer. Then it waited, the way project cars do.</p>
      <p>Now Jennifer wants to hand her dad the keys. Joe Cobb has spent a lifetime around race cars, and on February 14, 2027, his birthday, he gets this one. Jennifer, Steve, and Nick are working it in phases, on the clock, and posting everything here as it happens. First goal: a rolling chassis in two weeks. Last goal: Joe behind the wheel.</p>
    </div>
    <div class="people">{people}</div>
  </div>
</div></section>

<section id="progress"><div class="wrap">
  <div class="sec-h"><h2>Where it stands</h2><span class="label">Updated {nice_date(date.today())}</span></div>
  <div class="phases">{ph_html}</div>
</div></section>

<section id="log"><div class="wrap">
  <div class="sec-h"><h2>Build log</h2><span class="label">{len(posts)} update{'s' if len(posts)!=1 else ''}</span></div>
  <div class="posts">{post_cards}</div>
</div></section>
{thanks_sec}
<div class="wrap">{share_html(SITE + '/', PROJECT['title'])}</div>
<footer class="wrap"><span>{E(PROJECT['title'])}</span><span class="sp"></span><span>Built in the shop by Jennifer, Steve &amp; Nick</span></footer>
{COUNT_JS}"""
    return page(PROJECT["title"], PROJECT["tagline"], body, PROJECT["hero_photo"], SITE + "/")


def build_post(p, posts):
    phase_names = {ph["id"]: ph["name"] for ph in PROJECT["phases"]}
    url = f"{SITE}/posts/{p['slug']}.html"
    photos = p["photos"]
    if len(photos) == 1:
        gal = f'<figure><img src="../{photos[0]}" alt=""></figure>'
    elif photos:
        gal = '<div class="gallery">' + "".join(
            f'<img src="../{ph}" alt="" class="{"wide" if i == 0 else ""}">' for i, ph in enumerate(photos)) + "</div>"
    else:
        gal = ""
    idx = posts.index(p)
    newer = posts[idx - 1] if idx > 0 else None
    older = posts[idx + 1] if idx + 1 < len(posts) else None
    links = " · ".join(filter(None, [
        f'<a class="backlink" href="{older["slug"]}.html">← {E(older["title"])}</a>' if older else None,
        f'<a class="backlink" href="{newer["slug"]}.html">{E(newer["title"])} →</a>' if newer else None]))
    body = f"""{nav('../')}
<div class="wrap article">
  <header>
    <a class="backlink" href="../index.html#log">← Build log</a>
    <div class="meta" style="display:flex;gap:12px;align-items:center"><span class="tag">{E(phase_names.get(p.get('phase',''), 'Update'))}</span><span class="label">{nice_date(p['date_obj'])}</span></div>
    <h1>{E(p['title'])}</h1>
  </header>
  {gal}
  <div class="body">{md_to_html(p['body'])}</div>
  {share_html(url, p['title'])}
  <p style="margin-top:24px;font-family:var(--sans);font-size:14px">{links}</p>
</div>
<footer class="wrap"><span>{E(PROJECT['title'])}</span><span class="sp"></span><span>Built in the shop by Jennifer, Steve &amp; Nick</span></footer>
{COUNT_JS}"""
    og = photos[0] if photos else PROJECT["hero_photo"]
    return page(f"{p['title']} · {PROJECT['title']}", p.get("summary", ""), body, og, url, rel="../")


def main():
    posts = sorted((parse_post(f) for f in (ROOT / "content" / "posts").glob("*.md")),
                   key=lambda p: (p["date_obj"], p["slug"]), reverse=True)
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "posts").mkdir(parents=True)
    shutil.copytree(ROOT / "photos", OUT / "photos")
    shutil.copy(ROOT / "site" / "style.css", OUT / "style.css")
    (OUT / ".nojekyll").write_text("")
    (OUT / "CNAME").write_text(SITE.replace("https://", "") + "\n")
    (OUT / "index.html").write_text(build_index(posts), encoding="utf-8")
    for p in posts:
        (OUT / "posts" / f"{p['slug']}.html").write_text(build_post(p, posts), encoding="utf-8")
    print(f"built docs/ with {len(posts)} post(s)")


if __name__ == "__main__":
    main()
