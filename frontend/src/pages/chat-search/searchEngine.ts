import MiniSearch from "minisearch";
import type { Conversation } from "./types";

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "what",
  "with",
]);

const MAX_RESULTS = 50;
const MIN_SCORE = 0;

export interface ChatSearchResult {
  id: string;
  score: number;
  title: string;
  snippet: string;
}

export interface ChatSearchResponse {
  results: ChatSearchResult[];
  isBroadMatch: boolean;
}

interface SearchDocument {
  id: string;
  title: string;
  messages: string;
}

const toSearchDocument = (conversation: Conversation): SearchDocument => ({
  id: conversation.id,
  title: conversation.name ?? "Untitled chat",
  messages: conversation.messages
    .map((message) => message.content ?? "")
    .join("\n"),
});

const queryTerms = (query: string) =>
  query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.replace(/[^\p{L}\p{N}-]/gu, ""))
    .filter((term) => term.length > 0 && !STOPWORDS.has(term));

const makeSnippet = (document: SearchDocument, query: string) => {
  const terms = queryTerms(query);
  const text = [document.title, document.messages].filter(Boolean).join("\n");
  const lowerText = text.toLowerCase();
  const matchIndex = terms.reduce((best, term) => {
    const index = lowerText.indexOf(term);
    return index >= 0 && (best < 0 || index < best) ? index : best;
  }, -1);

  if (matchIndex < 0) return text.slice(0, 240);

  const start = Math.max(0, matchIndex - 100);
  const end = Math.min(text.length, matchIndex + 140);
  return `${start > 0 ? "..." : ""}${text.slice(start, end)}${end < text.length ? "..." : ""}`;
};

export class ChatSearchEngine {
  private readonly index = new MiniSearch<SearchDocument>({
    idField: "id",
    fields: ["title", "messages"],
    storeFields: ["title", "messages"],
    processTerm: (term) => {
      const normalized = term.toLowerCase();
      return STOPWORDS.has(normalized) ? null : normalized;
    },
    searchOptions: {
      prefix: (term) => term.length >= 3,
      fuzzy: (term) => (term.length >= 5 ? 0.2 : false),
      boost: { title: 3, messages: 1 },
      combineWith: "AND",
    },
  });

  private initialized = false;

  initialize(conversations: Conversation[]) {
    if (this.initialized) return;
    this.index.addAll(conversations.map(toSearchDocument));
    this.initialized = true;
  }

  upsert(conversations: Conversation[]) {
    if (!this.initialized) {
      this.initialize(conversations);
      return;
    }

    conversations.forEach((conversation) => {
      const document = toSearchDocument(conversation);
      if (this.index.has(document.id)) this.index.replace(document);
      else this.index.add(document);
    });
  }

  search(query: string): ChatSearchResponse {
    if (!query.trim()) return { results: [], isBroadMatch: false };

    const search = (combineWith: "AND" | "OR") =>
      this.index
        .search(query, { combineWith })
        .filter((result) => result.score > MIN_SCORE);
    let rawResults = search("AND");
    const isBroadMatch = rawResults.length === 0;
    if (isBroadMatch) rawResults = search("OR");

    return {
      isBroadMatch,
      results: rawResults.slice(0, MAX_RESULTS).map((result) => {
        const document = result as typeof result & SearchDocument;
        return {
          id: String(result.id),
          score: result.score,
          title: String(document.title ?? "Untitled chat"),
          snippet: makeSnippet(document, query),
        };
      }),
    };
  }
}
