import { resolve } from "node:path";

export function databaseUrl(filename = process.env.DATABASE_URL ?? process.env.LOCALE_DB_PATH ?? "data/locale.db") {
  if (filename === ":memory:" || filename === "file::memory:") return ":memory:";
  const path = filename.startsWith("file:") ? filename.slice(5) : filename;
  if (!path || path.includes("?") || /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(path)) throw new Error("Provide a local SQLite database path or file: URL");
  return "file:" + resolve(path).replaceAll("\\", "/");
}
