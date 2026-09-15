import { mutation, query } from "./_generated/server";
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
