import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertOctagon, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useDb, useDispatch } from "@/demo/store";
import { clearanceFor, effectiveVehicle, EXCEPTION_LABEL, learnerName } from "@/domain/rules";
import { dayOptions, routeOptions } from "@/domain/selectors";
import type { ExceptionReason, TransportException } from "@/domain/types";
import { EmptyState, Field, PageHeader, Panel, Toolbar } from "@/shared/components/Page";
import { ALL, FilterSelect } from "@/shared/components/FilterSelect";
import { DirPill, EXC_META, PaymentPill, Pill } from "@/shared/components/Status";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { fmtDateTime, fmtNum, fmtTime } from "@/shared/lib/format";
import { useParamState } from "@/shared/lib/useParamState";
import { cn } from "@/shared/lib/utils";

const REASONS: ExceptionReason[] = ["fare", "wrong_route", "wrong_bus", "no_trip", "unknown_pass", "revoked_pass"];
const METHOD: Record<string, string> = { qr: "QR scan", demo: "Demo scan", manual: "Manual check-in" };

export function Exceptions() {
  const db = useDb();
  const { get, set } = useParamState();
  const date = get("date", db.today);
  const reason = get("reason");
  const status = get("status");
  const route = get("route");
  const openId = get("open", "");

  const list = useMemo(
    () =>
      db.exceptions
        .filter((x) => (date === "any" || x.date === date) && (reason === ALL || x.reason === reason) && (status === ALL || x.status === status) && (route === ALL || x.routeId === route))
        .sort((a, b) => b.time.localeCompare(a.time)),
    [db, date, reason, status, route],
  );
  const byReason = useMemo(() => {
    const m: Record<string, number> = {};
    for (const x of db.exceptions) if (date === "any" || x.date === date) m[x.reason] = (m[x.reason] ?? 0) + 1;
    return m;
  }, [db, date]);
  const selected = openId ? db.exceptionById.get(openId) : undefined;

  return (
    <div>
      <PageHeader
        eyebrow="Needs attention"
        title="Exceptions"
        description="Every blocked boarding attempt is kept here: unpaid fares, wrong route or bus, and unknown or replaced passes. Open one to see the expected assignment and record what happened."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {REASONS.map((r) => {
          const m = EXC_META[r];
          const activeF = reason === r;
          return (
            <button key={r} onClick={() => set("reason", activeF ? ALL : r)} className={cn("flex items-center gap-3 rounded-2xl border bg-card p-3.5 text-left transition hover:shadow-md", activeF && "border-teal-2 ring-2 ring-teal-2/20")}>
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", m.tone === "warn" ? "bg-warn-bg text-warn" : "bg-bad-bg text-bad")}><m.icon className="size-[18px]" /></span>
              <span className="min-w-0">
                <span className="block font-display text-[20px] font-semibold leading-none tabular text-ink">{fmtNum(byReason[r] ?? 0)}</span>
                <span className="block truncate text-[12px] text-muted-foreground">{EXCEPTION_LABEL[r]}</span>
              </span>
            </button>
          );
        })}
      </div>

      <Panel>
        <Toolbar>
          <FilterSelect label="Day" allLabel="All days" value={date === "any" ? ALL : date} onChange={(v) => set("date", v === ALL ? "any" : v)} options={dayOptions(db)} className="w-[190px]" />
          <FilterSelect label="Routes" value={route} onChange={(v) => set("route", v)} options={routeOptions(db)} />
          <FilterSelect label="Status" allLabel="Any status" value={status} onChange={(v) => set("status", v)} options={[{ value: "open", label: "Open" }, { value: "cleared", label: "One-trip clearance" }, { value: "resolved", label: "Resolved" }]} className="w-[170px]" />
          <span className="ml-auto text-[13px] text-muted-foreground tabular">{fmtNum(list.length)} attempts</span>
        </Toolbar>
        {list.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No exceptions">Nothing was blocked at the bus door for these filters.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead><tr className="border-b text-left text-[12px] text-muted-foreground"><th className="px-5 py-2.5 font-medium">When</th><th className="px-3 py-2.5 font-medium">Reason</th><th className="px-3 py-2.5 font-medium">Learner</th><th className="px-3 py-2.5 font-medium">Attempted on</th><th className="px-3 py-2.5 font-medium">Expected</th><th className="px-3 py-2.5 font-medium">Status</th></tr></thead>
              <tbody>
                {list.slice(0, 300).map((x) => {
                  const exp = x.expectedTripId ? db.tripById.get(x.expectedTripId) : undefined;
                  return (
                    <tr key={x.id} onClick={() => set("open", x.id)} className="cursor-pointer border-b last:border-0 hover:bg-muted/50">
                      <td className="px-5 py-2.5 tabular">{date === "any" ? fmtDateTime(x.time) : fmtTime(x.time)}</td>
                      <td className="px-3 py-2.5"><Pill tone={EXC_META[x.reason].tone} icon={EXC_META[x.reason].icon}>{EXCEPTION_LABEL[x.reason]}</Pill></td>
                      <td className="px-3 py-2.5">{x.learnerId ? <span className="font-medium text-ink">{learnerName(db.learnerById.get(x.learnerId))}</span> : <code className="text-[12px] text-muted-foreground">{x.token}</code>}</td>
                      <td className="px-3 py-2.5"><span className="flex items-center gap-1.5">{db.vehicleById.get(x.vehicleId)?.label} <DirPill dir={x.direction} short /></span></td>
                      <td className="px-3 py-2.5 text-muted-foreground">{exp ? effectiveVehicle(db, exp).label : "—"}</td>
                      <td className="px-3 py-2.5"><StatusPill x={x} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <ExceptionSheet x={selected} onClose={() => set("open", "")} />
    </div>
  );
}

function StatusPill({ x }: { x: TransportException }) {
  if (x.status === "open") return <Pill tone="bad" icon={AlertOctagon}>Open</Pill>;
  if (x.status === "cleared") return <Pill tone="info" icon={ShieldCheck}>{x.clearanceUsedBy ? "Clearance used" : "One-trip clearance"}</Pill>;
  return <Pill tone="ok" icon={CheckCircle2}>Resolved</Pill>;
}

function ExceptionSheet({ x, onClose }: { x?: TransportException; onClose: () => void }) {
  const db = useDb();
  const dispatch = useDispatch();
  const [note, setNote] = useState("");
  if (!x) return <Sheet open={false} />;

  const trip = db.tripById.get(x.tripId);
  const learner = x.learnerId ? db.learnerById.get(x.learnerId) : undefined;
  const exp = x.expectedTripId ? db.tripById.get(x.expectedTripId) : undefined;
  const route = db.routeById.get(x.routeId);
  const clr = learner?.rider ? clearanceFor(db, learner.id) : undefined;
  const history = learner ? db.exceptions.filter((e) => e.learnerId === learner.id && e.id !== x.id).sort((a, b) => b.time.localeCompare(a.time)).slice(0, 5) : [];
  const usedEvent = x.clearanceUsedBy ? db.events.find((e) => e.id === x.clearanceUsedBy) : undefined;
  const canGrant = x.reason === "fare" && x.status !== "cleared" && trip?.status !== "completed";

  const resolve = (grant: boolean) => {
    dispatch({ type: "resolveException", id: x.id, note: note.trim() || (grant ? "One-trip clearance granted by office." : "Resolved by office."), grant, at: new Date().toISOString() });
    toast.success(grant ? "One-trip clearance granted" : "Exception resolved", { description: grant ? `${learnerName(learner)} can board ${db.vehicleById.get(x.vehicleId)?.label} on the next scan.` : undefined });
    setNote("");
  };

  return (
    <Sheet open onOpenChange={(o) => { if (!o) { onClose(); setNote(""); } }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[480px]">
        <SheetHeader>
          <div className="flex items-center gap-2"><Pill tone={EXC_META[x.reason].tone} icon={EXC_META[x.reason].icon}>{EXCEPTION_LABEL[x.reason]}</Pill><StatusPill x={x} /></div>
          <SheetTitle className="text-xl">{learner ? learnerName(learner) : "Unrecognised pass"}</SheetTitle>
          <SheetDescription>{fmtDateTime(x.time)} · {METHOD[x.method]}{x.token ? ` · code ${x.token}` : ""}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-6">
          <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
            <div className="rounded-xl border p-3">
              <div className="eyebrow text-muted-foreground">Attempted</div>
              <div className="mt-1 font-semibold text-ink">{db.vehicleById.get(x.vehicleId)?.label}</div>
              <div className="text-[12px] text-muted-foreground">{route?.code} {route?.name} · {x.direction}</div>
              {trip && <Link to={`/office/trips/${trip.id}`} className="mt-1 inline-block text-[12px] font-medium text-teal hover:underline">Trip register</Link>}
            </div>
            <div className="grid place-items-center text-muted-foreground"><ArrowRight className="size-4" /></div>
            <div className="rounded-xl border bg-muted/40 p-3">
              <div className="eyebrow text-muted-foreground">Expected</div>
              {exp ? (
                <>
                  <div className="mt-1 font-semibold text-ink">{effectiveVehicle(db, exp).label}</div>
                  <div className="text-[12px] text-muted-foreground">{db.routeById.get(exp.routeId)?.code} {db.routeById.get(exp.routeId)?.name} · departs {exp.departure}</div>
                  <Link to={`/office/trips/${exp.id}`} className="mt-1 inline-block text-[12px] font-medium text-teal hover:underline">Trip register</Link>
                </>
              ) : (
                <div className="mt-1 text-sm text-muted-foreground">{x.reason === "fare" ? "This bus (assignment correct)" : learner ? "No assignment for this direction" : "Unknown"}</div>
              )}
            </div>
          </div>

          {learner && (
            <div className="grid grid-cols-2 gap-4 rounded-xl border p-4">
              <Field label="Learner">{learner.id} · Gr {learner.className}</Field>
              <Field label="Rider">{learner.rider ? "Bus rider" : "Non-rider"}</Field>
              {clr && (<><div><div className="eyebrow text-muted-foreground">Current fare</div><div className="mt-1"><PaymentPill status={clr.status} /></div></div><Field label="Pass">{db.activePass.get(learner.id)?.token}</Field></>)}
              <Link to={`/office/learners/${learner.id}`} className="col-span-2 text-[13px] font-medium text-teal hover:underline">Open learner profile</Link>
            </div>
          )}

          {x.status === "open" ? (
            <div className="flex flex-col gap-3 rounded-xl border p-4">
              <Label htmlFor="exc-note">Reason or note</Label>
              <Textarea id="exc-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={x.reason === "fare" ? "e.g. Parent phoned, EFT made this morning" : "e.g. Learner redirected to the correct bus"} />
              <div className="flex flex-wrap gap-2">
                {canGrant && <Button onClick={() => resolve(true)}><ShieldCheck /> Grant one-trip clearance</Button>}
                <Button variant="outline" onClick={() => resolve(false)}>Mark resolved</Button>
              </div>
              {canGrant && <p className="text-[12px] text-muted-foreground">Clearance applies to this trip only. The next scan is checked again and the boarding is marked as using an office exception.</p>}
            </div>
          ) : (
            <div className="rounded-xl border bg-muted/40 p-4 text-sm">
              <div className="eyebrow text-muted-foreground">Resolution</div>
              <p className="mt-1 text-ink">{x.resolutionNote}</p>
              {x.resolvedAt && <p className="mt-1 text-[12px] text-muted-foreground">{fmtDateTime(x.resolvedAt)}</p>}
              {x.status === "cleared" && (
                <p className="mt-2 font-medium text-teal">{usedEvent ? `Used: boarded at ${fmtTime(usedEvent.time)}.` : "Waiting for the learner's next scan on this trip."}</p>
              )}
            </div>
          )}

          {history.length > 0 && (
            <div>
              <div className="eyebrow mb-2 text-muted-foreground">Earlier attempts</div>
              <ul className="flex flex-col gap-1.5">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2 text-[13px]">
                    <Pill tone={EXC_META[h.reason].tone}>{EXCEPTION_LABEL[h.reason]}</Pill>
                    <span className="text-muted-foreground">{fmtDateTime(h.time)} · {db.vehicleById.get(h.vehicleId)?.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
