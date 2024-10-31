import { useAsync } from "react-use";
import { Button } from "@nextui-org/button";
import {
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";

import DefaultLayout from "@/layouts/default";
import { getProfileName } from "@/util/name";

const HOST = import.meta.env.VITE_API_HOST || "http://localhost:3000";

type Translation = {
  obj: any;
  value: string;
};

type OnContentChange = (obj: any, key: string, value: string | null) => void;

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
  const [status, setStatus] = useState("✅");
  const [searchParams, setSearchParams] = useSearchParams();
  const path = searchParams.get("path");

  const translationsRef = useRef<{
    [key: string]: Translation;
  }>({});
  const pathRef = useRef(path);

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    const callback = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key == "s") {
        e.preventDefault();

        setStatus("⌛");
        const response = await fetch(`${HOST}/sq/translate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path,
            translations: Object.entries(translationsRef.current).map(
              ([key, { value }]) => {
                return {
                  key,
                  value: value.replace(/\\n/g, "\n"),
                };
              },
            ),
            editor: getProfileName(),
          }),
        });

        if (response.ok) {
          Object.values(translationsRef.current).forEach(({ obj, value }) => {
            obj.ko = value;
          });
          translationsRef.current = {};
          setStatus("✅");
        } else {
          setStatus("❗");
        }
      }
    };

    document.addEventListener("keydown", callback);

    return () => {
      document.removeEventListener("keydown", callback);
    };
  }, [pathRef.current]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      translationsRef.current = {};
      setStatus("✅");

      const response = await fetch(`${HOST}/sq/value?path=${path}`);

      const data = await response.json();

      setData(data);
      setLoading(false);
    };

    if (path) {
      fetchData();
    }
  }, [path]);

  const onContentChange = useCallback(
    (obj: any, key: string, value: string | null) => {
      if (value === null) {
        delete translationsRef.current[key];
      } else {
        translationsRef.current[key] = {
          obj,
          value,
        };
      }
      // 상태 업데이트 최소화
      const hasTranslations = Object.keys(translationsRef.current).length > 0;

      setStatus(hasTranslations ? "❌" : "✅");
    },
    [],
  );

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
                onClick={() => {
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
                  {status} {path}
                </p>
              )}
              {path && data.script && buildSQ(data.script, onContentChange)}
              {path && data.csv && buildText(data.csv, onContentChange)}
            </>
          )}
        </div>
      </section>
    </DefaultLayout>
  );
}

type Props = {
  obj: any;
  _key: string;
  depth: number;
  onContentChange: OnContentChange;
};

const ContentEditable = memo(function ContentEditable(props: Props) {
  const { obj, _key, depth, onContentChange } = props;

  return (
    <div style={{ paddingLeft: depth * 40 + 5 }}>
      <span>{"> "}</span>
      <span
        contentEditable
        suppressContentEditableWarning
        role="presentation"
        onInput={(e) => {
          const text = (e.target as HTMLSpanElement).innerText;

          const origin = obj.ko?.replace(/\n/g, "\\n") ?? "미번역";

          if (text != origin) {
            onContentChange(obj, _key, text);
          } else {
            onContentChange(obj, _key, null);
          }
        }}
      >
        {obj.ko?.replace(/\n/g, "\\n") ?? "미번역"}
      </span>
    </div>
  );
});

function buildText(obj: any, onContentChange: OnContentChange) {
  return Object.entries<any>(obj).map(([key, value], i) => {
    return (
      <div key={`csv-${i}`} className="py-2">
        <p className="pb-1 font-bold">{key}</p>
        <p> {value.en.replace(/\n/g, "\\n")}</p>
        <ContentEditable
          _key={key}
          depth={0}
          obj={value}
          onContentChange={onContentChange}
        />
      </div>
    );
  });
}

function buildSQ(
  obj: any,
  onContentChange: OnContentChange,
  depth?: number,
  meta?: any,
) {
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
          _key={obj.directive}
          depth={depth}
          obj={obj}
          onContentChange={onContentChange}
        />
      </div>,
    );
  } else {
    depth--;
  }

  if (children && Array.isArray(children)) {
    for (const child of children) {
      meta.index++;
      output.push(...buildSQ(child, onContentChange, depth, meta));
    }
  }

  if (type == "cutscene") {
    output.push(<br key={`br-${depth}-${index}`} />);
  }

  return output;
}
