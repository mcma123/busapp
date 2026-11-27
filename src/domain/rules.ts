import type { Db, Mutation } from "@/demo/store";
import { newId } from "@/demo/store";
import { dateKey } from "@/shared/lib/format";
import type {
  BoardingEvent, Clearance, Direction, EntryMethod, Learner, OutcomeKind, PaymentStatus, Trip, TransportException, Vehicle,
} from "./types";

export const currentPeriod = (db: Db) => db.periods.find((p) => p.current)!;

const invCache = new WeakMap<Db, Map<string, number>>();
const clrCache = new WeakMap<Db, Map<string, Clearance>>();
export function clearanceFor(db: Db, learnerId: string, periodId = currentPeriod(db).id): Clearance {
  let cc = clrCache.get(db);
  if (!cc) { cc = new Map(); clrCache.set(db, cc); }
  const ck = `${learnerId}|${periodId}`;
  const hit = cc.get(ck);
  if (hit) return hit;
  let inv = invCache.get(db);
  if (!inv) { inv = new Map(db.invoices.map((i) => [`${i.learnerId}|${i.periodId}`, i.amountDue])); invCache.set(db, inv); }
  const due = inv.get(ck) ?? 0;
  const pays = (db.paymentsByLearner.get(learnerId) ?? []).filter((p) => p.periodId === periodId);
  const paid = pays.filter((p) => p.status === "confirmed").reduce((s, p) => s + p.amount, 0);
  const pending = pays.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  let status: PaymentStatus;
  if (due > 0 && paid >= due) status = "paid";
  else if (pending > 0) status = "pending";
  else if (paid > 0) status = "partial";
  else status = "unpaid";
  const c: Clearance = { cleared: due > 0 && paid >= due, status, periodId, due, paid, pending };
  cc.set(ck, c);
  return c;
}

export const effectiveVehicle = (db: Db, trip: Trip): Vehicle =>
  db.vehicleById.get(db.substitutions.get(trip.id) ?? trip.vehicleId)!;

export const assignedVehicleId = (db: Db, learnerId: string, dir: Direction) => db.assignments[learnerId]?.[dir];

/** The departure (trip) the learner is rostered on for a given date and direction */
export function expectedTrip(db: Db, learnerId: string, date: string, dir: Direction): Trip | undefined {
  const v = assignedVehicleId(db, learnerId, dir);
  return v ? db.tripById.get(`${date}-${dir}-${v}`) : undefined;
}

export function rosterFor(db: Db, trip: Trip): Learner[] {
  return db.learners.filter((l) => db.assignments[l.id]?.[trip.direction] === trip.vehicleId);
}

export interface Outcome {
  kind: OutcomeKind;
  learner?: Learner;
  trip?: Trip;
  event?: BoardingEvent;
  expectedTrip?: Trip;
  expectedRouteName?: string;
  expectedVehicleLabel?: string;
  usedException?: boolean;
  clearance?: Clearance;
}

export const OUTCOME_LABEL: Record<OutcomeKind, string> = {
  boarded: "Boarded",
  already_boarded: "Already boarded",
  wrong_route: "Wrong route",
  no_trip: "No trip assigned",
  wrong_bus: "Wrong bus",
  fare: "Check with office",
  unknown_pass: "Pass not recognised",
  revoked_pass: "Pass replaced",
  no_active_trip: "Select a trip to start scanning",
};

export const EXCEPTION_LABEL: Record<TransportException["reason"], string> = {
  fare: "Fare not cleared",
  wrong_route: "Wrong route",
  wrong_bus: "Wrong bus",
  no_trip: "No trip assigned",
  unknown_pass: "Unknown pass",
  revoked_pass: "Revoked pass",
};

/**
 * The single boarding check used by camera, demo and manual entry.
 * Returns the outcome plus the mutations to persist.
 */
export function attemptBoarding(
  db: Db,
  input: { token?: string; learnerId?: string; tripId?: string; method: EntryMethod; now?: Date },
): { outcome: Outcome; mutations: Mutation[] } {
  const now = input.now ?? new Date();
  const time = now.toISOString();
  const trip = input.tripId ? db.tripById.get(input.tripId) : undefined;
  if (!trip || trip.status !== "in_progress") return { outcome: { kind: "no_active_trip" }, mutations: [] };

  const vehicle = effectiveVehicle(db, trip);
  const base = { tripId: trip.id, routeId: trip.routeId, vehicleId: vehicle.id, direction: trip.direction, date: trip.date, time, method: input.method };
  const exception = (x: Partial<TransportException> & Pick<TransportException, "reason">): Mutation => ({
    type: "exception",
    exception: { id: newId("X"), status: "open", ...base, ...x },
  });

  // identify learner
  let learner: Learner | undefined;
  if (input.token) {
    const pass = db.passByToken.get(input.token.trim());
    if (!pass) {
      return { outcome: { kind: "unknown_pass", trip }, mutations: [exception({ reason: "unknown_pass", token: input.token.trim() })] };
    }
    learner = db.learnerById.get(pass.learnerId);
    if (pass.status === "revoked") {
      return {
        outcome: { kind: "revoked_pass", trip, learner },
        mutations: [exception({ reason: "revoked_pass", token: pass.token, learnerId: pass.learnerId })],
      };
    }
  } else if (input.learnerId) {
    learner = db.learnerById.get(input.learnerId);
  }
  if (!learner) return { outcome: { kind: "unknown_pass", trip }, mutations: [exception({ reason: "unknown_pass", token: input.token })] };

  // duplicate (covers QR then manual)
  const existing = db.eventByLearnerTrip.get(`${learner.id}|${trip.id}`);
  if (existing) return { outcome: { kind: "already_boarded", learner, trip, event: existing }, mutations: [] };

  // assignment
  const assigned = assignedVehicleId(db, learner.id, trip.direction);
  if (!learner.rider || !assigned) {
    return { outcome: { kind: "no_trip", learner, trip }, mutations: [exception({ reason: "no_trip", learnerId: learner.id })] };
  }
  const exp = expectedTrip(db, learner.id, trip.date, trip.direction);
  const expVehicle = exp ? effectiveVehicle(db, exp) : db.vehicleById.get(assigned);
  if (learner.routeId !== trip.routeId) {
    const rt = db.routeById.get(learner.routeId!);
    return {
      outcome: { kind: "wrong_route", learner, trip, expectedTrip: exp, expectedRouteName: rt ? `${rt.code} · ${rt.name}` : undefined, expectedVehicleLabel: expVehicle?.label },
      mutations: [exception({ reason: "wrong_route", learnerId: learner.id, expectedTripId: exp?.id })],
    };
  }
  if (assigned !== trip.vehicleId) {
    return {
      outcome: { kind: "wrong_bus", learner, trip, expectedTrip: exp, expectedVehicleLabel: expVehicle?.label },
      mutations: [exception({ reason: "wrong_bus", learnerId: learner.id, expectedTripId: exp?.id })],
    };
  }

  // fare clearance
  const clearance = clearanceFor(db, learner.id);
  let usedExceptionId: string | undefined;
  if (!clearance.cleared) {
    const grant = db.exceptions.find(
      (x) => x.learnerId === learner!.id && x.tripId === trip.id && x.reason === "fare" && x.clearanceGranted && !x.clearanceUsedBy,
    );
    if (!grant) {
      return { outcome: { kind: "fare", learner, trip, clearance }, mutations: [exception({ reason: "fare", learnerId: learner.id })] };
    }
    usedExceptionId = grant.id;
  }

  const event: BoardingEvent = {
    id: newId("E"),
    learnerId: learner.id,
    tripId: trip.id,
    routeId: trip.routeId,
    vehicleId: vehicle.id,
    driverId: trip.driverId,
    direction: trip.direction,
    date: trip.date,
    time,
    method: input.method,
    clearance: usedExceptionId ? "office_exception" : "cleared",
    usedExceptionId,
  };
  return {
    outcome: { kind: "boarded", learner, trip, event, usedException: !!usedExceptionId, clearance },
    mutations: [{ type: "board", event, usedExceptionId }],
  };
}

/** Status of a rostered learner on a trip */
export type RosterStatus = "boarded" | "not_boarded_yet" | "not_recorded" | "planned";
export function rosterStatus(db: Db, trip: Trip, learnerId: string): RosterStatus {
  if (db.eventByLearnerTrip.has(`${learnerId}|${trip.id}`)) return "boarded";
  if (trip.status === "completed") return "not_recorded";
  if (trip.status === "in_progress") return "not_boarded_yet";
  return "planned";
}

export const todayKey = () => dateKey();
export const initials = (l: Learner) => `${l.firstName[0]}${l.lastName.split(" ").pop()![0]}`.toUpperCase();
export const learnerName = (l?: Learner) => (l ? `${l.firstName} ${l.lastName}` : "Unknown learner");
