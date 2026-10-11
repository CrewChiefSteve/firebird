import { useEffect, useState } from "react";
import { Switch, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useM, useQ } from "@/lib/data";
import { F, useColors } from "@/lib/theme";
import { errText, todayIso } from "@/lib/format";
import { pickImages, shrink, upload } from "@/lib/upload";
import { photo } from "@/lib/site";
import { Btn, Card, Chips, DateField, Field, Label, Loading, Msg, Muted, P, Row, Screen } from "@/components/ui";

type Photo = { storageId?: Id<"_storage">; url?: string; caption: string; preview: string };
const blank = { title: "", date: todayIso(), phase: "rust", summary: "", body: "", published: true };

export default function PostEdit() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const posts = useQ(api.posts.all);
  const phases = useQ(api.phases.list);
  const save = useM(api.posts.save);
  const uploadUrl = useM(api.posts.generateUploadUrl);
  const [form, setForm] = useState(blank);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [ready, setReady] = useState(!id);
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const existing = id ? posts?.find((p) => p._id === id) : undefined;

  useEffect(() => {
    if (ready || !existing) return;
    setForm({ title: existing.title, date: existing.date, phase: existing.phase, summary: existing.summary, body: existing.body, published: existing.published });
    setPhotos(existing.photos.map((ph) => ({ storageId: (ph.storageId as Id<"_storage"> | null) ?? undefined, url: ph.storageId ? undefined : ph.url, caption: ph.caption, preview: photo(ph.url) })));
    setReady(true);
  }, [existing, ready]);

  if (posts && id && !existing && !ready) return <Screen><Muted>That post is gone.</Muted></Screen>;
  if (!posts || !phases || !ready) return <Loading />;
  const set = (k: "title" | "date" | "phase" | "summary" | "body") => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function add(from: "camera" | "library") {
    setMsg("");
    const picked = await pickImages(from, from === "library");
    for (const p of picked) {
      setUploading((n) => n + 1);
      try {
        const small = await shrink(p, 1600, 0.85);
        const storageId = await upload(await uploadUrl({}), small);
        setPhotos((ps) => [...ps, { storageId, caption: "", preview: small.uri }]);
      } catch (e) { setMsg("Upload failed: " + errText(e)); }
      finally { setUploading((n) => n - 1); }
    }
  }

  async function submit() {
    if (!form.title.trim()) return setMsg("Needs a title.");
    setSaving(true);
    try {
      await save({ id: (id as Id<"posts"> | undefined) ?? undefined, ...form, title: form.title.trim(), photos: photos.map(({ storageId, url, caption }) => ({ storageId, url, caption })) });
      router.back();
    } catch (e) { setMsg("Couldn’t save: " + errText(e)); }
    finally { setSaving(false); }
  }

  const move = (i: number) => setPhotos((ps) => { const x = [...ps]; [x[i - 1], x[i]] = [x[i], x[i - 1]]; return x; });

  return (
    <Screen>
      <Stack.Screen options={{ title: id ? "Edit post" : "New post" }} />
      <Field label="Title" value={form.title} onChangeText={set("title")} placeholder="Floors are out" />
      <DateField label="Date" value={form.date} onChange={set("date")} />
      <Chips label="Phase" options={phases.map((p) => [p.key, p.name] as const)} value={form.phase} onChange={set("phase")} />
      <Field label="One-line summary" value={form.summary} onChangeText={set("summary")} placeholder="Under the headline and on share cards" />
      <Field label="Story" value={form.body} onChangeText={set("body")} multiline style={{ minHeight: 180 }}
        placeholder={"What got done, what’s next. Blank line between paragraphs. Start a line with - for a bullet."} />

      <Label>Photos {photos.length ? `(${photos.length}) · the first one leads` : ""}</Label>
      <Row>
        <Btn title="Camera" kind="gold" style={{ flex: 1 }} onPress={() => add("camera")} />
        <Btn title="From photos" style={{ flex: 1 }} onPress={() => add("library")} />
      </Row>
      {uploading > 0 && <Muted>Uploading {uploading}…</Muted>}
      {photos.map((ph, i) => (
        <Card key={ph.preview} style={{ flexDirection: "row", gap: 10, padding: 8 }}>
          <Image source={{ uri: ph.preview }} style={{ width: 84, height: 84, borderRadius: 4 }} contentFit="cover" />
          <View style={{ flex: 1, gap: 6 }}>
            <TextInput value={ph.caption} onChangeText={(t) => setPhotos((ps) => ps.map((x, j) => (j === i ? { ...x, caption: t } : x)))} placeholder="caption" placeholderTextColor={c.muted}
              style={{ fontFamily: F.sans, fontSize: 15, color: c.ink, borderBottomWidth: 1, borderBottomColor: c.line, paddingVertical: 6 }} />
            <Row>
              <Btn small kind="quiet" title="↑ Move up" disabled={i === 0} onPress={() => move(i)} />
              <Btn small kind="quiet" title="✕ Remove" onPress={() => setPhotos((ps) => ps.filter((_, j) => j !== i))} />
            </Row>
          </View>
        </Card>
      ))}

      <Row>
        <Switch value={form.published} onValueChange={(v) => setForm((f) => ({ ...f, published: v }))} trackColor={{ true: c.good, false: c.line }} />
        <P style={{ flex: 1 }}>{form.published ? "Published. It’s on the public site within a minute." : "Draft. Only the crew sees it."}</P>
      </Row>
      <Msg text={msg} />
      <Btn title={saving ? "Saving…" : id ? "Save changes" : form.published ? "Post it" : "Save draft"} kind="primary" busy={saving} disabled={uploading > 0} onPress={submit} />
    </Screen>
  );
}
