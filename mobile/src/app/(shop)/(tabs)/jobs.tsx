import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useM, useQ } from "@/lib/data";
import { useCrew } from "@/lib/crew";
import { F, useColors } from "@/lib/theme";
import { errText, fmtDate, plural } from "@/lib/format";
import { SHOP_PHASES } from "@/lib/site";
import { confirm } from "@/lib/confirm";
import { Btn, Card, Chips, Empty, Field, H2, H3, Label, Loading, Msg, Muted, P, Pill, Row, Screen, Sheet, Stat } from "@/components/ui";

type Priority = "now" | "soon" | "whenever";
const PRIORITIES: [Priority, string, string][] = [
  ["now", "Do now", "grab one of these first"],
  ["soon", "Soon", "next up once the board above is clear"],
  ["whenever", "Whenever", "good for a slow afternoon"],
];
const prioOpts = [["now", "Do now"], ["soon", "Soon"], ["whenever", "Whenever"]] as const;
const empty = { title: "", where: "", phase: "Other", priority: "now" as Priority, time: "", needs: "", steps: "" };
const lines = (s: string) => s.split("\n").map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim()).filter(Boolean);

export default function Jobs() {
  const c = useColors();
  const me = useCrew();
  const jobs = useQ(api.jobs.list);
  const crew = useQ(api.crew.list);
  const save = useM(api.jobs.save);
  const claim = useM(api.jobs.claim);
  const release = useM(api.jobs.release);
  const finish = useM(api.jobs.finish);
  const reopen = useM(api.jobs.reopen);
  const setPriority = useM(api.jobs.setPriority);
  const remove = useM(api.jobs.remove);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Id<"jobs"> | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [finishing, setFinishing] = useState<Doc<"jobs"> | null>(null);
  const [result, setResult] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [msg, setMsg] = useState("");
  if (!jobs || !crew) return <Loading text="Loading the board…" />;

  const byWho = Object.fromEntries(crew.map((x) => [x.short, x]));
  const name = (short?: string) => (short ? byWho[short]?.name ?? short : "");
  const rank: Record<Priority, number> = { now: 0, soon: 1, whenever: 2 };
  const live = jobs.filter((j) => j.status !== "done").sort((a, b) => rank[a.priority] - rank[b.priority] || a.createdAt - b.createdAt);
  const done = jobs.filter((j) => j.status === "done").sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
  const ready = live.filter((j) => j.status === "open");
  const claimed = live.filter((j) => j.status === "claimed");
  const doneWeek = done.filter((j) => (j.doneAt ?? 0) >= Date.now() - 7 * 86400000);
  const isOpen = (j: Doc<"jobs">) => open[j._id] ?? (j.priority === "now" || j.status === "claimed");
  const run = (p: Promise<unknown>) => p.then(() => Haptics.selectionAsync().catch(() => {})).catch((e) => setMsg(errText(e)));
  const set = (k: keyof typeof empty) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  function startNew() { setEditing(null); setForm(empty); setFormOpen(true); }
  function edit(j: Doc<"jobs">) {
    setEditing(j._id);
    setForm({ title: j.title, where: j.where, phase: j.phase, priority: j.priority, time: j.time, needs: j.needs, steps: j.steps });
    setFormOpen(true);
  }
  async function submit() {
    if (!form.title.trim()) return;
    try {
      await save({ id: editing ?? undefined, ...form });
      setFormOpen(false); setForm(empty); setEditing(null);
      setMsg(editing ? "Job saved." : "It’s on the board.");
    } catch (e) { setMsg(errText(e)); }
  }
  async function markDone() {
    if (!finishing) return;
    await run(finish({ id: finishing._id, result }));
    setFinishing(null); setResult("");
  }

  return (
    <Screen>
      <Row wrap gap={10}>
        <Stat label="Ready to grab" value={String(ready.length)} foot={`${ready.filter((j) => j.priority === "now").length} marked do now`} tone="hot" />
        <Stat label="In progress" value={String(claimed.length)} foot={claimed.length ? Array.from(new Set(claimed.map((j) => name(j.claimedBy)))).join(", ") : "nobody’s claimed one"} />
        <Stat label="Done this week" value={String(doneWeek.length)} foot={`${done.length} done all told`} />
      </Row>
      <Btn title="Put a job on the board" kind="primary" onPress={startNew} />
      <Msg text={msg} />
      {live.length === 0 && <Empty>The board is clear. Put the next job up.</Empty>}

      {PRIORITIES.map(([p, label, blurb]) => {
        const js = live.filter((j) => j.priority === p);
        if (!js.length) return null;
        return (
          <View key={p} style={{ gap: 10 }}>
            <Row style={{ alignItems: "baseline" }}>
              <H2 style={{ color: p === "now" ? c.crit : p === "soon" ? c.warn : c.muted }}>{label}</H2>
              <Muted style={{ flex: 1 }}>{blurb}</Muted>
            </Row>
            {js.map((j) => {
              const who = j.claimedBy ? byWho[j.claimedBy] : null;
              const needs = lines(j.needs), steps = lines(j.steps);
              const showing = isOpen(j);
              return (
                <Card key={j._id} accent={who?.color ?? (p === "now" ? c.crit : undefined)}>
                  <Pressable onPress={() => setOpen((o) => ({ ...o, [j._id]: !showing }))} style={{ gap: 4 }}>
                    <Row style={{ alignItems: "flex-start" }}>
                      <H3 style={{ flex: 1, fontSize: 17 }}>{j.title}</H3>
                      {who ? <Pill text={who.short === me.short ? "You’re on it" : `${who.name}’s on it`} tone="info" /> : <Pill text={p === "now" ? "do now" : p} tone={p === "now" ? "critSolid" : p === "soon" ? "warn" : "muted"} />}
                    </Row>
                    {[j.where, j.phase !== "Other" ? j.phase : "", j.time].some(Boolean) && <Muted>{[j.where, j.phase !== "Other" ? j.phase : "", j.time].filter(Boolean).join(" · ")}</Muted>}
                  </Pressable>
                  {showing ? (
                    <View style={{ gap: 10 }}>
                      {needs.length > 0 && (
                        <View style={{ gap: 4 }}>
                          <Label>You’ll need</Label>
                          {needs.map((n, i) => <P key={i}>•  {n}</P>)}
                        </View>
                      )}
                      {steps.length > 0 && (
                        <View style={{ gap: 4 }}>
                          <Label>How</Label>
                          {steps.map((s, i) => (
                            <Row key={i} style={{ alignItems: "flex-start" }}>
                              <Text style={{ fontFamily: F.mono, fontSize: 14, color: c.accent, width: 20 }}>{i + 1}</Text>
                              <P style={{ flex: 1 }}>{s}</P>
                            </Row>
                          ))}
                        </View>
                      )}
                      {needs.length === 0 && steps.length === 0 && <Muted>No notes yet. Tap Edit to add what to grab and how to do it.</Muted>}
                    </View>
                  ) : (
                    <Pressable onPress={() => setOpen((o) => ({ ...o, [j._id]: true }))}>
                      <Muted style={{ color: c.oxide }}>{[steps.length ? plural(steps.length, "step") : "", needs.length ? `${plural(needs.length, "thing")} to grab` : ""].filter(Boolean).join(" · ") || "show details"}</Muted>
                    </Pressable>
                  )}
                  <Row wrap>
                    {j.status === "open" && <Btn small kind="primary" title="I’ve got this" onPress={() => run(claim({ id: j._id }))} />}
                    {j.status === "claimed" && <Btn small kind="good" title="Done" onPress={() => { setFinishing(j); setResult(""); }} />}
                    {j.status === "claimed" && <Btn small title="Put it back" onPress={() => run(release({ id: j._id }))} />}
                    {j.status === "open" && <Btn small title="Already done" onPress={() => { setFinishing(j); setResult(""); }} />}
                    <Btn small kind="quiet" title="Edit" onPress={() => edit(j)} />
                    <Btn small kind="quiet" title="✕" onPress={async () => { if (await confirm("Take this job off the board?", j.title, "Remove", true)) run(remove({ id: j._id })); }} />
                  </Row>
                  {showing && <Chips options={prioOpts} value={j.priority} onChange={(v) => run(setPriority({ id: j._id, priority: v }))} />}
                </Card>
              );
            })}
          </View>
        );
      })}

      {done.length > 0 && <Btn kind="quiet" title={`${showDone ? "Hide" : "Show"} done (${done.length})`} onPress={() => setShowDone((s) => !s)} />}
      {showDone && done.map((j) => (
        <Card key={j._id} accent={j.doneBy ? byWho[j.doneBy]?.color : undefined} style={{ paddingVertical: 10 }}>
          <P style={{ fontFamily: F.sans6 }}>{j.title}{j.where ? <Muted> · {j.where}</Muted> : null}</P>
          <Muted>{name(j.doneBy)}{j.doneAt ? `, ${fmtDate(j.doneAt)}` : ""}{j.result ? ` · ${j.result}` : ""}</Muted>
          <Row>
            <Btn small title="Reopen" onPress={() => run(reopen({ id: j._id }))} />
            <Btn small kind="quiet" title="✕" onPress={async () => { if (await confirm("Remove this job for good?", j.title, "Remove", true)) run(remove({ id: j._id })); }} />
          </Row>
        </Card>
      ))}

      <Sheet visible={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit job" : "New job"}>
        <Field label="Job" value={form.title} onChangeText={set("title")} placeholder="Paint trunk area with POR-15" />
        <Field label="Where" value={form.where} onChangeText={set("where")} placeholder="under the bed, driver side" />
        <Chips label="Phase" options={SHOP_PHASES.map((p) => [p, p] as const)} value={form.phase} onChange={set("phase")} />
        <Chips label="Priority" options={prioOpts} value={form.priority} onChange={(v) => setForm((f) => ({ ...f, priority: v }))} />
        <Field label="About how long" value={form.time} onChangeText={set("time")} placeholder="2 hrs" />
        <Field label="You’ll need" hint="(one per line, say where it is)" value={form.needs} onChangeText={set("needs")} multiline placeholder={"POR-15 quart (paint cabinet)\nChip brushes (drawer under the bench)"} />
        <Field label="How" hint="(one step per line)" value={form.steps} onChangeText={set("steps")} multiline placeholder={"Wire-wheel any loose scale\nThin coat of POR-15"} />
        <Btn title={editing ? "Save job" : "Put it on the board"} kind="primary" onPress={submit} disabled={!form.title.trim()} />
      </Sheet>

      <Sheet visible={!!finishing} onClose={() => setFinishing(null)} title="Mark it done">
        <P>{finishing?.title}</P>
        <Field label="Anything the next person should know?" hint="(optional)" value={result} onChangeText={setResult} multiline placeholder="two coats, second one still tacky" />
        <Btn title="Done" kind="good" onPress={markDone} />
      </Sheet>
    </Screen>
  );
}
