BEGIN IMMEDIATE;
CREATE TABLE "new_locale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "path" TEXT,
    "lang" TEXT,
    "key" TEXT,
    "value" TEXT,
    "editedDate" BIGINT NOT NULL DEFAULT 1726740805758,
    "editor" TEXT
);
INSERT INTO "new_locale" ("id", "path", "lang", "key", "value", "editedDate", "editor")
SELECT "id", "path", "lang", "key", "value", "editedDate", "editor" FROM "locale";
UPDATE "sqlite_sequence" SET "seq" = MAX("seq", COALESCE((SELECT "seq" FROM "sqlite_sequence" WHERE "name" = 'locale'), 0)) WHERE "name" = 'new_locale';
DROP TABLE "locale";
ALTER TABLE "new_locale" RENAME TO "locale";
CREATE INDEX "locale_latest" ON "locale"("path", "lang", "key", "editedDate" DESC, "id" DESC);
CREATE INDEX "locale_key" ON "locale"("path", "key");
COMMIT;
