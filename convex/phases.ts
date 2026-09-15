import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireCrew } from "./lib";

/** Public: the progress strip on the front page. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("phases").withIndex("by_order").collect();
  },
});

export const update = mutation({
  args: {
    id: v.id("phases"),
    pct: v.number(),
    status: v.union(v.literal("done"), v.literal("active"), v.literal("up-next"), v.literal("later")),
  },
  handler: async (ctx, { id, pct, status }) => {
    await requireCrew(ctx);
    await ctx.db.patch(id, { pct: Math.max(0, Math.min(100, Math.round(pct))), status });
  },
});

/** Admin knob, run from the CLI:
 *  npx convex run --prod phases:set '{"key":"rust","pct":25}'
 */
export const set = internalMutation({
  args: {
    key: v.string(),
    pct: v.optional(v.number()),
    status: v.optional(v.union(v.literal("done"), v.literal("active"), v.literal("up-next"), v.literal("later"))),
  },
  handler: async (ctx, { key, pct, status }) => {
    const p = await ctx.db.query("phases").withIndex("by_key", (q) => q.eq("key", key)).unique();
    if (!p) throw new Error(`No phase "${key}"`);
    const patch: { pct?: number; status?: typeof p.status } = {};
    if (pct !== undefined) patch.pct = Math.max(0, Math.min(100, Math.round(pct)));
    if (status !== undefined) patch.status = status;
    await ctx.db.patch(p._id, patch);
    return { ...p, ...patch };
  },
});
