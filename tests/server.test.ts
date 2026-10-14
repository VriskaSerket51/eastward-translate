import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TranslationStore } from "../server/store";
import { TranslationService } from "../server/service";

function seed(store: TranslationStore) {
  store.seed([
    {path:"story/demo.sq",lang:"en",key:"one",value:"Hello"},
    {path:"story/demo.sq",lang:"en",key:"two",value:"World"},
    {path:"farm/demo.sq",lang:"en",key:"farm",value:"Farm"},
  ]);
}
test("legacy database rows and equal timestamps retain history and deterministic latest values", () => {
  const directory = mkdtempSync(join(tmpdir(), "eastward-db-"));
  try {
    const filename = join(directory,"locale.db");
    const original = new DatabaseSync(filename);
    original.exec(`CREATE TABLE locale(id INTEGER PRIMARY KEY AUTOINCREMENT,path TEXT,lang TEXT,key TEXT,value TEXT,editedDate INTEGER NOT NULL DEFAULT 1726740805758,editor TEXT);
      INSERT INTO locale(path,lang,key,value,editedDate,editor) VALUES ('story/demo.sq','ko','one','first',100,'a'),('story/demo.sq','ko','one','last',100,'b');`);
    original.close();
    const store = new TranslationStore(filename);
    try {
      assert.equal(store.latest("ko")[0].value,"last");
      assert.equal(store.diff("story/demo.sq","ko").one.length,2);
      store.seed([{path:"story/demo.sq",lang:"ko",key:"one",value:"seed"}]);
      assert.equal(store.latest("ko")[0].value,"last");
      assert.equal(store.history("ko")[0].editor,"b");
    } finally { store.close(); }
  } finally { rmSync(directory,{recursive:true,force:true}); }
});
test("batches roll back, conflicts retain drafts, empty strings are translations, custom language keys survive export", async () => {
  const store = new TranslationStore(":memory:");
  try {
    seed(store);
    const service = new TranslationService(store);
    const post = (changes: unknown[], lang = "x-test") => service.handle(new Request("http://localhost/sq/translate",{method:"POST",body:JSON.stringify({path:"story/demo.sq",editor:"tester",lang,translations:changes})}));
    assert.equal((await post([{key:"one",value:"first"},{key:"missing",value:"bad"}])).status,400);
    assert.equal(store.latest("x-test").length,0);
    assert.equal((await post([{key:"one",value:"안녕\n日本語",expectedValue:null},{key:"two",value:"",expectedValue:null}])).status,200);
    assert.equal((await post([{key:"one",value:"stale",expectedValue:null}])).status,409);
    assert.equal((await post([{key:"one",value:123}])).status,400);
    assert.equal((await post([{key:"one",value:"bad"}],"children")).status,400);
    const exported = await (await service.handle(new Request("http://localhost/sq/export?lang=x-test"))).json();
    assert.deepEqual(exported,{language:"x-test",translations:[{path:"story/demo.sq",key:"one",value:"안녕\n日本語"},{path:"story/demo.sq",key:"two",value:""}]});
    assert.deepEqual(store.remaining("x-test").totals,{main:{total:2,remain:0},mrpg:{total:0,remain:0},dlc:{total:1,remain:1}});
    assert.deepEqual(await (await service.handle(new Request("http://localhost/sq/languages"))).json(),["en","x-test"]);
    const csv = await (await service.handle(new Request("http://localhost/sq/value?path=story%2Fdemo.sq&lang=x-test"))).json();
    assert.equal(csv.csv.one["x-test"],"안녕\n日本語");
    assert.equal((await service.handle(new Request("http://localhost/sq/value"))).status,400);
    assert.equal((await service.handle(new Request("http://localhost/sq/value?path=missing"))).status,404);
  } finally { store.close(); }
});
test("source outlines are not translation caches and dialogue empty strings suppress fallback", async () => {
  const store = new TranslationStore(":memory:");
  try {
    seed(store);
    const original = {children:[{directive:"one",chara:"John",fallback:"original"}]};
    const game = {outline:async () => structuredClone(original)};
    const service = new TranslationService(store,game as never);
    store.save("story/demo.sq","ko","a",[{key:"one",value:"first"}]);
    assert.equal((await service.value("story/demo.sq","ko")).script!.children![0].ko,"first");
    store.save("story/demo.sq","ko","a",[{key:"one",value:""}]);
    const updated = (await service.value("story/demo.sq","ko")).script!.children![0];
    assert.equal(updated.ko,""); assert.equal(updated.fallback,undefined);
    assert.equal(original.children[0].fallback,"original");
  } finally { store.close(); }
});
