import { useNavigate } from "react-router-dom";
import { ChevronRight, Play, RotateCw, Eye, Users, Clock } from "lucide-react";
import { useDispatch } from "@/demo/store";
import { useSession } from "@/app/session";
import type { Trip } from "@/domain/types";
import { TripPill } from "@/shared/components/Status";
import { fmtDay } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { tripInfo, useDriver } from "./useDriver";

export function DriverToday() {
  const { db, today, previous, active } = useDriver();
  const dispatch = useDispatch();
  const selectTrip = useSession((s) => s.selectTrip);
  const nav = useNavigate();

  const open = (t: Trip) => {
    if (t.status === "planned") {
      dispatch({ type: "tripStatus", tripId: t.id, status: "in_progress", at: new Date().toISOString() });
      selectTrip(t.id);
      nav("/driver/scan");
    } else if (t.status === "in_progress") {
      selectTrip(t.id);
      nav("/driver/scan");
    } else {
      selectTrip(t.id);
      nav("/driver/register");
    }
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-5">
      <section>
        <h1 className="text-[22px] font-semibold">Today's trips</h1>
        <p className="text-[14px] text-muted-foreground">Start a trip, then scan each learner as they board.</p>
        <div className="mt-4 flex flex-col gap-3">
          {today.length === 0 && <div className="rounded-2xl border bg-card p-5 text-muted-foreground">No trips assigned for today.</div>}
          {today.map((t) => {
            const info = tripInfo(db, t);
            const isActive = active?.id === t.id;
            return (
              <article key={t.id} className={cn("overflow-hidden rounded-2xl border bg-card shadow-sm", isActive && "border-teal ring-2 ring-teal/20")}>
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-md px-1.5 py-0.5 text-[12px] font-bold", t.direction === "AM" ? "bg-[#fff1cc] text-[#7a4f00]" : "bg-[#e3e6f7] text-navy")}>
                        {t.direction} · {t.direction === "AM" ? "To school" : "From school"}
                      </span>
                      <TripPill status={t.status} />
                    </div>
                    <div className="mt-2 font-display text-[22px] font-semibold leading-tight">{info.vehicle.label}</div>
                    <div className="text-[14px] text-muted-foreground">{info.route.code} · {info.route.name}</div>
                    {info.substituted && <div className="mt-1 text-[13px] font-medium text-warn">Office substitution: replaces {info.planned.label}</div>}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-[13px] text-muted-foreground"><Clock className="size-3.5" /> Departs</div>
                    <div className="font-display text-[22px] font-semibold tabular">{t.departure}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-4 py-3">
                  <div className="flex items-center gap-2 text-[14px]">
                    <Users className="size-4 text-teal" />
                    <span className="font-semibold tabular">{info.boarded.length}</span>
                    <span className="text-muted-foreground">of {info.roster.length} expected</span>
                  </div>
                  <button
                    onClick={() => open(t)}
                    className={cn(
                      "flex h-12 min-w-[150px] items-center justify-center gap-2 rounded-xl px-5 text-[16px] font-semibold active:scale-[0.99]",
                      t.status === "completed" ? "border bg-card text-ink" : "bg-navy text-white shadow",
                    )}
                  >
                    {t.status === "planned" && (<><Play className="size-5" /> Start trip</>)}
                    {t.status === "in_progress" && (<><RotateCw className="size-5" /> Resume trip</>)}
                    {t.status === "completed" && (<><Eye className="size-5" /> View register</>)}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="eyebrow mb-2 text-muted-foreground">Previous trips</h2>
        <div className="overflow-hidden rounded-2xl border bg-card">
          {previous.slice(0, 10).map((t, i) => {
            const info = tripInfo(db, t);
            return (
              <button
                key={t.id}
                onClick={() => open(t)}
                className={cn("flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left hover:bg-muted/50", i > 0 && "border-t")}
              >
                <span className={cn("w-9 rounded-md py-0.5 text-center text-[11px] font-bold", t.direction === "AM" ? "bg-[#fff1cc] text-[#7a4f00]" : "bg-[#e3e6f7] text-navy")}>{t.direction}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">{fmtDay(t.date)}</span>
                  <span className="block text-[13px] text-muted-foreground">{info.vehicle.label} · {info.route.name}</span>
                </span>
                <span className="text-[14px] tabular text-muted-foreground">{info.boarded.length}/{info.roster.length}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
