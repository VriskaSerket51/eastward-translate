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
  private async all<T>(query: Prisma.Sql): Promise<T[]> {
    const rows = await this.db.$queryRaw<Record<string, unknown>[]>(query);
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
  async paths(): Promise<string[]> {
    const rows = await this.db.locale.findMany({ select: {path:true}, where: {path:{not:null}}, distinct: ["path"], orderBy: {path:"asc"} });
    return rows.map(row => row.path!);
  }
  async languages(): Promise<string[]> {
    const rows = await this.db.locale.findMany({ select: {lang:true}, where: {lang:{not:null}}, distinct: ["lang"], orderBy: {lang:"asc"} });
    return rows.map(row => row.lang!);
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
    await this.write(async tx => {
      const keys = entries.map(entry => entry.key);
      const known = new Set((await tx.locale.findMany({where:{path,key:{in:keys}},select:{key:true},distinct:["key"]})).map(row => row.key));
      const rows = await tx.locale.findMany({where:{path,lang:target,key:{in:keys}},select:{key:true,value:true},orderBy:[{editedDate:"desc"},{id:"desc"}],distinct:["key"]});
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
      const existing = await tx.locale.findMany({select:{path:true,lang:true,key:true},distinct:["path","lang","key"]});
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
  async remaining(lang: string) {
    // Every original key remains in the target count, even before that language has rows.
    const rows = await this.all<{path:string;key:string;value:string|null}>(Prisma.sql`WITH original AS (SELECT DISTINCT path,key FROM locale),
      target AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY path,key ORDER BY editedDate DESC,id DESC) rank FROM locale WHERE lang=${lang})
      SELECT o.path,o.key,t.value FROM original o LEFT JOIN target t ON o.path=t.path AND o.key=t.key AND t.rank=1 ORDER BY o.path,o.key`);
    const totals = { main: {total:0,remain:0}, mrpg: {total:0,remain:0}, dlc: {total:0,remain:0} };
    const paths: Record<string,{path:string;total:number;remain:number}> = Object.create(null);
    const keys: Record<string,string[]> = Object.create(null);
    for (const row of rows) {
      const count = paths[row.path] ??= {path:row.path,total:0,remain:0};
      count.total++;
      if (row.value === null) { count.remain++; (keys[row.path] ??= []).push(row.key); }
      if (!row.path.includes("DEMO")) {
        const group = row.path.startsWith("farm/") ? totals.dlc : row.path.includes("MRPG") ? totals.mrpg : totals.main;
        group.total++; if (row.value === null) group.remain++;
      }
    }
    return { totals, paths: Object.values(paths), keys };
  }
  async export(lang: string) {
    return { language: lang, translations: (await this.latest(lang)).filter(row => row.value !== null).map(({path,key,value}) => ({path,key,value})) };
  }
}
