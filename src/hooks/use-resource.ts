import { useEffect, useState } from "react";
import { request } from "@/api/client";
export function useResource<T>(
  path: string,
  parameters: Record<string, string | undefined> = {},
) {
  const key = JSON.stringify(parameters);
  const [state, setState] = useState<{ value?: T; error?: Error }>({});
  useEffect(() => {
    const abort = new AbortController();
    setState({});
    request<T>(path, { signal: abort.signal }, JSON.parse(key))
      .then((value) => {
        if (!abort.signal.aborted) setState({ value });
      })
      .catch((error) => {
        if (!abort.signal.aborted) setState({ error });
      });
    return () => abort.abort();
  }, [path, key]);
  return state;
}
