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
            <div className="label">An 80th birthday build</div>
            <h1>Joe&rsquo;s <span>Trans Am</span></h1>
            <p>{PROJECT.tagline} The Trans Am Joe Cobb bought for his wife Connie became their daughter Jennifer&rsquo;s first car. Now it&rsquo;s going back together so Joe can drive it on his 80th birthday. Follow along.</p>
          </div>
        </div>
      </div>
      <Countdown />

      <section id="story"><div className="wrap">
        <div className="sec-h"><h2>Why this car</h2><span className="label">The story</span></div>
        <div className="story">
          <div>
            <p>Joe Cobb bought this Trans Am for his wife, Connie, from a retired Kansas City, Kansas police detective. Every morning he&rsquo;d drop Connie at the assembly plant, and the second she was through the doors, six-year-old Jennifer climbed onto his lap and drove herself to elementary school. Joe&rsquo;s hands were right there on the wheel with hers. Mostly.</p>
            <p>By the time her sixteenth birthday came around the transmission had let go and the car sat behind the house. But a set of brand-new gold-on-chrome Cragar wheels had been waiting in a closet all those years, and Jennifer asked for the TA. For a working family led by a mechanic, that was a do-able request, and Joe and Connie were a little relieved she hadn&rsquo;t asked for something new. The deal: they would get it running, and she&rsquo;d buy the tires. So she got a job at Western Auto and, with her employee discount, bought one tire with each of her first four paychecks.</p>
            <p>She couldn&rsquo;t help showing it off. Friday nights at the local hot spot, and her first competition in anything with four wheels, the High School Drags at KCI Dragstrip. She and her dad kept brainstorming ways to make it faster, and the big block they dropped in, with the A/C compressor pulled in the name of speed, was eventually too much car for the drive to the University of Kansas. She bought something economical, and the Trans Am went back behind the Cobb house for decades.</p>
            <p>That&rsquo;s where Crew Chief Steve came in. As Jennifer&rsquo;s NASCAR career took off she couldn&rsquo;t stop talking about that car, so Steve said: let&rsquo;s bring it back to North Carolina. It rode east on the JJCR hauler, with Joe feeling very mixed about his daughter&rsquo;s car going so far from home. Every year on Jennifer&rsquo;s birthday the team put a little time into it. Every panel came off, every bracket got bagged and tagged, and the body went into primer. Then it waited, the way project cars do.</p>
            <p>Now the waiting is over. Joe turns 80 on February 14, 2027, and Jennifer wants to hand him the keys. Jennifer, Steve, and Nick are working it in phases, on the clock, and posting everything here as it happens. First goal: a rolling chassis in two weeks. Last goal: Joe behind the wheel of the car he bought for Connie.</p>
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
