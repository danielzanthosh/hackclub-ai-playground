import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getOrCreateUser = mutation({
  args: { uuid: v.string() },
  handler: async (ctx, { uuid }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_uuid", (q) => q.eq("uuid", uuid))
      .unique();
    if (existing) return existing._id;

    return await ctx.db.insert("users", {
      uuid,
      name: "Hack Clubber",
      avatarColor: "#ec3750",
      accentColor: "#ec3750",
      apiKey: "",
      baseUrl: "https://ai.hackclub.com/proxy/v1",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getUserByUuid = query({
  args: { uuid: v.string() },
  handler: async (ctx, { uuid }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_uuid", (q) => q.eq("uuid", uuid))
      .unique();
  },
});

export const updateUser = mutation({
  args: {
    uuid: v.string(),
    name: v.optional(v.string()),
    avatarColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
    customModels: v.optional(v.array(v.string())),
    defaultChatModel: v.optional(v.string()),
    defaultImageModel: v.optional(v.string()),
    defaultEmbeddingModel: v.optional(v.string()),
  },
  handler: async (ctx, { uuid, ...updates }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_uuid", (q) => q.eq("uuid", uuid))
      .unique();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { ...updates, updatedAt: Date.now() });
  },
});
