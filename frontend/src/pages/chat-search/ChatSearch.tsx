import { useCallback, useEffect, useState } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { FileUpload } from "../../common/FileUpload";
import { chatDb } from "./db";
import { importChatFile } from "./importChatExport";
import { ChatSearchEngine, type ChatSearchResult } from "./searchEngine";
import type { Conversation, ImportStats } from "./types";
import { ConversationPreview } from "./ConversationPreview";
import { ConversationMetadata } from "./ConversationMetadata";
import { ConversationResults } from "./ConversationResults";

const engine = new ChatSearchEngine();

export function ChatSearch() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [results, setResults] = useState<ChatSearchResult[]>([]);
  const [isBroadMatch, setIsBroadMatch] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedConversation =
    conversations.find(({ id }) => id === selectedId) ?? null;

  const refresh = useCallback(async () => {
    const records = await chatDb.conversations.toArray();
    engine.initialize(records);
    setConversations(records);
  }, []);

  useEffect(() => {
    void refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  const handleSearch = (value: string) => {
    setQuery(value);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const response = engine.search(query);
      setResults(response.results);
      setIsBroadMatch(response.isBroadMatch);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  const handleImport = async (files: File[]) => {
    setIsImporting(true);
    setError(null);
    setImportStats(null);

    try {
      const totals: ImportStats = { added: 0, updated: 0, skipped: 0 };
      for (const file of files) {
        const stats = await importChatFile(file);
        engine.upsert(stats.changed);
        totals.added += stats.added;
        totals.updated += stats.updated;
        totals.skipped += stats.skipped;
      }
      setImportStats(totals);
      setConversations(await chatDb.conversations.toArray());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Import failed.");
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-neutral-300 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-8 text-center text-3xl font-bold">Chat Search</h1>
      <div className="flex flex-col gap-6">
        <p className="text-neutral-600">
          Import exported chat JSON files and search them locally. Your data
          never leaves this browser.
        </p>

        <FileUpload
          allowedFileTypes={["application/json", ".json"]}
          onFileUpload={(files) => void handleImport(files)}
          className={isImporting ? "pointer-events-none opacity-50" : undefined}
        />

        {isImporting && (
          <p className="font-bold text-blue-500">Importing conversations...</p>
        )}
        {importStats && (
          <div className="rounded-lg border-2 border-neutral-500 bg-neutral-100 p-4">
            Added {importStats.added}, updated {importStats.updated}, skipped{" "}
            {importStats.skipped}.
          </div>
        )}
        {error && (
          <div className="rounded-lg border-2 border-red-500 bg-red-50 p-4 font-bold text-red-600">
            {error}
          </div>
        )}

        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-neutral-500" />
          <input
            value={query}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Search conversations or messages..."
            className="w-full rounded-lg border-2 border-neutral-500 bg-neutral-50 py-3 pr-12 pl-12 outline-none focus:border-blue-500 focus:bg-white"
          />
          {query && (
            <button
              type="button"
              onClick={() => handleSearch("")}
              className="absolute top-1/2 right-4 -translate-y-1/2 text-neutral-500 hover:text-blue-500"
              aria-label="Clear search"
            >
              <XMarkIcon className="size-5" />
            </button>
          )}
        </div>

        <div className="w-full rounded-lg border-2 border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
          {query
            ? `${results.length} ${isBroadMatch ? "broader matches" : "matching chats"}`
            : `${conversations.length} cached chats`}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
          <ConversationResults
            entries={results}
            query={query}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <ConversationPreview
            conversation={selectedConversation}
            query={query}
          />
        </div>
        <ConversationMetadata conversation={selectedConversation} />
      </div>
    </div>
  );
}
