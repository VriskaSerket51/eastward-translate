export type TextRecord = Record<string, unknown>;
export type ScriptNode = TextRecord & {
  type?: string;
  directive?: string;
  children?: ScriptNode[];
  args?: string[];
  chara?: string;
  chara_en?: string;
};
export type TranslationData = {
  script?: ScriptNode;
  csv?: Record<string, TextRecord>;
};
export type TranslationRow = {
  key?: string;
  label: string;
  depth: number;
  values: TextRecord;
};
export type Draft = Record<string, string>;
export function rowsFromData(data: TranslationData): TranslationRow[] {
  const rows: TranslationRow[] = [];
  function walk(node: ScriptNode, depth: number) {
    if (node.directive)
      rows.push({
        key: node.directive,
        label: [
          node.chara,
          node.chara_en !== node.chara ? node.chara_en : undefined,
        ]
          .filter(Boolean)
          .join(" / "),
        depth,
        values: node,
      });
    else if (
      node.type &&
      ["cutscene", "if", "elseif", "else", "wait"].includes(node.type)
    )
      rows.push({
        label: node.type + " " + (node.args ?? []).join(", "),
        depth,
        values: {},
      });
    for (const child of node.children ?? [])
      walk(child, depth + (node.type === "root" ? 0 : 1));
  }
  if (data.script) walk(data.script, 0);
  for (const [key, values] of Object.entries(data.csv ?? {}))
    rows.push({ key, label: key, depth: 0, values });
  return rows;
}
export function textValue(row: TranslationRow, language: string) {
  const value = row.values[language];
  return typeof value === "string" ? value : "";
}
export function acknowledgeDraft(draft: Draft, saved: Draft): Draft {
  const result = { ...draft };
  for (const [key, value] of Object.entries(saved))
    if (Object.hasOwn(result, key) && result[key] === value) delete result[key];
  return result;
}
export function matchesView(path: string, view: string) {
  const farm = /^farm\//i.test(path),
    demo = /demo/i.test(path),
    mrpg = /mrpg/i.test(path);
  return view === "main"
    ? !farm && !demo && !mrpg
    : view === "mrpg"
      ? mrpg && !demo
      : view === "demo"
        ? demo
        : view === "dlc"
          ? farm && !demo
          : false;
}
export function getPercent(value: { total: number; remain: number }) {
  return value.total > 0
    ? Math.round((1 - value.remain / value.total) * 100)
    : 0;
}
