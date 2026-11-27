import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowLeftRight, Bus, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useDb, useDispatch } from "@/demo/store";
import { effectiveVehicle, learnerName } from "@/domain/rules";
import { dayOptions, roster, tripsOn } from "@/domain/selectors";
import type { Direction, Trip } from "@/domain/types";
import { EmptyState, PageHeader, Panel } from "@/shared/components/Page";
import { DirPill, Pill, TripPill } from "@/shared/components/Status";
import { FilterSelect } from "@/shared/components/FilterSelect";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { cn } from "@/shared/lib/utils";

export function RouteDetail() {
  const { routeId = "" } = useParams();
  const db = useDb();
  const nav = useNavigate();
  const [date, setDate] = useState(db.today);
  const [subTrip, setSubTrip] = useState<Trip | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const r = db.routeById.get(routeId);
  if (!r) return <EmptyState title="Route not found"><Link to="/office/fleet" className="text-teal underline">Back to routes</Link></EmptyState>;

  const buses = db.vehicles.filter((v) => v.routeId === r.id);
  const trips = tripsOn(db, date).filter((t) => t.routeId === r.id).sort((a, b) => a.direction.localeCompare(b.direction) || a.vehicleId.localeCompare(b.vehicleId));

  return (
    <div>
      <Link to="/office/fleet" className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-ink"><ArrowLeft className="size-4" /> Routes & buses</Link>
      <PageHeader
        eyebrow={`${r.code} · ${r.area}`}
        title={`${r.name} route`}
        description={`${r.stops.length} stops · ${db.learners.filter((l) => l.routeId === r.id && l.rider).length} riders across ${buses.length} buses`}
        actions={<Button onClick={() => setAssignOpen(true)}><UserPlus /> Assign learner to a departure</Button>}
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Panel title="Stops">
            <ol className="relative px-5 py-4">
              <span className="absolute bottom-8 left-[29px] top-8 w-0.5 bg-teal-2/25" aria-hidden />
              {r.stops.map((s) => (
                <li key={s.id} className="relative flex items-center gap-3 py-2">
                  <span className="z-10 size-[18px] shrink-0 rounded-full border-[3px] border-teal-2 bg-card" />
                  <span className="flex-1 text-sm font-medium text-ink">{s.name}</span>
                  <span className="text-[12px] tabular text-muted-foreground">{s.amTime} · {s.pmTime}</span>
                </li>
              ))}
              <li className="relative flex items-center gap-3 py-2">
                <span className="z-10 grid size-[18px] shrink-0 place-items-center rounded-full bg-navy text-[8px] font-bold text-white">KN</span>
                <span className="flex-1 text-sm font-semibold text-ink">Koot Niemann Primary</span>
                <span className="text-[12px] text-muted-foreground">AM arrive · PM depart 14:15</span>
              </li>
            </ol>
          </Panel>
          <Panel title="Buses and drivers">
            <div className="flex flex-col gap-2 p-4">
              {buses.map((v) => {
                const drv = db.drivers.find((d) => d.vehicleId === v.id);
                const amCount = db.learners.filter((l) => db.assignments[l.id]?.AM === v.id).length;
                const pmCount = db.learners.filter((l) => db.assignments[l.id]?.PM === v.id).length;
                return (
                  <div key={v.id} className="rounded-xl border p-3">
                    <div className="flex items-center gap-2 font-medium text-ink"><Bus className="size-4 text-teal" /> {v.label} <span className="text-[12px] font-normal text-muted-foreground">{v.registration}</span></div>
                    <div className="mt-1 text-[13px] text-muted-foreground">{drv?.name} · {drv?.phone}</div>
                    <div className="mt-2 flex gap-2 text-[12px]"><Pill tone="neutral">AM {amCount}/{v.capacity}</Pill><Pill tone="neutral">PM {pmCount}/{v.capacity}</Pill></div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        <Panel
          title="Trips"
          actions={<FilterSelect label="Day" value={date} onChange={(v) => setDate(v === "all" ? db.today : v)} options={dayOptions(db)} className="w-[190px]" allLabel="Today" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-[12px] text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Direction</th>
                  <th className="px-3 py-2.5 font-medium">Departs</th>
                  <th className="px-3 py-2.5 font-medium">Bus</th>
                  <th className="px-3 py-2.5 font-medium">Driver</th>
                  <th className="px-3 py-2.5 font-medium">Boarded</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => {
                  const ev = effectiveVehicle(db, t);
                  const planned = db.vehicleById.get(t.vehicleId)!;
                  return (
                    <tr key={t.id} className="cursor-pointer border-b last:border-0 hover:bg-muted/50" onClick={() => nav(`/office/trips/${t.id}`)}>
                      <td className="px-5 py-3"><DirPill dir={t.direction} /></td>
                      <td className="px-3 py-3 tabular">{t.departure}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-ink">{ev.label}</div>
                        {ev.id !== planned.id && <div className="text-[12px] text-warn">replaces {planned.label}</div>}
                      </td>
                      <td className="px-3 py-3">{db.driverById.get(t.driverId)?.name}</td>
                      <td className="px-3 py-3 tabular"><strong>{db.eventsByTrip.get(t.id)?.length ?? 0}</strong><span className="text-muted-foreground">/{roster(db, t).length}</span></td>
                      <td className="px-3 py-3"><TripPill status={t.status} /></td>
                      <td className="px-3 py-3 text-right">
                        {t.status !== "completed" && (
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSubTrip(t); }}>
                            <ArrowLeftRight /> Substitute bus
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <SubstituteDialog trip={subTrip} onClose={() => setSubTrip(null)} />
      <AssignDialog open={assignOpen} onOpenChange={setAssignOpen} routeId={r.id} />
    </div>
  );
}

function SubstituteDialog({ trip, onClose }: { trip: Trip | null; onClose: () => void }) {
  const db = useDb();
  const dispatch = useDispatch();
  const [vehicleId, setVehicleId] = useState("");
  const planned = trip ? db.vehicleById.get(trip.vehicleId) : undefined;
  const current = trip ? effectiveVehicle(db, trip) : undefined;
  const candidates = db.vehicles.filter((v) => v.id !== trip?.vehicleId);
  return (
    <Dialog open={!!trip} onOpenChange={(o) => { if (!o) { onClose(); setVehicleId(""); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Substitute bus</DialogTitle>
          <DialogDescription>
            {planned?.label} {trip?.direction} trip. The driver and roster stay the same. The driver's phone shows the new bus straight away, and boardings already saved keep the bus they were recorded on.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label>Vehicle for this trip</Label>
          <Select value={vehicleId || current?.id} onValueChange={setVehicleId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {planned && <SelectItem value={planned.id}>{planned.label} (planned)</SelectItem>}
              {candidates.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.label} · {v.registration} · {v.capacity} seats{v.spare ? " · spare" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!trip) return;
              const v = vehicleId || current!.id;
              dispatch({ type: "substitute", tripId: trip.id, vehicleId: v === trip.vehicleId ? null : v });
              toast.success(v === trip.vehicleId ? "Planned bus restored" : `${db.vehicleById.get(v)?.label} now runs this trip`);
              onClose();
              setVehicleId("");
            }}
          >
            Save substitution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({ open, onOpenChange, routeId }: { open: boolean; onOpenChange: (o: boolean) => void; routeId: string }) {
  const db = useDb();
  const dispatch = useDispatch();
  const [q, setQ] = useState("");
  const [learnerId, setLearnerId] = useState("");
  const [dir, setDir] = useState<"AM" | "PM" | "both">("both");
  const buses = db.vehicles.filter((v) => v.routeId === routeId);
  const [vehicleId, setVehicleId] = useState(buses[0]?.id ?? "");
  const learner = db.learnerById.get(learnerId);
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return db.learners.filter((l) => `${l.firstName} ${l.lastName} ${l.id}`.toLowerCase().includes(s)).slice(0, 6);
  }, [db, q]);
  const v = db.vehicleById.get(vehicleId);
  const load = (d: Direction) => db.learners.filter((l) => db.assignments[l.id]?.[d] === vehicleId).length;

  const close = () => { onOpenChange(false); setQ(""); setLearnerId(""); };
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign learner to a departure</DialogTitle>
          <DialogDescription>Choose the exact bus the learner rides. Their pass stays the same.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="assign-search">Learner</Label>
            {learner ? (
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <span><strong>{learnerName(learner)}</strong> <span className="text-muted-foreground">· {learner.id} · {learner.routeId ? `${db.routeById.get(learner.routeId)?.name} · AM ${db.vehicleById.get(db.assignments[learner.id]?.AM ?? "")?.label ?? "none"} · PM ${db.vehicleById.get(db.assignments[learner.id]?.PM ?? "")?.label ?? "none"}` : "non-rider"}</span></span>
                <Button variant="ghost" size="sm" onClick={() => setLearnerId("")}>Change</Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="assign-search" className="pl-9" placeholder="Search by name or learner number" value={q} onChange={(e) => setQ(e.target.value)} />
                {matches.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-lg">
                    {matches.map((l) => (
                      <button key={l.id} className="block w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => setLearnerId(l.id)}>
                        {learnerName(l)} <span className="text-muted-foreground">· {l.id} · {l.routeId ? db.routeById.get(l.routeId)?.name : "non-rider"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Direction</Label>
              <Select value={dir} onValueChange={(x) => setDir(x as typeof dir)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">AM and PM</SelectItem>
                  <SelectItem value="AM">AM · to school</SelectItem>
                  <SelectItem value="PM">PM · from school</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Bus</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{buses.map((b) => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {v && (
            <div className={cn("rounded-lg bg-muted/50 px-3 py-2 text-[13px] text-muted-foreground")}>
              {v.label} has {v.capacity} seats · AM {load("AM")} rostered · PM {load("PM")} rostered
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button
            disabled={!learner || !vehicleId}
            onClick={() => {
              if (!learner) return;
              const dirs: Direction[] = dir === "both" ? ["AM", "PM"] : [dir];
              const full = dirs.find((d) => load(d) >= (v?.capacity ?? 0) && db.assignments[learner.id]?.[d] !== vehicleId);
              if (full) { toast.error(`${v?.label} is full for ${full}. Choose the other bus.`); return; }
              if (!learner.rider) toast.info("This learner is now a bus rider. Record a fare payment before they can board.");
              dispatch(...dirs.map((d) => ({ type: "assign" as const, learnerId: learner.id, direction: d, vehicleId })));
              toast.success(`${learnerName(learner)} assigned to ${v?.label} (${dirs.join(" and ")})`);
              close();
            }}
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
