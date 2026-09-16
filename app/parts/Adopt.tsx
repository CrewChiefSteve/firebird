"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type Part = { _id: Id<"parts">; name: string; phase: string; qty: number; cost: number; vendor: string; pn: string; status: string; sponsor: string | null; pending: boolean };
const money = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

export function Adopt({ groups }: { groups: { phase: string; parts: Part[] }[] }) {
  const submit = useMutation(api.pledges.submit);
  const [picked, setPicked] = useState<Part | null>(null);
  const [form, setForm] = useState({ name: "", email: "", company: "", credit: "name" as "name" | "company" | "anon", how: "cost" as "cost" | "ship", message: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Part | null>(null);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function pick(p: Part) {
    setPicked(p); setDone(null); setErr("");
    setTimeout(() => document.getElementById("pledge")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) return;
    setBusy(true); setErr("");
    try {
      await submit({ partId: picked._id, name: form.name, email: form.email, company: form.company || undefined, credit: form.credit, how: form.how, message: form.message });
      setDone(picked); setPicked(null);
      setForm((f) => ({ ...f, message: "" }));
    } catch (ex) { setErr((ex as Error).message.replace(/^.*Uncaught Error: /, "").split("\n")[0]); }
    finally { setBusy(false); }
  }

  const state = (p: Part) => {
    if (p.status === "installed") return <span className="st done">On the car</span>;
    if (p.sponsor) return <span className="st claimed">Sponsored by {p.sponsor}</span>;
    if (p.pending) return <span className="st pending">Spoken for</span>;
    if (p.status !== "need" && p.status !== "hot") return <span className="st pending">Ordered</span>;
    return <button type="button" className="st open" onClick={() => pick(p)}>Sponsor this</button>;
  };

  return (
    <>
      {groups.map((g) => (
        <div className="adopt-group" key={g.phase}>
          <h3>{g.phase}</h3>
          <div className="plist">
            {g.parts.map((p) => (
              <div className={`p${p.sponsor || (p.status !== "need" && p.status !== "hot") ? " on" : ""}`} key={p._id}>
                <div>
                  <div className="nm">{p.name}{p.qty > 1 ? ` × ${p.qty}` : ""}{p.status === "hot" && !p.sponsor && <span className="hotnow">needed now</span>}</div>
                  <div className="pn">{[p.pn, p.vendor].filter(Boolean).join(" · ")}</div>
                </div>
                <div className="cost">{p.cost > 0 ? money(p.cost * p.qty) : ""}</div>
                <div>{state(p)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {done && (
        <div className="pledge" id="pledge">
          <h3>Thank you</h3>
          <p className="ok">You&rsquo;re down for the <b>{done.name}</b>. Jennifer will email you at <b>{form.email}</b> to sort out the details. When it goes on the car, it goes on the build log.</p>
        </div>
      )}

      {picked && (
        <form className="pledge" id="pledge" onSubmit={send}>
          <h3>Adopt the {picked.name}</h3>
          <p className="fine">{picked.cost > 0 ? `About ${money(picked.cost * picked.qty)}` : "Price to be confirmed"}{picked.pn ? ` · ${picked.pn}` : ""}{picked.vendor ? ` from ${picked.vendor}` : ""}.</p>
          <div className="grid">
            <label>Your name<input required value={form.name} onChange={set("name")} autoComplete="name" /></label>
            <label>Email<input required type="email" value={form.email} onChange={set("email")} autoComplete="email" /></label>
            <label>Company <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span><input value={form.company} onChange={set("company")} autoComplete="organization" /></label>
            <label>Credit on the site
              <select value={form.credit} onChange={set("credit")}>
                <option value="name">My name</option>
                <option value="company">My company</option>
                <option value="anon">Anonymous, &ldquo;a friend of the family&rdquo;</option>
              </select>
            </label>
            <label>How you&rsquo;d like to help
              <select value={form.how} onChange={set("how")}>
                <option value="cost">Cover the cost. Jennifer will tell me how.</option>
                <option value="ship">I&rsquo;ll buy it and ship it to the shop.</option>
              </select>
            </label>
          </div>
          <label>A note for Joe, if you like <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span><textarea rows={3} value={form.message} onChange={set("message")} /></label>
          {err && <p className="fine" style={{ color: "var(--oxide)" }}>{err}</p>}
          <div className="actions">
            <button type="submit" disabled={busy}>{busy ? "Sending…" : "Count me in"}</button>
            <button type="button" className="quiet" onClick={() => setPicked(null)}>Never mind</button>
            <span className="fine">No payment here. Your email goes to Jennifer and nowhere else.</span>
          </div>
        </form>
      )}
    </>
  );
}
