import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { PROJECT, SHOP_PHASES } from "@/lib/project";
import { Nav, Footer } from "../Nav";
import { Share } from "../Share";
import { Adopt } from "./Adopt";

export const revalidate = 60;

function openCount(parts: { sponsor: string | null; pending: boolean; status: string }[]) {
  return parts.filter((p) => !p.sponsor && !p.pending && (p.status === "need" || p.status === "hot")).length;
}

export async function generateMetadata(): Promise<Metadata> {
  const parts = await fetchQuery(api.parts.publicList);
  const n = openCount(parts);
  const title = `Adopt a part · ${PROJECT.title}`;
  const description = n > 0 ? `${n} part${n === 1 ? "" : "s"} on Joe's Trans Am still need${n === 1 ? "s" : ""} a sponsor. Real parts, real prices, your name on the car.` : "Every listed part on Joe's Trans Am has a sponsor. Thank you.";
  const image = PROJECT.siteUrl + PROJECT.heroPhoto;
  return {
    title, description,
    openGraph: { type: "website", siteName: PROJECT.title, title, description, url: PROJECT.siteUrl + "/parts", images: [{ url: image, width: 1600, height: 1200 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function PartsPage() {
  const parts = await fetchQuery(api.parts.publicList);
  const n = openCount(parts);
  const order = (ph: string) => { const i = SHOP_PHASES.indexOf(ph); return i < 0 ? 99 : i; };
  const groups = Array.from(new Set(parts.map((p) => p.phase))).sort((a, b) => order(a) - order(b)).map((ph) => ({ phase: ph, parts: parts.filter((p) => p.phase === ph).sort((a, b) => a.cost * a.qty - b.cost * b.qty) }));

  return (
    <>
      <Nav />
      <div className="wrap article" style={{ maxWidth: 820 }}>
        <header>
          <div className="label">Adopt a part</div>
          <h1>{n > 0 ? <>{n} part{n === 1 ? "" : "s"} <span style={{ color: "var(--gold)" }}>still need{n === 1 ? "s" : ""} a home</span></> : <>Every part <span style={{ color: "var(--gold)" }}>has a home</span></>}</h1>
        </header>
        <div className="adopt-intro">
          <p>Joe Cobb turns 80 on February 14, 2027, and his daughter Jennifer wants him driving the Trans Am he bought for her mom. Jennifer, Steve, and Nick are doing the work. The parts below are what it takes to get the car back on its wheels.</p>
          <p>If you&rsquo;d like to be part of it, pick a part. Cover the cost, or order it yourself and ship it to the shop. When it goes on the car, your name goes on the build log next to it, or you can stay anonymous. Nothing is paid on this page. Jennifer will get in touch to sort out the details.</p>
        </div>
        <Adopt groups={groups} />
        <p className="fine" style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--muted)", marginTop: 24 }}>
          This is a family project, not a charity, so a sponsored part isn&rsquo;t a tax deduction. It is a very good excuse to come see the car.
        </p>
        <Share url={PROJECT.siteUrl + "/parts"} />
      </div>
      <Footer />
    </>
  );
}
