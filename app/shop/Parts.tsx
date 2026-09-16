"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SHOP_PHASES } from "@/lib/project";
import { money } from "./util";
import { Pledges } from "./Pledges";

type Status = "hot" | "need" | "ordered" | "received" | "installed" | "hold";
const PRE_ORDER: Status[] = ["hot", "need", "hold"];
const empty = { name: "", phase: SHOP_PHASES[0], qty: "1", vendor: "", cost: "", pn: "", eta: "", status: "need" as Status, note: "" };

export function Parts() {
  const parts = useQuery(api.parts.list);
  const save = useMutation(api.parts.save);
  const advance = useMutation(api.parts.advance);
  const remove = useMutation(api.parts.remove);
  const setPublic = useMutation(api.parts.setPublic);
  const setStatus = useMutation(api.parts.setStatus);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Id<"parts"> | null>(null);
  if (!parts) return <div className="shop-loading">Loading parts…</div>;

  const order: Record<Status, number> = { hot: 0, need: 1, ordered: 2, received: 3, installed: 4, hold: 5 };
  const rows = [...parts].sort((a, b) => order[a.status] - order[b.status] || (a.eta || "z").localeCompare(b.eta || "z") || a.name.localeCompare(b.name));
  const open = rows.filter((p) => p.status === "hot" || p.status === "need" || p.status === "ordered");
  const openCost = open.reduce((a, p) => a + p.cost * p.qty, 0);
  const hot = rows.filter((p) => p.status === "hot");
  const held = rows.filter((p) => p.status === "hold");
  const heldCost = held.reduce((a, p) => a + p.cost * p.qty, 0);
  const totalCost = rows.filter((p) => p.status !== "hold").reduce((a, p) => a + p.cost * p.qty, 0);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await save({ id: editing ?? undefined, name: form.name, phase: form.phase, qty: parseInt(form.qty) || 1, vendor: form.vendor, cost: parseFloat(form.cost) || 0, pn: form.pn, eta: form.eta, status: form.status, note: form.note });
    setForm(empty); setEditing(null);
  }
  function edit(p: (typeof rows)[number]) {
    setEditing(p._id);
    setForm({ name: p.name, phase: p.phase, qty: String(p.qty), vendor: p.vendor, cost: p.cost ? String(p.cost) : "", pn: p.pn, eta: p.eta, status: p.status, note: p.note });
    document.getElementById("pform")?.scrollIntoView({ block: "nearest" });
  }

  return (
    <>
      <section className="stats">
        <div className="stat hot"><div className="lbl">Parts outstanding</div><div className="val"><span className="num">{open.length}</span></div><div className="foot">{hot.length > 0 ? `${hot.length} hot · ` : ""}{rows.filter((p) => p.status === "need").length} not ordered{held.length > 0 ? ` · ${held.length} on hold` : ""}</div></div>
        <div className="stat"><div className="lbl">Open cost</div><div className="val"><span className="num">{money(openCost)}</span></div><div className="foot">{money(totalCost)} total listed{heldCost > 0 ? ` · ${money(heldCost)} on hold` : ""}</div></div>
      </section>
      <Pledges />
      <section className="panel">
        <header><h2>Parts &amp; Materials</h2><span className="hint">tap a status to advance it · hot = needed now · hold parks it and keeps the research · tap a name to edit</span></header>
        <div className="bd">
          <div className="tablewrap"><table className="parts">
            <thead><tr><th>Part</th><th title="Listed on the public Adopt-a-part page">Public</th><th>Phase</th><th>Qty</th><th>Vendor</th><th>Cost</th><th>ETA</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={9} className="empty">No parts listed yet. Add the first one below.</td></tr>}
              {rows.map((p) => (
                <tr key={p._id}>
                  <td className="n"><a href="#pform" onClick={(e) => { e.preventDefault(); edit(p); }}>{p.name}</a>{(p.pn || p.note) && <small>{[p.pn, p.note].filter(Boolean).join(" · ")}</small>}{p.sponsor && <small style={{ color: "var(--gold)" }}>Sponsored by {p.sponsor.name}{p.sponsor.company ? ", " + p.sponsor.company : ""}</small>}</td>
                  <td><input type="checkbox" checked={!!p.public} onChange={(e) => setPublic({ id: p._id, public: e.target.checked })} title="Show on the public page" /></td>
                  <td>{p.phase}</td><td className="num">{p.qty}</td><td>{p.vendor}</td>
                  <td className="num">{p.cost ? money(p.cost * p.qty) : ""}</td>
                  <td className="num">{p.eta}</td>
                  <td className="stcell">
                    <button className={`pill ${p.status}`} onClick={() => advance({ id: p._id })}>{p.status === "hot" ? "hot" : p.status === "hold" ? "on hold" : p.status}</button>
                    {PRE_ORDER.includes(p.status) && (
                      <span className="minis">
                        {p.status !== "hot" && <button className="mini hot" title="Needed now" onClick={() => setStatus({ id: p._id, status: "hot" })}>hot</button>}
                        {p.status !== "hold" && <button className="mini hold" title="Park it, keep the research" onClick={() => setStatus({ id: p._id, status: "hold" })}>hold</button>}
                        {p.status !== "need" && <button className="mini" title="Back to the list" onClick={() => setStatus({ id: p._id, status: "need" })}>need</button>}
                      </span>
                    )}
                  </td>
                  <td><button className="btn quiet" title="Remove" onClick={() => { if (confirm("Remove this part?")) remove({ id: p._id }); }}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <form className="form" id="pform" onSubmit={submit}>
            <label className="f span2">Part<input required value={form.name} onChange={set("name")} placeholder="POR-15 Rust Preventive, black, quart" /></label>
            <label className="f">Phase<select value={form.phase} onChange={set("phase")}>{SHOP_PHASES.map((p) => <option key={p}>{p}</option>)}</select></label>
            <label className="f">Qty<input type="number" min={1} value={form.qty} onChange={set("qty")} /></label>
            <label className="f">Vendor<input value={form.vendor} onChange={set("vendor")} placeholder="Summit, LMC, local" /></label>
            <label className="f">Cost $<input type="number" step="0.01" min={0} value={form.cost} onChange={set("cost")} placeholder="0.00" /></label>
            <label className="f">Part #<input value={form.pn} onChange={set("pn")} /></label>
            <label className="f">ETA<input type="date" value={form.eta} onChange={set("eta")} /></label>
            <label className="f">Status<select value={form.status} onChange={set("status")}><option value="hot">Hot, needed now</option><option value="need">Need</option><option value="ordered">Ordered</option><option value="received">Received</option><option value="installed">Installed</option><option value="hold">On hold</option></select></label>
            <label className="f span2">Note<input value={form.note} onChange={set("note")} placeholder="which side, size, why" /></label>
            <div className="row">
              <button className="btn primary" type="submit">{editing ? "Save part" : "Add part"}</button>
              {editing && <button className="btn" type="button" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</button>}
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
