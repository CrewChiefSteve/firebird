import Link from "next/link";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { PROJECT, niceDate } from "@/lib/project";
import { Nav, Footer } from "./Nav";
import { Countdown } from "./Countdown";
import { Share } from "./Share";

export const revalidate = 60;

export default async function Home() {
  const [phases, posts] = await Promise.all([fetchQuery(api.phases.list), fetchQuery(api.posts.published)]);
  const phaseName = Object.fromEntries(phases.map((p) => [p.key, p.name]));
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <>
      <Nav />
      <div className="wrap">
        <div className="hero">
          <img src={PROJECT.heroPhoto} alt="The Trans Am shell on its dolly in the shop" />
          <div className="in">
            <div className="label">A birthday build · Kansas City</div>
            <h1>Joe&rsquo;s <span>Trans Am</span></h1>
            <p>{PROJECT.tagline} Jennifer Jo Cobb&rsquo;s first car is going back together so her dad Joe can drive it on his birthday. Follow along.</p>
          </div>
        </div>
      </div>
      <Countdown />

      <section id="story"><div className="wrap">
        <div className="sec-h"><h2>Why this car</h2><span className="label">The story</span></div>
        <div className="story">
          <div>
            <p>Before it was a project car, this Trans Am was Jennifer Jo Cobb&rsquo;s first car. Long before the race trucks and the team with her name on the wall, this was the one in her driveway.</p>
            <p>A few years ago it came apart down to the shell. Every panel off, every bracket bagged and tagged, the body sanded and shot in primer. Then it waited, the way project cars do.</p>
            <p>Now Jennifer wants to hand her dad the keys. Joe Cobb has spent a lifetime around race cars, and on February 14, 2027, his birthday, he gets this one. Jennifer, Steve, and Nick are working it in phases, on the clock, and posting everything here as it happens. First goal: a rolling chassis in two weeks. Last goal: Joe behind the wheel.</p>
          </div>
          <div className="people">
            {PROJECT.people.map((pp) => (
              <div className="person" key={pp.name}>
                <div className="pics">{pp.photos.map((ph) => <img src={ph} alt="" key={ph} />)}</div>
                <div>
                  <div className="rl">{pp.role}</div>
                  <div className="nm">{pp.name}</div>
                  <div className="bl">{pp.blurb}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {PROJECT.gallery.length > 0 && (
          <div className="family">
            <div className="label">The racing family</div>
            <div className="strip">
              {PROJECT.gallery.map((g) => (
                <figure key={g.photo}><img src={g.photo} alt={g.caption} /><figcaption>{g.caption}</figcaption></figure>
              ))}
            </div>
          </div>
        )}
      </div></section>

      <section id="progress"><div className="wrap">
        <div className="sec-h"><h2>Where it stands</h2><span className="label">Updated {today}</span></div>
        <div className="phases">
          {phases.map((p, i) => (
            <div className={`ph ${p.status}`} key={p.key}>
              <div className="pip">{p.status === "done" ? "✓" : i + 1}</div>
              <div className="n">{p.name}</div>
              <div className="b">{p.blurb}</div>
              <div className="bar"><i style={{ width: `${p.pct}%` }} /></div>
            </div>
          ))}
        </div>
      </div></section>

      <section id="log"><div className="wrap">
        <div className="sec-h"><h2>Build log</h2><span className="label">{posts.length} update{posts.length === 1 ? "" : "s"}</span></div>
        <div className="posts">
          {posts.length === 0 && <p className="empty">First update coming soon.</p>}
          {posts.map((p) => (
            <article className="post" key={p._id}>
              <div className="img"><Link href={`/log/${p.slug}`}><img src={p.photos[0]?.url ?? PROJECT.heroPhoto} alt="" /></Link></div>
              <div className="tx">
                <div className="meta"><span className="tag">{phaseName[p.phase] ?? "Update"}</span><span className="label">{niceDate(p.date)}</span></div>
                <h3><Link href={`/log/${p.slug}`}>{p.title}</Link></h3>
                <p>{p.summary}</p>
                <Link className="more" href={`/log/${p.slug}`}>Read the update →</Link>
              </div>
            </article>
          ))}
        </div>
      </div></section>

      {PROJECT.thanks.length > 0 && (
        <section id="thanks"><div className="wrap">
          <div className="sec-h"><h2>Wall of thanks</h2></div>
          <div className="thanks">{PROJECT.thanks.map((t) => <span key={t}>{t}</span>)}</div>
        </div></section>
      )}
      <div className="wrap"><Share url={PROJECT.siteUrl + "/"} /></div>
      <Footer />
    </>
  );
}
