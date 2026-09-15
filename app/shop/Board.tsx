"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SHOP_PHASES, SPRINT_PHASES } from "@/lib/project";

export function Board() {
  const tasks = useQuery(api.tasks.list);
  const phases = useQuery(api.phases.list);
  const add = useMutation(api.tasks.add);
  const cycle = useMutation(api.tasks.cycle);
  const remove = useMutation(api.tasks.remove);
  const updatePhase = useMutation(api.phases.update);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  if (!tasks || !phases) return <div className="shop-loading">Loading the board…</div>;

  const shown = SPRINT_PHASES.concat(SHOP_PHASES.filter((p) => !SPRINT_PHASES.includes(p) && tasks.some((t) => t.phase === p)));
  const submit = async (phase: string) => {
    const title = (drafts[phase] ?? "").trim();
    if (!title) return;
    await add({ phase, title });
    setDrafts((d) => ({ ...d, [phase]: "" }));
  };

  return (
    <div className="two">
      <section className="panel">
        <header><h2>Two-Week Sprint</h2><span className="hint">tap a box: to do → doing → done</span></header>
        <div className="bd">
          {shown.map((ph) => {
            const ts = tasks.filter((t) => t.phase === ph).sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || a.order - b.order);
            const done = ts.filter((t) => t.status === "done").length;
            return (
              <div className="phase" key={ph}>
                <div className="ph"><h3>{ph}</h3><div className="prog"><i style={{ width: `${ts.length ? (done / ts.length) * 100 : 0}%` }} /></div><span className="cnt">{done}/{ts.length}</span></div>
                {ts.map((t) => (
                  <div className={`task ${t.status}`} key={t._id}>
                    <button className="st" title={t.status} onClick={() => cycle({ id: t._id })}>{t.status === "done" ? "✓" : t.status === "doing" ? "›" : ""}</button>
                    <div className="t">{t.title}{t.note && <small>{t.note}</small>}</div>
                    <button className="btn quiet" title="Remove" onClick={() => { if (confirm("Remove this task?")) remove({ id: t._id }); }}>✕</button>
                  </div>
                ))}
                <div className="addrow">
                  <input placeholder={`Add a task to ${ph}`} value={drafts[ph] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [ph]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") submit(ph); }} />
                  <button className="btn" onClick={() => submit(ph)}>Add</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <header><h2>Public Progress</h2><span className="hint">what the front page shows</span></header>
        <div className="bd">
          {phases.map((p) => (
            <div className="prow" key={p._id}>
              <div className="pn">{p.name}</div>
              <select value={p.status} onChange={(e) => updatePhase({ id: p._id, pct: p.pct, status: e.target.value as typeof p.status })}>
                <option value="done">Done</option><option value="active">Active</option><option value="up-next">Up next</option><option value="later">Later</option>
              </select>
              <input type="range" min={0} max={100} step={5} defaultValue={p.pct} onMouseUp={(e) => updatePhase({ id: p._id, pct: Number((e.target as HTMLInputElement).value), status: p.status })} onTouchEnd={(e) => updatePhase({ id: p._id, pct: Number((e.target as HTMLInputElement).value), status: p.status })} />
              <span className="num pct">{p.pct}%</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
