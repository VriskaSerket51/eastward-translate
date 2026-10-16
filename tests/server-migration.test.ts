import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function deploy(filename: string) {
  const result = spawnSync(process.execPath,["--import","tsx","server/migrate.ts"],{
    env:{...process.env,DATABASE_URL:"file:" + filename.replaceAll("\\","/")},encoding:"utf8",
  });
  assert.equal(result.status,0,result.stdout + result.stderr);
}

test("Prisma deployment baselines legacy history without resetting rows or the ID sequence", () => {
  const directory = mkdtempSync(join(tmpdir(),"eastward-migration-"));
  const filename = join(directory,"legacy.db");
  try {
    const legacy = new DatabaseSync(filename);
    legacy.exec(`CREATE TABLE locale(id INTEGER PRIMARY KEY AUTOINCREMENT,path TEXT,lang TEXT,key TEXT,value TEXT,editedDate INTEGER NOT NULL DEFAULT 1726740805758,editor TEXT);
      INSERT INTO locale(path,lang,key,value,editedDate,editor) VALUES ('story.sq','ko','one','한글',1726740805758,'a'),('story.sq','ko','one','',1726740805759,'b'),('story.sq','ko','two',NULL,1726740805760,NULL);
      INSERT INTO locale(id,path) VALUES(100,'deleted'); DELETE FROM locale WHERE id=100;`);
    const expected = legacy.prepare("SELECT * FROM locale ORDER BY id").all();
    legacy.close();
    deploy(filename);
    deploy(filename);
    const db = new DatabaseSync(filename);
    try {
      assert.deepEqual(db.prepare("SELECT * FROM locale ORDER BY id").all(),expected);
      assert.equal(db.prepare("SELECT COUNT(*) AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL").get()!.count,2);
      assert.equal(db.prepare("SELECT type FROM pragma_table_info('locale') WHERE name='editedDate'").get()!.type,"BIGINT");
      assert.ok(Number(db.prepare("INSERT INTO locale(path,lang,key,value) VALUES('story.sq','ko','three','new')").run().lastInsertRowid) > 100);
    } finally { db.close(); }
    const fresh = join(directory,"fresh.db");
    deploy(fresh);
    const dbFresh = new DatabaseSync(fresh);
    try { assert.equal(dbFresh.prepare("SELECT COUNT(*) AS count FROM locale").get()!.count,0); }
    finally { dbFresh.close(); }
  } finally { rmSync(directory,{recursive:true,force:true}); }
});
