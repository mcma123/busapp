export type Direction = "AM" | "PM";
export type TripStatus = "planned" | "in_progress" | "completed";
export type PaymentStatus = "paid" | "partial" | "pending" | "unpaid";
export type EntryMethod = "qr" | "demo" | "manual";

export interface Learner {
  id: string; // KN0001
  firstName: string;
  lastName: string;
  grade: string; // "R" | "1".."7"
  className: string; // "4B"
  rider: boolean;
  routeId?: string;
  stopId?: string;
  guardian: string;
  guardianPhone: string;
}

export interface QrPass {
  token: string;
  learnerId: string;
  issuedOn: string; // ISO date
  status: "active" | "revoked";
  revokedOn?: string;
  replacedBy?: string;
}

export interface Stop { id: string; name: string; amTime: string; pmTime: string }
export interface Route { id: string; code: string; name: string; area: string; stops: Stop[] }

export interface Vehicle { id: string; label: string; registration: string; capacity: number; routeId: string; spare?: boolean }
export interface Driver { id: string; name: string; phone: string; vehicleId: string }

export interface Trip {
  id: string; // date|dir|vehicle
  date: string; // YYYY-MM-DD
  direction: Direction;
  routeId: string;
  vehicleId: string; // planned vehicle (roster bus)
  driverId: string;
  departure: string; // HH:mm
  status: TripStatus;
  startedAt?: string;
  endedAt?: string;
}

export interface FarePeriod { id: string; label: string; start: string; end: string; amount: number; current: boolean }

export interface Invoice { id: string; learnerId: string; periodId: string; amountDue: number }

export interface Payment {
  id: string;
  learnerId: string;
  periodId: string;
  amount: number;
  method: "EFT" | "Card" | "Cash" | "Debit order";
  reference: string;
  date: string; // ISO datetime
  status: "confirmed" | "pending";
  recordedBy?: string;
}

export interface Clearance {
  cleared: boolean;
  status: PaymentStatus;
  periodId: string;
  due: number;
  paid: number;
  pending: number;
}

export type OutcomeKind =
  | "boarded"
  | "already_boarded"
  | "wrong_route"
  | "no_trip"
  | "wrong_bus"
  | "fare"
  | "unknown_pass"
  | "revoked_pass"
  | "no_active_trip";

export interface BoardingEvent {
  id: string;
  learnerId: string;
  tripId: string;
  routeId: string;
  vehicleId: string;
  driverId: string;
  direction: Direction;
  date: string;
  time: string; // ISO datetime
  method: EntryMethod;
  clearance: "cleared" | "office_exception";
  usedExceptionId?: string;
}

export type ExceptionReason = "fare" | "wrong_route" | "wrong_bus" | "no_trip" | "unknown_pass" | "revoked_pass";

export interface TransportException {
  id: string;
  tripId: string;
  routeId: string;
  vehicleId: string;
  direction: Direction;
  date: string;
  time: string;
  reason: ExceptionReason;
  learnerId?: string;
  token?: string;
  expectedTripId?: string;
  method: EntryMethod;
  status: "open" | "resolved" | "cleared";
  resolutionNote?: string;
  resolvedAt?: string;
  /** one-trip fare clearance granted by office */
  clearanceGranted?: boolean;
  clearanceUsedBy?: string; // boarding event id
}

export interface Substitution { tripId: string; vehicleId: string; note?: string }
export interface RosterOverride { learnerId: string; direction: Direction; vehicleId: string }
