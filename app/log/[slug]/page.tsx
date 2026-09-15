import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { PROJECT, niceDate } from "@/lib/project";
import { mdToHtml } from "@/lib/md";
import { Nav, Footer } from "../../Nav";
import { Share } from "../../Share";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchQuery(api.posts.bySlug, { slug });
  if (!post) return { title: PROJECT.title };
  const url = `${PROJECT.siteUrl}/log/${post.slug}`;
  const image = post.photos[0]?.url ?? PROJECT.siteUrl + PROJECT.heroPhoto;
  return {
    title: `${post.title} · ${PROJECT.title}`,
    description: post.summary,
    openGraph: { type: "article", siteName: PROJECT.title, title: post.title, description: post.summary, url, images: [{ url: image }] },
    twitter: { card: "summary_large_image", title: post.title, description: post.summary, images: [image] },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const [post, phases, all] = await Promise.all([
    fetchQuery(api.posts.bySlug, { slug }),
    fetchQuery(api.phases.list),
    fetchQuery(api.posts.published),
  ]);
  if (!post) notFound();
  const phaseName = Object.fromEntries(phases.map((p) => [p.key, p.name]));
  const idx = all.findIndex((p) => p.slug === slug);
  const newer = idx > 0 ? all[idx - 1] : null;
  const older = idx >= 0 && idx + 1 < all.length ? all[idx + 1] : null;
  const url = `${PROJECT.siteUrl}/log/${post.slug}`;

  return (
    <>
      <Nav />
      <div className="wrap article">
        <header>
          <Link className="backlink" href="/#log">← Build log</Link>
          <div className="meta" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span className="tag">{phaseName[post.phase] ?? "Update"}</span>
            <span className="label">{niceDate(post.date)}</span>
          </div>
          <h1>{post.title}</h1>
        </header>
        {post.photos.length === 1 && (
          <figure><img src={post.photos[0].url} alt={post.photos[0].caption} />{post.photos[0].caption && <figcaption>{post.photos[0].caption}</figcaption>}</figure>
        )}
        {post.photos.length > 1 && (
          <div className="gallery">
            {post.photos.map((ph, i) => <img key={ph.url} src={ph.url} alt={ph.caption} className={i === 0 ? "wide" : ""} title={ph.caption} />)}
          </div>
        )}
        <div className="body" dangerouslySetInnerHTML={{ __html: mdToHtml(post.body) }} />
        <Share url={url} />
        <p style={{ marginTop: 24, fontFamily: "var(--sans)", fontSize: 14, display: "flex", gap: 16, flexWrap: "wrap" }}>
          {older && <Link className="backlink" href={`/log/${older.slug}`}>← {older.title}</Link>}
          {newer && <Link className="backlink" href={`/log/${newer.slug}`}>{newer.title} →</Link>}
        </p>
      </div>
      <Footer />
    </>
  );
}
