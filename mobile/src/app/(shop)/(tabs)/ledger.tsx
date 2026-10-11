import { useMemo, useState } from "react";
import { Pressable, Share, View } from "react-native";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { ConvexError } from "convex/values";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useA, useM, useQ } from "@/lib/data";
import { useCrew } from "@/lib/crew";
import { F, useColors } from "@/lib/theme";
import { errText, fmtDate, fmtDay, money, todayIso } from "@/lib/format";
import { confirm } from "@/lib/confirm";
import { pickDocument, pickImages, shrink, upload, type Picked } from "@/lib/upload";
import { Btn, Card, Chips, DateField, Empty, Field, Label, Loading, Msg, Muted, P, Row, Screen, Section, Stat } from "@/components/ui";

type Pending = { storageId: Id<"_storage">; kind: "image" | "pdf"; preview: string; name: string };

/**
 * Every dollar spent on the car, newest first, with a running total. Same rules as the website:
 * rows paid by a clocker wait on Jennifer to mark them reimbursed; rows she paid herself are settled on entry.
 */
export default function Ledger() {
  const c = useColors();
  const me = useCrew();
  const rows = useQ(api.receipts.list);
  const crew = useQ(api.crew.list);
  const phases = useQ(api.phases.list);
  const parts = useQ(api.parts.list);
  const add = useM(api.receipts.add);
  const remove = useM(api.receipts.remove);
  const setReimbursed = useM(api.receipts.setReimbursed);
  const reimburseAll = useM(api.receipts.reimburseAll);
  const uploadUrl = useM(api.receipts.generateUploadUrl);
  const readReceipt = useA(api.scan.read);

  const [form, setForm] = useState({ who: me.short, date: todayIso(), vendor: "", total: "", phase: "other", note: "" });
  const [file, setFile] = useState<Pending | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);

  const book = useMemo(() => {
    if (!rows) return [];
    const asc = [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
    let run = 0;
    return asc.map((r) => ({ ...r, run: (run += r.total) })).reverse();
  }, [rows]);

  if (!rows || !crew || !phases || !parts) return <Loading text="Opening the ledger…" />;

  const canPay = me.canPay;
  const name = (short: string) => crew.find((x) => x.short === short)?.name ?? short;
  const color = (short: string) => crew.find((x) => x.short === short)?.color ?? c.muted;
  const isPayer = (short: string) => !!crew.find((x) => x.short === short)?.canPay;
  const phaseName: Record<string, string> = { other: "Other", ...Object.fromEntries(phases.map((p) => [p.key, p.name])) };
  const total = rows.reduce((a, r) => a + r.total, 0);
  const owed: Record<string, number> = {};
  for (const r of rows) if (!r.reimbursed) owed[r.who] = (owed[r.who] ?? 0) + r.total;
  const owedTotal = Object.values(owed).reduce((a, b) => a + b, 0);
  const byPhase: Record<string, number> = {};
  for (const r of rows) byPhase[r.phase] = (byPhase[r.phase] ?? 0) + r.total;
  const byWho: Record<string, number> = {};
  for (const r of rows) byWho[r.who] = (byWho[r.who] ?? 0) + r.total;
  const stillToBuy = parts.filter((p) => p.status === "need" || p.status === "hot").reduce((a, p) => a + p.cost * p.qty, 0);
  const onOrder = parts.filter((p) => p.status === "ordered").reduce((a, p) => a + p.cost * p.qty, 0);
  const month = todayIso().slice(0, 7);
  const thisMonth = rows.filter((r) => r.date.startsWith(month)).reduce((a, r) => a + r.total, 0);
  const shown = book.filter((r) => (filter === "all" ? true : filter === "owed" ? !r.reimbursed : r.who === filter));
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function attach(source: "camera" | "library" | "file") {
    setMsg("");
    try {
      const picked: Picked | null = source === "file" ? await pickDocument() : (await pickImages(source))[0] ?? null;
      if (!picked) return;
      setUploading(true);
      const kind = picked.mime === "application/pdf" ? "pdf" : "image";
      const ready = kind === "image" ? await shrink(picked, 2200, 0.88) : picked;
      const storageId = await upload(await uploadUrl({}), ready);
      setFile({ storageId, kind, preview: ready.uri, name: picked.name });
      setUploading(false);
      if (kind === "image") await readInto(storageId);
    } catch (e) { setMsg("Upload failed: " + errText(e)); }
    finally { setUploading(false); }
  }

  /** Fill whatever the form doesn't have yet. Typed values win; the default date and "Other" phase don't. */
  async function readInto(storageId: Id<"_storage">) {
    setReading(true); setMsg("Reading the receipt…");
    try {
      const r = await readReceipt({ storageId });
      if (!r) return setMsg("");
      const paid = [r.paymentMethod, r.cardLast4 ? "ending " + r.cardLast4 : ""].filter(Boolean).join(" ");
      setForm((f) => ({
        ...f,
        vendor: f.vendor || r.vendor || "",
        total: f.total || (r.total != null ? r.total.toFixed(2) : ""),
        date: r.date ?? f.date,
        phase: f.phase === "other" && r.phaseKey ? r.phaseKey : f.phase,
        note: f.note || r.description || "",
      }));
      const missing = [!r.vendor && "vendor", r.total == null && "amount", !r.date && "date"].filter(Boolean);
      setMsg(missing.length > 0 ? `Read what it could. Fill in the ${missing.join(", ")}.` : r.reviewNeeded ? `Filled in. Double-check the numbers${r.notes ? ": " + r.notes : ""}.` : `Filled in from the receipt${paid ? ", paid by " + paid : ""}. Check it and hit Enter it.`);
    } catch (e) {
      setMsg("Couldn’t read it, type it in. " + (e instanceof ConvexError ? String(e.data) : ""));
    } finally { setReading(false); }
  }

  async function submit() {
    const amount = Number(form.total.replace(/[$,]/g, ""));
    if (!form.vendor.trim() || !(amount > 0)) return setMsg("Needs a vendor and an amount.");
    setSaving(true);
    try {
      await add({ who: form.who, date: form.date, vendor: form.vendor, total: amount, phase: form.phase, note: form.note, storageId: file?.storageId, kind: file?.kind });
      setMsg(isPayer(form.who) ? `Entered. ${money(total + amount)} spent so far.` : `Entered. ${name(form.who)} is owed ${money((owed[form.who] ?? 0) + amount)}.`);
      setForm((f) => ({ ...f, vendor: "", total: "", note: "" })); setFile(null);
    } catch (e) { setMsg("Couldn’t save: " + errText(e)); }
    finally { setSaving(false); }
  }

  function exportCsv() {
    const esc = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
    const out = [["Date", "Vendor", "What for", "Phase", "Paid by", "Amount", "Running total", "Status", "Receipt"].join(",")];
    for (const r of [...book].reverse()) {
      out.push([r.date, r.vendor, r.note, phaseName[r.phase] ?? r.phase, name(r.who), r.total.toFixed(2), r.run.toFixed(2),
        isPayer(r.who) ? "paid direct" : r.reimbursed ? "reimbursed" : "owed", r.url ?? ""].map(esc).join(","));
    }
    Share.share({ message: out.join("\n"), title: `trans-am-ledger-${todayIso()}.csv` }).catch(() => {});
  }

  return (
    <Screen>
      <Row wrap gap={10}>
        <Stat label="Spent on the car" value={money(total)} foot={`${rows.length} entr${rows.length === 1 ? "y" : "ies"}`} tone="hot" />
        <Stat label="This month" value={money(thisMonth)} foot="since the 1st" />
        <Stat label="Owed to crew" value={money(owedTotal)} foot={owedTotal === 0 ? "all square" : Object.entries(owed).map(([w, a]) => `${name(w)} ${money(a)}`).join(" · ")} />
        <Stat label="Parts still to buy" value={money(stillToBuy)} foot={onOrder > 0 ? `plus ${money(onOrder)} on order` : "from the Parts tab"} />
      </Row>

      <Section title="Enter a purchase" hint="a photo of the receipt fills the form in for you">
        <Row gap={8}>
          <Btn title="Snap receipt" kind="gold" style={{ flex: 1 }} busy={uploading} onPress={() => attach("camera")} />
          <Btn title="Photos" style={{ flex: 1 }} disabled={uploading} onPress={() => attach("library")} />
          <Btn title="PDF" disabled={uploading} onPress={() => attach("file")} />
        </Row>
        {file && (
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10 }}>
            {file.kind === "image" ? <Image source={{ uri: file.preview }} style={{ width: 56, height: 72, borderRadius: 4 }} contentFit="cover" /> : <P style={{ fontFamily: F.sans7 }}>PDF</P>}
            <Muted style={{ flex: 1 }} numberOfLines={2}>{reading ? "Reading…" : file.name}</Muted>
            <Btn small kind="quiet" title="✕" onPress={() => setFile(null)} />
          </Card>
        )}
        <Msg text={msg} />
        <Row gap={10}>
          <Field label="Vendor" value={form.vendor} onChangeText={set("vendor")} placeholder="Lowe's, Rock Auto" />
          <Field label="Amount" value={form.total} onChangeText={set("total")} placeholder="0.00" keyboardType="decimal-pad" style={{ fontFamily: F.mono }} />
        </Row>
        <DateField label="Date" value={form.date} onChange={set("date")} />
        <Chips label="Paid by" value={form.who} onChange={set("who")} options={crew.map((x) => [x.short, x.canPay ? `${x.name} (project funds)` : x.name] as const)} />
        <Chips label="Phase" value={form.phase} onChange={set("phase")} options={[...phases.map((p) => [p.key, p.name] as const), ["other", "Other"] as const]} />
        <Field label="What for" value={form.note} onChangeText={set("note")} placeholder="ball joints, tie rod ends" />
        <Btn title={saving ? "Saving…" : reading ? "Reading receipt…" : "Enter it"} kind="primary" busy={saving} disabled={uploading || reading} onPress={submit} />
        <Muted>{isPayer(form.who) ? "Paid from project funds. Nothing owed." : `${name(form.who)} gets reimbursed for this.`}</Muted>
      </Section>

      <Section title="Where it went">
        <Card style={{ gap: 6 }}>
          <Label>By phase</Label>
          {Object.entries(byPhase).sort((a, b) => b[1] - a[1]).map(([k, v]) => <Row key={k}><P style={{ flex: 1 }}>{phaseName[k] ?? k}</P><P style={{ fontFamily: F.mono }}>{money(v)}</P></Row>)}
          {rows.length === 0 && <Muted>Nothing yet.</Muted>}
          <Label style={{ marginTop: 8 }}>By who paid</Label>
          {Object.entries(byWho).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <Row key={k}><P style={{ flex: 1 }}>{name(k)}{owed[k] ? <Muted> · {money(owed[k])} owed</Muted> : null}</P><P style={{ fontFamily: F.mono }}>{money(v)}</P></Row>
          ))}
          {canPay && owedTotal > 0 && Object.entries(owed).map(([w, amt]) => (
            <Btn key={w} small title={`Reimburse ${name(w)} ${money(amt)}`} onPress={async () => {
              if (!(await confirm(`Mark all of ${name(w)}'s receipts (${money(amt)}) reimbursed?`, "", "Reimbursed"))) return;
              const n = await reimburseAll({ who: w });
              setMsg(`Marked ${n} entr${n === 1 ? "y" : "ies"} reimbursed.`);
            }} />
          ))}
        </Card>
      </Section>

      <Section title="The book" right={<Btn small title="Share CSV" onPress={exportCsv} disabled={rows.length === 0} />}>
        <Chips value={filter} onChange={setFilter} options={[["all", "Everything"], ["owed", "Waiting on reimbursement"], ...crew.map((x) => [x.short, `Paid by ${x.name}`] as const)]} />
        {shown.length === 0 && <Empty>Nothing here yet.</Empty>}
        {(showAll ? shown : shown.slice(0, 40)).map((r) => (
          <Card key={r._id} accent={color(r.who)} style={{ paddingVertical: 10, gap: 6 }}>
            <Row style={{ alignItems: "flex-start" }}>
              {r.url && (
                <Pressable onPress={() => WebBrowser.openBrowserAsync(r.url!)} accessibilityLabel="Open the receipt">
                  {r.kind === "image" ? <Image source={{ uri: r.url }} style={{ width: 40, height: 52, borderRadius: 3, backgroundColor: c.line }} contentFit="cover" /> : <View style={{ width: 40, height: 52, borderRadius: 3, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}><Label>PDF</Label></View>}
                </Pressable>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <P style={{ fontFamily: F.sans7 }}>{r.vendor || "—"}</P>
                <Muted>{fmtDay(r.date)} · {phaseName[r.phase] ?? r.phase} · {name(r.who)}{r.note ? ` · ${r.note}` : ""}</Muted>
              </View>
              <View style={{ alignItems: "flex-end", gap: 2 }}>
                <P style={{ fontFamily: F.mono }}>{money(r.total)}</P>
                <Muted style={{ fontFamily: F.mono4, fontSize: 11 }}>{money(r.run)}</Muted>
              </View>
            </Row>
            <Row wrap>
              {isPayer(r.who) ? <Muted>paid direct</Muted> : r.reimbursed ? <Muted>reimbursed{r.reimbursedAt ? " " + fmtDate(r.reimbursedAt) : ""}</Muted> : <Muted style={{ color: c.oxide, fontFamily: F.sans7 }}>owed</Muted>}
              <View style={{ flex: 1 }} />
              {canPay && !isPayer(r.who) && !r.reimbursed && <Btn small kind="primary" title="Reimbursed" onPress={() => setReimbursed({ id: r._id, reimbursed: true })} />}
              {canPay && !isPayer(r.who) && r.reimbursed && <Btn small kind="quiet" title="Undo" onPress={() => setReimbursed({ id: r._id, reimbursed: false })} />}
              {(canPay || !r.reimbursed) && <Btn small kind="quiet" title="✕" onPress={async () => {
                if (await confirm(`Delete the ${money(r.total)} ${r.vendor || ""} entry?`, "", "Delete", true)) remove({ id: r._id }).catch((e) => setMsg(errText(e)));
              }} />}
            </Row>
          </Card>
        ))}
        {!showAll && shown.length > 40 && <Btn kind="quiet" title={`Show all ${shown.length}`} onPress={() => setShowAll(true)} />}
      </Section>
    </Screen>
  );
}
