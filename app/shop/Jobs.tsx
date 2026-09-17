"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SHOP_PHASES } from "@/lib/project";
import { fmtDate } from "./util";

type Priority = "now" | "soon" | "whenever";
const PRIORITIES: [Priority, string, string][] = [
  ["now", "Do now", "grab one of these first"],
  ["soon", "Soon", "next up once the board above is clear"],
  ["whenever", "Whenever", "good for a slow afternoon"],
];
const empty = { title: "", where: "", phase: "Other", priority: "now" as Priority, time: "", needs: "", steps: "" };
const lines = (s: string) => s.split("\n").map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim()).filter(Boolean);
const NEEDS_HINT = "POR-15 quart, black (top shelf, paint cabinet)\nChip brushes (drawer under the bench)\nNitrile gloves\nMarine Clean + Metal Prep, same shelf";
const STEPS_HINT = "Wire-wheel any loose scale\nMarine Clean, rinse, Metal Prep, let it dry all the way\nThin coat of POR-15, don't glob it\nSecond coat when the first is tacky, about 2 hrs\nPour leftovers out, never back in the can";

export function Jobs({ me }: { me: string }) {
  const jobs = useQuery(api.jobs.list);
  const crew = useQuery(api.crew.list);
  const save = useMutation(api.jobs.save);
  const claim = useMutation(api.jobs.claim);
  const release = useMutation(api.jobs.release);
  const finish = useMutation(api.jobs.finish);
  const reopen = useMutation(api.jobs.reopen);
  const setPriority = useMutation(api.jobs.setPriority);
  const remove = useMutation(api.jobs.remove);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Id<"jobs"> | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  if (!jobs || !crew) return <div className="shop-loading">Loading the board…</div>;

  type Job = (typeof jobs)[number];
  const byWho = Object.fromEntries(crew.map((c) => [c.short, c]));
  const name = (short?: string) => (short ? byWho[short]?.name ?? short : "");
  const rank: Record<Priority, number> = { now: 0, soon: 1, whenever: 2 };
  const live = jobs.filter((j) => j.status !== "done").sort((a, b) => rank[a.priority] - rank[b.priority] || a.createdAt - b.createdAt);
  const done = jobs.filter((j) => j.status === "done").sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
  const ready = live.filter((j) => j.status === "open");
  const claimed = live.filter((j) => j.status === "claimed");
  const weekAgo = Date.now() - 7 * 86400000;
  const doneWeek = done.filter((j) => (j.doneAt ?? 0) >= weekAgo);
  const isOpen = (j: Job) => open[j._id] ?? (j.priority === "now" || j.status === "claimed");
  const toggle = (j: Job, to?: boolean) => setOpen((o) => ({ ...o, [j._id]: to ?? !isOpen(j) }));

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await save({ id: editing ?? undefined, ...form });
    setForm(empty); setEditing(null);
  }
  function edit(j: Job) {
    setEditing(j._id);
    setForm({ title: j.title, where: j.where, phase: j.phase, priority: j.priority, time: j.time, needs: j.needs, steps: j.steps });
    document.getElementById("jform")?.scrollIntoView({ block: "nearest" });
  }
  async function markDone(j: Job) {
    const result = prompt(`Marking "${j.title}" done. Anything the next person should know? (optional)`, "");
    if (result === null) return;
    await finish({ id: j._id, result });
  }
  const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  return (
    <>
      <section className="stats">
        <div className="stat hot"><div className="lbl">Ready to grab</div><div className="val"><span className="num">{ready.length}</span></div><div className="foot">{ready.filter((j) => j.priority === "now").length} marked do now</div></div>
        <div className="stat"><div className="lbl">In progress</div><div className="val"><span className="num">{claimed.length}</span></div><div className="foot">{claimed.length ? claimed.map((j) => name(j.claimedBy)).filter((v, i, a) => a.indexOf(v) === i).join(", ") : "nobody's claimed one"}</div></div>
        <div className="stat"><div className="lbl">Done this week</div><div className="val"><span className="num">{doneWeek.length}</span></div><div className="foot">{done.length} done all told</div></div>
      </section>

      <section className="panel">
        <header><h2>Job Board</h2><span className="hint">walk in, pick one, tap &ldquo;I&rsquo;ve got this&rdquo; · everything you need is on the card</span></header>
        <div className="bd">
          {live.length === 0 && <div className="empty">The board is clear. Put the next job up below.</div>}
          {PRIORITIES.map(([p, label, blurb]) => {
            const js = live.filter((j) => j.priority === p);
            if (!js.length) return null;
            return (
              <div className="jobsec" key={p}>
                <div className="jh"><h3 className={p}>{label}</h3><span className="m">{blurb}</span></div>
                <div className="joblist">
                  {js.map((j) => {
                    const who = j.claimedBy ? byWho[j.claimedBy] : null;
                    const needs = lines(j.needs), steps = lines(j.steps);
                    const showing = isOpen(j);
                    const summary = [steps.length ? count(steps.length, "step") : "", needs.length ? `${count(needs.length, "thing")} to grab` : ""].filter(Boolean).join(" · ") || "show details";
                    return (
                      <article className={`job ${j.priority} ${j.status}`} key={j._id} style={who ? ({ "--pc": who.color } as React.CSSProperties) : undefined}>
                        <div className="jt" onClick={() => toggle(j)}>
                          <div>
                            <div className="title">{j.title}</div>
                            <div className="meta">{[j.where, j.phase !== "Other" ? j.phase : "", j.time].filter(Boolean).join(" · ")}</div>
                          </div>
                          {who ? <span className="onit">{who.short === me ? "You're on it" : `${who.name}'s on it`}</span> : <span className={`pill ${j.priority}`}>{j.priority === "now" ? "do now" : j.priority}</span>}
                        </div>
                        {showing ? (
                          <div className="jb">
                            {needs.length > 0 && <div className="sec"><div className="l">You&rsquo;ll need</div><ul>{needs.map((n, i) => <li key={i}>{n}</li>)}</ul></div>}
                            {steps.length > 0 && <div className="sec"><div className="l">How</div><ol>{steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div>}
                            {needs.length === 0 && steps.length === 0 && <div className="m">No notes yet. Tap the pencil to add what to grab and how to do it.</div>}
                          </div>
                        ) : (
                          <button className="more" onClick={() => toggle(j, true)}>{summary}</button>
                        )}
                        <div className="ja">
                          {j.status === "open" && <button className="btn primary" onClick={() => claim({ id: j._id })}>I&rsquo;ve got this</button>}
                          {j.status === "claimed" && <button className="btn primary" onClick={() => markDone(j)}>Done</button>}
                          {j.status === "claimed" && <button className="btn" onClick={() => release({ id: j._id })}>Put it back</button>}
                          {j.status === "open" && <button className="btn" onClick={() => markDone(j)}>Already done</button>}
                          <select className="prio" value={j.priority} title="Move it" onChange={(e) => setPriority({ id: j._id, priority: e.target.value as Priority })}>
                            <option value="now">Do now</option><option value="soon">Soon</option><option value="whenever">Whenever</option>
                          </select>
                          <button className="btn quiet" title="Edit" onClick={() => edit(j)}>✎</button>
                          <button className="btn quiet" title="Remove" onClick={() => { if (confirm("Take this job off the board?")) remove({ id: j._id }); }}>✕</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <form className="form" id="jform" onSubmit={submit}>
            <label className="f span2">Job<input required value={form.title} onChange={set("title")} placeholder="Paint truck area with POR-15" /></label>
            <label className="f">Where<input value={form.where} onChange={set("where")} placeholder="under the bed, driver side" /></label>
            <label className="f">Phase<select value={form.phase} onChange={set("phase")}>{SHOP_PHASES.map((p) => <option key={p}>{p}</option>)}</select></label>
            <label className="f">Priority<select value={form.priority} onChange={set("priority")}><option value="now">Do now</option><option value="soon">Soon</option><option value="whenever">Whenever</option></select></label>
            <label className="f">About how long<input value={form.time} onChange={set("time")} placeholder="2 hrs" /></label>
            <label className="f span3">You&rsquo;ll need <small>(one per line, say where it is)</small><textarea rows={4} value={form.needs} onChange={set("needs")} placeholder={NEEDS_HINT} /></label>
            <label className="f span3">How <small>(one step per line)</small><textarea rows={4} value={form.steps} onChange={set("steps")} placeholder={STEPS_HINT} /></label>
            <div className="row span3">
              <button className="btn primary" type="submit">{editing ? "Save job" : "Put it on the board"}</button>
              {editing && <button className="btn" type="button" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</button>}
            </div>
          </form>

          {done.length > 0 && (
            <details>
              <summary>Done ({done.length})</summary>
              <div className="donelist">
                {done.map((j) => (
                  <div className="dn" key={j._id} style={j.doneBy && byWho[j.doneBy] ? ({ "--pc": byWho[j.doneBy].color } as React.CSSProperties) : undefined}>
                    <i />
                    <div>
                      <div className="title">{j.title}{j.where && <span className="m"> · {j.where}</span>}</div>
                      <div className="m">{name(j.doneBy)}{j.doneAt ? `, ${fmtDate(j.doneAt)}` : ""}{j.result ? ` · ${j.result}` : ""}</div>
                    </div>
                    <div className="row"><button className="btn" onClick={() => reopen({ id: j._id })}>Reopen</button><button className="btn quiet" title="Remove" onClick={() => { if (confirm("Remove this job for good?")) remove({ id: j._id }); }}>✕</button></div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </section>
    </>
  );
}
