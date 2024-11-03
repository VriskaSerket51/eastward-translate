import { useAsync } from "react-use";

import DefaultLayout from "@/layouts/default";
import haha from "@/assets/img/haha.png";

const HOST = import.meta.env.VITE_API_HOST || "http://localhost:3000";

type Remaining = {
  main: number;
  mrpg: number;
};

export default function RemainPage() {
  const { error: fetchError, value: remain } = useAsync(async () => {
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
          {!remain && <p>Loading...</p>}
          {remain && (
            <>
              <p>메인 스토리: {remain.main} 라인</p>
              <p>대지의 아이: {remain.mrpg} 라인</p>
            </>
          )}
        </div>
      </section>
    </DefaultLayout>
  );
}
