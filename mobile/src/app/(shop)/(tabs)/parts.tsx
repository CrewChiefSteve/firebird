import { useState } from "react";
import { Linking, Switch, View } from "react-native";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useM, useQ } from "@/lib/data";
import { F, useColors } from "@/lib/theme";
import { errText, fmtDate, money, todayIso } from "@/lib/format";
import { SHOP_PHASES } from "@/lib/site";
import { confirm } from "@/lib/confirm";
import { Btn, Card, Chips, DateField, Empty, Field, Label, Loading, Msg, Muted, P, Pill, Row, Screen, Section, Sheet, Stat, type Tone } from "@/components/ui";

type Status = Doc<"parts">["status"];
const PRE_ORDER: Status[] = ["hot", "need", "hold"];
const ORDER: Record<Status, number> = { hot: 0, need: 1, ordered: 2, received: 3, installed: 4, hold: 5 };
const TONE: Record<Status, Tone> = { hot: "critSolid", need: "crit", ordered: "warn", received: "info", installed: "good", hold: "muted" };
const statusOpts = [["hot", "Hot"], ["need", "Need"], ["ordered", "Ordered"], ["received", "Received"], ["installed", "Installed"], ["hold", "On hold"]] as const;
const empty = { name: "", phase: SHOP_PHASES[0], qty: "1", vendor: "", cost: "", pn: "", eta: "", status: "need" as Status, note: "" };
const FILTERS = [["open", "Still to get"], ["hot", "Hot"], ["all", "All"], ["done", "Received & on"], ["hold", "On hold"]] as const;

function Pledges() {
  const c = useColors();
  const pledges = useQ(api.pledges.list);
  const decide = useM(api.pledges.decide);
  const [showOld, setShowOld] = useState(false);
  if (!pledges || pledges.length === 0) return null;
  const fresh = pledges.filter((p) => p.status === "new");
  const old = pledges.filter((p) => p.status !== "new");
  const creditText = (p: Doc<"pledges">) => (p.credit === "anon" ? "anonymous" : p.credit === "company" ? `as ${p.company}` : `as ${p.name}`);
  return (
    <Section title="Part pledges" hint={fresh.length === 0 ? "nothing waiting" : `${fresh.length} waiting on Jennifer`}>
      {fresh.map((p) => (
        <Card key={p._id} accent={c.gold}>
          <P style={{ fontFamily: F.sans7 }}>{p.name}{p.company ? `, ${p.company}` : ""} <Muted>· {fmtDate(p.createdAt)}</Muted></P>
          <P><P style={{ fontFamily: F.sans6 }}>{p.partName}</P> · {p.how === "ship" ? "will buy it and ship it to the shop" : "wants to cover the cost"} · credit {creditText(p)}</P>
          <Muted>{p.email}</Muted>
          {p.message ? <Muted style={{ fontStyle: "italic" }}>“{p.message}”</Muted> : null}
          <Row wrap>
            <Btn small kind="primary" title="Confirm" onPress={() => decide({ id: p._id, action: "confirm" })} />
            <Btn small title="Email them" onPress={() => Linking.openURL(`mailto:${p.email}?subject=${encodeURIComponent("Joe's Trans Am: " + p.partName)}`)} />
            <Btn small kind="quiet" title="Decline" onPress={async () => { if (await confirm(`Decline ${p.name}'s pledge for ${p.partName}?`, "", "Decline", true)) decide({ id: p._id, action: "decline" }); }} />
          </Row>
        </Card>
      ))}
      {fresh.length === 0 && <Empty>No new pledges.</Empty>}
      {old.length > 0 && <Btn small kind="quiet" title={`${showOld ? "Hide" : "Show"} ${old.length} decided`} onPress={() => setShowOld((s) => !s)} />}
      {showOld && old.map((p) => (
        <Card key={p._id} style={{ paddingVertical: 10 }}>
          <P>{p.name}{p.company ? `, ${p.company}` : ""} <Muted>· {p.partName} · {p.status}{p.decidedAt ? ` ${fmtDate(p.decidedAt)}` : ""}</Muted></P>
          {p.status === "confirmed" && <Btn small kind="quiet" title="Undo" onPress={async () => { if (await confirm("Take the sponsor off this part?", "", "Undo", true)) decide({ id: p._id, action: "decline" }); }} />}
        </Card>
      ))}
    </Section>
  );
}

export default function Parts() {
  const c = useColors();
  const parts = useQ(api.parts.list);
  const save = useM(api.parts.save);
  const advance = useM(api.parts.advance);
  const remove = useM(api.parts.remove);
  const setPublic = useM(api.parts.setPublic);
  const setStatus = useM(api.parts.setStatus);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Id<"parts"> | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("open");
  const [msg, setMsg] = useState("");
  if (!parts) return <Loading text="Loading parts…" />;

  const rows = [...parts].sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.eta || "z").localeCompare(b.eta || "z") || a.name.localeCompare(b.name));
  const open = rows.filter((p) => p.status === "hot" || p.status === "need" || p.status === "ordered");
  const hot = rows.filter((p) => p.status === "hot");
  const held = rows.filter((p) => p.status === "hold");
  const cost = (ps: typeof rows) => ps.reduce((a, p) => a + p.cost * p.qty, 0);
  const shown = rows.filter((p) =>
    filter === "all" ? true : filter === "open" ? open.includes(p) : filter === "hot" ? p.status === "hot" : filter === "hold" ? p.status === "hold" : p.status === "received" || p.status === "installed");
  const run = (pr: Promise<unknown>) => pr.catch((e) => setMsg(errText(e)));
  const set = (k: keyof typeof empty) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  function edit(p: Doc<"parts">) {
    setEditing(p._id);
    setForm({ name: p.name, phase: p.phase, qty: String(p.qty), vendor: p.vendor, cost: p.cost ? String(p.cost) : "", pn: p.pn, eta: p.eta, status: p.status, note: p.note });
    setFormOpen(true);
  }
  async function submit() {
    if (!form.name.trim()) return;
    try {
      await save({ id: editing ?? undefined, name: form.name, phase: form.phase, qty: parseInt(form.qty) || 1, vendor: form.vendor, cost: parseFloat(form.cost) || 0, pn: form.pn, eta: form.eta, status: form.status, note: form.note });
      setFormOpen(false); setForm(empty); setEditing(null);
    } catch (e) { setMsg(errText(e)); }
  }

  return (
    <Screen>
      <Row wrap gap={10}>
        <Stat label="Parts outstanding" value={String(open.length)} tone="hot"
          foot={`${hot.length ? `${hot.length} hot · ` : ""}${rows.filter((p) => p.status === "need").length} not ordered${held.length ? ` · ${held.length} on hold` : ""}`} />
        <Stat label="Hot list" value={money(cost(hot))} tone={hot.length ? "crit" : undefined} foot={hot.length ? `${hot.length} part${hot.length === 1 ? "" : "s"} needed now` : "nothing marked hot"} />
        <Stat label="Open cost" value={money(cost(open))} foot={`${money(cost(rows.filter((p) => p.status !== "hold")))} total listed`} />
      </Row>
      <Pledges />
      <Btn title="Add a part" kind="primary" onPress={() => { setEditing(null); setForm(empty); setFormOpen(true); }} />
      <Msg text={msg} />
      <Chips options={FILTERS} value={filter} onChange={setFilter} />
      <Muted>Tap the status to move it along: need → ordered → received → installed. Tap a part to edit it.</Muted>
      {shown.length === 0 && <Empty>Nothing here.</Empty>}
      {shown.map((p) => (
        <Card key={p._id} accent={p.status === "hot" ? c.crit : undefined} onPress={() => edit(p)}>
          <Row style={{ alignItems: "flex-start" }}>
            <View style={{ flex: 1, gap: 2 }}>
              <P style={{ fontFamily: F.sans6 }}>{p.name}{p.qty > 1 ? ` × ${p.qty}` : ""}</P>
              <Muted>{[p.phase, p.vendor, p.pn].filter(Boolean).join(" · ")}{p.eta ? ` · ETA ${p.eta}` : ""}</Muted>
              {p.note ? <Muted>{p.note}</Muted> : null}
              {p.sponsor ? <Muted style={{ color: c.gold }}>Sponsored by {p.sponsor.name}{p.sponsor.company ? ", " + p.sponsor.company : ""}</Muted> : null}
            </View>
            {p.cost > 0 ? <P style={{ fontFamily: F.mono }}>{money(p.cost * p.qty)}</P> : null}
          </Row>
          <Row wrap>
            <Pill text={p.status === "hold" ? "on hold" : p.status} tone={TONE[p.status]} onPress={() => run(advance({ id: p._id }))} />
            {PRE_ORDER.includes(p.status) && (["hot", "hold", "need"] as const).filter((s) => s !== p.status).map((s) => (
              <Pill key={s} text={s === "need" ? "→ need" : `→ ${s}`} tone="muted" onPress={() => run(setStatus({ id: p._id, status: s }))} />
            ))}
            <View style={{ flex: 1 }} />
            <Label>Public</Label>
            <Switch value={!!p.public} onValueChange={(v) => { run(setPublic({ id: p._id, public: v })); }} trackColor={{ true: c.gold, false: c.line }} />
          </Row>
        </Card>
      ))}

      <Sheet visible={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit part" : "New part"}>
        <Field label="Part" value={form.name} onChangeText={set("name")} placeholder="POR-15 Rust Preventive, black, quart" />
        <Chips label="Phase" options={SHOP_PHASES.map((p) => [p, p] as const)} value={form.phase} onChange={set("phase")} />
        <Row gap={10}>
          <Field label="Qty" value={form.qty} onChangeText={set("qty")} keyboardType="number-pad" />
          <Field label="Cost $ (each)" value={form.cost} onChangeText={set("cost")} keyboardType="decimal-pad" placeholder="0.00" />
        </Row>
        <Row gap={10}>
          <Field label="Vendor" value={form.vendor} onChangeText={set("vendor")} placeholder="Summit, LMC, local" />
          <Field label="Part #" value={form.pn} onChangeText={set("pn")} autoCapitalize="characters" />
        </Row>
        <Chips label="Status" options={statusOpts} value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))} />
        {form.eta ? (
          <Row style={{ alignItems: "flex-end" }}>
            <DateField label="ETA" value={form.eta} onChange={set("eta")} allowFuture />
            <Btn small kind="quiet" title="Clear" onPress={() => set("eta")("")} />
          </Row>
        ) : (
          <Btn small title="Set an ETA" onPress={() => set("eta")(todayIso())} />
        )}
        <Field label="Note" value={form.note} onChangeText={set("note")} placeholder="which side, size, why" />
        <Btn title={editing ? "Save part" : "Add part"} kind="primary" onPress={submit} disabled={!form.name.trim()} />
        {editing && (
          <Btn title="Remove this part" kind="quiet" onPress={async () => {
            if (!(await confirm("Remove this part?", form.name, "Remove", true))) return;
            await run(remove({ id: editing })); setFormOpen(false); setEditing(null);
          }} />
        )}
      </Sheet>
    </Screen>
  );
}
