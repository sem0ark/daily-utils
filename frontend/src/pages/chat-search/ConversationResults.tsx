import type { ChatSearchResult } from "./searchEngine";
import { HighlightedText } from "./HighlightedText";

export function ConversationResults({
  entries,
  query,
  selectedId,
  onSelect,
}: {
  entries: ChatSearchResult[];
  query: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="h-[65vh] min-w-0 overflow-y-auto rounded-lg border-2 border-neutral-200 bg-neutral-50 p-4">
      <div className="flex flex-col gap-4 rounded-md">
        {entries.length === 0 ? (
          <div className="rounded-lg border-2 border-neutral-500 bg-neutral-50 p-6 text-neutral-600">
            Search results will appear here.
          </div>
        ) : (
          entries.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => onSelect(result.id)}
              className={`w-full rounded-lg border-2 p-4 text-left transition-colors hover:bg-white ${selectedId === result.id ? "border-blue-500 bg-blue-50" : "border-neutral-500 bg-neutral-50"}`}
            >
              <strong className="block truncate text-blue-500">
                <HighlightedText text={result.title} query={query} />
              </strong>
              <p className="mt-2 max-w-full font-mono text-sm break-words whitespace-pre-wrap text-neutral-700">
                <HighlightedText text={result.snippet} query={query} />
              </p>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
