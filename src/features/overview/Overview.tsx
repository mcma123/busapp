import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertOctagon, ArrowUpRight, Bus, CheckCircle2, CreditCard, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useDb } from "@/demo/store";
import { currentPeriod, EXCEPTION_LABEL, learnerName } from "@/domain/rules";
import { dayOptions, dayStats, paymentSummary, roster, tripsOn } from "@/domain/selectors";
import { PageHeader, Panel } from "@/shared/components/Page";
import { DirPill, EXC_META, Pill } from "@/shared/components/Status";
import { FilterSelect } from "@/shared/components/FilterSelect";
import { fmtLongDay, fmtNum, fmtTime, fmtZAR, pct } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

function Bar({ value, max, tone = "teal" }: { value: number; max: number; tone?: "teal" | "navy" }) {
  const p = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", tone === "teal" ? "bg-teal-2" : "bg-navy")} style={{ width: `${p}%` }} />
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon, to, tone }: { label: string; value: string; sub: string; icon: LucideIcon; to: string; tone: string }) {
  return (
    <Link to={to} className="group flex min-w-0 flex-col gap-3 rounded-2xl border bg-card p-4 transition hover:border-teal-2/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex items-center justify-between">
        <span className={cn("grid size-9 place-items-center rounded-lg", tone)}><Icon className="size-[18px]" /></span>
        <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
      </div>
      <div>
        <div className="font-display text-[28px] font-semibold leading-none tabular text-ink">{value}</div>
        <div className="mt-1.5 text-[13px] font-medium text-ink">{label}</div>
        <div className="text-[12px] text-muted-foreground">{sub}</div>
      </div>
    </Link>
  );
}

export function Overview() {
  const db = useDb();
  const nav = useNavigate();
  const [date, setDate] = useState(db.today);
  const stats = useMemo(() => dayStats(db, date), [db, date]);
  const pay = useMemo(() => paymentSummary(db), [db]);
  const per = currentPeriod(db);
  const riders = db.learners.filter((l) => l.rider).length;
  const isToday = date === db.today;
  const dayWord = isToday ? "today" : "on this day";

  const routeRows = useMemo(
    () =>
      db.routes.map((r) => {
        const trips = tripsOn(db, date).filter((t) => t.routeId === r.id);
        const sum = (dir: "AM" | "PM") =>
          trips.filter((t) => t.direction === dir).reduce(
            (a, t) => ({ b: a.b + (db.eventsByTrip.get(t.id)?.length ?? 0), e: a.e + roster(db, t).length, active: a.active || t.status === "in_progress", done: a.done && t.status === "completed" }),
            { b: 0, e: 0, active: false, done: true },
          );
        const buses = db.vehicles.filter((v) => v.routeId === r.id);
        return { r, am: sum("AM"), pm: sum("PM"), buses, riders: db.learners.filter((l) => l.routeId === r.id && l.rider).length };
      }),
    [db, date],
  );

  const recent = useMemo(() => {
    const ev = db.events.filter((e) => e.date === date).slice(-14).map((e) => ({ kind: "event" as const, time: e.time, e }));
    const ex = db.exceptions.filter((x) => x.date === date).slice(-8).map((x) => ({ kind: "exc" as const, time: x.time, x }));
    return [...ev, ...ex].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 12);
  }, [db, date]);

  return (
    <div>
      <PageHeader
        eyebrow={fmtLongDay(db.today)}
        title="Transport overview"
        description="School totals come from the learner register. Daily figures count boarding scans for the selected day."
        actions={<FilterSelect label="Day" value={date} onChange={(v) => setDate(v === "all" ? db.today : v)} options={dayOptions(db)} className="w-[190px]" allLabel="Today" />}
      />

      {/* School totals */}
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[15px] font-semibold text-ink">School totals</h2>
        <span className="text-[13px] text-muted-foreground">enrolment and transport register</span>
      </div>
      <section className="mb-8 overflow-hidden rounded-2xl bg-navy text-white shadow-sm">
        <div className="grid gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { k: "Learners enrolled", v: fmtNum(db.learners.length), s: `${fmtNum(db.learners.length - riders)} do not use school transport`, to: "/office/learners" },
            { k: "Bus riders", v: fmtNum(riders), s: "All assigned to a route and bus", to: "/office/learners?rider=yes" },
            { k: "Routes", v: String(db.routes.length), s: `${db.vehicles.filter((v) => !v.spare).length} buses + ${db.vehicles.filter((v) => v.spare).length} spares`, to: "/office/fleet" },
            { k: `Fares cleared · ${per.label}`, v: `${pct(pay.paid, riders)}%`, s: `${fmtZAR(pay.collected)} of ${fmtZAR(pay.due)} received`, to: "/office/payments" },
          ].map((x) => (
            <Link key={x.k} to={x.to} className="group bg-navy px-6 py-5 transition hover:bg-navy-2">
              <div className="eyebrow text-[#9fd0e6]">{x.k}</div>
              <div className="mt-2 font-display text-[36px] font-semibold leading-none tabular">{x.v}</div>
              <div className="mt-2 text-[13px] text-white/65">{x.s}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Daily KPIs */}
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[15px] font-semibold text-ink">{isToday ? "Today" : fmtLongDay(date)}</h2>
        <span className="text-[13px] text-muted-foreground">boarding registers</span>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi icon={Sun} tone="bg-[#fff1cc] text-[#7a4f00]" label="AM boarded · to school" value={`${fmtNum(stats.AM.boarded)}`} sub={`of ${fmtNum(stats.AM.expected)} expected ${dayWord}`} to={`/office/activity?date=${date}&dir=AM`} />
        <Kpi icon={Moon} tone="bg-[#e3e6f7] text-navy" label="PM boarded · from school" value={`${fmtNum(stats.PM.boarded)}`} sub={`of ${fmtNum(stats.PM.expected)} expected ${dayWord}`} to={`/office/activity?date=${date}&dir=PM`} />
        <Kpi icon={CreditCard} tone="bg-warn-bg text-warn" label="Payment exceptions" value={fmtNum(stats.fareExceptions)} sub={`fare checks at the bus door ${dayWord}`} to={`/office/exceptions?date=${date}&reason=fare`} />
        <Kpi icon={Bus} tone="bg-teal-tint text-teal" label="Active trips" value={fmtNum(stats.active)} sub={`${stats.openExceptions} open exceptions ${dayWord}`} to={`/office/activity?date=${date}&view=trips&status=in_progress`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Route progress" actions={<Link to="/office/fleet" className="text-[13px] font-medium text-teal hover:underline">Routes & buses</Link>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-[12px] text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Route</th>
                  <th className="px-3 py-2.5 font-medium">Buses</th>
                  <th className="w-[26%] px-3 py-2.5 font-medium">AM · to school</th>
                  <th className="w-[26%] px-3 py-2.5 font-medium">PM · from school</th>
                </tr>
              </thead>
              <tbody>
                {routeRows.map(({ r, am, pm, buses, riders }) => (
                  <tr
                    key={r.id}
                    tabIndex={0}
                    onClick={() => nav(`/office/activity?date=${date}&route=${r.id}`)}
                    onKeyDown={(e) => e.key === "Enter" && nav(`/office/activity?date=${date}&route=${r.id}`)}
                    className="cursor-pointer border-t transition hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 place-items-center rounded-lg bg-teal-tint text-[12px] font-bold text-teal">{r.code}</span>
                        <div>
                          <div className="font-medium text-ink">{r.name}</div>
                          <div className="text-[12px] text-muted-foreground">{riders} riders · {r.stops.length} stops</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[13px] text-muted-foreground">{buses.map((b) => b.label.replace("Bus ", "")).join(" · ")}</td>
                    {[am, pm].map((x, i) => (
                      <td key={i} className="px-3 py-3">
                        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
                          <span className="font-semibold tabular text-ink">{x.b}<span className="font-normal text-muted-foreground">/{x.e}</span></span>
                          <span className="text-[12px] text-muted-foreground">
                            {x.active ? <span className="font-medium text-teal">In progress</span> : x.done ? "Completed" : "Not started"}
                          </span>
                        </div>
                        <Bar value={x.b} max={x.e} tone={i === 0 ? "teal" : "navy"} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Recent activity" actions={<Link to={`/office/activity?date=${date}`} className="text-[13px] font-medium text-teal hover:underline">All activity</Link>}>
          {recent.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">No boarding scans recorded {dayWord} yet.</div>
          ) : (
            <ol className="relative px-5 py-4">
              <span className="absolute bottom-6 left-[31px] top-6 w-px bg-border" aria-hidden />
              {recent.map((item) => {
                if (item.kind === "event") {
                  const e = item.e;
                  const l = db.learnerById.get(e.learnerId);
                  return (
                    <li key={e.id} className="relative flex gap-3 py-2">
                      <span className="z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-ok-bg text-ok ring-4 ring-card"><CheckCircle2 className="size-3.5" /></span>
                      <Link to={`/office/learners/${e.learnerId}?tab=activity`} className="min-w-0 flex-1 hover:underline">
                        <div className="truncate text-[13px] font-medium text-ink">{learnerName(l)} boarded</div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
                          {fmtTime(e.time)} · {db.vehicleById.get(e.vehicleId)?.label} <DirPill dir={e.direction} short />
                          {e.method === "manual" && <span>· manual</span>}
                        </div>
                      </Link>
                    </li>
                  );
                }
                const x = item.x;
                const meta = EXC_META[x.reason];
                return (
                  <li key={x.id} className="relative flex gap-3 py-2">
                    <span className={cn("z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ring-4 ring-card", meta.tone === "warn" ? "bg-warn-bg text-warn" : "bg-bad-bg text-bad")}>
                      <AlertOctagon className="size-3.5" />
                    </span>
                    <Link to={`/office/exceptions?date=${x.date}&open=${x.id}`} className="min-w-0 flex-1 hover:underline">
                      <div className="truncate text-[13px] font-medium text-ink">{x.learnerId ? learnerName(db.learnerById.get(x.learnerId)) : "Unrecognised pass"}</div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
                        {fmtTime(x.time)} · <Pill tone={meta.tone} className="py-0 text-[11px]">{EXCEPTION_LABEL[x.reason]}</Pill>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}
