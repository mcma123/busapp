import { initials } from "@/domain/rules";
import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bus, CreditCard, MapPin, Phone, Printer, QrCode, RefreshCcw, User } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useDb, useDispatch } from "@/demo/store";
import { clearanceFor, currentPeriod, EXCEPTION_LABEL, expectedTrip, learnerName, rosterStatus } from "@/domain/rules";
import type { Direction } from "@/domain/types";
import { EmptyState, Field, Panel } from "@/shared/components/Page";
import { DirPill, EXC_META, PaymentPill, Pill, RosterPill } from "@/shared/components/Status";
import { fmtDate, fmtDay, fmtTime, fmtZAR } from "@/shared/lib/format";
import { mulberry32, token as makeToken } from "@/demo/rng";
import { RecordPaymentDialog } from "@/features/payments/RecordPaymentDialog";
import { PassCard } from "./PassCard";

export function LearnerProfile() {
  const { id = "" } = useParams();
  const db = useDb();
  const dispatch = useDispatch();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "overview";
  const [payOpen, setPayOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const l = db.learnerById.get(id);

  const events = useMemo(() => [...(db.eventsByLearner.get(id) ?? [])].sort((a, b) => b.time.localeCompare(a.time)), [db, id]);
  const exceptions = useMemo(() => db.exceptions.filter((x) => x.learnerId === id).sort((a, b) => b.time.localeCompare(a.time)), [db, id]);
  const payments = useMemo(() => [...(db.paymentsByLearner.get(id) ?? [])].sort((a, b) => b.date.localeCompare(a.date)), [db, id]);
  const passes = useMemo(() => db.passes.filter((p) => p.learnerId === id).sort((a, b) => b.issuedOn.localeCompare(a.issuedOn)), [db, id]);

  if (!l) return <EmptyState title="Learner not found"><Link to="/office/learners" className="text-teal underline">Back to learners</Link></EmptyState>;

  const per = currentPeriod(db);
  const clr = clearanceFor(db, l.id);
  const route = l.routeId ? db.routeById.get(l.routeId) : undefined;
  const stop = route?.stops.find((s) => s.id === l.stopId);
  const active = db.activePass.get(l.id);

  const replace = () => {
    const r = mulberry32(Date.now() & 0xffffffff);
    let tok = makeToken(r);
    while (db.passByToken.has(tok)) tok = makeToken(r);
    dispatch({ type: "replacePass", learnerId: l.id, newToken: tok, at: new Date().toISOString() });
    toast.success("New pass issued", { description: `${active?.token ?? "Old code"} is revoked. Payments and trip history stay on the account.` });
  };

  const assignment = (dir: Direction) => {
    const vId = db.assignments[l.id]?.[dir];
    if (!vId) return null;
    const v = db.vehicleById.get(vId)!;
    const t = expectedTrip(db, l.id, db.today, dir);
    const drv = t ? db.driverById.get(t.driverId) : undefined;
    return { v, t, drv };
  };

  return (
    <div>
      <Link to="/office/learners" className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-ink"><ArrowLeft className="size-4" /> Learners</Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-navy font-display text-lg font-semibold text-white">{initials(l)}</span>
          <div>
            <h1 className="text-[24px] font-semibold leading-tight text-ink">{learnerName(l)}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
              <span className="tabular">{l.id}</span>·<span>Grade {l.className}</span>·
              {l.rider ? <Pill tone="info" icon={Bus}>Bus rider</Pill> : <Pill tone="neutral">Non-rider</Pill>}
              {l.rider && <PaymentPill status={clr.status} />}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {l.rider && <Button variant="outline" onClick={() => setPayOpen(true)}><CreditCard /> Record payment</Button>}
          <Button variant="outline" onClick={() => setReplaceOpen(true)}><RefreshCcw /> Replace pass</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="activity">Bus activity</TabsTrigger>
          <TabsTrigger value="pass">QR pass</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              {(["AM", "PM"] as Direction[]).map((dir) => {
                const a = assignment(dir);
                const st = a?.t ? rosterStatus(db, a.t, l.id) : undefined;
                return (
                  <Panel key={dir} title={<span className="flex items-center gap-2"><DirPill dir={dir} /></span>}>
                    {a ? (
                      <div className="grid grid-cols-2 gap-4 p-5">
                        <Field label="Route">{route?.code} · {route?.name}</Field>
                        <Field label="Bus">{a.v.label}</Field>
                        <Field label="Stop">{stop?.name}</Field>
                        <Field label={dir === "AM" ? "Pick-up" : "Drop-off approx."}>{dir === "AM" ? stop?.amTime : stop?.pmTime}</Field>
                        <Field label="Driver today">{a.drv?.name ?? "—"}</Field>
                        <div><div className="eyebrow text-muted-foreground">Today</div><div className="mt-1">{st ? <RosterPill status={st} /> : "—"}</div></div>
                      </div>
                    ) : (
                      <div className="p-5 text-sm text-muted-foreground">No {dir === "AM" ? "morning" : "afternoon"} transport assigned.</div>
                    )}
                  </Panel>
                );
              })}
            </div>

            <Panel title="Timeline">
              <ol className="px-5 py-3">
                {[...events.slice(0, 8).map((e) => ({ t: e.time, k: "e" as const, e })), ...exceptions.slice(0, 6).map((x) => ({ t: x.time, k: "x" as const, x }))]
                  .sort((a, b) => b.t.localeCompare(a.t))
                  .slice(0, 10)
                  .map((it) =>
                    it.k === "e" ? (
                      <li key={it.e.id} className="flex items-center gap-3 border-b py-2.5 text-sm last:border-0">
                        <Pill tone="ok">Boarded</Pill>
                        <span className="flex-1 text-ink">{db.vehicleById.get(it.e.vehicleId)?.label} <DirPill dir={it.e.direction} short /> {it.e.method === "manual" && <span className="text-muted-foreground">· manual</span>}{it.e.clearance === "office_exception" && <span className="text-warn"> · used office clearance</span>}</span>
                        <span className="text-[13px] text-muted-foreground tabular">{fmtDay(it.e.date)} · {fmtTime(it.e.time)}</span>
                      </li>
                    ) : (
                      <li key={it.x.id} className="flex items-center gap-3 border-b py-2.5 text-sm last:border-0">
                        <Pill tone={EXC_META[it.x.reason].tone}>{EXCEPTION_LABEL[it.x.reason]}</Pill>
                        <span className="flex-1 text-ink">{db.vehicleById.get(it.x.vehicleId)?.label} <DirPill dir={it.x.direction} short /> <span className="text-muted-foreground">· {it.x.status === "open" ? "open" : it.x.status === "cleared" ? "one-trip clearance" : "resolved"}</span></span>
                        <span className="text-[13px] text-muted-foreground tabular">{fmtDay(it.x.date)} · {fmtTime(it.x.time)}</span>
                      </li>
                    ),
                  )}
                {events.length + exceptions.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">No bus activity recorded.</li>}
              </ol>
            </Panel>
          </div>

          <div className="flex flex-col gap-6">
            <Panel title="Current clearance">
              <div className="p-5">
                {l.rider ? (
                  <>
                    <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{per.label}</span><PaymentPill status={clr.status} /></div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <Field label="Fare due">{fmtZAR(clr.due)}</Field>
                      <Field label="Confirmed paid">{fmtZAR(clr.paid)}</Field>
                    </div>
                    <p className={clr.cleared ? "mt-3 text-sm font-medium text-ok" : "mt-3 text-sm font-medium text-warn"}>
                      {clr.cleared ? "Cleared to board this month." : "Not cleared. The driver sees “Check with office”."}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Not a bus rider. No transport fare is charged.</p>
                )}
              </div>
            </Panel>
            <Panel title="Guardian">
              <div className="flex flex-col gap-3 p-5 text-sm">
                <div className="flex items-center gap-2"><User className="size-4 text-muted-foreground" />{l.guardian}</div>
                <div className="flex items-center gap-2 tabular"><Phone className="size-4 text-muted-foreground" />{l.guardianPhone}</div>
                {stop && <div className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" />{stop.name}</div>}
              </div>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="flex flex-col gap-6">
          {!l.rider ? (
            <Panel><EmptyState icon={CreditCard} title="No transport fares">This learner does not use school transport.</EmptyState></Panel>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                {db.periods.map((p) => {
                  const c = clearanceFor(db, l.id, p.id);
                  return (
                    <div key={p.id} className="rounded-2xl border bg-card p-4">
                      <div className="flex items-center justify-between"><span className="font-medium text-ink">{p.label}{p.current && <span className="ml-1 text-[12px] font-normal text-teal">current</span>}</span><PaymentPill status={c.status} /></div>
                      <div className="mt-2 text-sm text-muted-foreground tabular">Paid {fmtZAR(c.paid)} of {fmtZAR(c.due)}{c.pending > 0 && ` · ${fmtZAR(c.pending)} pending`}</div>
                    </div>
                  );
                })}
              </div>
              <Panel title="Payment history" actions={<Button size="sm" onClick={() => setPayOpen(true)}><CreditCard /> Record payment</Button>}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead><tr className="border-b text-left text-[12px] text-muted-foreground"><th className="px-5 py-2.5 font-medium">Date</th><th className="px-3 py-2.5 font-medium">Fare period</th><th className="px-3 py-2.5 text-right font-medium">Amount</th><th className="px-3 py-2.5 font-medium">Method</th><th className="px-3 py-2.5 font-medium">Reference</th><th className="px-3 py-2.5 font-medium">Status</th></tr></thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="px-5 py-2.5 tabular">{fmtDate(p.date)}</td>
                          <td className="px-3 py-2.5">{db.periods.find((x) => x.id === p.periodId)?.label}</td>
                          <td className="px-3 py-2.5 text-right font-medium tabular">{fmtZAR(p.amount)}</td>
                          <td className="px-3 py-2.5">{p.method}</td>
                          <td className="px-3 py-2.5 font-mono text-[12px]">{p.reference}</td>
                          <td className="px-3 py-2.5">{p.status === "confirmed" ? <Pill tone="ok">Confirmed</Pill> : <Pill tone="warn">Pending</Pill>}</td>
                        </tr>
                      ))}
                      {payments.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No payments recorded.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </>
          )}
        </TabsContent>

        <TabsContent value="activity">
          <Panel title="Daily boarding register" actions={<span className="text-[12px] text-muted-foreground">Boarding confirms the learner got on the bus. It does not record arrival or drop-off.</span>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr className="border-b text-left text-[12px] text-muted-foreground"><th className="px-5 py-2.5 font-medium">Date</th><th className="px-3 py-2.5 font-medium">AM · to school</th><th className="px-3 py-2.5 font-medium">PM · from school</th></tr></thead>
                <tbody>
                  {[...db.days].reverse().map((d) => (
                    <tr key={d} className="border-b last:border-0">
                      <td className="px-5 py-3 font-medium">{d === db.today ? "Today" : fmtDay(d)}</td>
                      {(["AM", "PM"] as Direction[]).map((dir) => {
                        const t = expectedTrip(db, l.id, d, dir);
                        const ev = events.find((e) => e.date === d && e.direction === dir);
                        return (
                          <td key={dir} className="px-3 py-3">
                            {ev ? (
                              <Link to={`/office/trips/${ev.tripId}`} className="flex items-center gap-2 hover:underline">
                                <Pill tone="ok">Boarded {fmtTime(ev.time)}</Pill>
                                <span className="text-[13px] text-muted-foreground">{db.vehicleById.get(ev.vehicleId)?.label}{ev.method === "manual" ? " · manual" : ""}</span>
                              </Link>
                            ) : t ? (
                              <Link to={`/office/trips/${t.id}`} className="hover:underline"><RosterPill status={rosterStatus(db, t, l.id)} /></Link>
                            ) : (
                              <span className="text-[13px] text-muted-foreground">No trip assigned</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="pass" className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
          <Panel title="Active pass" actions={<Button size="sm" variant="outline" onClick={() => window.print()}><Printer /> Print pass</Button>}>
            <div className="flex flex-col items-center gap-4 p-6">
              {active ? (
                <div className="print-area flex flex-wrap gap-6">
                  <PassCard db={db} learner={l} pass={active} />
                </div>
              ) : <div className="text-sm text-muted-foreground">No active pass.</div>}
              <p className="max-w-[330px] text-center text-[12px] text-muted-foreground">
                Print on a card, book label or sticker. The code links to the learner's account, so it keeps working when payments change.
              </p>
            </div>
          </Panel>
          <Panel title="Pass history" actions={<Button size="sm" variant="outline" onClick={() => setReplaceOpen(true)}><RefreshCcw /> Replace lost pass</Button>}>
            <ul>
              {passes.map((p) => (
                <li key={p.token} className="flex flex-wrap items-center gap-3 border-b px-5 py-3 last:border-0">
                  <QrCode className="size-5 text-muted-foreground" />
                  <code className="font-mono text-sm">{p.token}</code>
                  {p.status === "active" ? <Pill tone="ok">Active</Pill> : <Pill tone="bad">Revoked</Pill>}
                  <span className="ml-auto text-[13px] text-muted-foreground">Issued {fmtDate(p.issuedOn)}{p.revokedOn && ` · revoked ${fmtDate(p.revokedOn)}`}</span>
                </li>
              ))}
            </ul>
            <p className="border-t px-5 py-3 text-[12px] text-muted-foreground">Scanning a revoked code shows “Pass replaced” on the driver's phone and is logged as an exception.</p>
          </Panel>
        </TabsContent>
      </Tabs>

      <RecordPaymentDialog open={payOpen} onOpenChange={setPayOpen} learnerId={l.id} />
      <AlertDialog open={replaceOpen} onOpenChange={setReplaceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace {l.firstName}'s pass?</AlertDialogTitle>
            <AlertDialogDescription>
              The current code {active && <code className="font-mono">{active.token}</code>} stops working immediately. A new code is issued to the same account, so payments and bus history are kept. Print the new pass afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { replace(); setParams({ tab: "pass" }, { replace: true }); }}>Revoke and issue new pass</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
