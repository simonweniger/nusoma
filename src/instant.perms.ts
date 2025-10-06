// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react";

const rules = {
  conversations: {
    allow: {
      view: "auth.id in data.ref('user.id') || ruleParams.sessionId == data.sessionId",
      create: "true",
      update:
        "auth.id in data.ref('user.id') || ruleParams.sessionId == data.sessionId",
      delete:
        "auth.id in data.ref('user.id') || ruleParams.sessionId == data.sessionId",
    },
  },
  messages: {
    allow: {
      view: "auth.id in data.ref('conversation.user.id') || ruleParams.sessionId in data.ref('conversation.sessionId')",
      create: "true",
      update:
        "auth.id in data.ref('conversation.user.id') || ruleParams.sessionId in data.ref('conversation.sessionId')",
      delete:
        "auth.id in data.ref('conversation.user.id') || ruleParams.sessionId in data.ref('conversation.sessionId')",
    },
  },
  $files: {
    allow: {
      view: "true",
      create: "true",
      delete: "true",
    },
  },
} satisfies InstantRules;

export default rules;
