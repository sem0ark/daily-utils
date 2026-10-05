import { describe, expect, it } from "vitest";
import {
  deduplicateConversations,
  normalizeConversation,
} from "./importChatExport";

describe("chat export normalization", () => {
  it("rejects records without an id and supplies safe defaults", () => {
    expect(normalizeConversation({ messages: "invalid" })).toBeNull();
    expect(
      normalizeConversation({
        id: "chat-1",
        messages: [{ role: "user", content: 123 }],
      }),
    ).toMatchObject({
      id: "chat-1",
      name: "Untitled chat",
      model: { id: "Unknown model" },
      messages: [
        {
          role: "user",
          content: "",
          model: { id: "Unknown model" },
        },
      ],
    });
  });

  it("keeps the newest duplicate conversation", () => {
    const older = normalizeConversation({
      id: "chat-1",
      updatedAt: 10,
      messages: [{ content: "old" }],
    });
    const newer = normalizeConversation({
      id: "chat-1",
      updatedAt: 20,
      messages: [{ content: "new" }],
    });

    expect(deduplicateConversations([older!, newer!])).toEqual([newer]);
  });

  it("does not replace a newer record with an older duplicate", () => {
    const older = normalizeConversation({
      id: "chat-1",
      updatedAt: 10,
      messages: [{ content: "old" }],
    });
    const newer = normalizeConversation({
      id: "chat-1",
      updatedAt: 20,
      messages: [{ content: "new" }],
    });

    expect(deduplicateConversations([newer!, older!])).toEqual([newer]);
  });
});
