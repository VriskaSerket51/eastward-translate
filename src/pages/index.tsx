import { useAsync } from "react-use";
import { Button } from "@nextui-org/button";
import { ReactNode, useState } from "react";

import DefaultLayout from "@/layouts/default";
import { getProfileName } from "@/util/name";

const host = location.hostname;

export default function IndexPage() {
  const { error: fetchError, value: paths } = useAsync(async () => {
    const response = await fetch(`http://${host}:3000/sq/names`);
    const names = (await response.json()) as string[];

    return names.filter((name) => !name.startsWith("farm"));
  }, []);
  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState("");
  const [script, setScript] = useState<any>();
  const [csv, setCsv] = useState<any>();

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
                  setLoading(true);
                  setPath("");
                  setScript(undefined);
                  setCsv(undefined);

                  const response = await fetch(
                    `http://${host}:3000/sq/value?path=${path}`
                  );

                  const { script, csv } = await response.json();

                  setScript(script);
                  setPath(path);
                  setCsv(csv);
                  setLoading(false);
                }}
              >
                {path}
              </Button>
            ))) || <p>Loading...</p>}
        </div>
        <div className="absolute left-1/4 w-3/4 h-full overflow-auto border-2 p-1 whitespace-pre break-words">
          {loading && <p>Loading...</p>}
          {path && (
            <p className="sticky top-0 backdrop-blur-sm font-bold py-2">
              {path}
            </p>
          )}
          {script && buildSQ(script, path)}
          {csv && buildText(csv, path)}
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
};

function ContentEditable(props: Props) {
  const { index, id, obj, tKey, path } = props;

  return (
    <>
      <span> </span>
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
              const response = await fetch(
                "http://localhost:3000/sq/translate",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    path,
                    lang: "ko",
                    key: tKey,
                    value: text,
                    editor: getProfileName(),
                  }),
                }
              );

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
    </>
  );
}

function buildText(obj: any, path: string) {
  return Object.entries<any>(obj).map(([key, value], i) => {
    return (
      <div key={`csv-${i}`} className="py-2">
        <p className="pb-1 font-bold">{key}</p>
        <p> {value.en.replace(/\n/g, "\\n")}</p>
        <ContentEditable
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
      <p key={`cutscene-${depth}-${index}`}>{"\t".repeat(depth)}CUTSCENE</p>
    );
  } else if (type == "if") {
    output.push(
      <p key={`if-${depth}-${index}`}>
        {"\t".repeat(depth)}if {args.join(",")}
      </p>
    );
  } else if (type == "elseif") {
    output.push(
      <p key={`elseif-${depth}-${index}`}>
        {"\t".repeat(depth)}else if {args.join(",")}
      </p>
    );
  } else if (type == "else") {
    output.push(
      <p key={`else-${depth}-${index}`}>{"\t".repeat(depth ?? 0)}else</p>
    );
  } else if (type == "wait") {
    output.push(
      <p key={`wait-${depth}-${index}`}>
        {"\t".repeat(depth ?? 0)}wait {args.join(",")}
      </p>
    );
  } else if (obj.directive) {
    output.push(
      <div key={`say-${depth}-${index}`} className="py-2">
        <p className="pb-1 font-bold">
          {"\t".repeat(depth)}
          {obj.chara}
        </p>
        <p>
          {"\t".repeat(depth)} {obj.en.replace(/\n/g, "\\n")}
        </p>
        <p>
          {"\t".repeat(depth)} {obj.ja.replace(/\n/g, "\\n")}
        </p>
        <p>
          {"\t".repeat(depth)} {obj["zh-CN"].replace(/\n/g, "\\n")}
        </p>
        <span>{"\t".repeat(depth)}</span>
        <ContentEditable
          id="say"
          index={index}
          obj={obj}
          path={path}
          tKey={obj.directive}
        />
      </div>
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
