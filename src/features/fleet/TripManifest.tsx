import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { useDb } from "@/demo/store";
import { clearanceFor, effectiveVehicle, EXCEPTION_LABEL, learnerName, rosterStatus } from "@/domain/rules";
import { roster } from "@/domain/selectors";
import { EmptyState, Field, Panel } from "@/shared/components/Page";
import { DirPill, EXC_META, Pill, RosterPill, TripPill } from "@/shared/components/Status";
import { Button } from "@/shared/components/ui/button";
import { downloadCsv } from "@/shared/lib/csv";
import { dirLabel, fmtLongDay, fmtTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

export function TripManifest() {
  const { tripId = "" } = useParams();
  const db = useDb();
  const [view, setView] = useState<"all" | "boarded" | "missing">("all");
  const t = db.tripById.get(tripId);

  const rows = useMemo(() => {
    if (!t) return [];
    return roster(db, t)
      .map((l) => {
        const stop = db.routeById.get(t.routeId)?.stops.find((s) => s.id === l.stopId);
        return { l, stop, status: rosterStatus(db, t, l.id), ev: db.eventByLearnerTrip.get(`${l.id}|${t.id}`), cleared: clearanceFor(db, l.id).cleared };
      })
      .sort((a, b) => (a.stop?.amTime ?? "").localeCompare(b.stop?.amTime ?? "") || a.l.lastName.localeCompare(b.l.lastName));
  }, [db, t]);

  if (!t) return <EmptyState title="Trip not found"><Link to="/office/fleet" className="text-teal underline">Back to routes</Link></EmptyState>;
  const route = db.routeById.get(t.routeId)!;
  const veh = effectiveVehicle(db, t);
  const planned = db.vehicleById.get(t.vehicleId)!;
  const exceptions = db.exceptions.filter((x) => x.tripId === t.id);
  const boarded = rows.filter((r) => r.status === "boarded").length;
  const list = rows.filter((r) => (view === "all" ? true : view === "boarded" ? r.status === "boarded" : r.status !== "boarded"));
  const missingLabel = t.status === "completed" ? "Not recorded" : "Not boarded yet";

  const exportCsv = () =>
    downloadCsv(`manifest-${t.id}.csv`, [
      ["Date", "Direction", "Route", "Bus", "Learner ID", "Learner", "Class", "Stop", "Status", "Scan time", "Entry method", "Clearance"],
      ...list.map((r) => [
        t.date, dirLabel(t.direction), `${route.code} ${route.name}`, r.ev ? db.vehicleById.get(r.ev.vehicleId)?.label : veh.label, r.l.id, learnerName(r.l), r.l.className, r.stop?.name,
        r.status === "boarded" ? "Boarded" : missingLabel, r.ev ? fmtTime(r.ev.time) : "", r.ev?.method ?? "", r.ev?.clearance === "office_exception" ? "Office one-trip clearance" : r.ev ? "Cleared" : "",
      ]),
    ]);

  return (
    <div className="print-area">
      <Link to={`/office/fleet/${route.id}`} className="no-print mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-ink"><ArrowLeft className="size-4" /> {route.name} route</Link>
      <div className="mb-6 rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2"><DirPill dir={t.direction} /><TripPill status={t.status} /></div>
            <h1 className="text-[24px] font-semibold text-ink">Trip register · {veh.label}</h1>
            <p className="text-sm text-muted-foreground">{fmtLongDay(t.date)} · {route.code} {route.name} · departs {t.departure}</p>
          </div>
          <div className="no-print flex gap-2">
            <Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button>
            <Button variant="outline" onClick={exportCsv}><Download /> Export CSV</Button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-4 md:grid-cols-5">
          <Field label="Driver">{db.driverById.get(t.driverId)?.name}</Field>
          <Field label="Vehicle">{veh.label} · {veh.registration}{veh.id !== planned.id ? ` (replaces ${planned.label})` : ""}</Field>
          <Field label="Boarded">{boarded} of {rows.length}</Field>
          <Field label={missingLabel}>{rows.length - boarded}</Field>
          <Field label="Exceptions">{exceptions.length}</Field>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          title="Roster"
          actions={
            <div className="no-print flex rounded-lg bg-muted p-0.5 text-[13px]">
              {([["all", `All ${rows.length}`], ["boarded", `Boarded ${boarded}`], ["missing", `${missingLabel} ${rows.length - boarded}`]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setView(k)} className={cn("rounded-md px-3 py-1 font-medium text-muted-foreground", view === k && "bg-card text-ink shadow-sm")}>{label}</button>
              ))}
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="border-b text-left text-[12px] text-muted-foreground"><th className="px-5 py-2.5 font-medium">Learner</th><th className="px-3 py-2.5 font-medium">Stop</th><th className="px-3 py-2.5 font-medium">Status</th><th className="px-3 py-2.5 font-medium">Scan</th><th className="px-3 py-2.5 font-medium">Fare</th></tr></thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.l.id} className="border-b last:border-0">
                    <td className="px-5 py-2.5"><Link to={`/office/learners/${r.l.id}?tab=activity`} className="font-medium text-ink hover:underline">{learnerName(r.l)}</Link> <span className="text-[12px] text-muted-foreground">· {r.l.className}</span></td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.stop?.name}</td>
                    <td className="px-3 py-2.5"><RosterPill status={r.status} /></td>
                    <td className="px-3 py-2.5 tabular">
                      {r.ev ? <>{fmtTime(r.ev.time)} <span className="text-muted-foreground">· {r.ev.method === "manual" ? "manual" : r.ev.method === "demo" ? "demo scan" : "QR"}{r.ev.vehicleId !== veh.id ? ` · ${db.vehicleById.get(r.ev.vehicleId)?.label}` : ""}</span>{r.ev.clearance === "office_exception" && <span className="text-warn"> · office clearance</span>}</> : "—"}
                    </td>
                    <td className="px-3 py-2.5">{r.cleared ? <Pill tone="ok">Cleared</Pill> : <Pill tone="warn">Not cleared</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Exceptions on this trip">
          {exceptions.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">None recorded.</div>
          ) : (
            <ul>
              {exceptions.map((x) => (
                <li key={x.id} className="border-b px-5 py-3 last:border-0">
                  <Link to={`/office/exceptions?date=${x.date}&open=${x.id}`} className="block hover:underline">
                    <div className="flex items-center justify-between gap-2">
                      <Pill tone={EXC_META[x.reason].tone}>{EXCEPTION_LABEL[x.reason]}</Pill>
                      <span className="text-[12px] text-muted-foreground tabular">{fmtTime(x.time)}</span>
                    </div>
                    <div className="mt-1 text-sm text-ink">{x.learnerId ? learnerName(db.learnerById.get(x.learnerId)) : `Code ${x.token}`}</div>
                    <div className="text-[12px] text-muted-foreground">{x.status === "open" ? "Open" : x.status === "cleared" ? (x.clearanceUsedBy ? "One-trip clearance used" : "One-trip clearance granted") : "Resolved"}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
