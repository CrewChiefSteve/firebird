import { useState } from "react";
import { View } from "react-native";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import { useM, useQ } from "@/lib/data";
import { F, useColors } from "@/lib/theme";
import { money, errText } from "@/lib/format";
import { PROJECT, SHOP_PHASES, isOpenPart, share } from "@/lib/site";
import { Body, Btn, Card, Chips, Display, Field, H2, Label, Loading, Msg, Muted, P, Pill, Row, Screen, Sheet } from "@/components/ui";

type Part = FunctionReturnType<typeof api.parts.publicList>[number];
const blank = { name: "", email: "", company: "", credit: "name" as "name" | "company" | "anon", how: "cost" as "cost" | "ship", message: "" };

export default function Adopt() {
  const c = useColors();
  const parts = useQ(api.parts.publicList);
  const submit = useM(api.pledges.submit);
  const [picked, setPicked] = useState<Part | null>(null);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [thanks, setThanks] = useState("");
  if (!parts) return <Loading text="Loading the parts list…" />;

  const n = parts.filter(isOpenPart).length;
  const order = (ph: string) => { const i = SHOP_PHASES.indexOf(ph); return i < 0 ? 99 : i; };
  const groups = Array.from(new Set(parts.map((p) => p.phase))).sort((a, b) => order(a) - order(b))
    .map((ph) => ({ phase: ph, parts: parts.filter((p) => p.phase === ph).sort((a, b) => a.cost * a.qty - b.cost * b.qty) }));
  const set = (k: keyof typeof blank) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function send() {
    if (!picked) return;
    setBusy(true); setErr("");
    try {
      await submit({ partId: picked._id, name: form.name, email: form.email, company: form.company || undefined, credit: form.credit, how: form.how, message: form.message });
      setThanks(`You’re down for the ${picked.name}. Jennifer will email you at ${form.email} to sort out the details. When it goes on the car, it goes on the build log.`);
      setPicked(null);
      setForm((f) => ({ ...f, message: "" }));
    } catch (e) { setErr(errText(e)); }
    finally { setBusy(false); }
  }

  const state = (p: Part) => {
    if (p.status === "installed") return <Pill text="On the car" tone="good" />;
    if (p.sponsor) return <Pill text={`Sponsored by ${p.sponsor}`} tone="gold" />;
    if (p.pending) return <Pill text="Spoken for" />;
    if (p.status !== "need" && p.status !== "hot") return <Pill text="Ordered" />;
    return <Btn title="Sponsor this" kind="gold" small onPress={() => { setPicked(p); setErr(""); setThanks(""); }} />;
  };

  return (
    <Screen>
      <Label>Adopt a part</Label>
      <Display style={{ fontSize: 40 }}>
        {n > 0 ? `${n} part${n === 1 ? "" : "s"} still need${n === 1 ? "s" : ""} a home` : "Every part has a home"}
      </Display>
      <Body>Joe Cobb turns 80 on February 14, 2027, and his daughter Jennifer wants him driving the Trans Am he bought for her mom. Jennifer, Steve, and Nick are doing the work. The parts below are what it takes to get the car back on its wheels.</Body>
      <Body>Pick a part. Cover the cost, or order it yourself and ship it to the shop. When it goes on the car, your name goes on the build log next to it, or you can stay anonymous. Nothing is paid in the app. Jennifer will get in touch to sort out the details.</Body>
      <Msg text={thanks} />

      {groups.map((g) => (
        <View key={g.phase} style={{ gap: 8 }}>
          <H2>{g.phase}</H2>
          {g.parts.map((p) => (
            <Card key={p._id} style={{ opacity: p.sponsor || (p.status !== "need" && p.status !== "hot") ? 0.75 : 1 }}>
              <Row style={{ alignItems: "flex-start" }}>
                <View style={{ flex: 1, gap: 3 }}>
                  <P style={{ fontFamily: F.sans6 }}>{p.name}{p.qty > 1 ? ` × ${p.qty}` : ""}</P>
                  {p.status === "hot" && !p.sponsor ? <Pill text="needed now" tone="critSolid" /> : null}
                  {(p.pn || p.vendor) ? <Muted>{[p.pn, p.vendor].filter(Boolean).join(" · ")}</Muted> : null}
                </View>
                {p.cost > 0 ? <P style={{ fontFamily: F.mono }}>{money(p.cost * p.qty)}</P> : null}
              </Row>
              <View style={{ alignItems: "flex-start" }}>{state(p)}</View>
            </Card>
          ))}
        </View>
      ))}

      <Muted>This is a family project, not a charity, so a sponsored part isn’t a tax deduction. It is a very good excuse to come see the car.</Muted>
      <Btn title="Share the parts list" onPress={() => share(PROJECT.siteUrl + "/parts")} />

      <Sheet visible={!!picked} onClose={() => setPicked(null)} title={picked ? `Adopt the ${picked.name}` : ""}>
        {picked && <Muted>{picked.cost > 0 ? `About ${money(picked.cost * picked.qty)}` : "Price to be confirmed"}{picked.pn ? ` · ${picked.pn}` : ""}{picked.vendor ? ` from ${picked.vendor}` : ""}.</Muted>}
        <Field label="Your name" value={form.name} onChangeText={set("name")} autoComplete="name" textContentType="name" />
        <Field label="Email" value={form.email} onChangeText={set("email")} autoComplete="email" keyboardType="email-address" autoCapitalize="none" textContentType="emailAddress" />
        <Field label="Company" hint="(optional)" value={form.company} onChangeText={set("company")} />
        <Chips label="Credit on the site" value={form.credit} onChange={(v) => setForm((f) => ({ ...f, credit: v }))}
          options={[["name", "My name"], ["company", "My company"], ["anon", "Anonymous"]]} />
        <Chips label="How you’d like to help" value={form.how} onChange={(v) => setForm((f) => ({ ...f, how: v }))}
          options={[["cost", "Cover the cost"], ["ship", "Buy it and ship it"]]} />
        <Field label="A note for Joe" hint="(optional)" value={form.message} onChangeText={set("message")} multiline />
        {err ? <P style={{ color: c.crit }}>{err}</P> : null}
        <Btn title={busy ? "Sending…" : "Count me in"} kind="primary" busy={busy} onPress={send} />
        <Muted>No payment here. Your email goes to Jennifer and nowhere else.</Muted>
      </Sheet>
    </Screen>
  );
}
