import { useEffect, useState } from "react";
import {
  CHAT_BASE_URL_STORAGE_KEY,
  chatUrl,
  DEFAULT_CHAT_BASE_URL,
} from "./chatUrl";
import type { Conversation } from "./types";

const value = (item: unknown) => {
  if (item === undefined || item === null || item === "") return "—";
  if (typeof item === "object") return JSON.stringify(item);
  return String(item);
};

export function ConversationMetadata({
  conversation,
}: {
  conversation: Conversation | null;
}) {
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_CHAT_BASE_URL;
    return (
      window.localStorage.getItem(CHAT_BASE_URL_STORAGE_KEY) ??
      DEFAULT_CHAT_BASE_URL
    );
  });

  useEffect(() => {
    window.localStorage.setItem(CHAT_BASE_URL_STORAGE_KEY, baseUrl);
  }, [baseUrl]);

  if (!conversation) return null;

  const url = chatUrl(baseUrl, conversation.id);
  const copyUrl = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const fields = [
    ["ID", conversation.id],
    ["Name", conversation.name],
    ["Reference", conversation.reference],
    ["Model", conversation.model?.id],
    ["Temperature", conversation.temperature],
    ["Updated at", conversation.updatedAt],
    ["Message count", conversation.messages.length],
  ] as const;

  return (
    <section className="rounded-lg border-2 border-neutral-200 bg-neutral-50 p-4">
      <h2 className="mb-3 font-bold text-neutral-700">Conversation metadata</h2>
      <dl className="grid gap-x-6 gap-y-3 font-mono text-sm sm:grid-cols-2">
        {fields.map(([label, item]) => (
          <div key={label}>
            <dt className="font-bold text-neutral-500">{label}</dt>
            <dd className="break-words whitespace-pre-wrap text-neutral-800">
              {value(item)}
            </dd>
          </div>
        ))}
        <div className="sm:col-span-2">
          <label htmlFor="chat-base-url" className="font-bold text-neutral-500">
            Chat base URL
          </label>
          <input
            id="chat-base-url"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            className="mt-1 block w-full rounded border-2 border-neutral-400 bg-white px-2 py-1 font-mono text-sm text-neutral-800 outline-none focus:border-blue-500"
            placeholder={DEFAULT_CHAT_BASE_URL}
          />
        </div>
        <div className="sm:col-span-2">
          <dt className="font-bold text-neutral-500">Chat URL</dt>
          <dd>
            <button
              type="button"
              onClick={() => void copyUrl()}
              className="max-w-full text-left break-all text-blue-600 underline hover:text-blue-800"
              title="Copy chat URL"
            >
              {copied ? "Copied" : url}
            </button>
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-bold text-neutral-500">Prompt</dt>
          <dd className="break-words whitespace-pre-wrap text-neutral-800">
            {value(conversation.prompt)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
