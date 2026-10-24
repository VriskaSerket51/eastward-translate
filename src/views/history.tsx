import { useResource } from "@/hooks/use-resource";
import { request } from "@/api/client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardFooter } from "@heroui/card";
import { useSearchParams } from "@/hooks/use-search-params";
import { Divider } from "@heroui/divider";
import dayjs from "dayjs";

import DefaultLayout from "@/layouts/default";

type History = {
  path: string;
  editor: string;
  editedDate: number;
};

type Diff = {
  key: string;
  value: string;
  editedDate: number;
  editor: string | null;
};

export default function HistoryPage() {
  const [loading, setLoading] = useState(false);
  const [diff, setDiff] = useState<{ [key: string]: Diff[] }>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const path = searchParams.get("path");
  const lang = searchParams.get("lang") ?? "ko";
  const { error: fetchError, value: history } = useResource<History[]>(
    "/sq/history",
    { lang },
  );

  useEffect(() => {
    const abort = new AbortController();
    setDiff({});
    if (!path) return;
    setLoading(true);
    request<Record<string, Diff[]>>(
      "/sq/diff",
      { signal: abort.signal },
      { path, lang },
    )
      .then((value) => {
        if (!abort.signal.aborted) setDiff(value);
      })
      .catch(() => {
        if (!abort.signal.aborted) setDiff({});
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [path, lang]);

  return (
    <DefaultLayout>
      <section className="history-page grid min-h-0 flex-1 gap-3 lg:grid-cols-[2fr_3fr]">
        <header className="page-heading lg:col-span-2">
          <h1>History</h1>
          <span className="language-tag">{lang}</span>
        </header>
        <div className="history-list min-h-60 max-h-72 overflow-auto rounded border border-default-300 p-2 lg:max-h-[calc(100vh-150px)]">
          <p>{fetchError?.message}</p>
          {(history &&
            history.map(({ path, editedDate, editor }) => (
              <Card
                key={path}
                isPressable
                className="block my-1"
                onPress={() => {
                  setSearchParams({ path, lang });
                }}
              >
                <CardHeader>
                  <p className="font-bold">{path}</p>
                </CardHeader>

                <CardFooter className="flex flex-col items-start w-full">
                  <p>Last updated by {editor}</p>
                  <p>at {dayjs(editedDate).format("YYYY-MM-DD HH:mm:ss")}</p>
                </CardFooter>
              </Card>
            ))) || <p>Loading...</p>}
        </div>
        <div className="history-diff min-h-60 min-w-0 overflow-auto rounded border border-default-300 p-3 whitespace-pre-wrap break-words">
          {loading && <p>Loading...</p>}
          {path && (
            <p className="sticky top-0 backdrop-blur-sm font-bold py-2">
              {path}
            </p>
          )}
          {diff &&
            Object.entries(diff).map(([key, diff]) => {
              return (
                <div key={`${key}`} className="py-6">
                  {diff.map(({ value, editor, editedDate }) => {
                    return (
                      <div key={`${key}-${editedDate}`} className="py-2">
                        <p className="font-bold">
                          {editor
                            ? `Edited by ${editor} at ${dayjs(editedDate).format("YYYY-MM-DD HH:mm:ss")}`
                            : "Original"}
                        </p>
                        <p>{value}</p>
                      </div>
                    );
                  })}
                  <Divider />
                </div>
              );
            })}
        </div>
      </section>
    </DefaultLayout>
  );
}
