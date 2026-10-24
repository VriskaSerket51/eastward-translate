# Eastward Translate

English | [한국어](README.ko.md)

Unofficial translation editor for Eastward. Supports Korean and other languages.

## How to run

1. Install Node.js 24.13 or later.
2. Build a sibling `eastward.js` checkout.
3. Copy `.env.example` to `.env` and set the paths.
4. Run the commands below.

```sh
npm ci
npm run db:deploy
npm run locale:import -- "/path/to/Eastward"
npm run dev
```

Open [localhost:3000](http://localhost:3000).

Translations are saved in `data/locale.db`. Use `LOCALE_DB_PATH` to change the path; `DATABASE_URL` takes priority. Import and edit using the same database. Back it up before `db:deploy`.

Set `EASTWARD_GAME_ROOT` to browse the original SQ structure.

## How to use

1. Enter a language code and select `Apply`.
2. Edit text and save with `Save` or Ctrl/Cmd+S.
3. Use `Export JSON` to download translations.

Unsaved changes stay in browser drafts. If another edit causes a conflict, reload the server text and compare it with your draft before saving again.

Import the JSON in EastwardModTool through `Mod > Create language patch...`. Menus, images and fonts can be included in the same mod. See the [language patch guide](https://github.com/VriskaSerket51/EastwardModLoader/blob/main/docs/language-patches.md).

## Production

```sh
npm run db:deploy
npm run build
npm start
```

[License](LICENSE)
