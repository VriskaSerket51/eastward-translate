# Eastward Translate

English | [한국어](README.ko.md)

An unofficial web editor for Eastward translations. Supports target languages beyond Korean.

## Requirements

- Node.js 24.13 or newer.
- A sibling `eastward.js` checkout. Install its dependencies and build it first.
- An Eastward installation to import the original text from.

## How to use

Create `.env` using `.env.example` as a reference.

```sh
npm ci
npm run db:deploy
npm run locale:import -- "/path/to/Eastward"
npm run dev
```

Open [localhost:3000](http://localhost:3000).

### Data

Translations are stored in `data/locale.db`. Set `LOCALE_DB_PATH` to use a different path. `DATABASE_URL` takes precedence if set.

Back up an existing database before running `npm run db:deploy`. Use the same database path for imports and the web editor. Set `EASTWARD_GAME_ROOT` to display the original SQ structure as well.

### Translation

Enter the language code and press **Apply**. Edit the text, then save with **Save** or Ctrl/Cmd+S.

Unsaved changes remain as browser drafts. If another editor's changes cause a conflict, reload the server text, compare it with your draft and save again.

### Export

Use **Export JSON** to export the target language.

```json
{"language":"ko","translations":[{"path":"asset/path","key":"message-id","value":"번역"}]}
```

Select the exported JSON in EastwardModTool's **Mod > Create language patch...** dialog. Package it with menus, images and fonts as an `.ewmod`. See the [language patch guide](https://github.com/VriskaSerket51/EastwardModLoader/blob/main/docs/language-patches.md) for details.

## Production

```sh
npm run db:deploy
npm run build
npm start
```

## License

See [LICENSE](LICENSE).
