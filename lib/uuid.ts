const UUID_KEY = "hc-ai-playground-uuid";

export function getOrInitUuid(): string {
  if (typeof window === "undefined") return "";
  let uuid = localStorage.getItem(UUID_KEY);
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem(UUID_KEY, uuid);
  }
  return uuid;
}
