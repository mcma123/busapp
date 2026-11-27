import { useMemo } from "react";
import { useDb } from "@/demo/store";
import { useSession } from "@/app/session";
import { effectiveVehicle } from "@/domain/rules";
import { roster as rosterOf } from "@/domain/selectors";
import type { Trip } from "@/domain/types";

export function useDriver() {
  const db = useDb();
  const driverId = useSession((s) => s.driverId);
  const selectedTripId = useSession((s) => s.selectedTripId);
  return useMemo(() => {
    const driver = driverId ? db.driverById.get(driverId) : undefined;
    const trips = driver ? db.trips.filter((t) => t.driverId === driver.id) : [];
    const today = trips.filter((t) => t.date === db.today).sort((a, b) => a.departure.localeCompare(b.departure));
    const previous = trips.filter((t) => t.date !== db.today).sort((a, b) => b.date.localeCompare(a.date) || b.departure.localeCompare(a.departure));
    let active: Trip | undefined = selectedTripId ? db.tripById.get(selectedTripId) : undefined;
    if (active && active.driverId !== driver?.id) active = undefined;
    if (!active) active = today.find((t) => t.status === "in_progress");
    const info = active ? tripInfo(db, active) : undefined;
    return { db, driver, today, previous, active, info };
  }, [db, driverId, selectedTripId]);
}

export function tripInfo(db: ReturnType<typeof useDb>, trip: Trip) {
  const route = db.routeById.get(trip.routeId)!;
  const vehicle = effectiveVehicle(db, trip);
  const planned = db.vehicleById.get(trip.vehicleId)!;
  const roster = rosterOf(db, trip);
  const boarded = db.eventsByTrip.get(trip.id) ?? [];
  const flagged = db.exceptions.filter((x) => x.tripId === trip.id && !(x.clearanceUsedBy));
  return { route, vehicle, planned, substituted: vehicle.id !== planned.id, roster, boarded, flagged };
}
