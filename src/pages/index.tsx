import { useAsync } from "react-use";
import { Button } from "@nextui-org/button";
import { CheckboxGroup, Checkbox } from "@nextui-org/checkbox";
import {
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { RadioGroup, Radio } from "@nextui-org/radio";

import DefaultLayout from "@/layouts/default";
import { getProfileName } from "@/util/name";

const HOST = import.meta.env.VITE_API_HOST || "http://localhost:3000";

type Translation = {
  obj: any;
  value: string;
};

type OnContentChange = (obj: any, key: string, value: string | null) => void;

export default function IndexPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") || "main";
  const path = searchParams.get("path");

  const { error: fetchError, value: paths } = useAsync(async () => {
    const response = await fetch(`${HOST}/sq/names`);
    const names = (await response.json()) as string[];

    return names;
  }, []);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ script: any; csv: any }>({
    script: undefined,
    csv: undefined,
  });
  const [filter, setFilter] = useState(["en", "ja", "zh-CN", "ko"]);
  const [status, setStatus] = useState("✅");

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
      const hasTranslations = Object.keys(translationsRef.current).length > 0;

      setStatus(hasTranslations ? "❌" : "✅");
    },
    [],
  );

  const filteredPath =
    paths &&
    paths.filter((name) => {
      switch (view) {
        case "main":
          return (
            !/.*mrpg.*/gi.test(name) &&
            !/farm\/.*/gi.test(name) &&
            !/.*demo.*/gi.test(name)
          );
        case "mrpg":
          return /.*mrpg.*/gi.test(name) && !/.*demo.*/gi.test(name);
        case "demo":
          return /.*demo.*/gi.test(name);
        case "dlc":
          return /farm\/.*/gi.test(name) && !/.*demo.*/gi.test(name);
        default:
          return false;
      }
    });

  return (
    <DefaultLayout>
      <section className="relative w-full h-full gap-4">
        <div className="absolute w-1/4 h-full overflow-auto border-2 p-1">
          <div className="z-20 sticky top-[-4px] bg-white dark:bg-black font-bold py-2">
            <RadioGroup
              className="pl-2"
              orientation="horizontal"
              size="sm"
              value={view}
              onValueChange={(view) => {
                setSearchParams((prev) => {
                  prev.set("view", view);

                  return prev;
                });
              }}
            >
              <Radio value="main">Main Story</Radio>
              <Radio value="mrpg">Earthborn</Radio>
              <Radio value="demo">Demo</Radio>
              <Radio value="dlc">Octopia</Radio>
            </RadioGroup>
          </div>
          <p>{fetchError?.message}</p>
          {(filteredPath &&
            filteredPath.map((path) => (
              <Button
                key={path}
                className="block my-1"
                onClick={() => {
                  setSearchParams((prev) => {
                    prev.set("path", path);

                    return prev;
                  });
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
                <div className="sticky top-[-4px] backdrop-blur-sm font-bold py-2">
                  <p>
                    {status} {path}
                  </p>
                  <CheckboxGroup
                    className="pl-2"
                    orientation="horizontal"
                    size="sm"
                    value={filter}
                    onValueChange={setFilter}
                  >
                    <Checkbox value="en">영어</Checkbox>
                    <Checkbox value="ja">일본어</Checkbox>
                    <Checkbox value="zh-CN">중국어</Checkbox>
                    <Checkbox value="ko">한국어</Checkbox>
                  </CheckboxGroup>
                </div>
              )}
              {path &&
                data.script &&
                buildSQ(data.script, filter, onContentChange)}
              {path && data.csv && buildText(data.csv, filter, onContentChange)}
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

function escape(locale?: any) {
  return locale?.replace(/\n/g, "\\n") ?? "!!No Translation!!";
}

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

          const origin = escape(obj.ko);

          if (text != origin) {
            onContentChange(obj, _key, text);
          } else {
            onContentChange(obj, _key, null);
          }
        }}
      >
        {escape(obj.ko)}
      </span>
    </div>
  );
});

function buildText(
  obj: any,
  filter: string[],
  onContentChange: OnContentChange,
) {
  return Object.entries<any>(obj).map(([key, value], i) => {
    return (
      <div key={`csv-${i}`} className="py-2">
        <p className="pb-1 font-bold">{key}</p>
        {filter.includes("en") && <p>{escape(value.en)}</p>}
        {filter.includes("ja") && <p>{escape(value.ja)}</p>}
        {filter.includes("zh-CN") && <p>{escape(value["zh-CN"])}</p>}
        {filter.includes("ko") && (
          <ContentEditable
            _key={key}
            depth={0}
            obj={value}
            onContentChange={onContentChange}
          />
        )}
      </div>
    );
  });
}

function buildSQ(
  obj: any,
  filter: string[],
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
        {filter.includes("en") && (
          <p style={{ paddingLeft: depth * 40 + 5 }}>{escape(obj.en)}</p>
        )}
        {filter.includes("ja") && (
          <p style={{ paddingLeft: depth * 40 + 5 }}>{escape(obj.ja)}</p>
        )}
        {filter.includes("zh-CN") && (
          <p style={{ paddingLeft: depth * 40 + 5 }}>{escape(obj["zh-CN"])}</p>
        )}
        {filter.includes("ko") && (
          <ContentEditable
            _key={obj.directive}
            depth={depth}
            obj={obj}
            onContentChange={onContentChange}
          />
        )}
      </div>,
    );
  } else {
    depth--;
  }

  if (children && Array.isArray(children)) {
    for (const child of children) {
      meta.index++;
      output.push(...buildSQ(child, filter, onContentChange, depth, meta));
    }
  }

  if (type == "cutscene") {
    output.push(<br key={`br-${depth}-${index}`} />);
  }

  return output;
}
