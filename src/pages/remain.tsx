import { useAsync } from "react-use";

import DefaultLayout from "@/layouts/default";
import haha from "@/assets/img/haha.png";
import { Link } from "@nextui-org/link";

const HOST = import.meta.env.VITE_API_HOST || "http://localhost:3000";

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

function getPercent(remain: Remain) {
  return Math.round((1 - remain.remain / remain.total) * 100);
}

export default function RemainPage() {
  const { error: fetchError, value: remaining } = useAsync(async () => {
    const response = await fetch(`${HOST}/sq/remain`);
    const remain = (await response.json()) as Remaining;

    return remain;
  }, []);

  const { value: detail } = useAsync(async () => {
    const response = await fetch(`${HOST}/sq/remain/detail`);
    const detail = (await response.json()) as Detail[];

    return detail;
  }, []);

  return (
    <DefaultLayout>
      <section className="relative w-full h-full gap-4">
        <div className="absolute w-1/4 h-full overflow-auto border-2 p-1">
          <img alt="haha work" src={haha} />
        </div>
        <div className="absolute left-1/4 w-3/4 h-full overflow-auto border-2 p-1 whitespace-pre break-words">
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
                      <Link href={`/?path=${path}`}>{path}</Link>
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
