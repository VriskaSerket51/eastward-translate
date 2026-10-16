import type { AssetNode, Eastward, LocalePackAsset, SQScriptAsset } from "eastward.js";
import { TranslationStore } from "./store";

export type ScriptOutline = { chara?: string; chara_en?: string; directive?: string; fallback?: string; children?: ScriptOutline[]; [key: string]: unknown };

/** Caches pristine outlines only; database translations are applied to a fresh clone. */
export class GameSources {
  private readonly outlines = new Map<string, Promise<ScriptOutline | undefined>>();
  private constructor(private readonly game: Eastward, private readonly sqNodes: Map<string, AssetNode>) {}
  static async open(directory: string) {
    const { Eastward, register } = await import("eastward.js");
    const game = new Eastward({ root: directory });
    await game.init();
    register(game, "locale_pack"); register(game, "sq_script");
    return new GameSources(game, new Map(game.getAssetNodes("sq_script").map(node => [node.path,node])));
  }
  async outline(path: string): Promise<ScriptOutline | undefined> {
    const node = this.sqNodes.get(path);
    if (!node) return undefined;
    let pending = this.outlines.get(path);
    if (!pending) {
      pending = this.game.loadAsset<SQScriptAsset>(node.path).then(asset => asset?.root?.build() as ScriptOutline | undefined);
      this.outlines.set(path, pending);
      pending.catch(() => this.outlines.delete(path));
    }
    const outline = await pending;
    return outline ? structuredClone(outline) : undefined;
  }
  async seed(store: TranslationStore) {
    const rows: {path:string;lang:string;key:string;value:string|null}[] = [];
    for (const node of this.game.getAssetNodes("locale_pack")) {
      const locale = await this.game.loadAsset<LocalePackAsset>(node.path);
      if (!locale?.config) continue;
      for (const item of locale.config.items) for (const lang of locale.langs) {
        for (const [key,value] of Object.entries(locale.data[lang]?.[item.name] ?? {})) {
          if (typeof value !== "string") throw new Error(`Invalid locale text: ${item.path}/${key}`);
          rows.push({path:item.path,lang,key,value});
        }
      }
    }
    await store.seed(rows);
    return rows.length;
  }
}
