import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { openDatabase } from "./database";

const { client, url } = await openDatabase();
let baseline: boolean;
try {
  const tables = await client.$queryRaw<{name:string}[]>`SELECT name FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'`;
  baseline = tables.length === 0;
} finally { await client.$disconnect(); }

const cli = join(dirname(createRequire(import.meta.url).resolve("prisma/package.json")), "build/index.js");
function migrate(args: string[]) {
  const result = spawnSync(process.execPath, [cli, "migrate", ...args], {
    stdio: "inherit", env: {...process.env, DATABASE_URL:url},
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Prisma migration failed (${result.status ?? result.signal})`);
}

// openDatabase creates only the original schema; baselining never replaces existing rows.
if (baseline) migrate(["resolve", "--applied", "20261016000000_locale"]);
migrate(["deploy"]);
