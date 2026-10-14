import { useEffect, useMemo, useRef } from "react";
import { HighlightedText } from "./HighlightedText";
import type { Conversation } from "./types";

const toThreadText = (conversation: Conversation) =>
  conversation.messages
    .map((message, index) => {
      return [`[${index + 1}] ${message.role}`, message.content ?? ""]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

export function ConversationPreview({
  conversation,
  query,
}: {
  conversation: Conversation | null;
  query: string;
}) {
  const firstMatchRef = useRef<HTMLElement | null>(null);
  const threadText = useMemo(
    () => (conversation ? toThreadText(conversation) : ""),
    [conversation],
  );

  useEffect(() => {
    firstMatchRef.current?.scrollIntoView({ block: "center" });
  }, [conversation?.id, query]);

  if (!conversation) {
    return (
      <div className="rounded-lg border-2 border-dashed border-neutral-300 p-12 text-center text-neutral-500">
        Select a conversation to preview it.
      </div>
    );
  }

  return (
    <section className="flex h-[65vh] min-w-0 flex-col rounded-lg border-2 border-neutral-200 bg-neutral-50 p-4">
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border-2 border-neutral-500 bg-white p-4">
        <pre className="font-mono text-sm leading-6 break-words whitespace-pre-wrap text-neutral-800">
          <HighlightedText
            text={threadText}
            query={query}
            firstMatchRef={firstMatchRef}
          />
        </pre>
      </div>
    </section>
  );
}
