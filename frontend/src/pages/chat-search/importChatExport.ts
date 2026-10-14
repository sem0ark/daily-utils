import { chatDb } from "./db";
import type { ChatMessage, Conversation, ImportResult } from "./types";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const asNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const normalizeMessage = (value: unknown): ChatMessage => {
  const message = asRecord(value);
  const model = asRecord(message?.model);

  return {
    role: asString(message?.role, "assistant"),
    content: asString(message?.content),
    model: { id: asString(model?.id, "Unknown model") },
  };
};

const normalizeConversation = (value: unknown): Conversation | null => {
  const source = asRecord(value);
  const id = asString(source?.id);
  if (!id) return null;

  const model = asRecord(source?.model);
  const messages = Array.isArray(source?.messages)
    ? source.messages.map(normalizeMessage)
    : [];

  return {
    id,
    reference: asString(source?.reference),
    name: asString(source?.name, "Untitled chat"),
    model: { id: asString(model?.id, "Unknown model") },
    prompt: asString(source?.prompt),
    temperature: asNumber(source?.temperature),
    messages,
    updatedAt: asNumber(source?.updatedAt),
  };
};

export const deduplicateConversations = (conversations: Conversation[]) => {
  const byId = new Map<string, Conversation>();
  conversations.forEach((conversation) => {
    const previous = byId.get(conversation.id);
    if (!previous || conversation.updatedAt > previous.updatedAt) {
      byId.set(conversation.id, conversation);
    }
  });
  return [...byId.values()];
};

export async function importChatFile(file: File): Promise<ImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error(`${file.name} is not valid JSON.`);
  }

  const root = asRecord(parsed);
  if (!Array.isArray(root?.history)) {
    throw new Error(`${file.name} does not contain a history array.`);
  }

  const incoming = deduplicateConversations(
    root.history
      .map(normalizeConversation)
      .filter(
        (conversation): conversation is Conversation => conversation !== null,
      ),
  );
  const existing = await chatDb.conversations.bulkGet(
    incoming.map(({ id }) => id),
  );
  const toSave: Conversation[] = [];
  let added = 0;
  let updated = 0;

  incoming.forEach((conversation, index) => {
    const previous = existing[index];
    if (!previous) {
      added++;
      toSave.push(conversation);
    } else if (conversation.updatedAt > previous.updatedAt) {
      updated++;
      toSave.push(conversation);
    }
  });

  if (toSave.length > 0) await chatDb.conversations.bulkPut(toSave);

  return {
    added,
    updated,
    skipped: Math.max(0, root.history.length - toSave.length),
    changed: toSave,
  };
}

export { normalizeConversation };
