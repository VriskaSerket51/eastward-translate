import { useAsync } from "react-use";

import DefaultLayout from "@/layouts/default";
import haha from "@/assets/img/haha.png";

const HOST = import.meta.env.VITE_API_HOST || "http://localhost:3000";

type Remain = {
  total: number;
  remain: number;
};

type Remaining = {
  main: Remain;
  mrpg: Remain;
};

export default function RemainPage() {
  const { error: fetchError, value: remaining } = useAsync(async () => {
    const response = await fetch(`${HOST}/sq/remain`);
    const remain = (await response.json()) as Remaining;

    return remain;
  }, []);

  return (
    <DefaultLayout>
      <p>{fetchError?.message}</p>
      <section className="relative w-full h-full gap-4">
        <div className="absolute w-1/4 h-full overflow-auto border-2 p-1">
          <img alt="haha work" src={haha} />
        </div>
        <div className="absolute left-1/4 w-3/4 h-full overflow-auto border-2 p-1 whitespace-pre break-words">
          {!remaining && <p>Loading...</p>}
          {remaining && (
            <>
              <p>
                Main Story: {remaining.main.remain}/{remaining.main.total};{" "}
                {Math.round(
                  (remaining.main.remain / remaining.main.total) * 100,
                )}
                % Finished
              </p>
              <p>
                Earthborn: {remaining.mrpg.remain}/{remaining.mrpg.total};{" "}
                {Math.round(
                  (remaining.mrpg.remain / remaining.mrpg.total) * 100,
                )}
                % Finished
              </p>
              <p>Octopia: 0/∞; ∞% Finished</p>
            </>
          )}
        </div>
      </section>
    </DefaultLayout>
  );
}
