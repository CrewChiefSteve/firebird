import { MutationCtx, QueryCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

/** The signed-in crew member, or null if the viewer isn't on the crew list. */
export async function currentCrew(ctx: QueryCtx | MutationCtx): Promise<Doc<"crew"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  const email = identity?.email?.toLowerCase();
  if (!email) return null;
  return await ctx.db.query("crew").withIndex("by_email", (q) => q.eq("email", email)).unique();
}

export async function requireCrew(ctx: QueryCtx | MutationCtx): Promise<Doc<"crew">> {
  const crew = await currentCrew(ctx);
  if (!crew) throw new Error("Not on the crew list");
  return crew;
}

export const PHASES = [
  "Rust Repair",
  "POR-15",
  "Rear End",
  "Front Clip",
  "Drivetrain",
  "Body & Paint",
  "Interior",
  "Other",
];
