import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createChat = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    model: v.string(),
    params: v.object({
      temperature: v.optional(v.number()),
      maxTokens: v.optional(v.number()),
      topP: v.optional(v.number()),
      frequencyPenalty: v.optional(v.number()),
      presencePenalty: v.optional(v.number()),
      systemPrompt: v.optional(v.string()),
      stream: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("chats", {
      ...args,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const appendMessage = mutation({
  args: {
    chatId: v.id("chats"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
  },
  handler: async (ctx, { chatId, role, content }) => {
    const chat = await ctx.db.get(chatId);
    if (!chat) throw new Error("Chat not found");
    const messages = [
      ...chat.messages,
      { role, content, timestamp: Date.now() },
    ];
    // Auto-title from first user message
    let title = chat.title;
    if (title === "New Chat" && role === "user") {
      title = content.slice(0, 60) + (content.length > 60 ? "…" : "");
    }
    await ctx.db.patch(chatId, { messages, title, updatedAt: Date.now() });
  },
});

export const updateChatParams = mutation({
  args: {
    chatId: v.id("chats"),
    params: v.object({
      temperature: v.optional(v.number()),
      maxTokens: v.optional(v.number()),
      topP: v.optional(v.number()),
      frequencyPenalty: v.optional(v.number()),
      presencePenalty: v.optional(v.number()),
      systemPrompt: v.optional(v.string()),
      stream: v.optional(v.boolean()),
    }),
    model: v.optional(v.string()),
  },
  handler: async (ctx, { chatId, params, model }) => {
    const patch: Record<string, unknown> = { params, updatedAt: Date.now() };
    if (model) patch.model = model;
    await ctx.db.patch(chatId, patch);
  },
});

export const listChats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("chats")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const getChat = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, { chatId }) => ctx.db.get(chatId),
});

export const deleteChat = mutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, { chatId }) => ctx.db.delete(chatId),
});
