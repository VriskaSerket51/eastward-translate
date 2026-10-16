import { GameSources } from "./game";
import { TranslationStore } from "./store";

const root = process.argv[2] ?? process.env.EASTWARD_GAME_ROOT;
if (!root) throw new Error("Provide the Eastward installation path or EASTWARD_GAME_ROOT");
const game = await GameSources.open(root);
const store = await TranslationStore.open(process.argv[3]);
try { console.log(`Imported ${await game.seed(store)} source rows; existing translations and history were preserved.`); }
finally { await store.close(); }
