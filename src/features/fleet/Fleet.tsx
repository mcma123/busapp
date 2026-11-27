import { Link } from "react-router-dom";
import { ArrowRight, Bus, MapPin, Users } from "lucide-react";
import { useDb } from "@/demo/store";
import { effectiveVehicle } from "@/domain/rules";
import { roster, tripsOn } from "@/domain/selectors";
import { PageHeader, Panel } from "@/shared/components/Page";
import { Pill, TripPill } from "@/shared/components/Status";

export function Fleet() {
  const db = useDb();
  const spares = db.vehicles.filter((v) => v.spare);
  return (
    <div>
      <PageHeader
        eyebrow="Fleet"
        title="Routes, buses and drivers"
        description="A route is the scheduled service. Each route runs two buses, and every rider is rostered on one bus per direction."
      />
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {db.routes.map((r) => {
          const buses = db.vehicles.filter((v) => v.routeId === r.id);
          const riders = db.learners.filter((l) => l.routeId === r.id && l.rider).length;
          const today = tripsOn(db, db.today).filter((t) => t.routeId === r.id);
          return (
            <Link key={r.id} to={`/office/fleet/${r.id}`} className="group flex flex-col rounded-2xl border bg-card transition hover:border-teal-2/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="flex items-start justify-between gap-3 border-b p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-navy font-display text-[15px] font-semibold text-white">{r.code}</span>
                  <div>
                    <div className="font-display text-[18px] font-semibold text-ink">{r.name}</div>
                    <div className="text-[13px] text-muted-foreground">{r.area} · {r.stops.length} stops · first pick-up {r.stops[0].amTime}</div>
                  </div>
                </div>
                <ArrowRight className="size-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-teal" />
              </div>
              {/* stop strip */}
              <div className="flex items-center gap-1 overflow-hidden px-5 pt-4" aria-hidden>
                {r.stops.map((s, i) => (
                  <div key={s.id} className="flex flex-1 items-center gap-1">
                    <span className="size-2.5 shrink-0 rounded-full border-2 border-teal-2 bg-card" />
                    {i < r.stops.length - 1 && <span className="h-0.5 flex-1 rounded bg-teal-2/30" />}
                  </div>
                ))}
                <span className="ml-1 rounded bg-navy px-1.5 text-[10px] font-bold text-white">KN</span>
              </div>
              <div className="grid flex-1 gap-2 p-5">
                {buses.map((v) => {
                  const drv = db.drivers.find((d) => d.vehicleId === v.id);
                  const am = today.find((t) => t.vehicleId === v.id && t.direction === "AM");
                  const sub = am && effectiveVehicle(db, am).id !== v.id;
                  return (
                    <div key={v.id} className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
                      <Bus className="size-4 text-teal" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-ink">{v.label} <span className="font-normal text-muted-foreground">· {v.registration}</span></div>
                        <div className="truncate text-[12px] text-muted-foreground">{drv?.name} · {am ? roster(db, am).length : 0}/{v.capacity} seats used</div>
                      </div>
                      {sub ? <Pill tone="warn">Substituted</Pill> : am && <TripPill status={am.status} />}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 border-t px-5 py-3 text-[13px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><Users className="size-4" /> {riders} riders</span>
                <span className="flex items-center gap-1.5"><MapPin className="size-4" /> {r.stops[r.stops.length - 1].name} → school</span>
              </div>
            </Link>
          );
        })}
      </div>

      <Panel title="Spare buses" className="mt-6">
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {spares.map((v) => {
            const used = db.trips.filter((t) => t.date === db.today && db.substitutions.get(t.id) === v.id);
            return (
              <div key={v.id} className="flex items-center gap-3 rounded-xl border px-4 py-3">
                <Bus className="size-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium text-ink">{v.label} <span className="font-normal text-muted-foreground">· {v.registration} · {v.capacity} seats</span></div>
                  <div className="text-[12px] text-muted-foreground">
                    {used.length ? `Substituting today on ${used.map((t) => `${db.vehicleById.get(t.vehicleId)?.label} ${t.direction}`).join(", ")}` : "Available for substitution"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
