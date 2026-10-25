import { useTranslations } from "next-intl";
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
  const t = useTranslations("Progress");
  const c = useTranslations("Common");
  const [searchParams] = useSearchParams();
  const lang = searchParams.get("lang") ?? "ko";
  const { error: fetchError, value } = useResource<{
    totals: Remaining;
    paths: Detail[];
  }>("/sq/remain", { lang, detail: "1" });
  const remaining = value?.totals;
  const detail = value?.paths;

  return (
    <DefaultLayout>
      <section className="progress-page">
        <header className="page-heading">
          <h1>{t("title")}</h1>
          <span className="language-tag">{lang}</span>
        </header>
        {fetchError && (
          <p role="alert" className="text-danger">
            {fetchError.message}
          </p>
        )}
        {!remaining && <p role="status">{c("loading")}</p>}
        {remaining && (
          <div className="progress-cards">
            {(
              [
                [c("main"), remaining.main],
                [c("mrpg"), remaining.mrpg],
                [c("dlc"), remaining.dlc],
              ] as const
            ).map(([label, progress]) => (
              <section className="progress-card" key={label}>
                <h2>{label}</h2>
                <p className="progress-number">
                  {getPercent(progress)}
                  <span>%</span>
                </p>
                <progress
                  aria-label={t("translated", { label })}
                  value={progress.total - progress.remain}
                  max={progress.total || 1}
                />
                <p>
                  {t("summary", {
                    remaining: progress.remain,
                    total: progress.total,
                  })}
                </p>
              </section>
            ))}
          </div>
        )}
        <details className="progress-details" open>
          <summary>{t("unfinished")}</summary>
          {!detail && <p>{c("loading")}</p>}
          {detail
            ?.filter(({ remain }) => remain > 0)
            .map((item) => (
              <div className="progress-file" key={item.path}>
                <Link
                  href={`/?${new URLSearchParams({ path: item.path, lang })}`}
                >
                  {item.path}
                </Link>
                <span>{t("remaining", { count: item.remain })}</span>
                <span>{getPercent(item)}%</span>
              </div>
            ))}
        </details>
      </section>
    </DefaultLayout>
  );
}
