"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { todayIso } from "./util";

type Photo = { storageId?: Id<"_storage">; url?: string; caption?: string; preview: string };
const blank = { title: "", date: todayIso(), phase: "rust", summary: "", body: "", published: true };

/** Downscale an image in the browser so uploads stay small (max 1600px on the long side). */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size < 900_000) return file;
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((res) => c.toBlob((b) => res(b ?? file), "image/jpeg", 0.85));
}

export function Posts() {
  const posts = useQuery(api.posts.all);
  const phases = useQuery(api.phases.list);
  const save = useMutation(api.posts.save);
  const remove = useMutation(api.posts.remove);
  const uploadUrl = useMutation(api.posts.generateUploadUrl);
  const [form, setForm] = useState(blank);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [editing, setEditing] = useState<Id<"posts"> | null>(null);
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  if (!posts || !phases) return <div className="shop-loading">Loading posts…</div>;

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function addFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      setUploading((n) => n + 1);
      try {
        const blob = await shrink(file);
        const url = await uploadUrl();
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": blob.type || "image/jpeg" }, body: blob });
        const { storageId } = await res.json();
        setPhotos((p) => [...p, { storageId, caption: "", preview: URL.createObjectURL(blob) }]);
      } catch (e) { setMsg("Upload failed: " + (e as Error).message); }
      finally { setUploading((n) => n - 1); }
    }
  }
  function edit(p: NonNullable<typeof posts>[number]) {
    setEditing(p._id);
    setForm({ title: p.title, date: p.date, phase: p.phase, summary: p.summary, body: p.body, published: p.published });
    setPhotos(p.photos.map((ph) => ({ storageId: (ph.storageId as Id<"_storage">) ?? undefined, url: ph.storageId ? undefined : ph.url, caption: ph.caption, preview: ph.url })));
    window.scrollTo({ top: 0 });
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await save({ id: editing ?? undefined, ...form, title: form.title.trim(), photos: photos.map(({ storageId, url, caption }) => ({ storageId, url, caption })) });
      setMsg(editing ? "Post updated." : form.published ? "Posted! It's live on the public site within a minute." : "Draft saved.");
      setForm(blank); setPhotos([]); setEditing(null);
    } catch (err) { setMsg("Couldn't save: " + (err as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="two posts-layout">
      <section className="panel">
        <header><h2>{editing ? "Edit post" : "New post"}</h2><span className="hint">{msg}</span></header>
        <form className="bd" onSubmit={submit}>
          <label className="f">Title<input value={form.title} onChange={set("title")} placeholder="Floors are out" required /></label>
          <div className="row">
            <label className="f">Date<input type="date" value={form.date} onChange={set("date")} /></label>
            <label className="f">Phase<select value={form.phase} onChange={set("phase")}>{phases.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}</select></label>
          </div>
          <label className="f">One-line summary<input value={form.summary} onChange={set("summary")} placeholder="Shows under the headline and on the Facebook card" /></label>
          <label className="f">Story<textarea rows={8} value={form.body} onChange={set("body")} placeholder={"What got done, what's next. Blank line between paragraphs. Start a line with - for a bullet."} /></label>
          <label className="f">Photos
            <input type="file" accept="image/*" multiple onChange={(e) => addFiles(e.target.files)} />
          </label>
          {(photos.length > 0 || uploading > 0) && (
            <div className="thumbs">
              {photos.map((ph, i) => (
                <div className="thumb" key={ph.preview}>
                  <img src={ph.preview} alt="" />
                  <input placeholder="caption" value={ph.caption ?? ""} onChange={(e) => setPhotos((ps) => ps.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} />
                  <div className="row">
                    <button type="button" className="btn quiet" disabled={i === 0} onClick={() => setPhotos((ps) => { const c = [...ps]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; })}>↑</button>
                    <button type="button" className="btn quiet" onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}>✕</button>
                  </div>
                </div>
              ))}
              {uploading > 0 && <div className="thumb uploading">Uploading {uploading}…</div>}
            </div>
          )}
          <label className="chk"><input type="checkbox" checked={form.published} onChange={set("published")} /> Published (uncheck to keep as a draft)</label>
          <div className="row">
            <button className="btn primary" type="submit" disabled={saving || uploading > 0}>{saving ? "Saving…" : editing ? "Save changes" : form.published ? "Post it" : "Save draft"}</button>
            {editing && <button className="btn" type="button" onClick={() => { setEditing(null); setForm(blank); setPhotos([]); }}>Cancel</button>}
          </div>
        </form>
      </section>

      <section className="panel">
        <header><h2>All posts</h2><span className="hint">{posts.length}</span></header>
        <div className="bd">
          {posts.map((p) => (
            <div className="postrow" key={p._id}>
              {p.photos[0] && <img src={p.photos[0].url} alt="" />}
              <div>
                <div className="pt">{p.title} {!p.published && <span className="pill need">draft</span>}</div>
                <div className="m">{p.date} · {p.photos.length} photo{p.photos.length === 1 ? "" : "s"}</div>
                <div className="row" style={{ marginTop: 6 }}>
                  <button className="btn" onClick={() => edit(p)}>Edit</button>
                  {p.published && <a className="btn" href={`/log/${p.slug}`} target="_blank" rel="noopener">View</a>}
                  <button className="btn quiet" onClick={() => { if (confirm(`Delete "${p.title}"? Its uploaded photos go too.`)) remove({ id: p._id }); }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
