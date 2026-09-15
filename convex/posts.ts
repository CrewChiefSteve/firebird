import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireCrew } from "./lib";
import { Doc } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";

async function withUrls(ctx: QueryCtx, p: Doc<"posts">) {
  const photos = await Promise.all(
    p.photos.map(async (ph) => ({
      caption: ph.caption ?? "",
      url: ph.storageId ? await ctx.storage.getUrl(ph.storageId) : ph.url ?? null,
      storageId: ph.storageId ?? null,
    })),
  );
  return { ...p, photos: photos.filter((x) => x.url) as { caption: string; url: string; storageId: string | null }[] };
}

/** Public: published posts, newest first. */
export const published = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("posts").withIndex("by_date").order("desc").collect();
    const out = [];
    for (const p of rows) if (p.published) out.push(await withUrls(ctx, p));
    return out;
  },
});

/** Public: one post by slug (null if unpublished or missing). */
export const bySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const p = await ctx.db.query("posts").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
    if (!p || !p.published) return null;
    return await withUrls(ctx, p);
  },
});

/** Crew: every post including drafts. */
export const all = query({
  args: {},
  handler: async (ctx) => {
    await requireCrew(ctx);
    const rows = await ctx.db.query("posts").withIndex("by_date").order("desc").collect();
    return await Promise.all(rows.map((p) => withUrls(ctx, p)));
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCrew(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "update";
}

export const save = mutation({
  args: {
    id: v.optional(v.id("posts")),
    title: v.string(),
    date: v.string(),
    phase: v.string(),
    summary: v.string(),
    body: v.string(),
    photos: v.array(v.object({ storageId: v.optional(v.id("_storage")), url: v.optional(v.string()), caption: v.optional(v.string()) })),
    published: v.boolean(),
  },
  handler: async (ctx, { id, ...data }) => {
    await requireCrew(ctx);
    const now = Date.now();
    if (id) {
      await ctx.db.patch(id, { ...data, updatedAt: now });
      return id;
    }
    let slug = `${data.date}-${slugify(data.title)}`;
    let n = 2;
    while (await ctx.db.query("posts").withIndex("by_slug", (q) => q.eq("slug", slug)).unique()) slug = `${data.date}-${slugify(data.title)}-${n++}`;
    return await ctx.db.insert("posts", { ...data, slug, createdAt: now, updatedAt: now });
  },
});

export const remove = mutation({
  args: { id: v.id("posts") },
  handler: async (ctx, { id }) => {
    await requireCrew(ctx);
    const p = await ctx.db.get(id);
    if (!p) return;
    for (const ph of p.photos) if (ph.storageId) await ctx.storage.delete(ph.storageId);
    await ctx.db.delete(id);
  },
});
