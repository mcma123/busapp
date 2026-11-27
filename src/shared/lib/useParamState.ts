import { useSearchParams } from "react-router-dom";
import { ALL } from "@/shared/components/FilterSelect";

/** URL-synced filter state so filtered lists are linkable */
export function useParamState() {
  const [params, setParams] = useSearchParams();
  const get = (k: string, d = ALL) => params.get(k) ?? d;
  const set = (k: string, v: string, extra?: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    if (!v || v === ALL) next.delete(k);
    else next.set(k, v);
    if (k !== "page") next.delete("page");
    for (const [ek, ev] of Object.entries(extra ?? {})) {
      if (ev == null) next.delete(ek);
      else next.set(ek, ev);
    }
    setParams(next, { replace: true });
  };
  return { get, set, params };
}
