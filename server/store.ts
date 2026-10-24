import { Prisma, type PrismaClient } from "../generated/prisma/client";
import { openDatabase } from "./database";

export type Translation = { key: string; value: string | null; expectedValue?: string | null };
export type LocaleRow = { id: number; path: string; lang: string; key: string; value: string | null; editedDate: number; editor: string | null };
export class InputError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function language(value: unknown = "ko"): string {
  if (typeof value !== "string" || !/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(value) || ["children", "type", "args", "file", "chara", "chara_en", "directive", "fallback", "constructor", "prototype"].includes(value)) throw new InputError("Invalid language ID");
  return value;
}
function text(value: unknown, label: string, limit: number): asserts value is string {
  if (typeof value !== "string" || !value.trim() || value.length > limit) throw new InputError(`Invalid ${label}`);
}
const ranked = Prisma.sql`WITH ranked AS (SELECT *, ROW_NUMBER() OVER
  (PARTITION BY path, lang, key ORDER BY editedDate DESC, id DESC) AS rank FROM locale`;
const writes = new Map<string | symbol, Promise<void>>();

/** Keeps the existing append-only locale schema and makes each save atomic. */
export class TranslationStore {
  private constructor(private readonly db: PrismaClient, private readonly writeKey: string | symbol) {}
  static async open(filename?: string) {
    const { client, url } = await openDatabase(filename);
    return new TranslationStore(client, url === ":memory:" ? Symbol() : url);
  }
  close() { return this.db.$disconnect(); }
  private async all<T>(query: Prisma.Sql, db: Pick<PrismaClient, "$queryRaw"> = this.db): Promise<T[]> {
    const rows = await db.$queryRaw<Record<string, unknown>[]>(query);
    return rows.map(row => Object.fromEntries(Object.entries(row).map(([key,value]) => [key, typeof value === "bigint" ? Number(value) : value])) as T);
  }
  private async write<T>(action: (tx: Prisma.TransactionClient) => Promise<T>) {
    const previous = writes.get(this.writeKey) ?? Promise.resolve();
    const operation = previous.then(() => this.db.$transaction(async tx => {
      // Acquire the SQLite write lock before reading expected values, as BEGIN IMMEDIATE did.
      await tx.$executeRaw`UPDATE locale SET id=id WHERE 0`;
      return action(tx);
    }, { timeout: 30000, maxWait: 10000 }));
    const pending = operation.then(() => {}, () => {});
    writes.set(this.writeKey, pending);
    try { return await operation; }
    finally { if (writes.get(this.writeKey) === pending) writes.delete(this.writeKey); }
  }
  async latest(lang?: string, path?: string): Promise<LocaleRow[]> {
    const conditions: Prisma.Sql[] = [];
    if (lang !== undefined) conditions.push(Prisma.sql`lang=${lang}`);
    if (path !== undefined) conditions.push(Prisma.sql`path=${path}`);
    const where = conditions.length ? Prisma.sql` WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;
    return this.all<LocaleRow>(Prisma.sql`${ranked}${where}) SELECT id,path,lang,key,value,editedDate,editor FROM ranked WHERE rank=1 ORDER BY path,key,lang`);
  }
  async hasPath(path: string): Promise<boolean> {
    return await this.db.locale.findFirst({where:{path},select:{id:true}}) !== null;
  }
  async paths(): Promise<string[]> {
    const rows = await this.all<{path:string}>(Prisma.sql`SELECT DISTINCT path FROM locale WHERE path IS NOT NULL ORDER BY path`);
    return rows.map(row => row.path);
  }
  async languages(): Promise<string[]> {
    const rows = await this.all<{lang:string}>(Prisma.sql`SELECT DISTINCT lang FROM locale WHERE lang IS NOT NULL ORDER BY lang`);
    return rows.map(row => row.lang);
  }
  async csv(path: string): Promise<Record<string, Record<string, string | null>>> {
    const result: Record<string, Record<string, string | null>> = Object.create(null);
    for (const row of await this.latest(undefined, path)) { result[row.key] ??= Object.create(null); result[row.key][row.lang] = row.value; }
    return result;
  }
  async save(path: unknown, lang: unknown, editor: unknown, changes: unknown) {
    text(path, "asset path", 4096); text(editor, "editor", 128);
    const target = language(lang);
    if (!Array.isArray(changes) || changes.length > 5000) throw new InputError("Invalid translation batch");
    const seen = new Set<string>();
    const entries: Translation[] = changes.map(change => {
      if (!change || typeof change !== "object") throw new InputError("Invalid translation");
      text(change.key, "translation key", 4096);
      if (seen.has(change.key)) throw new InputError("Duplicate translation key: " + change.key);
      seen.add(change.key);
      if (change.value !== null && (typeof change.value !== "string" || change.value.length > 1024 * 1024)) throw new InputError("Invalid translation value");
      if ("expectedValue" in change && change.expectedValue !== null && typeof change.expectedValue !== "string") throw new InputError("Invalid expected value");
      return change as Translation;
    });
    if (!entries.length) return;
    await this.write(async tx => {
      const keys = Prisma.join(entries.map(entry => entry.key));
      const known = new Set((await tx.$queryRaw<{key:string}[]>(Prisma.sql`SELECT DISTINCT key FROM locale WHERE path=${path} AND key IN (${keys})`)).map(row => row.key));
      const rows = await tx.$queryRaw<{key:string;value:string|null}[]>(Prisma.sql`SELECT key,value FROM
        (SELECT key,value,ROW_NUMBER() OVER(PARTITION BY key ORDER BY editedDate DESC,id DESC) rank
          FROM locale WHERE path=${path} AND lang=${target} AND key IN (${keys})) WHERE rank=1`);
      const current = new Map(rows.map(row => [row.key,row.value]));
      const now = BigInt(Date.now());
      const data: Prisma.LocaleCreateManyInput[] = [];
      for (const entry of entries) {
        if (!known.has(entry.key)) throw new InputError("Unknown asset or key: " + entry.key);
        const value = current.get(entry.key) ?? null;
        if ("expectedValue" in entry && value !== entry.expectedValue) throw new InputError("Translation changed since it was loaded: " + entry.key, 409);
        if (value !== entry.value) data.push({path,lang:target,key:entry.key,value:entry.value,editedDate:now,editor});
      }
      if (data.length) await tx.locale.createMany({data});
    });
  }
  async seed(rows: { path: string; lang: string; key: string; value: string | null }[]) {
    await this.write(async tx => {
      const existing = await tx.$queryRaw<{path:string;lang:string;key:string}[]>`SELECT DISTINCT path,lang,key FROM locale`;
      const keys = new Set(existing.map(row => JSON.stringify([row.path,row.lang,row.key])));
      const data = rows.filter(row => {
        const key = JSON.stringify([row.path,row.lang,row.key]);
        if (keys.has(key)) return false;
        keys.add(key); return true;
      });
      for (let offset = 0; offset < data.length; offset += 1000) await tx.locale.createMany({data:data.slice(offset,offset+1000)});
    });
  }
  async history(lang: string) {
    return this.all<{path:string;editor:string;editedDate:number}>(Prisma.sql`WITH edits AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY path ORDER BY editedDate DESC,id DESC) rank FROM locale WHERE lang=${lang} AND editor IS NOT NULL)
      SELECT path,editor,editedDate FROM edits WHERE rank=1 ORDER BY editedDate DESC,id DESC LIMIT 100`);
  }
  async diff(path: string, lang: string) {
    const rows = await this.all<LocaleRow>(Prisma.sql`SELECT id,path,lang,key,value,editedDate,editor FROM
      (SELECT *,COUNT(*) OVER(PARTITION BY key) cnt FROM locale WHERE path=${path} AND lang=${lang}) WHERE cnt>1 ORDER BY key,editedDate DESC,id DESC`);
    const result: Record<string, LocaleRow[]> = Object.create(null);
    for (const row of rows) { result[row.key] ??= []; result[row.key].push(row); }
    return result;
  }
  async remaining(lang: string, includeKeys = true) {
    // Count each source key once, including languages with no translations yet.
    const source = Prisma.sql`WITH original AS (SELECT DISTINCT path,key FROM locale)`;
    const untranslated = Prisma.sql`(SELECT value FROM locale WHERE path=o.path AND lang=${lang} AND key=o.key
      ORDER BY editedDate DESC,id DESC LIMIT 1) IS NULL`;
    const summary = Prisma.sql`${source}
      SELECT o.path,COUNT(*) total,SUM(CASE WHEN ${untranslated} THEN 1 ELSE 0 END) remain
      FROM original o GROUP BY o.path ORDER BY o.path`;
    const missing = Prisma.sql`${source}
      SELECT o.path,o.key FROM original o WHERE ${untranslated} ORDER BY o.path,o.key`;
    const [rows, untranslatedKeys] = includeKeys
      ? await this.db.$transaction(tx => Promise.all([
        this.all<{path:string;total:number;remain:number}>(summary,tx),
        this.all<{path:string;key:string}>(missing,tx),
      ]))
      : [await this.all<{path:string;total:number;remain:number}>(summary), []] as const;
    const totals = { main: {total:0,remain:0}, mrpg: {total:0,remain:0}, dlc: {total:0,remain:0} };
    for (const row of rows) {
      if (!row.path.includes("DEMO")) {
        const group = row.path.startsWith("farm/") ? totals.dlc : row.path.includes("MRPG") ? totals.mrpg : totals.main;
        group.total += row.total; group.remain += row.remain;
      }
    }
    const keys: Record<string,string[]> = Object.create(null);
    for (const row of untranslatedKeys) (keys[row.path] ??= []).push(row.key);
    return { totals, paths: rows, keys };
  }
  async export(lang: string) {
    return { language: lang, translations: (await this.latest(lang)).filter(row => row.value !== null).map(({path,key,value}) => ({path,key,value})) };
  }
}
