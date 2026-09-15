"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SHOP_PHASES } from "@/lib/project";
import { fmtClock, fmtDate, fmtH, todayIso } from "./util";

export function Clock() {
  const board = useQuery(api.clock.board);
  const punchIn = useMutation(api.clock.punchIn);
  const punchOut = useMutation(api.clock.punchOut);
  const addManual = useMutation(api.clock.addManual);
  const remove = useMutation(api.clock.remove);
  const [phase, setPhase] = useState(SHOP_PHASES[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 15000); return () => clearInterval(t); }, []);

  const [mWho, setMWho] = useState("steve");
  const [mDate, setMDate] = useState(todayIso());
  const [mHrs, setMHrs] = useState("");
  const [mPhase, setMPhase] = useState(SHOP_PHASES[0]);
  const [mNote, setMNote] = useState("");

  if (!board) return <div className="shop-loading">Loading the clock…</div>;
  const { crew, active, sessions } = board;
  const clockers = crew.filter((c) => c.canClock);
  const byWho = Object.fromEntries(crew.map((c) => [c.short, c]));
  const total = sessions.reduce((a, s) => a + s.minutes, 0);
  const weekAgo = Date.now() - 7 * 86400000;
  const week = sessions.filter((s) => s.start >= weekAgo).reduce((a, s) => a + s.minutes, 0);
  const unpaid = sessions.filter((s) => !s.paid).reduce((a, s) => a + s.minutes, 0);
  const perPerson = clockers.map((c) => ({ ...c, minutes: sessions.filter((s) => s.who === c.short).reduce((a, s) => a + s.minutes, 0) }));
  const byPhase: Record<string, number> = {};
  for (const s of sessions) byPhase[s.phase] = (byPhase[s.phase] ?? 0) + s.minutes;

  async function punch(who: string) {
    setBusy(who);
    try {
      if (active.some((a) => a.who === who)) await punchOut({ who });
      else await punchIn({ who, phase, note: note.trim() });
    } finally { setBusy(null); }
  }
  async function submitManual() {
    const hours = parseFloat(mHrs);
    if (!(hours > 0)) return;
    const whos = mWho === "both" ? clockers.map((c) => c.short) : [mWho];
    for (const who of whos) await addManual({ who, date: mDate, hours, phase: mPhase, note: mNote.trim() });
    setMHrs(""); setMNote("");
  }

  return (
    <>
      <section className="stats">
        <div className="stat hot"><div className="lbl">Hours on the car</div><div className="val"><span className="num">{fmtH(total)}</span><small>hrs</small></div><div className="foot">last 7 days: {fmtH(week)} hrs</div></div>
        <div className="stat"><div className="lbl">Unpaid hours</div><div className="val"><span className="num">{fmtH(unpaid)}</span><small>hrs</small></div><div className="foot">Jennifer marks these paid</div></div>
        {perPerson.map((p) => (
          <div className="stat" key={p.short} style={{ ["--pc" as string]: p.color }}>
            <div className="lbl">{p.name}</div>
            <div className="val"><span className="num">{fmtH(p.minutes)}</span><small>hrs</small></div>
            <div className="foot">{active.some((a) => a.who === p.short) ? "on the clock now" : "off the clock"}</div>
          </div>
        ))}
      </section>

      <section className="panel">
        <header><h2>Time Clock</h2><span className="hint">pick what you&rsquo;re working on, then punch</span></header>
        <div className="bd">
          <div className="row">
            <label className="f">Working on
              <select value={phase} onChange={(e) => setPhase(e.target.value)}>{SHOP_PHASES.map((p) => <option key={p}>{p}</option>)}</select>
            </label>
            <label className="f">Note (optional)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. driver floor pan" /></label>
          </div>
          <div className="clock-grid">
            {clockers.map((c) => {
              const a = active.find((x) => x.who === c.short);
              const elapsed = a ? Math.floor((Date.now() - a.start) / 60000) : 0;
              return (
                <button key={c.short} className={`punch ${a ? "on" : "off"}`} style={{ ["--pc" as string]: c.color }} disabled={busy === c.short} onClick={() => punch(c.short)}>
                  <span className="who">{c.name}</span>
                  <span className="state">{a ? `On the clock · ${a.phase}` : "Off the clock"}</span>
                  <span className="elapsed num">{fmtClock(elapsed)}</span>
                  <span className="act">{a ? "Clock out" : "Clock in"}</span>
                </button>
              );
            })}
          </div>

          <details>
            <summary>Add hours by hand</summary>
            <div className="row" style={{ marginTop: 10 }}>
              <label className="f">Who
                <select value={mWho} onChange={(e) => setMWho(e.target.value)}>
                  {clockers.map((c) => <option key={c.short} value={c.short}>{c.name}</option>)}
                  <option value="both">Both</option>
                </select>
              </label>
              <label className="f">Date<input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} /></label>
              <label className="f">Hours<input type="number" step="0.25" min="0.25" placeholder="2.5" value={mHrs} onChange={(e) => setMHrs(e.target.value)} /></label>
              <label className="f">Phase<select value={mPhase} onChange={(e) => setMPhase(e.target.value)}>{SHOP_PHASES.map((p) => <option key={p}>{p}</option>)}</select></label>
              <label className="f" style={{ flex: 2 }}>Note<input value={mNote} onChange={(e) => setMNote(e.target.value)} placeholder="what got done" /></label>
              <button className="btn primary" style={{ alignSelf: "end" }} onClick={submitManual}>Add</button>
            </div>
          </details>

          {Object.keys(byPhase).length > 0 && (
            <div className="hours">
              <div className="h" style={{ gridColumn: "1 / -1" }}>Hours by phase</div>
              {Object.entries(byPhase).sort((a, b) => b[1] - a[1]).map(([p, m]) => (
                <div key={p} className="hrow"><span>{p}</span><span className="num">{fmtH(m)} hrs</span></div>
              ))}
            </div>
          )}

          <div className="log">
            {sessions.length === 0 && <div className="empty">No time logged yet. Clock in when you hit the shop.</div>}
            {sessions.slice(0, 60).map((s) => (
              <div className="r" key={s._id} style={{ ["--pc" as string]: byWho[s.who]?.color ?? "#888" }}>
                <i />
                <div>{byWho[s.who]?.name ?? s.who} · {s.phase}{s.note && <span className="m"> · {s.note}</span>}{s.paid && <span className="paid">paid</span>}</div>
                <div className="num">{fmtClock(s.minutes)}</div>
                <div className="m">{fmtDate(s.start)} {!s.paid && <button className="btn quiet" title="Delete" onClick={() => { if (confirm("Delete this time entry?")) remove({ id: s._id }); }}>✕</button>}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
