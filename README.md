# Koot Niemann Primary School · School Transport (frontend prototype)

An interactive, client-side demo of the school's bus boarding system. It has two surfaces in one app:

- **School office** (desktop): overview, learners, QR passes, routes and buses, payments, boarding activity and exceptions.
- **Driver** (phone): today's trips, QR scanner and boarding register.

All names, fares, routes, vehicles and drivers are fictional. There is no server, no live payments and no real authentication.

Stack: React 18 · TypeScript · Vite 6 · Tailwind CSS 4 · shadcn/ui (Radix) · zustand · qrcode.react · qr-scanner.

## Start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check and production build into dist/
npm run preview    # serve the production build
```

| URL | What opens |
|---|---|
| `/` | Demo sign-in: **Enter as school office** or **Enter as driver** (pick a driver) |
| `/office` | Office web app |
| `/driver` | Driver app, full screen. Install it to the home screen where the browser offers it (manifest starts at `/driver`). |
| `/driver?as=D01` | Opens the driver app signed in as a specific driver (used by the office's phone preview) |

In the office, **Driver phone preview** (left rail) opens a phone-sized panel running `/driver` against the same records, so a desktop walkthrough shows both sides at once.

## Camera

The scanner reads real QR codes through the device camera. Browsers only allow the camera on **HTTPS or `localhost`**. To test on a phone on your network, serve over HTTPS (for example a tunnel) or use the built-in fallbacks:

- **Try demo scan**: sends a sample pass code through the same boarding checks as the camera.
- **Find learner**: manual check-in for a forgotten pass, logged as manual.

If camera permission is denied or no camera is found, the Scan screen says so and both fallbacks keep working.

To test a real scan: open a learner in the office, go to **QR pass**, print (or show on another screen) the pass, then scan it on the driver's phone while a trip is in progress.

## Sample scan scenarios (Try demo scan)

Start **Bus 1A · AM** as driver *Sipho Mahlangu* (the default), then open **Try demo scan**:

| Option | Expected result |
|---|---|
| Paid learner on this bus | **Boarded** (green), count +1, row appears in office Boarding activity |
| Learner already on board | **Already boarded** with the original time, count unchanged |
| Learner from another route | **Wrong route**, shows the expected route, exception logged |
| Same route, other bus | **Wrong bus**, shows Bus 1B, exception logged |
| Unpaid fare / Partial payment / Payment still pending | **Check with office**, fare exception logged |
| Learner without transport | **No trip assigned** |
| Replaced (old) pass | **Pass replaced**, with Find learner |
| Unknown code | **Pass not recognised**, with Find learner |

**Scan again** at the top of the sheet re-sends a recent pass, so you can record a payment or grant a one-trip clearance in the office and rescan the same QR code.

## Acceptance walkthrough, in short

1. Office overview shows 1,000 learners, 985 bus riders and 9 routes (counted from the demo records).
2. Driver: start Bus 1A AM, demo-scan a paid learner. Count goes up; office Boarding activity shows the learner, time, direction, route and bus. Scan again: still one record.
3. Scan a learner from another route, then one from Bus 1B. Each shows its mismatch and the count stays the same.
4. Scan an unpaid learner. In the office, **Payments → Record demo payment** for the current month in full, confirmed. Scan the same pass again: Boarded. A previous-month or partial payment leaves the current fare uncleared.
5. Learner profile → **Replace pass**. The old code shows "Pass replaced"; the new code boards. Payments and history stay on the profile.
6. **Exceptions** → open a fare exception → **Grant one-trip clearance**. The next scan boards and the register marks it "office clearance".
7. Register → **Check in** a learner manually, then scan their pass: Already boarded. Start the PM trip and board the same learner: a separate PM record.
8. Register → **End trip** (shows boarded, unrecorded and flagged counts). Filter Boarding activity by date, route and bus and **Export CSV**. Refresh the page: changes remain. **Reset demo** restores the original records.

Office extras: route pages let you **assign a learner to a specific departure** and **substitute a bus** for a trip (spares S1 and S2). The driver's header updates to the new bus, and earlier boardings keep the bus they were recorded on.

## How data is stored

- Demo records are generated deterministically on load (same learners, routes and history every time).
- Every change (boarding, exception, payment, pass replacement, assignment, substitution, trip start/end) is saved as a small change log in this browser's `localStorage` under `kn-transport-v1`. Refreshing replays the log, so changes persist.
- Open tabs and the phone preview on the **same browser and device** stay in sync through `BroadcastChannel` (with a `storage` event fallback).
- A physical driver phone runs its own copy of the demo. **Changes do not travel between devices**; that needs a backend and is out of scope for this prototype.

## Reset

Office rail → **Reset demo**, or driver menu (⋮) → **Reset demo**. A confirmation dialog shows how many changes will be removed. Reset clears the change log in every open tab of this browser.

## Project layout

```
src/
  app/          routes, layouts, demo sign-in, session, reset
  assets/       Koot Niemann Primary School logo
  features/
    overview/   office dashboard
    learners/   directory, profile, printable QR passes, batch sheet
    fleet/      routes, buses, drivers, trip manifests, substitutions, assignments
    payments/   payment register and demo payment entry
    activity/   boarding registers (AM/PM), not recorded, exceptions, trips
    exceptions/ exception list, detail, one-trip clearance
    driver/     today, scanner, register, end trip
  domain/       types, boarding and clearance rules, selectors
  demo/         deterministic seed, store, persistence and sync
  shared/       shadcn/ui components, status pills, formatters (en-ZA, Africa/Johannesburg, ZAR), CSV
```

The boarding rules live in `src/domain/rules.ts` (`attemptBoarding`), separate from the UI, so they can be reused if the driver app later moves to Expo / React Native.
