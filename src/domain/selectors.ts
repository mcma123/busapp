import { fmtDay } from "@/shared/lib/format";
import type { Db } from "@/demo/store";
import type { Direction, Learner, Trip } from "./types";
import { clearanceFor, currentPeriod } from "./rules";

const rosterCache = new WeakMap<Db, Map<string, Learner[]>>();
/** learners rostered on a vehicle for a direction (the departure) */
export function rosterIndex(db: Db) {
  let m = rosterCache.get(db);
  if (!m) {
    m = new Map();
    for (const l of db.learners) {
      const a = db.assignments[l.id];
      if (!a) continue;
      for (const d of ["AM", "PM"] as Direction[]) {
        const v = a[d];
        if (!v) continue;
        const k = `${d}|${v}`;
        const arr = m.get(k);
        if (arr) arr.push(l);
        else m.set(k, [l]);
      }
    }
    rosterCache.set(db, m);
  }
  return m;
}
export const roster = (db: Db, trip: Trip) => rosterIndex(db).get(`${trip.direction}|${trip.vehicleId}`) ?? [];

export function tripsOn(db: Db, date: string, dir?: Direction) {
  return db.trips.filter((t) => t.date === date && (!dir || t.direction === dir));
}

export function dayStats(db: Db, date: string) {
  const out = { AM: { boarded: 0, expected: 0 }, PM: { boarded: 0, expected: 0 }, active: 0, fareExceptions: 0, openExceptions: 0 };
  for (const t of tripsOn(db, date)) {
    out[t.direction].expected += roster(db, t).length;
    out[t.direction].boarded += db.eventsByTrip.get(t.id)?.length ?? 0;
    if (t.status === "in_progress") out.active++;
  }
  for (const x of db.exceptions) {
    if (x.date !== date) continue;
    if (x.reason === "fare") out.fareExceptions++;
    if (x.status === "open") out.openExceptions++;
  }
  return out;
}

export function paymentSummary(db: Db) {
  const per = currentPeriod(db);
  const s = { paid: 0, partial: 0, pending: 0, unpaid: 0, collected: 0, due: 0 };
  for (const l of db.learners) {
    if (!l.rider) continue;
    const c = clearanceFor(db, l.id, per.id);
    s[c.status]++;
    s.collected += c.paid;
    s.due += c.due;
  }
  return s;
}

export function routeOptions(db: Db) {
  return db.routes.map((r) => ({ value: r.id, label: `${r.code} · ${r.name}` }));
}
export function busOptions(db: Db, routeId?: string) {
  return db.vehicles
    .filter((v) => !v.spare && (!routeId || routeId === "all" || v.routeId === routeId))
    .map((v) => ({ value: v.id, label: v.label }));
}
export function dayOptions(db: Db) {
  return [...db.days].reverse().map((d) => ({ value: d, label: d === db.today ? `Today · ${fmtDay(d)}` : fmtDay(d) }));
}
