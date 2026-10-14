import { useCallback, useMemo } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";

type Input =
  | URLSearchParams
  | Record<string, string>
  | ((previous: URLSearchParams) => URLSearchParams);
export function useSearchParams(): [URLSearchParams, (input: Input) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const next = useNextSearchParams();
  const value = useMemo(() => new URLSearchParams(next.toString()), [next]);
  const update = useCallback(
    (input: Input) => {
      const result =
        typeof input === "function"
          ? input(new URLSearchParams(value))
          : new URLSearchParams(input);
      router.push(pathname + (result.size ? "?" + result.toString() : ""));
    },
    [pathname, router, value],
  );
  return [value, update];
}
