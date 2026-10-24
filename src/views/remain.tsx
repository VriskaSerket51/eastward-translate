import { useResource } from "@/hooks/use-resource";
import { useSearchParams } from "@/hooks/use-search-params";
import { getPercent } from "@/util/translations";

import DefaultLayout from "@/layouts/default";

import { Link } from "@heroui/link";

type Remain = {
  total: number;
  remain: number;
};

type Remaining = {
  main: Remain;
  mrpg: Remain;
  dlc: Remain;
};

type Detail = {
  path: string;
} & Remain;

export default function RemainPage() {
  const [searchParams] = useSearchParams();
  const lang = searchParams.get("lang") ?? "ko";
  const { error: fetchError, value: remaining } = useResource<Remaining>(
    "/sq/remain",
    { lang },
  );
  const { value: detail } = useResource<Detail[]>("/sq/remain/detail", {
    lang,
  });

  return (
    <DefaultLayout>
      <section className="flex min-h-0 flex-1 flex-col gap-3">
        <p className="font-bold">Language: {lang}</p>
        <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded border border-default-300 p-3 whitespace-pre-wrap break-words">
          <p>{fetchError?.message}</p>
          {!remaining && <p>Loading...</p>}
          {remaining && (
            <>
              <div>
                <p> Main Story: </p>
                <p> - Remain: {remaining.main.remain} Lines</p>
                <p> - Total: {remaining.main.total} Lines</p>
                <p> - {getPercent(remaining.main)}% Finished</p>
              </div>
              <br />
              <div>
                <p> Earthborn: </p>
                <p> - Remain: {remaining.mrpg.remain} Lines</p>
                <p> - Total: {remaining.mrpg.total} Lines</p>
                <p> - {getPercent(remaining.mrpg)}% Finished</p>
              </div>
              <br />
              <div>
                <p> Octopia: </p>
                <p> - Remain: {remaining.dlc.remain} Lines</p>
                <p> - Total: {remaining.dlc.total} Lines</p>
                <p> - {getPercent(remaining.dlc)}% Finished</p>
              </div>
              <br />
            </>
          )}
          <details>
            <summary>In Detail</summary>
            {!detail && <p>Loading...</p>}
            {detail &&
              detail
                .filter(({ remain }) => remain)
                .map((detail) => {
                  const { path, total, remain } = detail;

                  return (
                    <div key={path}>
                      <Link href={`/?${new URLSearchParams({ path, lang })}`}>
                        {path}
                      </Link>
                      <p> - Remain: {remain} Lines</p>
                      <p> - Total: {total} Lines</p>
                      <p> - {getPercent(detail)}% Finished</p>
                    </div>
                  );
                })}
          </details>
        </div>
      </section>
    </DefaultLayout>
  );
}
