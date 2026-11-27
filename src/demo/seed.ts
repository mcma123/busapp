import type {
  BoardingEvent, Direction, Driver, FarePeriod, Invoice, Learner, Payment, QrPass, Route, TransportException, Trip, Vehicle,
} from "@/domain/types";
import { dateKey, keyToDate } from "@/shared/lib/format";
import { int, mulberry32, pick, token } from "./rng";

export const SCHOOL = {
  name: "Koot Niemann Primary School",
  product: "School Transport",
  learners: 1000,
  riders: 985,
  routes: 9,
};
export const DEMO_DRIVER_ID = "D01";
const FARE = 650;

const FIRST = [
  "Amahle", "Liam", "Lerato", "Ruan", "Thando", "Mia", "Sipho", "Zoë", "Kagiso", "Emma", "Neo", "Daniel", "Anika", "Bongani", "Chloé",
  "Lwazi", "Isabella", "Tumelo", "Jan", "Naledi", "Ethan", "Karabo", "Lisa", "Musa", "Nandi", "Pieter", "Refilwe", "Ava", "Themba",
  "Elize", "Jayden", "Palesa", "Wian", "Zanele", "Noah", "Ayanda", "Marli", "Kabelo", "Hannah", "Lindiwe", "Jacques", "Ofentse",
  "Sarah", "Mpho", "Christo", "Imani", "Kyle", "Busisiwe", "Lara", "Tshepo", "Juan", "Khanyisile", "Megan", "Siyabonga", "Leah",
  "Dineo", "Riaan", "Precious", "Aiden", "Nomvula", "Charlize", "Lethabo", "Joshua", "Ilze", "Sibusiso", "Keabetswe", "Ruben", "Thato",
];
const LAST = [
  "Dlamini", "van der Merwe", "Nkosi", "Botha", "Mokoena", "Smit", "Khumalo", "Pretorius", "Ndlovu", "du Plessis", "Mahlangu",
  "Venter", "Molefe", "Coetzee", "Zulu", "Naidoo", "Mthembu", "Steyn", "Sithole", "Fourie", "Mabaso", "Joubert", "Radebe", "Nel",
  "Mofokeng", "Swanepoel", "Shabalala", "Kruger", "Mokwena", "Jacobs", "Ngcobo", "le Roux", "Masilela", "Pillay", "Maseko", "Erasmus",
  "Baloyi", "Viljoen", "Tshabalala", "Louw", "Hlongwane", "Meyer", "Phiri", "Olivier", "Modise", "Engelbrecht",
];
const DRIVER_NAMES = [
  "Sipho Mahlangu", "Annelie Botha", "Thabo Nkosi", "Gerrit Venter", "Nomsa Dube", "Johan Kruger", "Lebo Molefe", "Petrus Smit",
  "Zodwa Khumalo", "Andries Fourie", "Mandla Zulu", "Karin Steyn", "Vusi Ndlovu", "Elmarie Nel", "Tebogo Radebe", "Hendrik Louw",
  "Puleng Mofokeng", "Willem Erasmus",
];

const ROUTE_DEFS: { name: string; area: string; stops: string[] }[] = [
  { name: "Kiepersol", area: "North", stops: ["Kiepersol Spar", "Acacia Street", "Fig Tree Circle", "Marula Park gate", "Library corner", "Station Road"] },
  { name: "Silverwood", area: "North-east", stops: ["Silverwood Clinic", "Oak Lane", "Willow Crescent", "Sports grounds", "Church Street", "Hillside shops", "Main Road"] },
  { name: "Rooihuis", area: "East", stops: ["Rooihuis Square", "Protea Avenue", "Kraal Street", "Dam wall", "Post office", "Bakery corner"] },
  { name: "Bergview", area: "South-east", stops: ["Bergview Mall", "Aloe Drive", "Ridge Road", "Water tower", "Taxi rank", "Clinic corner", "Fire station", "Park Lane"] },
  { name: "Hazeldene", area: "South", stops: ["Hazeldene Gardens", "Jacaranda Road", "Hospital gate", "Rugby club", "Garage corner", "School Lane"] },
  { name: "Riverside", area: "South-west", stops: ["Riverside Bridge", "Mill Street", "Willow Park", "Old Station", "Community hall", "Cemetery Road", "Short Street"] },
  { name: "Kloofsig", area: "West", stops: ["Kloofsig Centre", "Kloof Drive", "Mountain View", "Reservoir", "Primrose Street", "Pharmacy corner"] },
  { name: "Protea Glen", area: "North-west", stops: ["Protea Glen Hall", "Daisy Street", "Sunbird Close", "Soccer field", "Spaza corner", "Clinic Road", "Bridge Street"] },
  { name: "Eikenhof Vale", area: "Central", stops: ["Eikenhof Vale gate", "Eik Street", "Market Square", "Town hall", "Police station", "Library"] },
];

export interface SeedDb {
  learners: Learner[];
  passes: QrPass[];
  routes: Route[];
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: Trip[];
  periods: FarePeriod[];
  invoices: Invoice[];
  payments: Payment[];
  events: BoardingEvent[];
  exceptions: TransportException[];
  /** learnerId -> per-direction assigned vehicle (the departure) */
  assignments: Record<string, Partial<Record<Direction, string>>>;
  days: string[]; // seeded dates, oldest first, last is today
  today: string;
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const addMin = (hhmm: string, m: number) => {
  const [h, mm] = hhmm.split(":").map(Number);
  const t = h * 60 + mm + m;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
};
const iso = (date: string, hhmm: string, sec = 0) => `${date}T${hhmm}:${pad(sec)}+02:00`;

function schoolDays(today: string, back: number): string[] {
  const out: string[] = [];
  const d = keyToDate(today);
  while (out.length < back) {
    d.setUTCDate(d.getUTCDate() - 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) out.push(dateKey(d));
  }
  return [...out.reverse(), today];
}

function monthPeriods(today: string): FarePeriod[] {
  const [y, m] = today.split("-").map(Number);
  const months = [-2, -1, 0].map((off) => {
    const dt = new Date(Date.UTC(y, m - 1 + off, 1));
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, off };
  });
  return months.map(({ y, m, off }) => {
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const label = new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 15)));
    return { id: `${y}-${pad(m)}`, label, start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-${pad(last)}`, amount: FARE, current: off === 0 };
  });
}

export function buildSeed(today = dateKey()): SeedDb {
  const r = mulberry32(19650312);

  // ---- routes, vehicles, drivers
  const routes: Route[] = ROUTE_DEFS.map((def, i) => {
    const first = addMin("06:05", i * 3);
    return {
      id: `R${i + 1}`,
      code: `R${i + 1}`,
      name: def.name,
      area: def.area,
      stops: def.stops.map((s, j) => ({ id: `R${i + 1}S${j + 1}`, name: s, amTime: addMin(first, j * 7), pmTime: addMin("14:15", 6 + j * 7) })),
    };
  });
  const caps = [65, 60, 70];
  const vehicles: Vehicle[] = [];
  routes.forEach((rt, i) => {
    ["A", "B"].forEach((suffix, k) => {
      vehicles.push({
        id: `V${rt.id.slice(1)}${suffix}`,
        label: `Bus ${i + 1}${suffix}`,
        registration: `KNP ${pad(100 + i * 2 + k, 3)} GP`,
        capacity: caps[(i + k) % 3],
        routeId: rt.id,
      });
    });
  });
  vehicles.push({ id: "VS1", label: "Spare S1", registration: "KNP 201 GP", capacity: 65, routeId: "", spare: true });
  vehicles.push({ id: "VS2", label: "Spare S2", registration: "KNP 202 GP", capacity: 60, routeId: "", spare: true });
  const drivers: Driver[] = vehicles
    .filter((v) => !v.spare)
    .map((v, i) => ({ id: `D${pad(i + 1)}`, name: DRIVER_NAMES[i], phone: `07${int(r, 1, 9)} ${int(r, 100, 999)} ${pad(int(r, 0, 9999), 4)}`, vehicleId: v.id }));

  // ---- learners
  const nonRiderIdx = new Set<number>();
  while (nonRiderIdx.size < SCHOOL.learners - SCHOOL.riders) nonRiderIdx.add(int(r, 20, 999));
  const grades = ["R", "1", "2", "3", "4", "5", "6", "7"];
  const learners: Learner[] = [];
  const usedNames = new Set<string>();
  for (let i = 0; i < SCHOOL.learners; i++) {
    let fn = pick(r, FIRST);
    let ln = pick(r, LAST);
    while (usedNames.has(fn + ln)) { fn = pick(r, FIRST); ln = pick(r, LAST); }
    usedNames.add(fn + ln);
    const grade = grades[i % grades.length];
    learners.push({
      id: `KN${pad(i + 1, 4)}`,
      firstName: fn,
      lastName: ln,
      grade,
      className: `${grade}${"ABCD"[int(r, 0, 3)]}`,
      rider: !nonRiderIdx.has(i),
      guardian: `${pick(r, ["Mrs", "Mr", "Ms"])} ${ln}`,
      guardianPhone: `08${int(r, 1, 4)} ${int(r, 100, 999)} ${pad(int(r, 0, 9999), 4)}`,
    });
  }

  // ---- route + bus assignment (round robin, capacity-checked)
  const assignments: SeedDb["assignments"] = {};
  const load: Record<string, number> = {};
  let ri = 0;
  for (const l of learners) {
    if (!l.rider) continue;
    const rt = routes[ri % routes.length];
    ri++;
    const buses = vehicles.filter((v) => v.routeId === rt.id);
    const bus = buses.reduce((a, b) => ((load[a.id] ?? 0) / a.capacity <= (load[b.id] ?? 0) / b.capacity ? a : b));
    load[bus.id] = (load[bus.id] ?? 0) + 1;
    l.routeId = rt.id;
    l.stopId = pick(r, rt.stops).id;
    // ~2% ride mornings only (aftercare pickup)
    assignments[l.id] = r() < 0.02 ? { AM: bus.id } : { AM: bus.id, PM: bus.id };
  }
  for (const v of vehicles) {
    if ((load[v.id] ?? 0) > v.capacity) throw new Error(`Seed roster exceeds capacity on ${v.label}`);
  }

  // ---- passes
  const passes: QrPass[] = [];
  const issued = `${today.slice(0, 4)}-01-15`;
  for (const l of learners) passes.push({ token: token(r), learnerId: l.id, issuedOn: issued, status: "active" });
  // one revoked pass: 4th learner on demo bus
  const demoBus = drivers.find((d) => d.id === DEMO_DRIVER_ID)!.vehicleId;
  const demoRoster = learners.filter((l) => assignments[l.id]?.AM === demoBus);
  const revokedLearner = demoRoster[3];
  {
    const p = passes.find((x) => x.learnerId === revokedLearner.id)!;
    const newTok = token(r);
    p.status = "revoked";
    p.revokedOn = `${today.slice(0, 7)}-03`;
    p.replacedBy = newTok;
    passes.push({ token: newTok, learnerId: revokedLearner.id, issuedOn: p.revokedOn, status: "active" });
  }

  // ---- fare periods, invoices, payments
  const periods = monthPeriods(today);
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  let payN = 1;
  const methods: Payment["method"][] = ["EFT", "Debit order", "EFT", "Card", "Cash"];
  const addPay = (l: Learner, per: FarePeriod, amount: number, status: Payment["status"], day: number) => {
    const method = pick(r, methods);
    payments.push({
      id: `P${pad(payN++, 5)}`,
      learnerId: l.id,
      periodId: per.id,
      amount,
      method,
      reference: method === "Cash" ? `RCPT ${int(r, 1000, 9999)}` : `KN ${l.id.slice(2)} ${per.id.slice(5)}${int(r, 10, 99)}`,
      date: iso(`${per.start.slice(0, 8)}${pad(Math.min(day, 28))}`, `${pad(int(r, 7, 17))}:${pad(int(r, 0, 59))}`),
      status,
    });
  };
  for (const l of learners) {
    if (!l.rider) continue;
    periods.forEach((per) => {
      invoices.push({ id: `I-${l.id}-${per.id}`, learnerId: l.id, periodId: per.id, amountDue: per.amount });
      const x = r();
      if (!per.current) {
        if (x < 0.96) addPay(l, per, per.amount, "confirmed", int(r, 1, 7));
        else addPay(l, per, per.amount / 2, "confirmed", int(r, 1, 7));
      } else {
        const todayDay = Number(today.slice(8, 10));
        const d = Math.max(1, Math.min(todayDay - 1, int(r, 1, 6)));
        if (x < 0.82) addPay(l, per, per.amount, "confirmed", d);
        else if (x < 0.87) addPay(l, per, per.amount, "pending", d);
        else if (x < 0.92) addPay(l, per, int(r, 2, 4) * 100, "confirmed", d);
        // else unpaid
      }
    });
  }

  // ---- trips
  const days = schoolDays(today, 5);
  const trips: Trip[] = [];
  for (const date of days) {
    for (const v of vehicles) {
      if (v.spare) continue;
      const rt = routes.find((x) => x.id === v.routeId)!;
      const drv = drivers.find((d) => d.vehicleId === v.id)!;
      (["AM", "PM"] as Direction[]).forEach((dir) => {
        trips.push({
          id: `${date}-${dir}-${v.id}`,
          date,
          direction: dir,
          routeId: rt.id,
          vehicleId: v.id,
          driverId: drv.id,
          departure: dir === "AM" ? rt.stops[0].amTime : "14:15",
          status: date === today ? "planned" : "completed",
        });
      });
    }
  }

  // ---- historical boarding events and exceptions
  const currentPer = periods.find((p) => p.current)!;
  const clearedNow = new Set<string>();
  for (const l of learners) {
    if (!l.rider) continue;
    const paid = payments.filter((p) => p.learnerId === l.id && p.periodId === currentPer.id && p.status === "confirmed").reduce((s, p) => s + p.amount, 0);
    if (paid >= currentPer.amount) clearedNow.add(l.id);
  }
  const events: BoardingEvent[] = [];
  const exceptions: TransportException[] = [];
  let evN = 1;
  let exN = 1;
  const rosterOf = (vehicleId: string, dir: Direction) => learners.filter((l) => assignments[l.id]?.[dir] === vehicleId);

  const todayActive = new Set(
    trips.filter((t) => t.date === today && t.direction === "AM" && t.driverId !== DEMO_DRIVER_ID && Number(t.vehicleId.slice(1, -1)) % 3 !== 0).map((t) => t.id),
  );

  for (const t of trips) {
    const isToday = t.date === today;
    if (isToday && !todayActive.has(t.id)) continue;
    if (isToday) { t.status = "in_progress"; t.startedAt = iso(t.date, addMin(t.departure, -4)); }
    else { t.startedAt = iso(t.date, addMin(t.departure, -4)); t.endedAt = iso(t.date, t.direction === "AM" ? "07:28" : "15:20"); }
    const rt = routes.find((x) => x.id === t.routeId)!;
    const roster = rosterOf(t.vehicleId, t.direction);
    const boardRate = isToday ? 0.55 + r() * 0.3 : 0.9;
    for (const l of roster) {
      const stop = rt.stops.find((s) => s.id === l.stopId)!;
      const base = t.direction === "AM" ? stop.amTime : addMin("14:15", int(r, 0, 9));
      const time = iso(t.date, addMin(base, int(r, -1, 2)), int(r, 0, 59));
      if (!clearedNow.has(l.id) && t.date >= currentPer.start) {
        // fare not cleared this month: occasional attempt logged
        if (r() < 0.15) {
          exceptions.push({
            id: `X${pad(exN++, 4)}`, tripId: t.id, routeId: t.routeId, vehicleId: t.vehicleId, direction: t.direction, date: t.date, time,
            reason: "fare", learnerId: l.id, method: "qr", status: isToday ? "open" : "resolved",
            resolutionNote: isToday ? undefined : "Parent contacted, learner travelled with guardian.", resolvedAt: isToday ? undefined : time,
          });
        }
        continue;
      }
      if (r() > boardRate) continue;
      events.push({
        id: `E${pad(evN++, 6)}`, learnerId: l.id, tripId: t.id, routeId: t.routeId, vehicleId: t.vehicleId, driverId: t.driverId,
        direction: t.direction, date: t.date, time, method: r() < 0.03 ? "manual" : "qr", clearance: "cleared",
      });
    }
    // occasional wrong-bus / unknown pass attempts
    if (r() < 0.25) {
      const other = learners.find((l) => l.routeId === t.routeId && assignments[l.id]?.[t.direction] && assignments[l.id][t.direction] !== t.vehicleId);
      if (other) {
        exceptions.push({
          id: `X${pad(exN++, 4)}`, tripId: t.id, routeId: t.routeId, vehicleId: t.vehicleId, direction: t.direction, date: t.date,
          time: iso(t.date, addMin(t.departure, int(r, 2, 30)), int(r, 0, 59)), reason: "wrong_bus", learnerId: other.id,
          expectedTripId: `${t.date}-${t.direction}-${assignments[other.id][t.direction]}`, method: "qr",
          status: isToday ? "open" : "resolved", resolutionNote: isToday ? undefined : "Redirected to correct bus.",
        });
      }
    }
    if (r() < 0.08) {
      exceptions.push({
        id: `X${pad(exN++, 4)}`, tripId: t.id, routeId: t.routeId, vehicleId: t.vehicleId, direction: t.direction, date: t.date,
        time: iso(t.date, addMin(t.departure, int(r, 2, 30)), int(r, 0, 59)), reason: "unknown_pass", token: token(r), method: "qr",
        status: isToday ? "open" : "resolved", resolutionNote: isToday ? undefined : "Damaged label, learner identified manually.",
      });
    }
  }
  events.sort((a, b) => a.time.localeCompare(b.time));
  exceptions.sort((a, b) => a.time.localeCompare(b.time));

  return { learners, passes, routes, vehicles, drivers, trips, periods, invoices, payments, events, exceptions, assignments, days, today };
}
