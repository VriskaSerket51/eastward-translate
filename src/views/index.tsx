import { useTranslations } from "next-intl";
import { Button } from "@heroui/button";
import { CheckboxGroup, Checkbox } from "@heroui/checkbox";
import { RadioGroup, Radio } from "@heroui/radio";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "@/hooks/use-search-params";
import { useTranslationEditor } from "@/hooks/use-translation-editor";
import { apiUrl, request } from "@/api/client";
import {
  matchesView,
  rowsFromData,
  textValue,
  type TranslationRow,
} from "@/util/translations";
import DefaultLayout from "@/layouts/default";

export default function IndexPage() {
  const t = useTranslations("Editor");
  const c = useTranslations("Common");
  const [searchParams, setSearchParams] = useSearchParams();
  const path = searchParams.get("path"),
    view = searchParams.get("view") ?? "main",
    language = searchParams.get("lang") ?? "ko";
  const editor = useTranslationEditor(path, language);
  const [paths, setPaths] = useState<string[]>([]),
    [languages, setLanguages] = useState(["en", "ja", "zh-CN", "ko"]);
  const [filter, setFilter] = useState(["en", "ja", "zh-CN"]),
    [listError, setListError] = useState("");
  const [target, setTarget] = useState(language);
  useEffect(() => {
    setTarget(language);
  }, [language]);
  useEffect(() => {
    const abort = new AbortController();
    request<string[]>("/sq/names", { signal: abort.signal })
      .then(setPaths)
      .catch((error) => {
        if (!abort.signal.aborted) setListError(String(error));
      });
    request<string[]>("/sq/languages", { signal: abort.signal })
      .then(setLanguages)
      .catch(() => {});
    return () => abort.abort();
  }, []);
  const rows = useMemo(() => rowsFromData(editor.data), [editor.data]);
  const updateQuery = useCallback(
    (key: string, value: string) =>
      setSearchParams((previous) => {
        previous.set(key, value);
        return previous;
      }),
    [setSearchParams],
  );
  const count = Object.keys(editor.draft).length;
  const comparedLanguages = useMemo(
    () => filter.filter((lang) => lang !== language),
    [filter, language],
  );
  return (
    <DefaultLayout>
      <section className="translation-workspace">
        <TranslationFiles
          paths={paths}
          view={view}
          path={path}
          error={listError}
          onSelect={updateQuery}
        />
        <article className="translation-editor">
          <div className="editor-toolbar">
            <p className="editor-path">{path ?? t("title")}</p>
            <div className="editor-actions">
              <form
                className="language-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(target))
                    updateQuery("lang", target);
                }}
              >
                <label htmlFor="target-language">{t("target")}</label>
                <input
                  id="target-language"
                  list="language-list"
                  className="language-input"
                  value={target}
                  pattern="[A-Za-z][A-Za-z0-9_-]{0,31}"
                  required
                  onChange={(event) => setTarget(event.target.value)}
                />
                <datalist id="language-list">
                  {languages.map((lang) => (
                    <option key={lang} value={lang} />
                  ))}
                </datalist>
                <Button size="sm" type="submit">
                  {t("apply")}
                </Button>
              </form>
              <Button
                size="sm"
                color="primary"
                isLoading={editor.saving}
                isDisabled={!editor.ready || !count || editor.loading}
                onPress={() => void editor.save()}
              >
                {c("save")} {count ? `(${count})` : ""}
              </Button>
              <a
                className="export-link"
                href={apiUrl("/sq/export", { lang: language })}
                download={`translations-${language}.json`}
              >
                {t("export")}
              </a>
              <span role="status" className="save-status">
                {editor.saving
                  ? t("saving")
                  : count
                    ? t("unsaved")
                    : c("saved")}
              </span>
            </div>
            <CheckboxGroup
              orientation="horizontal"
              size="sm"
              value={filter}
              onValueChange={setFilter}
              label={t("compare")}
            >
              {languages
                .filter((lang) => lang !== language)
                .map((lang) => (
                  <Checkbox key={lang} value={lang}>
                    {lang}
                  </Checkbox>
                ))}
            </CheckboxGroup>
            {editor.error && (
              <div role="alert" className="text-danger">
                <p>{editor.error}</p>
                <Button size="sm" onPress={editor.reload}>
                  {t("reload")}
                </Button>
              </div>
            )}
          </div>
          {!path && (
            <div className="editor-empty">
              <span aria-hidden="true" className="empty-symbol">
                Aa
              </span>
              <h1>{t("selectFile")}</h1>
              <p>{t("selectHint")}</p>
            </div>
          )}
          {editor.loading && (
            <p className="editor-loading" role="status">
              {c("loading")}
            </p>
          )}
          {!editor.loading &&
            rows.map((row, index) => (
              <TranslationEntry
                key={row.key ?? `context-${index}`}
                row={row}
                language={language}
                languages={comparedLanguages}
                draft={
                  row.key && Object.hasOwn(editor.draft, row.key)
                    ? editor.draft[row.key]
                    : undefined
                }
                disabled={!editor.ready}
                onChange={editor.change}
              />
            ))}
        </article>
      </section>
    </DefaultLayout>
  );
}

const TranslationFiles = memo(function TranslationFiles({
  paths,
  view,
  path,
  error,
  onSelect,
}: {
  paths: string[];
  view: string;
  path: string | null;
  error: string;
  onSelect: (key: string, value: string) => void;
}) {
  const t = useTranslations("Editor");
  const c = useTranslations("Common");
  const [search, setSearch] = useState("");
  const visiblePaths = useMemo(() => {
    const query = search.toLowerCase();
    return paths.filter(
      (name) => matchesView(name, view) && name.toLowerCase().includes(query),
    );
  }, [paths, view, search]);
  return (
    <aside className="translation-files">
      <div className="files-heading">
        <h2>{t("files")}</h2>
        <span>{visiblePaths.length}</span>
      </div>
      <RadioGroup
        label={t("game")}
        orientation="horizontal"
        size="sm"
        value={view}
        onValueChange={(value) => onSelect("view", value)}
      >
        <Radio value="main">{c("main")}</Radio>
        <Radio value="mrpg">{c("mrpg")}</Radio>
        <Radio value="demo">{c("demo")}</Radio>
        <Radio value="dlc">{c("dlc")}</Radio>
      </RadioGroup>
      <input
        aria-label={t("search")}
        className="file-search"
        placeholder={t("find")}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {error && <p role="alert">{error}</p>}
      {!error && paths.length > 0 && visiblePaths.length === 0 && (
        <p className="files-empty">{c("noMatchingFiles")}</p>
      )}
      {visiblePaths.map((name) => (
        <Button
          key={name}
          fullWidth
          variant={name === path ? "flat" : "light"}
          className="file-item"
          aria-current={name === path ? "true" : undefined}
          onPress={() => onSelect("path", name)}
        >
          {name}
        </Button>
      ))}
    </aside>
  );
});

const TranslationEntry = memo(function TranslationEntry({
  row,
  language,
  languages,
  draft,
  disabled,
  onChange,
}: {
  row: TranslationRow;
  language: string;
  languages: string[];
  draft: string | undefined;
  disabled: boolean;
  onChange: (key: string, value: string, original: string) => void;
}) {
  const t = useTranslations("Editor");
  const c = useTranslations("Common");
  const original = textValue(row, language);
  return (
    <section
      className="translation-entry"
      style={{ paddingLeft: Math.min(row.depth, 6) * 8 }}
    >
      <p className="entry-label">{row.label}</p>
      {row.key && (
        <>
          <details className="message-id">
            <summary>{t("messageId")}</summary>
            {row.key}
          </details>
          {languages.map((lang) => (
            <p key={lang} dir="auto" className="reference-text">
              <span className="reference-language">{lang}: </span>
              {textValue(row, lang) || c("noTranslation")}
            </p>
          ))}
          <textarea
            dir="auto"
            aria-label={`${language} ${row.key}`}
            className="translation-input"
            value={draft ?? original}
            placeholder={t("placeholder")}
            disabled={disabled}
            onChange={(event) =>
              onChange(row.key!, event.target.value, original)
            }
          />
        </>
      )}
    </section>
  );
});
