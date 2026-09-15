"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/** Offers from the public Adopt-a-part page. Confirm puts the sponsor's name on the part. */
export function Pledges() {
  const pledges = useQuery(api.pledges.list);
  const decide = useMutation(api.pledges.decide);
  const [showOld, setShowOld] = useState(false);
  if (!pledges) return null;
  const fresh = pledges.filter((p) => p.status === "new");
  const old = pledges.filter((p) => p.status !== "new");
  if (pledges.length === 0) return null;
  const when = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const creditText = (p: (typeof pledges)[number]) => p.credit === "anon" ? "anonymous" : p.credit === "company" ? `as ${p.company}` : `as ${p.name}`;

  return (
    <section className="panel">
      <header><h2>Part pledges</h2><span className="hint">{fresh.length === 0 ? "nothing waiting" : `${fresh.length} waiting on Jennifer`}</span></header>
      <div className="bd">
        {fresh.length === 0 && <div className="empty">No new pledges.</div>}
        {fresh.map((p) => (
          <div className="pledge-row" key={p._id}>
            <div>
              <div className="who">{p.name}{p.company ? `, ${p.company}` : ""} <span className="m">· {when(p.createdAt)}</span></div>
              <div><b>{p.partName}</b> · {p.how === "ship" ? "will buy it and ship it to the shop" : "wants to cover the cost"} · credit {creditText(p)}</div>
              <div className="m"><a href={`mailto:${p.email}?subject=${encodeURIComponent("Joe's Trans Am: " + p.partName)}`}>{p.email}</a></div>
              {p.message && <blockquote>{p.message}</blockquote>}
            </div>
            <div className="row">
              <button className="btn primary" onClick={() => decide({ id: p._id, action: "confirm" })}>Confirm</button>
              <button className="btn quiet" onClick={() => { if (confirm(`Decline ${p.name}'s pledge for ${p.partName}?`)) decide({ id: p._id, action: "decline" }); }}>Decline</button>
            </div>
          </div>
        ))}
        {old.length > 0 && (
          <>
            <button className="linkbtn" style={{ marginTop: 10 }} onClick={() => setShowOld((s) => !s)}>{showOld ? "Hide" : "Show"} {old.length} decided</button>
            {showOld && old.map((p) => (
              <div className="pledge-row" key={p._id}>
                <div>
                  <div className="who">{p.name}{p.company ? `, ${p.company}` : ""} <span className="m">· {p.partName} · {p.status}{p.decidedAt ? ` ${when(p.decidedAt)}` : ""}</span></div>
                  <div className="m">{p.email}</div>
                </div>
                {p.status === "confirmed" && <button className="btn quiet" onClick={() => { if (confirm("Take the sponsor off this part?")) decide({ id: p._id, action: "decline" }); }}>Undo</button>}
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
