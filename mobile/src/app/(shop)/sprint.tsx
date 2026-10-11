import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Slider from "@/components/Slider";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { useM, useQ } from "@/lib/data";
import { F, useColors } from "@/lib/theme";
import { SHOP_PHASES, SPRINT_PHASES } from "@/lib/site";
import { confirm } from "@/lib/confirm";
import { Btn, Card, Chips, Field, H2, Loading, Muted, P, Row, Screen, Section } from "@/components/ui";

const statusOpts = [["done", "Done"], ["active", "Active"], ["up-next", "Up next"], ["later", "Later"]] as const;

function PhaseRow({ p }: { p: Doc<"phases"> }) {
  const c = useColors();
  const update = useM(api.phases.update);
  const [pct, setPct] = useState(p.pct);
  return (
    <Card style={{ gap: 8 }}>
      <Row>
        <P style={{ flex: 1, fontFamily: F.sans7 }}>{p.name}</P>
        <Text style={{ fontFamily: F.mono, fontSize: 15, color: c.ink }}>{pct}%</Text>
      </Row>
      <Slider value={pct} onChange={setPct} onDone={(v) => update({ id: p._id, pct: v, status: p.status })} />
      <Chips options={statusOpts} value={p.status} onChange={(s) => update({ id: p._id, pct, status: s })} />
    </Card>
  );
}

export default function Sprint() {
  const c = useColors();
  const tasks = useQ(api.tasks.list);
  const phases = useQ(api.phases.list);
  const add = useM(api.tasks.add);
  const cycle = useM(api.tasks.cycle);
  const remove = useM(api.tasks.remove);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  if (!tasks || !phases) return <Loading text="Loading the board…" />;

  const shown = SPRINT_PHASES.concat(SHOP_PHASES.filter((p) => !SPRINT_PHASES.includes(p) && tasks.some((t) => t.phase === p)));
  const submit = async (phase: string) => {
    const title = (drafts[phase] ?? "").trim();
    if (!title) return;
    await add({ phase, title });
    setDrafts((d) => ({ ...d, [phase]: "" }));
  };

  return (
    <Screen>
      <Section title="Two-week sprint" hint="tap a box: to do → doing → done">
        {shown.map((ph) => {
          const ts = tasks.filter((t) => t.phase === ph).sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || a.order - b.order);
          const done = ts.filter((t) => t.status === "done").length;
          return (
            <Card key={ph} style={{ gap: 8 }}>
              <Row>
                <H2 style={{ flex: 1, fontSize: 19 }}>{ph}</H2>
                <Muted style={{ fontFamily: F.mono4 }}>{done}/{ts.length}</Muted>
              </Row>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: c.line, overflow: "hidden" }}>
                <View style={{ width: `${ts.length ? (done / ts.length) * 100 : 0}%`, height: "100%", backgroundColor: c.good }} />
              </View>
              {ts.map((t) => (
                <Row key={t._id} style={{ alignItems: "flex-start" }}>
                  <Pressable onPress={() => cycle({ id: t._id })} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: t.status === "done" }} accessibilityLabel={`${t.title}, ${t.status}`}
                    style={{ width: 28, height: 28, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center",
                      borderColor: t.status === "done" ? c.good : t.status === "doing" ? c.warn : c.line, backgroundColor: t.status === "done" ? c.good : t.status === "doing" ? c.warnSoft : "transparent" }}>
                    <Text style={{ fontFamily: F.sans7, color: t.status === "done" ? "#fff" : c.warn }}>{t.status === "done" ? "✓" : t.status === "doing" ? "›" : ""}</Text>
                  </Pressable>
                  <View style={{ flex: 1, paddingTop: 3 }}>
                    <P style={t.status === "done" ? { color: c.muted, textDecorationLine: "line-through" } : undefined}>{t.title}</P>
                    {t.note ? <Muted>{t.note}</Muted> : null}
                  </View>
                  <Btn small kind="quiet" title="✕" onPress={async () => { if (await confirm("Remove this task?", t.title, "Remove", true)) remove({ id: t._id }); }} />
                </Row>
              ))}
              <Row>
                <Field value={drafts[ph] ?? ""} onChangeText={(v) => setDrafts((d) => ({ ...d, [ph]: v }))} placeholder={`Add a task to ${ph}`} onSubmitEditing={() => submit(ph)} returnKeyType="done" />
                <Btn title="Add" onPress={() => submit(ph)} />
              </Row>
            </Card>
          );
        })}
      </Section>

      <Section title="Public progress" hint="what the front page shows">
        {phases.map((p) => <PhaseRow key={p._id} p={p} />)}
      </Section>
    </Screen>
  );
}
