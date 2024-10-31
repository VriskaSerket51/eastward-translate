import { useAsync } from "react-use";
import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardFooter } from "@nextui-org/card";
import { useSearchParams } from "react-router-dom";
import { Divider } from "@nextui-org/divider";

import DefaultLayout from "@/layouts/default";

const HOST = import.meta.env.VITE_API_HOST || "http://localhost:3000";

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
  const { error: fetchError, value: history } = useAsync(async () => {
    const response = await fetch(`${HOST}/sq/history`);
    const history = (await response.json()) as History[];

    return history;
  }, []);
  const [loading, setLoading] = useState(false);
  const [diff, setDiff] = useState<{ [key: string]: Diff[] }>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const path = searchParams.get("path");

  useEffect(() => {
    const fetchDiff = async () => {
      setLoading(true);

      const response = await fetch(`${HOST}/sq/diff?path=${path}`);

      const diff = await response.json();

      setDiff(diff);
      setLoading(false);
    };

    if (path) {
      fetchDiff();
    }
  }, [path]);

  return (
    <DefaultLayout>
      <p>{fetchError?.message}</p>
      <section className="relative w-full h-full gap-4">
        <div className="absolute w-2/5 h-full overflow-auto border-2 p-1">
          {(history &&
            history.map(({ path, editedDate, editor }, i) => (
              <Card
                key={path}
                isPressable
                className="block my-1"
                onPress={() => {
                  setSearchParams({ path });
                }}
              >
                <CardHeader>
                  <p className="font-bold">{path}</p>
                </CardHeader>

                <CardFooter className="flex flex-col items-start w-full">
                  <p>Last updated by {editor}</p>
                  <p>at {new Date(editedDate).toISOString()}</p>
                </CardFooter>
              </Card>
            ))) || <p>Loading...</p>}
        </div>
        <div className="absolute left-[40%] w-3/5 h-full overflow-auto border-2 p-1 whitespace-pre break-words">
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
                          {editor ? `Edited by ${editor}` : "Original"}
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
