import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireCrew } from "./lib";

const priority = v.union(v.literal("now"), v.literal("soon"), v.literal("whenever"));
const fields = {
  title: v.string(), where: v.string(), phase: v.string(), priority, time: v.string(), needs: v.string(), steps: v.string(),
};

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireCrew(ctx);
    return await ctx.db.query("jobs").collect();
  },
});

export const save = mutation({
  args: { id: v.optional(v.id("jobs")), ...fields },
  handler: async (ctx, { id, ...data }) => {
    const me = await requireCrew(ctx);
    const now = Date.now();
    const clean = { ...data, title: data.title.trim(), where: data.where.trim(), time: data.time.trim(), needs: data.needs.trim(), steps: data.steps.trim() };
    if (!clean.title) throw new Error("A job needs a title");
    if (id) { await ctx.db.patch(id, { ...clean, updatedAt: now }); return id; }
    return await ctx.db.insert("jobs", { ...clean, status: "open", addedBy: me.short, createdAt: now, updatedAt: now });
  },
});

/** "I've got this." Anyone can take an open job; the card shows their color. */
export const claim = mutation({
  args: { id: v.id("jobs") },
  handler: async (ctx, { id }) => {
    const me = await requireCrew(ctx);
    const j = await ctx.db.get(id);
    if (!j || j.status === "done") return;
    await ctx.db.patch(id, { status: "claimed", claimedBy: me.short, claimedAt: Date.now(), updatedAt: Date.now() });
  },
});

/** Put it back on the board for someone else. */
export const release = mutation({
  args: { id: v.id("jobs") },
  handler: async (ctx, { id }) => {
    await requireCrew(ctx);
    const j = await ctx.db.get(id);
    if (!j || j.status !== "claimed") return;
    await ctx.db.patch(id, { status: "open", claimedBy: undefined, claimedAt: undefined, updatedAt: Date.now() });
  },
});

export const finish = mutation({
  args: { id: v.id("jobs"), result: v.optional(v.string()) },
  handler: async (ctx, { id, result }) => {
    const me = await requireCrew(ctx);
    const j = await ctx.db.get(id);
    if (!j) return;
    const now = Date.now();
    await ctx.db.patch(id, { status: "done", doneBy: j.claimedBy ?? me.short, doneAt: now, result: result?.trim() || undefined, updatedAt: now });
  },
});

/** Done by mistake, or it needs another coat. Comes back open and unclaimed. */
export const reopen = mutation({
  args: { id: v.id("jobs") },
  handler: async (ctx, { id }) => {
    await requireCrew(ctx);
    const j = await ctx.db.get(id);
    if (!j) return;
    await ctx.db.patch(id, { status: "open", claimedBy: undefined, claimedAt: undefined, doneBy: undefined, doneAt: undefined, result: undefined, updatedAt: Date.now() });
  },
});

export const setPriority = mutation({
  args: { id: v.id("jobs"), priority },
  handler: async (ctx, { id, priority: p }) => {
    await requireCrew(ctx);
    await ctx.db.patch(id, { priority: p, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("jobs") },
  handler: async (ctx, { id }) => {
    await requireCrew(ctx);
    await ctx.db.delete(id);
  },
});
