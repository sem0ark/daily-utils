export interface ChatMessage {
  role: "user" | "assistant" | string;
  content?: string;
  model?: { id?: string };
}

export interface Conversation {
  id: string;
  reference?: string;
  name?: string;
  model?: { id?: string };
  prompt?: string;
  temperature?: number;
  messages: ChatMessage[];
  updatedAt: number;
}

export interface ImportStats {
  added: number;
  updated: number;
  skipped: number;
}

export interface ImportResult extends ImportStats {
  changed: Conversation[];
}
