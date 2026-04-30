import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // One document per browser UUID — no auth needed
  users: defineTable({
    uuid: v.string(),
    name: v.string(),
    avatarColor: v.string(),        // hex color for avatar gradient
    accentColor: v.string(),        // one of HC palette hex values
    apiKey: v.string(),             // AES-GCM encrypted
    baseUrl: v.string(),            // default: "https://ai.hackclub.com/proxy/v1"
    customModels: v.optional(v.array(v.string())),
    defaultChatModel: v.optional(v.string()),
    defaultImageModel: v.optional(v.string()),
    defaultEmbeddingModel: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_uuid", ["uuid"]),

  // Chat sessions
  chats: defineTable({
    userId: v.id("users"),
    title: v.string(),
    model: v.string(),
    messages: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
      content: v.string(),           // JSON-stringified ContentPart[] or plain string
      timestamp: v.number(),
    })),
    params: v.object({
      temperature: v.optional(v.number()),
      maxTokens: v.optional(v.number()),
      topP: v.optional(v.number()),
      frequencyPenalty: v.optional(v.number()),
      presencePenalty: v.optional(v.number()),
      systemPrompt: v.optional(v.string()),
      stream: v.optional(v.boolean()),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // Image/audio/music generations
  generations: defineTable({
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
    params: v.string(),              // JSON-stringified model params
    outputUrl: v.optional(v.string()),
    outputText: v.optional(v.string()),
    model: v.string(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),
});
