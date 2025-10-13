// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.any(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed(),
    }),
    userProfiles: i.entity({
      credits: i.number().optional(),
      theme: i.string().optional(),
      hasPurchasedCredits: i.boolean().optional(),
    }),
    conversations: i.entity({
      name: i.string(),
      createdAt: i.date().indexed(),
      sessionId: i.string().optional(),
    }),
    messages: i.entity({
      role: i.string(),
      content: i.string(),
      createdAt: i.date(),
      model: i.string(),
      creditsConsumed: i.number().optional(),
    }),
    personas: i.entity({
      name: i.string(),
      createdAt: i.date(),
      prompt: i.string(),
      description: i.string().optional(),
    }),
    canvasProjects: i.entity({
      name: i.string().optional(),
      backgroundColor: i.string().optional(),
      viewportX: i.number().optional(),
      viewportY: i.number().optional(),
      viewportScale: i.number().optional(),
      lastModified: i.date().indexed().optional(),
      sessionId: i.string().optional().indexed(), // For unauthenticated users
    }),
    canvasElements: i.entity({
      type: i.string().indexed().optional(), // "image", "video", "text", "shape"
      x: i.number().optional(),
      y: i.number().optional(),
      width: i.number().optional(),
      height: i.number().optional(),
      rotation: i.number().optional(),
      scale: i.number().optional(),
      zIndex: i.number().optional(),
      // Crop properties
      cropX: i.number().optional(),
      cropY: i.number().optional(),
      cropWidth: i.number().optional(),
      cropHeight: i.number().optional(),
      // Video-specific properties
      duration: i.number().optional(),
      currentTime: i.number().optional(),
      isPlaying: i.boolean().optional(),
      volume: i.number().optional(),
      muted: i.boolean().optional(),
    }),
    canvasAssets: i.entity({
      type: i.string().indexed().optional(), // "image" or "video"
      duration: i.number().optional(), // For videos
      createdAt: i.date().indexed().optional(),
    }),
  },
  links: {
    conversationMessages: {
      forward: { on: "messages", has: "one", label: "conversation" },
      reverse: { on: "conversations", has: "many", label: "messages" },
    },
    conversationUser: {
      forward: { on: "conversations", has: "one", label: "user" },
      reverse: { on: "$users", has: "many", label: "conversations" },
    },
    userProfile: {
      forward: { on: "userProfiles", has: "one", label: "user" },
      reverse: { on: "$users", has: "one", label: "profile" },
    },
    userPersonas: {
      forward: { on: "personas", has: "one", label: "user" },
      reverse: { on: "$users", has: "many", label: "personas" },
    },
    messagePersona: {
      forward: { on: "messages", has: "one", label: "persona" },
      reverse: { on: "personas", has: "many", label: "messages" },
    },
    // Canvas links
    canvasProjectUser: {
      forward: { on: "canvasProjects", has: "one", label: "user" },
      reverse: { on: "$users", has: "many", label: "canvasProjects" },
    },
    canvasProjectElements: {
      forward: { on: "canvasElements", has: "one", label: "project" },
      reverse: { on: "canvasProjects", has: "many", label: "elements" },
    },
    canvasElementAsset: {
      forward: { on: "canvasElements", has: "one", label: "asset" },
      reverse: { on: "canvasAssets", has: "many", label: "elements" },
    },
    canvasAssetUser: {
      forward: { on: "canvasAssets", has: "one", label: "user" },
      reverse: { on: "$users", has: "many", label: "canvasAssets" },
    },
    canvasAssetFile: {
      forward: { on: "canvasAssets", has: "one", label: "file" },
      reverse: { on: "$files", has: "one", label: "canvasAsset" },
    },
  },
  rooms: {},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
