import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveGeneration = mutation({
  args: {
    userId: v.id("users"),
    mode: v.union(
      v.literal("image"),
      v.literal("speech-tts"),
      v.literal("speech-stt"),
      v.literal("music"),
      v.literal("embedding"),
      v.literal("utility")
    ),
    prompt: v.string(),
    params: v.string(),
    outputUrl: v.optional(v.string()),
    outputText: v.optional(v.string()),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("generations", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const listGenerations = query({
  args: {
    userId: v.id("users"),
    mode: v.optional(v.union(
      v.literal("image"),
      v.literal("speech-tts"),
      v.literal("speech-stt"),
      v.literal("music"),
      v.literal("embedding"),
      v.literal("utility")
    )),
  },
  handler: async (ctx, { userId, mode }) => {
    const q = ctx.db
      .query("generations")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc");
    const results = await q.take(100);
    if (mode) return results.filter((g) => g.mode === mode);
    return results;
  },
});
