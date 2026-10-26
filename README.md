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

Translations are saved in `data/locale.db`. Use `LOCALE_DB_PATH` to change the path; `DATABASE_URL` takes priority. Import and edit using the same database.

Set `EASTWARD_GAME_ROOT` to the game installation path to browse the original SQ structure.

## How to use

The interface supports English and Korean. It follows your browser language on the first visit and remembers changes made with the language selector in the top bar. On mobile, the selector is in the navigation menu.

The interface language is separate from the translation target. You can use the Korean interface while translating into French, for example.

To edit translations:

1. Set the name to use in edit history under `Profile`.
2. Select a file, enter a language code under `Target language`, and select `Apply`.
3. Choose languages to compare and edit the text.
4. Save with `Save` or Ctrl/Cmd+S.
5. Use `Export JSON` to download translations for the selected target language.

Unsaved changes stay in browser drafts when you switch files or interface languages. If another edit causes a conflict, reload the server text and compare it with your draft before saving again.

In `History`, search by file or latest editor and select two versions of a message to compare their changes. The file list shows up to 100 recently edited files.

`Progress` shows translation progress for the main story, Earthborn and Octopia, along with files that still need translation.

Import the JSON in EastwardModTool through `Mod > Create language patch...`. Menus, images and fonts can be included in the same mod. See the [language patch guide](https://github.com/VriskaSerket51/EastwardModLoader/blob/main/docs/language-patches.md).

## Production

```sh
npm run db:deploy
npm run build
npm start
```

[License](LICENSE)
