import { useAsync } from "react-use";
import { Button } from "@nextui-org/button";
import { ReactNode, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import DefaultLayout from "@/layouts/default";
import { getProfileName } from "@/util/name";

const HOST = import.meta.env.VITE_API_HOST || "http://localhost:3000";

export default function IndexPage() {
  const { error: fetchError, value: paths } = useAsync(async () => {
    const response = await fetch(`${HOST}/sq/names`);
    const names = (await response.json()) as string[];

    return names.filter((name) => !name.startsWith("farm"));
  }, []);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ script: any; csv: any }>({
    script: undefined,
    csv: undefined,
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const path = searchParams.get("path");

  useMemo(async () => {
    setLoading(true);

    const response = await fetch(`${HOST}/sq/value?path=${path}`);

    const data = await response.json();

    setData(data);
    setLoading(false);
  }, [path]);

  return (
    <DefaultLayout>
      <p>{fetchError?.message}</p>
      <section className="relative w-full h-full gap-4">
        <div className="absolute w-1/4 h-full overflow-auto border-2 p-1">
          {(paths &&
            paths.map((path) => (
              <Button
                key={path}
                className="block my-1"
                onClick={async () => {
                  setSearchParams({ path });
                }}
              >
                {path}
              </Button>
            ))) || <p>Loading...</p>}
        </div>
        <div className="absolute left-1/4 w-3/4 h-full overflow-auto border-2 p-1 whitespace-pre break-words">
          {loading && <p>Loading...</p>}
          {!loading && (
            <>
              {path && (
                <p className="sticky top-0 backdrop-blur-sm font-bold py-2">
                  {path}
                </p>
              )}
              {path && data.script && buildSQ(data.script, path)}
              {path && data.csv && buildText(data.csv, path)}
            </>
          )}
        </div>
      </section>
    </DefaultLayout>
  );
}

type Props = {
  index: number;
  id: string;
  obj: any;
  tKey: string;
  path: string;
  depth: number;
};

function ContentEditable(props: Props) {
  const { index, id, obj, tKey, path, depth } = props;

  return (
    <div style={{ paddingLeft: depth * 40 + 5 }}>
      <span id={`${id}-${index}`}>✅</span>
      <span
        contentEditable
        suppressContentEditableWarning
        role="presentation"
        onInput={(e) => {
          const key = `${id}-${index}`;
          const text = (e.target as HTMLSpanElement).innerText;

          const origin = obj.ko?.replace(/\n/g, "\\n") ?? "미번역";

          if (text != origin) {
            document.getElementById(key)!.innerText = "❌";
          } else {
            document.getElementById(key)!.innerText = "✅";
          }
        }}
        onKeyDown={async (e) => {
          const key = `${id}-${index}`;
          const text = (e.target as HTMLSpanElement).innerText;
          const origin = obj.ko?.replace(/\n/g, "\\n") ?? "미번역";

          if (e.ctrlKey && e.key == "s") {
            e.preventDefault();
            if (text != origin) {
              document.getElementById(key)!.innerText = "⌛";
              const response = await fetch(`${HOST}/sq/translate`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  path,
                  lang: "ko",
                  key: tKey,
                  value: text.replace(/\\n/g, "\n"),
                  editor: getProfileName(),
                }),
              });

              if (response.ok) {
                obj.ko = text;
                document.getElementById(key)!.innerText = "✅";
              } else {
                document.getElementById(key)!.innerText = "❗";
              }
            }
          }
        }}
      >
        {obj.ko?.replace(/\n/g, "\\n") ?? "미번역"}
      </span>
    </div>
  );
}

function buildText(obj: any, path: string) {
  return Object.entries<any>(obj).map(([key, value], i) => {
    return (
      <div key={`csv-${i}`} className="py-2">
        <p className="pb-1 font-bold">{key}</p>
        <p> {value.en.replace(/\n/g, "\\n")}</p>
        <ContentEditable
          depth={0}
          id="csv"
          index={i}
          obj={value}
          path={path}
          tKey={key}
        />
      </div>
    );
  });
}

function buildSQ(obj: any, path: string, depth?: number, meta?: any) {
  const { type, children, args } = obj;

  const output: ReactNode[] = [];

  depth = depth ?? -1;
  depth++;

  meta = meta ?? { index: 0 };
  const { index } = meta;

  if (type == "cutscene") {
    output.push(
      <p key={`cutscene-${depth}-${index}`} style={{ paddingLeft: depth * 40 }}>
        CUTSCENE
      </p>,
    );
  } else if (type == "if") {
    output.push(
      <p key={`if-${depth}-${index}`} style={{ paddingLeft: depth * 40 }}>
        if {args.join(",")}
      </p>,
    );
  } else if (type == "elseif") {
    output.push(
      <p key={`elseif-${depth}-${index}`} style={{ paddingLeft: depth * 40 }}>
        else if {args.join(",")}
      </p>,
    );
  } else if (type == "else") {
    output.push(
      <p key={`else-${depth}-${index}`} style={{ paddingLeft: depth * 40 }}>
        else
      </p>,
    );
  } else if (type == "wait") {
    output.push(
      <p key={`wait-${depth}-${index}`} style={{ paddingLeft: depth * 40 }}>
        wait {args.join(",")}
      </p>,
    );
  } else if (obj.directive) {
    output.push(
      <div key={`say-${depth}-${index}`} className="py-2">
        <p className="pb-1 font-bold" style={{ paddingLeft: depth * 40 }}>
          {obj.chara}
        </p>
        <p style={{ paddingLeft: depth * 40 + 5 }}>
          {obj.en.replace(/\n/g, "\\n")}
        </p>
        <p style={{ paddingLeft: depth * 40 + 5 }}>
          {obj.ja.replace(/\n/g, "\\n")}
        </p>
        <p style={{ paddingLeft: depth * 40 + 5 }}>
          {obj["zh-CN"].replace(/\n/g, "\\n")}
        </p>
        <ContentEditable
          depth={depth}
          id="say"
          index={index}
          obj={obj}
          path={path}
          tKey={obj.directive}
        />
      </div>,
    );
  } else {
    depth--;
  }

  if (children && Array.isArray(children)) {
    for (const child of children) {
      meta.index++;
      output.push(...buildSQ(child, path, depth, meta));
    }
  }

  if (type == "cutscene") {
    output.push(<br key={`br-${depth}-${index}`} />);
  }

  return output;
}
