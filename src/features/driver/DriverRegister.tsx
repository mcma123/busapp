import { initials } from "@/domain/rules";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Flag, HelpCircle, Square, UserCheck } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useDispatch } from "@/demo/store";
import { useSession } from "@/app/session";
import { clearanceFor, EXCEPTION_LABEL, learnerName, rosterStatus, type Outcome } from "@/domain/rules";
import { fmtTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { useDriver } from "./useDriver";
import { ResultOverlay, useBoarding } from "./boarding";

type Filter = "expected" | "boarded" | "attention";

export function DriverRegister() {
  const { db, active, info } = useDriver();
  const [filter, setFilter] = useState<Filter>("expected");
  const [endOpen, setEndOpen] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [confirmLearner, setConfirmLearner] = useState<string | null>(null);
  const dispatch = useDispatch();
  const board = useBoarding();
  const nav = useNavigate();
  const selectTrip = useSession((s) => s.selectTrip);

  const rows = useMemo(() => {
    if (!active || !info) return [];
    const flaggedIds = new Set(info.flagged.map((x) => x.learnerId).filter(Boolean) as string[]);
    return info.roster
      .map((l) => {
        const c = clearanceFor(db, l.id);
        const stop = db.routeById.get(l.routeId!)?.stops.find((s) => s.id === l.stopId);
        return { l, status: rosterStatus(db, active, l.id), cleared: c.cleared, flagged: flaggedIds.has(l.id), stop, event: db.eventByLearnerTrip.get(`${l.id}|${active.id}`) };
      })
      .sort((a, b) => (a.stop?.amTime ?? "").localeCompare(b.stop?.amTime ?? "") || a.l.lastName.localeCompare(b.l.lastName));
  }, [db, active, info]);

  if (!active || !info) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <div className="font-display text-[22px] font-semibold">No trip selected</div>
        <p className="text-muted-foreground">Open a trip from Today to see its register.</p>
        <button onClick={() => nav("/driver")} className="h-12 rounded-xl bg-navy px-6 font-semibold text-white">Go to Today</button>
      </div>
    );
  }

  const readOnly = active.status !== "in_progress";
  const boarded = rows.filter((r) => r.status === "boarded");
  const expected = rows.filter((r) => r.status !== "boarded");
  const attention = rows.filter((r) => r.status !== "boarded" && (!r.cleared || r.flagged));
  const unrosteredFlags = info.flagged.filter((x) => !x.learnerId || !info.roster.some((l) => l.id === x.learnerId));
  const list = filter === "boarded" ? boarded : filter === "expected" ? expected : attention;

  const checkIn = (learnerId: string) => {
    setConfirmLearner(null);
    const o = board({ learnerId, tripId: active.id, method: "manual" });
    setOutcome(o);
    if (o.kind === "boarded") window.setTimeout(() => setOutcome((cur) => (cur === o ? null : cur)), 1400);
  };

  return (
    <div className="relative min-h-full">
      <div className="sticky top-0 z-10 border-b bg-surface/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
          {([
            ["expected", active.status === "completed" ? "Not recorded" : "Expected", expected.length],
            ["boarded", "Boarded", boarded.length],
            ["attention", "Needs attention", attention.length + unrosteredFlags.length],
          ] as [Filter, string, number][]).map(([k, label, n]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn("flex h-12 flex-col items-center justify-center rounded-xl text-[13px] font-semibold leading-tight text-muted-foreground", filter === k && "bg-card text-ink shadow-sm")}
            >
              <span className="font-display text-[17px] tabular">{n}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      <ul className="flex flex-col px-4 pb-28 pt-2">
        {list.map(({ l, status, cleared, flagged, stop, event }) => (
          <li key={l.id} className="flex min-h-16 items-center gap-3 border-b py-2.5 last:border-0">
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold", status === "boarded" ? "bg-ok-bg text-ok" : "bg-teal-tint text-teal")}>
              {status === "boarded" ? <CheckCircle2 className="size-5" /> : initials(l)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-semibold">{learnerName(l)}</div>
              <div className="truncate text-[13px] text-muted-foreground">
                Gr {l.className} · {stop?.name}
                {event && ` · ${fmtTime(event.time)}${event.method === "manual" ? " · manual" : ""}${event.clearance === "office_exception" ? " · office clearance" : ""}`}
              </div>
              {status !== "boarded" && (!cleared || flagged) && (
                <div className="mt-0.5 flex items-center gap-1 text-[13px] font-semibold text-warn">
                  <Flag className="size-3.5" /> {!cleared ? "Check with office before boarding" : "Flagged on this trip"}
                </div>
              )}
            </div>
            {!readOnly && status !== "boarded" && (
              <button onClick={() => setConfirmLearner(l.id)} className="flex h-12 items-center gap-1.5 rounded-xl border bg-card px-3 text-[14px] font-semibold text-navy active:scale-[0.99]">
                <UserCheck className="size-4" /> Check in
              </button>
            )}
          </li>
        ))}
        {filter === "attention" && unrosteredFlags.map((x) => (
          <li key={x.id} className="flex min-h-16 items-center gap-3 border-b py-2.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-bad-bg text-bad"><HelpCircle className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-semibold">{x.learnerId ? learnerName(db.learnerById.get(x.learnerId)) : "Unidentified pass"}</div>
              <div className="text-[13px] text-muted-foreground">{EXCEPTION_LABEL[x.reason]} · {fmtTime(x.time)} · not on this roster</div>
            </div>
          </li>
        ))}
        {list.length === 0 && (filter !== "attention" || unrosteredFlags.length === 0) && (
          <li className="py-14 text-center text-muted-foreground">
            {filter === "boarded" ? "No one has boarded yet." : filter === "expected" ? "Everyone on the roster has boarded." : "Nothing needs attention."}
          </li>
        )}
      </ul>

      <div className="sticky bottom-0 border-t bg-card/95 p-4 backdrop-blur">
        {readOnly ? (
          <div className="flex items-center justify-between gap-3">
            <div className="text-[14px] text-muted-foreground">
              {active.status === "completed" ? `Trip ended ${active.endedAt ? fmtTime(active.endedAt) : ""} · read only` : "Trip not started"}
            </div>
            <button onClick={() => nav("/driver")} className="h-12 rounded-xl border px-4 font-semibold">Today</button>
          </div>
        ) : (
          <button onClick={() => setEndOpen(true)} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-navy text-[16px] font-semibold text-white">
            <Square className="size-4 fill-current" /> End trip
          </button>
        )}
      </div>

      {outcome && (
        <div className="fixed inset-0 z-40 mx-auto max-w-[480px]">
          <ResultOverlay outcome={outcome} onNext={() => setOutcome(null)} />
        </div>
      )}

      <AlertDialog open={!!confirmLearner} onOpenChange={(o) => !o && setConfirmLearner(null)}>
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Check in {learnerName(db.learnerById.get(confirmLearner ?? ""))}?</AlertDialogTitle>
            <AlertDialogDescription>Use this when the learner forgot their pass. The same boarding checks apply, and the register shows it as a manual check-in.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-12" onClick={() => confirmLearner && checkIn(confirmLearner)}>Check in</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={endOpen} onOpenChange={setEndOpen}>
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle>End this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              {info.vehicle.label} · {active.direction === "AM" ? "To school" : "From school"}. After ending, the register is read only and learners not scanned show as Not recorded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Boarded", boarded.length, "text-ok"],
              ["Unrecorded", expected.length, "text-warn"],
              ["Flagged", info.flagged.length, "text-bad"],
            ].map(([k, v, c]) => (
              <div key={k as string} className="rounded-xl bg-muted py-3">
                <div className={cn("font-display text-[26px] font-bold tabular", c as string)}>{v}</div>
                <div className="text-[12px] font-medium text-muted-foreground">{k}</div>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Keep scanning</AlertDialogCancel>
            <AlertDialogAction
              className="h-12"
              onClick={() => {
                dispatch({ type: "tripStatus", tripId: active.id, status: "completed", at: new Date().toISOString() });
                selectTrip(active.id);
                toast.success(`Trip ended · ${boarded.length} boarded`);
              }}
            >
              End trip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
