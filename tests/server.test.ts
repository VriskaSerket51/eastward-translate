import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TranslationStore } from "../server/store";
import { TranslationService } from "../server/service";

async function seed(store: TranslationStore) {
  await store.seed([
    {path:"story/demo.sq",lang:"en",key:"one",value:"Hello"},
    {path:"story/demo.sq",lang:"en",key:"two",value:"World"},
    {path:"farm/demo.sq",lang:"en",key:"farm",value:"Farm"},
  ]);
}
test("legacy database rows and equal timestamps retain history and deterministic latest values", async () => {
  const directory = mkdtempSync(join(tmpdir(), "eastward-db-"));
  try {
    const filename = join(directory,"locale.db");
    const original = new DatabaseSync(filename);
    original.exec(`CREATE TABLE locale(id INTEGER PRIMARY KEY AUTOINCREMENT,path TEXT,lang TEXT,key TEXT,value TEXT,editedDate INTEGER NOT NULL DEFAULT 1726740805758,editor TEXT);
      INSERT INTO locale(path,lang,key,value,editedDate,editor) VALUES ('story/demo.sq','ko','one','first',100,'a'),('story/demo.sq','ko','one','last',100,'b');`);
    original.close();
    const store = await TranslationStore.open(filename);
    try {
      assert.equal((await store.latest("ko"))[0].value,"last");
      assert.equal((await store.diff("story/demo.sq","ko")).one.length,2);
      await store.seed([{path:"story/demo.sq",lang:"ko",key:"one",value:"seed"}]);
      assert.equal((await store.latest("ko"))[0].value,"last");
      assert.equal((await store.history("ko"))[0].editor,"b");
    } finally { await store.close(); }
  } finally { rmSync(directory,{recursive:true,force:true}); }
});
test("batches roll back, conflicts retain drafts, empty strings are translations, custom language keys survive export", async () => {
  const store = await TranslationStore.open(":memory:");
  try {
    await seed(store);
    const service = new TranslationService(store);
    const post = (changes: unknown[], lang = "x-test") => service.handle(new Request("http://localhost/sq/translate",{method:"POST",body:JSON.stringify({path:"story/demo.sq",editor:"tester",lang,translations:changes})}));
    assert.equal((await post([{key:"one",value:"first"},{key:"missing",value:"bad"}])).status,400);
    assert.equal((await store.latest("x-test")).length,0);
    assert.equal((await post([{key:"one",value:"안녕\n日本語",expectedValue:null},{key:"two",value:"",expectedValue:null}])).status,200);
    assert.equal((await post([{key:"one",value:"stale",expectedValue:null}])).status,409);
    assert.equal((await post([{key:"one",value:123}])).status,400);
    assert.equal((await post([{key:"one",value:"bad"}],"children")).status,400);
    const exported = await (await service.handle(new Request("http://localhost/sq/export?lang=x-test"))).json();
    assert.deepEqual(exported,{language:"x-test",translations:[{path:"story/demo.sq",key:"one",value:"안녕\n日本語"},{path:"story/demo.sq",key:"two",value:""}]});
    assert.deepEqual((await store.remaining("x-test")).totals,{main:{total:2,remain:0},mrpg:{total:0,remain:0},dlc:{total:1,remain:1}});
    assert.deepEqual(await (await service.handle(new Request("http://localhost/sq/languages"))).json(),["en","x-test"]);
    const csv = await (await service.handle(new Request("http://localhost/sq/value?path=story%2Fdemo.sq&lang=x-test"))).json();
    assert.equal(csv.csv.one["x-test"],"안녕\n日本語");
    assert.equal((await service.handle(new Request("http://localhost/sq/value"))).status,400);
    assert.equal((await service.handle(new Request("http://localhost/sq/value?path=missing"))).status,404);
  } finally { await store.close(); }
});
test("source outlines are not translation caches and dialogue empty strings suppress fallback", async () => {
  const store = await TranslationStore.open(":memory:");
  try {
    await seed(store);
    const original = {children:[{directive:"one",chara:"John",fallback:"original"}]};
    const game = {outline:async () => structuredClone(original)};
    const service = new TranslationService(store,game as never);
    await store.save("story/demo.sq","ko","a",[{key:"one",value:"first"}]);
    assert.equal((await service.value("story/demo.sq","ko")).script!.children![0].ko,"first");
    await store.save("story/demo.sq","ko","a",[{key:"one",value:""}]);
    const updated = (await service.value("story/demo.sq","ko")).script!.children![0];
    assert.equal(updated.ko,""); assert.equal(updated.fallback,undefined);
    assert.equal(original.children[0].fallback,"original");
  } finally { await store.close(); }
});

test("concurrent stores reject a stale save and preserve millisecond timestamps after reopening", async () => {
  const directory = mkdtempSync(join(tmpdir(), "eastward-prisma-"));
  const filename = join(directory, "locale.db");
  let first: TranslationStore | undefined;
  let second: TranslationStore | undefined;
  try {
    first = await TranslationStore.open(filename);
    second = await TranslationStore.open(filename);
    await seed(first);
    const changes = (value: string) => [{key:"one",value,expectedValue:null}];
    const results = await Promise.allSettled([
      first.save("story/demo.sq","ko","first",changes("한글")),
      second.save("story/demo.sq","ko","second",changes("stale")),
    ]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    const rejected = results.find(result => result.status === "rejected") as PromiseRejectedResult;
    assert.equal(rejected.reason.status, 409);
    const rows = await first.latest("ko");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].value, "한글");
    assert.equal(typeof rows[0].editedDate, "number");
    assert.ok(rows[0].editedDate > 2 ** 31);
    const history = await first.history("ko");
    assert.equal(history[0].editedDate, rows[0].editedDate);
    await first.close(); first = undefined;
    await second.close(); second = undefined;
    first = await TranslationStore.open(filename);
    assert.deepEqual(await first.latest("ko"), rows);
    await first.seed(Array.from({length:1500}, (_,index) => ({path:"bulk.sq",lang:"en",key:String(index),value:"source"})));
    await first.seed([{path:"bulk.sq",lang:"en",key:"0",value:"must not replace"}]);
    assert.equal((await first.latest("en","bulk.sq")).length, 1500);
    assert.equal((await first.latest("en","bulk.sq"))[0].value, "source");
  } finally {
    await first?.close(); await second?.close();
    rmSync(directory,{recursive:true,force:true});
  }
});

test("progress summaries preserve latest nulls, empty translations and legacy response shapes", async () => {
  const store = await TranslationStore.open(":memory:");
  try {
    await store.seed([
      {path:"story.sq",lang:"en",key:"one",value:"one"},
      {path:"story.sq",lang:"en",key:"two",value:"two"},
      {path:"story.sq",lang:"fr",key:"one",value:"un"},
      {path:"story.sq",lang:"ko",key:"one",value:"old"},
      {path:"MRPG/story.sq",lang:"en",key:"one",value:"source"},
      {path:"farm/story.sq",lang:"en",key:"one",value:"source"},
      {path:"DEMO/story.sq",lang:"en",key:"one",value:"source"},
    ]);
    await store.save("story.sq","ko","tester",[{key:"one",value:null,expectedValue:"old"},{key:"two",value:"",expectedValue:null}]);
    assert.equal(await store.hasPath("story.sq"),true);
    assert.equal(await store.hasPath("missing"),false);
    assert.deepEqual(await store.paths(),["DEMO/story.sq","MRPG/story.sq","farm/story.sq","story.sq"]);
    assert.deepEqual(await store.languages(),["en","fr","ko"]);
    const expected = await store.remaining("ko");
    assert.deepEqual(expected.totals,{main:{total:2,remain:1},mrpg:{total:1,remain:1},dlc:{total:1,remain:1}});
    assert.deepEqual(expected.keys["story.sq"],["one"]);
    assert.deepEqual(await store.remaining("ko",false),{...expected,keys:Object.create(null)});
    const untranslated = await store.remaining("de");
    assert.deepEqual(untranslated.totals,{main:{total:2,remain:2},mrpg:{total:1,remain:1},dlc:{total:1,remain:1}});
    const service = new TranslationService(store);
    const get = async (route: string) => (await service.handle(new Request("http://localhost/sq/" + route))).json();
    assert.deepEqual(await get("remain?lang=ko"),expected.totals);
    assert.deepEqual(await get("remain/detail?lang=ko"),expected.paths);
    assert.deepEqual(await get("remain/detail?lang=ko&key"),JSON.parse(JSON.stringify(expected.keys)));
    assert.deepEqual(await get("remain?lang=ko&detail=1"),{totals:expected.totals,paths:expected.paths});
  } finally { await store.close(); }
});
