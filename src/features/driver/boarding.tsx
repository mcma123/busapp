import { useCallback } from "react";
import { create } from "zustand";
import { Search, ArrowRight } from "lucide-react";
import { useStore } from "@/demo/store";
import { attemptBoarding, learnerName, OUTCOME_LABEL, type Outcome } from "@/domain/rules";
import type { EntryMethod } from "@/domain/types";
import { OUTCOME_META } from "@/shared/components/Status";
import { fmtTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

/** Recent attempts on this device so the same pass can be rescanned */
export const useRecent = create<{ items: { token?: string; learnerId?: string; label: string; at: number }[]; add: (i: { token?: string; learnerId?: string; label: string }) => void }>((set) => ({
  items: [],
  add: (i) => set((s) => ({ items: [{ ...i, at: Date.now() }, ...s.items.filter((x) => x.token !== i.token || x.learnerId !== i.learnerId)].slice(0, 6) })),
}));

export function useBoarding() {
  const addRecent = useRecent((s) => s.add);
  return useCallback(
    (input: { token?: string; learnerId?: string; tripId?: string; method: EntryMethod }) => {
      const { db, dispatch } = useStore.getState();
      const { outcome, mutations } = attemptBoarding(db, input);
      if (mutations.length) dispatch(...mutations);
      if (outcome.kind !== "no_active_trip") {
        addRecent({ token: input.token, learnerId: input.token ? undefined : input.learnerId, label: outcome.learner ? learnerName(outcome.learner) : input.token ?? "Unknown" });
      }
      try {
        navigator.vibrate?.(outcome.kind === "boarded" ? 60 : [80, 60, 80]);
      } catch { /* not supported */ }
      return outcome;
    },
    [addRecent],
  );
}

const TONE_BG: Record<string, string> = {
  ok: "bg-[#0f7a3a]",
  info: "bg-teal",
  warn: "bg-[#b45309]",
  bad: "bg-[#b91c1c]",
  neutral: "bg-navy",
};

function detail(o: Outcome): string | undefined {
  switch (o.kind) {
    case "boarded":
      return o.usedException ? "Boarded using a one-trip office clearance" : o.event ? `Saved at ${fmtTime(o.event.time)}` : undefined;
    case "already_boarded":
      return o.event ? `Boarded at ${fmtTime(o.event.time)} · count unchanged` : undefined;
    case "wrong_route":
      return o.expectedRouteName ? `Belongs on ${o.expectedRouteName}${o.expectedVehicleLabel ? ` · ${o.expectedVehicleLabel}` : ""}` : "Learner is assigned to another route";
    case "wrong_bus":
      return o.expectedVehicleLabel ? `Assigned to ${o.expectedVehicleLabel}${o.expectedTrip ? ` · departs ${o.expectedTrip.departure}` : ""}` : "Assigned to another bus on this route";
    case "no_trip":
      return `No ${o.trip?.direction === "PM" ? "afternoon" : "morning"} transport on record for this learner`;
    case "fare":
      return "Transport fare not cleared. The office has been notified.";
    case "revoked_pass":
      return "This pass was replaced. Ask for the new pass or find the learner.";
    case "unknown_pass":
      return "This code is not a Koot Niemann pass. Find the learner instead.";
    default:
      return undefined;
  }
}

export function ResultOverlay({ outcome, onNext, onFind }: { outcome: Outcome; onNext: () => void; onFind?: () => void }) {
  const meta = OUTCOME_META[outcome.kind];
  const Icon = meta.icon;
  const blocking = outcome.kind !== "boarded" && outcome.kind !== "already_boarded";
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn("absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 px-6 text-center text-white animate-in fade-in zoom-in-95 duration-150", TONE_BG[meta.tone])}
    >
      <span className="grid size-24 place-items-center rounded-full bg-white/15 ring-4 ring-white/25">
        <Icon className="size-14" strokeWidth={2.2} />
      </span>
      <div>
        <div className="font-display text-[34px] font-bold leading-tight">{OUTCOME_LABEL[outcome.kind]}</div>
        {outcome.learner && (
          <div className="mt-1 text-[22px] font-semibold">
            {learnerName(outcome.learner)} <span className="font-normal text-white/75">· Gr {outcome.learner.className}</span>
          </div>
        )}
        {detail(outcome) && <p className="mx-auto mt-3 max-w-xs text-[16px] leading-snug text-white/90">{detail(outcome)}</p>}
      </div>
      <div className="mt-2 flex w-full max-w-xs flex-col gap-3">
        {(blocking || outcome.kind === "already_boarded") && (
          <button onClick={onNext} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white text-[17px] font-semibold text-ink shadow-lg active:scale-[0.99]">
            Next scan <ArrowRight className="size-5" />
          </button>
        )}
        {onFind && (outcome.kind === "unknown_pass" || outcome.kind === "revoked_pass") && (
          <button onClick={onFind} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/15 text-[16px] font-semibold ring-1 ring-white/30">
            <Search className="size-5" /> Find learner
          </button>
        )}
      </div>
    </div>
  );
}
