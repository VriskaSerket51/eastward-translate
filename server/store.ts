import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

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
const ranked = `WITH ranked AS (SELECT *, ROW_NUMBER() OVER
  (PARTITION BY path, lang, key ORDER BY editedDate DESC, id DESC) AS rank FROM locale`;

/** Keeps the existing append-only locale schema and makes each save atomic. */
export class TranslationStore {
  private readonly db: DatabaseSync;
  constructor(filename: string) {
    if (filename !== ":memory:") mkdirSync(dirname(resolve(filename)), { recursive: true });
    this.db = new DatabaseSync(filename, { timeout: 5000 });
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS locale (
        id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT, lang TEXT, key TEXT, value TEXT,
        editedDate INTEGER NOT NULL DEFAULT 1726740805758, editor TEXT);
      CREATE INDEX IF NOT EXISTS locale_latest ON locale(path,lang,key,editedDate DESC,id DESC);
      CREATE INDEX IF NOT EXISTS locale_key ON locale(path,key);`);
  }
  close() { this.db.close(); }
  private all<T>(sql: string, ...args: (string | number | null)[]): T[] { return this.db.prepare(sql).all(...args) as T[]; }
  latest(lang?: string, path?: string): LocaleRow[] {
    const conditions: string[] = [];
    const args: string[] = [];
    if (lang !== undefined) { conditions.push("lang=?"); args.push(lang); }
    if (path !== undefined) { conditions.push("path=?"); args.push(path); }
    const where = conditions.length ? " WHERE " + conditions.join(" AND ") : "";
    return this.all<LocaleRow>(ranked + where + ") SELECT id,path,lang,key,value,editedDate,editor FROM ranked WHERE rank=1 ORDER BY path,key,lang", ...args);
  }
  paths(): string[] { return this.all<{ path: string }>("SELECT DISTINCT path FROM locale ORDER BY path").map(row => row.path); }
  languages(): string[] { return this.all<{ lang: string }>("SELECT DISTINCT lang FROM locale ORDER BY lang").map(row => row.lang); }
  csv(path: string): Record<string, Record<string, string | null>> {
    const result: Record<string, Record<string, string | null>> = Object.create(null);
    for (const row of this.latest(undefined, path)) { result[row.key] ??= Object.create(null); result[row.key][row.lang] = row.value; }
    return result;
  }
  save(path: unknown, lang: unknown, editor: unknown, changes: unknown) {
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
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const known = this.db.prepare("SELECT 1 FROM locale WHERE path=? AND key=? LIMIT 1");
      const current = this.db.prepare("SELECT value FROM locale WHERE path=? AND lang=? AND key=? ORDER BY editedDate DESC,id DESC LIMIT 1");
      const insert = this.db.prepare("INSERT INTO locale(path,lang,key,value,editedDate,editor) VALUES(?,?,?,?,?,?)");
      const now = Date.now();
      for (const entry of entries) {
        if (!known.get(path, entry.key)) throw new InputError("Unknown asset or key: " + entry.key);
        const value = (current.get(path, target, entry.key) as { value: string | null } | undefined)?.value ?? null;
        if ("expectedValue" in entry && value !== entry.expectedValue) throw new InputError("Translation changed since it was loaded: " + entry.key, 409);
        if (value !== entry.value) insert.run(path, target, entry.key, entry.value, now, editor);
      }
      this.db.exec("COMMIT");
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  seed(rows: { path: string; lang: string; key: string; value: string | null }[]) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const insert = this.db.prepare(`INSERT INTO locale(path,lang,key,value)
        SELECT ?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM locale WHERE path=? AND lang=? AND key=?)`);
      for (const row of rows) insert.run(row.path,row.lang,row.key,row.value,row.path,row.lang,row.key);
      this.db.exec("COMMIT");
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  history(lang: string) {
    return this.all<{path:string;editor:string;editedDate:number}>(`WITH edits AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY path ORDER BY editedDate DESC,id DESC) rank FROM locale WHERE lang=? AND editor IS NOT NULL)
      SELECT path,editor,editedDate FROM edits WHERE rank=1 ORDER BY editedDate DESC,id DESC LIMIT 100`, lang);
  }
  diff(path: string, lang: string) {
    const rows = this.all<LocaleRow>(`SELECT id,path,lang,key,value,editedDate,editor FROM
      (SELECT *,COUNT(*) OVER(PARTITION BY key) cnt FROM locale WHERE path=? AND lang=?) WHERE cnt>1 ORDER BY key,editedDate DESC,id DESC`,path,lang);
    const result: Record<string, LocaleRow[]> = Object.create(null);
    for (const row of rows) { result[row.key] ??= []; result[row.key].push(row); }
    return result;
  }
  remaining(lang: string) {
    // Every original key remains in the target count, even before that language has rows.
    const rows = this.all<{path:string;key:string;value:string|null}>(`WITH original AS (SELECT DISTINCT path,key FROM locale),
      target AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY path,key ORDER BY editedDate DESC,id DESC) rank FROM locale WHERE lang=?)
      SELECT o.path,o.key,t.value FROM original o LEFT JOIN target t ON o.path=t.path AND o.key=t.key AND t.rank=1 ORDER BY o.path,o.key`,lang);
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
  export(lang: string) {
    return { language: lang, translations: this.latest(lang).filter(row => row.value !== null).map(({path,key,value}) => ({path,key,value})) };
  }
}
