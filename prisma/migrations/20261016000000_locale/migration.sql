CREATE TABLE IF NOT EXISTS "locale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "path" TEXT,
    "lang" TEXT,
    "key" TEXT,
    "value" TEXT,
    "editedDate" INTEGER NOT NULL DEFAULT 1726740805758,
    "editor" TEXT
);
CREATE INDEX IF NOT EXISTS "locale_latest" ON "locale"("path", "lang", "key", "editedDate" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "locale_key" ON "locale"("path", "key");
