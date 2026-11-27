import { create } from "zustand";
import type {
  BoardingEvent, Direction, Payment, QrPass, TransportException, Trip, TripStatus,
} from "@/domain/types";
import { buildSeed, type SeedDb } from "./seed";

export type Mutation =
  | { type: "board"; event: BoardingEvent; usedExceptionId?: string }
  | { type: "exception"; exception: TransportException }
  | { type: "payment"; payment: Payment }
  | { type: "replacePass"; learnerId: string; newToken: string; at: string }
  | { type: "resolveException"; id: string; note: string; grant: boolean; at: string }
  | { type: "substitute"; tripId: string; vehicleId: string | null }
  | { type: "assign"; learnerId: string; direction: Direction; vehicleId: string | null }
  | { type: "tripStatus"; tripId: string; status: TripStatus; at: string };

export interface Db extends SeedDb {
  learnerById: Map<string, SeedDb["learners"][number]>;
  passByToken: Map<string, QrPass>;
  activePass: Map<string, QrPass>;
  routeById: Map<string, SeedDb["routes"][number]>;
  vehicleById: Map<string, SeedDb["vehicles"][number]>;
  driverById: Map<string, SeedDb["drivers"][number]>;
  tripById: Map<string, Trip>;
  substitutions: Map<string, string>;
  eventByLearnerTrip: Map<string, BoardingEvent>;
  eventsByTrip: Map<string, BoardingEvent[]>;
  eventsByLearner: Map<string, BoardingEvent[]>;
  paymentsByLearner: Map<string, Payment[]>;
  exceptionById: Map<string, TransportException>;
}

const STORAGE_KEY = "kn-transport-v1";
const CHANNEL = "kn-transport-sync";

const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => {
  const arr = m.get(k);
  if (arr) arr.push(v);
  else m.set(k, [v]);
};

function index(seed: SeedDb): Db {
  const db: Db = {
    ...seed,
    learnerById: new Map(seed.learners.map((l) => [l.id, l])),
    passByToken: new Map(seed.passes.map((p) => [p.token, p])),
    activePass: new Map(seed.passes.filter((p) => p.status === "active").map((p) => [p.learnerId, p])),
    routeById: new Map(seed.routes.map((x) => [x.id, x])),
    vehicleById: new Map(seed.vehicles.map((x) => [x.id, x])),
    driverById: new Map(seed.drivers.map((x) => [x.id, x])),
    tripById: new Map(seed.trips.map((x) => [x.id, x])),
    substitutions: new Map(),
    eventByLearnerTrip: new Map(),
    eventsByTrip: new Map(),
    eventsByLearner: new Map(),
    paymentsByLearner: new Map(),
    exceptionById: new Map(seed.exceptions.map((x) => [x.id, x])),
  };
  for (const e of seed.events) {
    db.eventByLearnerTrip.set(`${e.learnerId}|${e.tripId}`, e);
    push(db.eventsByTrip, e.tripId, e);
    push(db.eventsByLearner, e.learnerId, e);
  }
  for (const p of seed.payments) push(db.paymentsByLearner, p.learnerId, p);
  return db;
}

export function applyMutation(db: Db, m: Mutation): void {
  switch (m.type) {
    case "board": {
      const e = m.event;
      if (db.eventByLearnerTrip.has(`${e.learnerId}|${e.tripId}`)) return;
      db.events.push(e);
      db.eventByLearnerTrip.set(`${e.learnerId}|${e.tripId}`, e);
      push(db.eventsByTrip, e.tripId, e);
      push(db.eventsByLearner, e.learnerId, e);
      if (m.usedExceptionId) {
        const x = db.exceptionById.get(m.usedExceptionId);
        if (x) x.clearanceUsedBy = e.id;
      }
      return;
    }
    case "exception":
      db.exceptions.push(m.exception);
      db.exceptionById.set(m.exception.id, m.exception);
      return;
    case "payment":
      db.payments.push(m.payment);
      push(db.paymentsByLearner, m.payment.learnerId, m.payment);
      return;
    case "replacePass": {
      const old = db.activePass.get(m.learnerId);
      if (old) {
        old.status = "revoked";
        old.revokedOn = m.at.slice(0, 10);
        old.replacedBy = m.newToken;
      }
      const p: QrPass = { token: m.newToken, learnerId: m.learnerId, issuedOn: m.at.slice(0, 10), status: "active" };
      db.passes.push(p);
      db.passByToken.set(p.token, p);
      db.activePass.set(m.learnerId, p);
      return;
    }
    case "resolveException": {
      const x = db.exceptionById.get(m.id);
      if (!x) return;
      x.resolutionNote = m.note;
      x.resolvedAt = m.at;
      x.status = m.grant ? "cleared" : "resolved";
      if (m.grant) x.clearanceGranted = true;
      return;
    }
    case "substitute":
      if (m.vehicleId) db.substitutions.set(m.tripId, m.vehicleId);
      else db.substitutions.delete(m.tripId);
      return;
    case "assign": {
      const a = (db.assignments[m.learnerId] ??= {});
      if (m.vehicleId) {
        a[m.direction] = m.vehicleId;
        const l = db.learnerById.get(m.learnerId);
        const v = db.vehicleById.get(m.vehicleId);
        if (l && v) {
          l.rider = true;
          if (l.routeId !== v.routeId) {
            l.routeId = v.routeId;
            l.stopId = db.routeById.get(v.routeId)?.stops[0].id;
          }
        }
      } else delete a[m.direction];
      return;
    }
    case "tripStatus": {
      const t = db.tripById.get(m.tripId);
      if (!t) return;
      t.status = m.status;
      if (m.status === "in_progress" && !t.startedAt) t.startedAt = m.at;
      if (m.status === "completed") t.endedAt = m.at;
      return;
    }
  }
}

function loadLog(): Mutation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { today?: string; log: Mutation[] };
    return Array.isArray(parsed.log) ? parsed.log : [];
  } catch {
    return [];
  }
}
function saveLog(log: Mutation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ log }));
  } catch {
    /* storage unavailable: demo still works in memory */
  }
}

function rebuild(log: Mutation[]): Db {
  const db = index(buildSeed());
  for (const m of log) applyMutation(db, m);
  return db;
}

interface StoreState {
  db: Db;
  log: Mutation[];
  version: number;
  dispatch: (...ms: Mutation[]) => void;
  reset: () => void;
  reload: () => void;
}

const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;

export const useStore = create<StoreState>((set, get) => {
  const log = loadLog();
  return {
    db: rebuild(log),
    log,
    version: 0,
    dispatch: (...ms) => {
      const { db, log, version } = get();
      for (const m of ms) applyMutation(db, m);
      const next = [...log, ...ms];
      saveLog(next);
      set({ db: { ...db }, log: next, version: version + 1 });
      channel?.postMessage({ kind: "changed" });
    },
    reset: () => {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      set({ db: rebuild([]), log: [], version: get().version + 1 });
      channel?.postMessage({ kind: "changed" });
    },
    reload: () => {
      const log = loadLog();
      set({ db: rebuild(log), log, version: get().version + 1 });
    },
  };
});

// Cross-tab / iframe sync
channel?.addEventListener("message", () => useStore.getState().reload());
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY || e.key === null) useStore.getState().reload();
  });
}

export const useDb = () => useStore((s) => s.db);
export const useDispatch = () => useStore((s) => s.dispatch);

let idCounter = 0;
export const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(idCounter++).toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
