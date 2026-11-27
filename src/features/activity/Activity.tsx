import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, Moon, ScanLine, Sun } from "lucide-react";
import { useDb } from "@/demo/store";
import { effectiveVehicle, EXCEPTION_LABEL, learnerName, rosterStatus } from "@/domain/rules";
import { busOptions, dayOptions, roster, routeOptions, tripsOn } from "@/domain/selectors";
import type { Direction } from "@/domain/types";
import { EmptyState, PageHeader, Panel, Toolbar } from "@/shared/components/Page";
import { ALL, FilterSelect } from "@/shared/components/FilterSelect";
import { EXC_META, Pill, ROSTER_META, RosterPill, TripPill, TRIP_META } from "@/shared/components/Status";
import { Button } from "@/shared/components/ui/button";
import { downloadCsv } from "@/shared/lib/csv";
import { dirLabel, fmtDate, fmtNum, fmtTime } from "@/shared/lib/format";
import { useParamState } from "@/shared/lib/useParamState";
import { cn } from "@/shared/lib/utils";

type View = "boarded" | "missing" | "exceptions" | "trips";
const METHOD: Record<string, string> = { qr: "QR scan", demo: "Demo scan", manual: "Manual check-in" };

export function Activity() {
  const db = useDb();
  const nav = useNavigate();
  const { get, set } = useParamState();
  const date = get("date", db.today);
  const dir = get("dir", "AM") as Direction;
  const route = get("route");
  const bus = get("bus");
  const view = get("view", "boarded") as View;
  const tripStatus = get("status");

  const trips = useMemo(
    () =>
      tripsOn(db, date, dir).filter(
        (t) => (route === ALL || t.routeId === route) && (bus === ALL || t.vehicleId === bus || effectiveVehicle(db, t).id === bus),
      ),
    [db, date, dir, route, bus],
  );
  const tripIds = useMemo(() => new Set(trips.map((t) => t.id)), [trips]);

  const boarded = useMemo(
    () => db.events.filter((e) => tripIds.has(e.tripId)).sort((a, b) => b.time.localeCompare(a.time)),
    [db, tripIds],
  );
  const missing = useMemo(
    () =>
      trips.flatMap((t) =>
        roster(db, t)
          .filter((l) => !db.eventByLearnerTrip.has(`${l.id}|${t.id}`))
          .map((l) => ({ l, t, status: rosterStatus(db, t, l.id) })),
      ),
    [db, trips],
  );
  const exceptions = useMemo(
    () => db.exceptions.filter((x) => x.date === date && x.direction === dir && (route === ALL || x.routeId === route) && (bus === ALL || x.vehicleId === bus)).sort((a, b) => b.time.localeCompare(a.time)),
    [db, date, dir, route, bus],
  );
  const tripRows = trips.filter((t) => tripStatus === ALL || t.status === tripStatus);
  const expected = trips.reduce((s, t) => s + roster(db, t).length, 0);

  const exportCsv = () => {
    const name = `boarding-${date}-${dir}-${view}.csv`;
    if (view === "boarded")
      downloadCsv(name, [["Date", "Direction", "Learner ID", "Learner", "Class", "Route", "Bus", "Scan time", "Entry method", "Result", "Driver"],
        ...boarded.map((e) => { const l = db.learnerById.get(e.learnerId); const r = db.routeById.get(e.routeId); return [e.date, dirLabel(e.direction), e.learnerId, learnerName(l), l?.className, `${r?.code} ${r?.name}`, db.vehicleById.get(e.vehicleId)?.label, fmtTime(e.time), METHOD[e.method], e.clearance === "office_exception" ? "Boarded (office one-trip clearance)" : "Boarded", db.driverById.get(e.driverId)?.name]; })]);
    else if (view === "missing")
      downloadCsv(name, [["Date", "Direction", "Learner ID", "Learner", "Class", "Route", "Bus", "Status"],
        ...missing.map(({ l, t, status }) => { const r = db.routeById.get(t.routeId); return [t.date, dirLabel(t.direction), l.id, learnerName(l), l.className, `${r?.code} ${r?.name}`, effectiveVehicle(db, t).label, ROSTER_META[status].label]; })]);
    else if (view === "exceptions")
      downloadCsv(name, [["Date", "Time", "Direction", "Reason", "Learner ID", "Learner", "Pass code", "Route", "Bus", "Entry method", "Status", "Resolution"],
        ...exceptions.map((x) => [x.date, fmtTime(x.time), dirLabel(x.direction), EXCEPTION_LABEL[x.reason], x.learnerId ?? "", x.learnerId ? learnerName(db.learnerById.get(x.learnerId)) : "", x.token ?? "", db.routeById.get(x.routeId)?.name, db.vehicleById.get(x.vehicleId)?.label, METHOD[x.method], x.status, x.resolutionNote ?? ""])]);
    else
      downloadCsv(name, [["Date", "Direction", "Route", "Bus", "Driver", "Departs", "Status", "Boarded", "Expected"],
        ...tripRows.map((t) => [t.date, dirLabel(t.direction), db.routeById.get(t.routeId)?.name, effectiveVehicle(db, t).label, db.driverById.get(t.driverId)?.name, t.departure, TRIP_META[t.status].label, db.eventsByTrip.get(t.id)?.length ?? 0, roster(db, t).length])]);
  };

  const VIEWS: [View, string, number][] = [
    ["boarded", "Boarded", boarded.length],
    ["missing", date === db.today ? "Not boarded / not recorded" : "Not recorded", missing.length],
    ["exceptions", "Exceptions", exceptions.length],
    ["trips", "Trips", trips.length],
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Bus boarding registers"
        title="Boarding activity"
        description="Each direction is a separate register. A boarding record confirms the learner got on the bus, not that they arrived in class or were dropped off."
        actions={<Button variant="outline" onClick={exportCsv}><Download /> Export CSV</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border bg-card p-1">
          {(["AM", "PM"] as Direction[]).map((d) => (
            <button
              key={d}
              onClick={() => set("dir", d === "AM" ? ALL : d)}
              className={cn("flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium text-muted-foreground", dir === d && "bg-navy text-white shadow")}
            >
              {d === "AM" ? <Sun className="size-4" /> : <Moon className="size-4" />} {dirLabel(d)}
            </button>
          ))}
        </div>
        <FilterSelect label="Day" allLabel="Today" value={date === db.today ? ALL : date} onChange={(v) => set("date", v === ALL || v === db.today ? ALL : v)} options={dayOptions(db).filter((o) => o.value !== db.today)} className="w-[170px]" />
        <FilterSelect label="Routes" value={route} onChange={(v) => set("route", v, { bus: null })} options={routeOptions(db)} />
        <FilterSelect label="Buses" value={bus} onChange={(v) => set("bus", v)} options={[...busOptions(db, route), ...db.vehicles.filter((v) => v.spare).map((v) => ({ value: v.id, label: v.label }))]} className="w-[130px]" />
        <div className="ml-auto text-[13px] text-muted-foreground tabular">
          <strong className="text-ink">{fmtNum(boarded.length)}</strong> of {fmtNum(expected)} boarded · {fmtDate(date)}
        </div>
      </div>

      <Panel>
        <div className="flex flex-wrap gap-1 border-b px-3 pt-2">
          {VIEWS.map(([k, label, n]) => (
            <button
              key={k}
              onClick={() => set("view", k === "boarded" ? ALL : k, { status: null })}
              className={cn("-mb-px flex items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-ink", view === k && "border-teal text-ink")}
            >
              {label} <span className={cn("rounded-full bg-muted px-1.5 text-[11px] tabular", view === k && "bg-teal-tint text-teal")}>{fmtNum(n)}</span>
            </button>
          ))}
        </div>

        {view === "trips" && (
          <Toolbar>
            <FilterSelect label="Trip status" allLabel="Any trip status" value={tripStatus} onChange={(v) => set("status", v)} options={(["planned", "in_progress", "completed"] as const).map((s) => ({ value: s, label: TRIP_META[s].label }))} className="w-[170px]" />
          </Toolbar>
        )}

        <div className="overflow-x-auto">
          {view === "boarded" && (boarded.length === 0 ? <EmptyState icon={ScanLine} title="No boardings recorded">Nothing has been scanned for this register and filter yet.</EmptyState> : (
            <table className="w-full min-w-[860px] text-sm">
              <thead><tr className="border-b text-left text-[12px] text-muted-foreground"><th className="px-5 py-2.5 font-medium">Learner</th><th className="px-3 py-2.5 font-medium">Bus</th><th className="px-3 py-2.5 font-medium">Route</th><th className="px-3 py-2.5 font-medium">Scan time</th><th className="px-3 py-2.5 font-medium">Direction</th><th className="px-3 py-2.5 font-medium">Entry method</th><th className="px-3 py-2.5 font-medium">Result</th></tr></thead>
              <tbody>
                {boarded.slice(0, 300).map((e) => {
                  const l = db.learnerById.get(e.learnerId);
                  const r = db.routeById.get(e.routeId);
                  return (
                    <tr key={e.id} onClick={() => nav(`/office/learners/${e.learnerId}?tab=activity`)} className="cursor-pointer border-b last:border-0 hover:bg-muted/50">
                      <td className="px-5 py-2.5"><span className="font-medium text-ink">{learnerName(l)}</span> <span className="text-[12px] text-muted-foreground">· {l?.className}</span></td>
                      <td className="px-3 py-2.5"><Link to={`/office/trips/${e.tripId}`} onClick={(ev) => ev.stopPropagation()} className="font-medium text-teal hover:underline">{db.vehicleById.get(e.vehicleId)?.label}</Link></td>
                      <td className="px-3 py-2.5">{r?.code} · {r?.name}</td>
                      <td className="px-3 py-2.5 tabular">{fmtTime(e.time)}</td>
                      <td className="px-3 py-2.5">{dirLabel(e.direction)}</td>
                      <td className="px-3 py-2.5">{METHOD[e.method]}</td>
                      <td className="px-3 py-2.5">{e.clearance === "office_exception" ? <Pill tone="warn">Boarded · office clearance</Pill> : <Pill tone="ok">Boarded</Pill>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ))}
          {view === "missing" && (missing.length === 0 ? <EmptyState title="Everyone on these rosters boarded" /> : (
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="border-b text-left text-[12px] text-muted-foreground"><th className="px-5 py-2.5 font-medium">Learner</th><th className="px-3 py-2.5 font-medium">Bus</th><th className="px-3 py-2.5 font-medium">Route</th><th className="px-3 py-2.5 font-medium">Trip</th><th className="px-3 py-2.5 font-medium">Status</th></tr></thead>
              <tbody>
                {missing.slice(0, 300).map(({ l, t, status }) => (
                  <tr key={`${l.id}${t.id}`} onClick={() => nav(`/office/trips/${t.id}`)} className="cursor-pointer border-b last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-2.5"><Link to={`/office/learners/${l.id}?tab=activity`} onClick={(ev) => ev.stopPropagation()} className="font-medium text-ink hover:underline">{learnerName(l)}</Link> <span className="text-[12px] text-muted-foreground">· {l.className}</span></td>
                    <td className="px-3 py-2.5">{effectiveVehicle(db, t).label}</td>
                    <td className="px-3 py-2.5">{db.routeById.get(t.routeId)?.name}</td>
                    <td className="px-3 py-2.5"><TripPill status={t.status} /></td>
                    <td className="px-3 py-2.5"><RosterPill status={status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
          {view === "exceptions" && (exceptions.length === 0 ? <EmptyState title="No exceptions for this register" /> : (
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="border-b text-left text-[12px] text-muted-foreground"><th className="px-5 py-2.5 font-medium">Time</th><th className="px-3 py-2.5 font-medium">Reason</th><th className="px-3 py-2.5 font-medium">Learner</th><th className="px-3 py-2.5 font-medium">Bus</th><th className="px-3 py-2.5 font-medium">Entry</th><th className="px-3 py-2.5 font-medium">Status</th></tr></thead>
              <tbody>
                {exceptions.map((x) => (
                  <tr key={x.id} onClick={() => nav(`/office/exceptions?date=${x.date}&open=${x.id}`)} className="cursor-pointer border-b last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-2.5 tabular">{fmtTime(x.time)}</td>
                    <td className="px-3 py-2.5"><Pill tone={EXC_META[x.reason].tone} icon={EXC_META[x.reason].icon}>{EXCEPTION_LABEL[x.reason]}</Pill></td>
                    <td className="px-3 py-2.5">{x.learnerId ? learnerName(db.learnerById.get(x.learnerId)) : <code className="text-[12px]">{x.token}</code>}</td>
                    <td className="px-3 py-2.5">{db.vehicleById.get(x.vehicleId)?.label}</td>
                    <td className="px-3 py-2.5">{METHOD[x.method]}</td>
                    <td className="px-3 py-2.5 capitalize">{x.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
          {view === "trips" && (tripRows.length === 0 ? <EmptyState title="No trips match" /> : (
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="border-b text-left text-[12px] text-muted-foreground"><th className="px-5 py-2.5 font-medium">Bus</th><th className="px-3 py-2.5 font-medium">Route</th><th className="px-3 py-2.5 font-medium">Driver</th><th className="px-3 py-2.5 font-medium">Departs</th><th className="px-3 py-2.5 font-medium">Boarded</th><th className="px-3 py-2.5 font-medium">Status</th></tr></thead>
              <tbody>
                {tripRows.map((t) => (
                  <tr key={t.id} onClick={() => nav(`/office/trips/${t.id}`)} className="cursor-pointer border-b last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-2.5 font-medium text-ink">{effectiveVehicle(db, t).label}</td>
                    <td className="px-3 py-2.5">{db.routeById.get(t.routeId)?.code} · {db.routeById.get(t.routeId)?.name}</td>
                    <td className="px-3 py-2.5">{db.driverById.get(t.driverId)?.name}</td>
                    <td className="px-3 py-2.5 tabular">{t.departure}</td>
                    <td className="px-3 py-2.5 tabular"><strong>{db.eventsByTrip.get(t.id)?.length ?? 0}</strong>/{roster(db, t).length}</td>
                    <td className="px-3 py-2.5"><TripPill status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
        {((view === "boarded" && boarded.length > 300) || (view === "missing" && missing.length > 300)) && (
          <div className="border-t px-5 py-3 text-[13px] text-muted-foreground">Showing the first 300 rows. Filter by route or bus, or export CSV for the full list.</div>
        )}
      </Panel>
    </div>
  );
}
