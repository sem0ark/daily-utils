import Dexie, { type Table } from "dexie";
import type { Conversation } from "./types";

class ChatDatabase extends Dexie {
  conversations!: Table<Conversation, string>;

  constructor() {
    super("DailyUtilsChatSearch");
    this.version(1).stores({
      conversations: "id, name, updatedAt",
    });
  }
}

export const chatDb = new ChatDatabase();
