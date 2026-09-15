import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { currentCrew } from "./lib";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const crew = await currentCrew(ctx);
    return { signedIn: !!identity, email: identity?.email ?? null, crew };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("crew").collect();
    return all.sort((a, b) => a.order - b.order).map(({ email: _e, ...rest }) => rest);
  },
});

/** Admin knob, run from the CLI:
 *  npx convex run --prod crew:setFlags '{"email":"jen@cobbracingteam.com","canPay":true}'
 */
export const setFlags = internalMutation({
  args: { email: v.string(), canClock: v.optional(v.boolean()), canPay: v.optional(v.boolean()) },
  handler: async (ctx, { email, canClock, canPay }) => {
    const row = await ctx.db.query("crew").withIndex("by_email", (q) => q.eq("email", email.toLowerCase())).unique();
    if (!row) throw new Error(`No crew row for ${email}`);
    const patch: { canClock?: boolean; canPay?: boolean } = {};
    if (canClock !== undefined) patch.canClock = canClock;
    if (canPay !== undefined) patch.canPay = canPay;
    await ctx.db.patch(row._id, patch);
    return { ...row, ...patch };
  },
});

/** Admin knob: move a crew member to a new sign-in email.
 *  npx convex run --prod crew:setEmail '{"short":"jen","email":"new@example.com"}'
 */
export const setEmail = internalMutation({
  args: { short: v.string(), email: v.string() },
  handler: async (ctx, { short, email }) => {
    const row = await ctx.db.query("crew").withIndex("by_short", (q) => q.eq("short", short)).unique();
    if (!row) throw new Error(`No crew row for ${short}`);
    const clean = email.trim().toLowerCase();
    const taken = await ctx.db.query("crew").withIndex("by_email", (q) => q.eq("email", clean)).unique();
    if (taken && taken._id !== row._id) throw new Error(`${clean} already belongs to ${taken.name}`);
    await ctx.db.patch(row._id, { email: clean });
    return { name: row.name, was: row.email, now: clean };
  },
});
