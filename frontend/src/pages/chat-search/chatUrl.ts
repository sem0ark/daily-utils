export const DEFAULT_CHAT_BASE_URL = "";
export const CHAT_BASE_URL_STORAGE_KEY = "daily-utils.chat-base-url";

const normalizeBaseUrl = (baseUrl: string) =>
  `${baseUrl.trim().replace(/\/+$/, "")}/`;

export const chatUrl = (baseUrl: string, id: string) => {
  const marker = "conversations/";
  const markerIndex = id.indexOf(marker);
  const suffix = markerIndex < 0 ? id : id.slice(markerIndex + marker.length);
  return `${normalizeBaseUrl(baseUrl)}conversations/${encodeURIComponent(suffix)}`;
};
