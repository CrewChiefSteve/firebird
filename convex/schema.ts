import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Who may sign in. Matched against the Clerk email, case-insensitive.
  crew: defineTable({
    email: v.string(),
    name: v.string(),
    short: v.string(), // "steve" | "nick" | "jen" — stable key used in sessions
    color: v.string(),
    canClock: v.boolean(), // Jennifer sees the clock but doesn't punch
    canPay: v.boolean(), // Jennifer marks hours paid
    order: v.number(),
  }).index("by_email", ["email"]).index("by_short", ["short"]),

  active: defineTable({
    who: v.string(), // crew.short
    start: v.number(),
    phase: v.string(),
    note: v.string(),
  }).index("by_who", ["who"]),

  sessions: defineTable({
    who: v.string(),
    phase: v.string(),
    note: v.string(),
    start: v.number(),
    end: v.number(),
    minutes: v.number(),
    manual: v.boolean(),
    paid: v.boolean(),
    paidAt: v.optional(v.number()),
  }).index("by_start", ["start"]).index("by_who", ["who", "start"]),

  tasks: defineTable({
    phase: v.string(),
    title: v.string(),
    status: v.union(v.literal("todo"), v.literal("doing"), v.literal("done")),
    order: v.number(),
    note: v.optional(v.string()),
    doneAt: v.optional(v.number()),
  }).index("by_phase", ["phase", "order"]),

  parts: defineTable({
    name: v.string(),
    phase: v.string(),
    qty: v.number(),
    vendor: v.string(),
    cost: v.number(),
    pn: v.string(),
    eta: v.string(), // YYYY-MM-DD or ""
    status: v.union(v.literal("need"), v.literal("ordered"), v.literal("received"), v.literal("installed")),
    note: v.string(),
    updated: v.number(),
  }),

  phases: defineTable({
    key: v.string(),
    name: v.string(),
    status: v.union(v.literal("done"), v.literal("active"), v.literal("up-next"), v.literal("later")),
    pct: v.number(),
    blurb: v.string(),
    order: v.number(),
  }).index("by_order", ["order"]).index("by_key", ["key"]),

  posts: defineTable({
    slug: v.string(),
    title: v.string(),
    date: v.string(), // YYYY-MM-DD
    phase: v.string(), // phases.key
    summary: v.string(),
    body: v.string(), // simple markdown
    photos: v.array(
      v.object({
        storageId: v.optional(v.id("_storage")),
        url: v.optional(v.string()), // legacy static photo under /photos
        caption: v.optional(v.string()),
      }),
    ),
    published: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]).index("by_date", ["date"]),

  // Out-of-pocket purchases waiting on reimbursement from Jennifer.
  receipts: defineTable({
    who: v.string(), // crew.short of whoever paid
    date: v.string(), // YYYY-MM-DD on the receipt
    vendor: v.string(),
    total: v.number(), // dollars
    phase: v.string(), // phases.key or "other"
    note: v.string(),
    storageId: v.id("_storage"),
    kind: v.union(v.literal("image"), v.literal("pdf")),
    reimbursed: v.boolean(),
    reimbursedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_who", ["who", "date"]).index("by_date", ["date"]),
});
