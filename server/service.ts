import { TranslationStore, InputError, language } from "./store";
import { GameSources, type ScriptOutline } from "./game";

export class TranslationService {
  constructor(public readonly store: TranslationStore, private readonly game?: GameSources) {}
  async value(path: string, target: string) {
    if (!(await this.store.hasPath(path))) throw new InputError("Unknown asset path", 404);
    const script = await this.game?.outline(path);
    if (!script) return { csv: await this.store.csv(path) };
    const [texts, names] = await Promise.all([
      this.store.csv(path), this.store.csv("config/story/CharacterName.xls/Name"),
    ]);
    function overlay(node: ScriptOutline) {
      if (node.directive) {
        const translations = texts[node.directive];
        if (translations) {
          for (const [lang,value] of Object.entries(translations)) node[lang] = value;
          if (Object.values(translations).some(value => value !== null)) delete node.fallback;
        }
      }
      if (node.chara) {
        const character = names["name::" + node.chara];
        if (character) { node.chara_en = character.en ?? undefined; node.chara = character[target] ?? character.en ?? node.chara; }
      }
      for (const child of node.children ?? []) overlay(child);
    }
    overlay(script);
    return { script };
  }
  async handle(request: Request) {
    try {
      const url = new URL(request.url);
      const route = url.pathname.replace(/^\/sq\/?/, "");
      const target = language(url.searchParams.get("lang") ?? "ko");
      const path = url.searchParams.get("path");
      const assetPath = () => { if (!path || path.length > 4096) throw new InputError("Asset path is required"); return path; };
      if (request.method === "GET") {
        switch (route) {
          case "names": return json(await this.store.paths());
          case "languages": return json(await this.store.languages());
          case "value": return json(await this.value(assetPath(),target));
          case "history": return json(await this.store.history(target));
          case "diff": return json(await this.store.diff(assetPath(),target));
          case "remain": {
            const {totals,paths} = await this.store.remaining(target,false);
            return json(url.searchParams.has("detail") ? {totals,paths} : totals);
          }
          case "remain/detail": {
            const includeKeys = url.searchParams.has("key");
            const result = await this.store.remaining(target,includeKeys);
            return json(includeKeys ? result.keys : result.paths);
          }
          case "export": return json(await this.store.export(target),200,{"Content-Disposition": `attachment; filename="eastward-${target}.json"`});
          default: return json({error:"Not found"},404);
        }
      }
      if (request.method === "POST" && route === "translate") {
        const body = await request.text();
        if (body.length > 8 * 1024 * 1024) throw new InputError("Translation batch is too large",413);
        let input;
        try { input = JSON.parse(body); } catch { throw new InputError("Invalid JSON"); }
        if (!input || typeof input !== "object" || Array.isArray(input)) throw new InputError("Invalid translation batch");
        await this.store.save(input.path,input.lang ?? target,input.editor,input.translations);
        return json({});
      }
      return json({error:"Method not allowed"},405);
    } catch (error) {
      if (error instanceof InputError) return json({error:error.message},error.status);
      console.error("Translation API:",error);
      return json({error:"Translation request failed"},500);
    }
  }
}
function json(value: unknown, status = 200, headers: Record<string,string> = {}) {
  return Response.json(value,{status,headers:{"Cache-Control":"no-store",...headers}});
}

const state = globalThis as typeof globalThis & { translationService?: Promise<TranslationService> };
export function getService() {
  return state.translationService ??= (async () => {
    const game = process.env.EASTWARD_GAME_ROOT ? await GameSources.open(process.env.EASTWARD_GAME_ROOT) : undefined;
    const store = await TranslationStore.open();
    return new TranslationService(store,game);
  })().catch(error => { delete state.translationService; throw error; });
}
