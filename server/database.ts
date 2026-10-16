import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { PrismaClient } from "../generated/prisma/client";
import { databaseUrl } from "./database-path";

export async function openDatabase(filename?: string) {
  const url = databaseUrl(filename);
  if (url !== ":memory:") mkdirSync(dirname(url.slice(5)), { recursive: true });
  const adapter = new PrismaBetterSqlite3({ url, timeout: 5000 });
  const client = new PrismaClient({ adapter });
  try {
    await client.$queryRaw`PRAGMA journal_mode=WAL`;
    // Bootstrap the unchanged legacy schema without replacing any rows or history.
    await client.$executeRaw`CREATE TABLE IF NOT EXISTS locale (
      id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT, lang TEXT, key TEXT, value TEXT,
      editedDate INTEGER NOT NULL DEFAULT 1726740805758, editor TEXT)`;
    await client.$executeRaw`CREATE INDEX IF NOT EXISTS locale_latest ON locale(path,lang,key,editedDate DESC,id DESC)`;
    await client.$executeRaw`CREATE INDEX IF NOT EXISTS locale_key ON locale(path,key)`;
    return { client, url };
  } catch (error) { await client.$disconnect(); throw error; }
}
