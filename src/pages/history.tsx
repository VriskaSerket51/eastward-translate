import { useAsync } from "react-use";
import { useState } from "react";
import { Card, CardHeader, CardFooter } from "@nextui-org/card";

import DefaultLayout from "@/layouts/default";

const host = location.hostname;

type History = {
  path: string;
  key: string;
  editor: string;
  editedDate: number;
};
type Diff = { editor: string | null; value: string };

export default function HistoryPage() {
  const { error: fetchError, value: history } = useAsync(async () => {
    const response = await fetch(`http://${host}:3000/sq/history`);
    const history = (await response.json()) as History[];

    return history;
  }, []);
  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState("");
  const [diff, setDiff] = useState<Diff[] | null>(null);

  return (
    <DefaultLayout>
      <p>{fetchError?.message}</p>
      <section className="relative w-full h-full gap-4">
        <div className="absolute w-2/5 h-full overflow-auto border-2 p-1">
          {(history &&
            history.map(({ path, key, editedDate, editor }, i) => (
              <Card
                key={i}
                isPressable
                className="block my-1 w-[400px]"
                onPress={async () => {
                  setLoading(true);
                  setPath("");
                  setDiff(null);

                  const response = await fetch(
                    `http://${host}:3000/sq/diff?path=${path}&key=${key}&editedDate=${editedDate}`
                  );

                  const diff = await response.json();

                  setDiff(diff);
                  setPath(path);
                  setLoading(false);
                }}
              >
                <CardHeader>
                  <p className="font-bold">{path}</p>
                </CardHeader>

                {/* <Divider /> */}
                <CardFooter className="flex flex-row justify-between w-full">
                  <p>By {editor}</p>
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
            diff.map(({ editor, value }, i) => (
              <div key={value} className="py-2">
                <p className="font-bold">
                  {i == 0 ? "Edit by " : "Origin by "}
                  {editor || "INIT"}
                </p>
                <p>{value}</p>
              </div>
            ))}
        </div>
      </section>
    </DefaultLayout>
  );
}
