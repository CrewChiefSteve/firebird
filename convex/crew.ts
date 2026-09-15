import { query } from "./_generated/server";
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
