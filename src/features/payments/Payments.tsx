import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CreditCard, Download, Search } from "lucide-react";
import { useDb } from "@/demo/store";
import { clearanceFor, currentPeriod, learnerName } from "@/domain/rules";
import { routeOptions } from "@/domain/selectors";
import type { PaymentStatus } from "@/domain/types";
import { EmptyState, PageHeader, Panel, Toolbar } from "@/shared/components/Page";
import { ALL, FilterSelect } from "@/shared/components/FilterSelect";
import { PAYMENT_META, PaymentPill } from "@/shared/components/Status";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { downloadCsv } from "@/shared/lib/csv";
import { fmtDate, fmtNum, fmtZAR } from "@/shared/lib/format";
import { useParamState } from "@/shared/lib/useParamState";
import { cn } from "@/shared/lib/utils";
import { RecordPaymentDialog } from "./RecordPaymentDialog";

const PAGE = 50;

export function Payments() {
  const db = useDb();
  const nav = useNavigate();
  const { get, set } = useParamState();
  const per = currentPeriod(db);
  const period = get("period", per.id);
  const route = get("route");
  const status = get("status");
  const q = get("q", "");
  const page = Number(get("page", "1"));
  const [open, setOpen] = useState(false);

  const all = useMemo(() => {
    return db.learners
      .filter((l) => l.rider)
      .map((l) => {
        const c = clearanceFor(db, l.id, period);
        const pays = (db.paymentsByLearner.get(l.id) ?? []).filter((p) => p.periodId === period).sort((a, b) => b.date.localeCompare(a.date));
        return { l, c, last: pays[0], route: l.routeId ? db.routeById.get(l.routeId) : undefined };
      });
  }, [db, period]);

  const counts = useMemo(() => {
    const out: Record<PaymentStatus, number> = { paid: 0, partial: 0, pending: 0, unpaid: 0 };
    let collected = 0;
    let due = 0;
    for (const r of all) {
      if (route !== ALL && r.l.routeId !== route) continue;
      out[r.c.status]++;
      collected += r.c.paid;
      due += r.c.due;
    }
    return { ...out, collected, due };
  }, [all, route]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter((r) => {
      if (route !== ALL && r.l.routeId !== route) return false;
      if (status !== ALL && r.c.status !== status) return false;
      if (s && !`${r.l.firstName} ${r.l.lastName} ${r.l.id} ${r.last?.reference ?? ""}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [all, route, status, q]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const p = Math.min(page, pages);
  const visible = rows.slice((p - 1) * PAGE, p * PAGE);
  const perLabel = db.periods.find((x) => x.id === period)?.label ?? period;

  const exportCsv = () =>
    downloadCsv(`transport-payments-${period}.csv`, [
      ["Learner ID", "Learner", "Class", "Route", "Fare period", "Amount due (ZAR)", "Confirmed paid (ZAR)", "Pending (ZAR)", "Status", "Last reference", "Last payment date", "Method"],
      ...rows.map((r) => [r.l.id, learnerName(r.l), r.l.className, r.route ? `${r.route.code} ${r.route.name}` : "", perLabel, r.c.due.toFixed(2), r.c.paid.toFixed(2), r.c.pending.toFixed(2), PAYMENT_META[r.c.status].label, r.last?.reference ?? "", r.last ? fmtDate(r.last.date) : "", r.last?.method ?? ""]),
    ]);

  return (
    <div>
      <PageHeader
        eyebrow="Transport fares"
        title="Payments"
        description="A learner is cleared to board once confirmed payments cover the current month's fare. Partial, pending and older-period payments stay visible but do not clear boarding."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}><Download /> Export CSV</Button>
            <Button onClick={() => setOpen(true)}><CreditCard /> Record demo payment</Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {(["paid", "partial", "pending", "unpaid"] as PaymentStatus[]).map((s) => {
          const m = PAYMENT_META[s];
          const activeF = status === s;
          return (
            <button
              key={s}
              onClick={() => set("status", activeF ? ALL : s)}
              className={cn("flex flex-col gap-1 rounded-2xl border bg-card p-4 text-left transition hover:shadow-md", activeF && "border-teal-2 ring-2 ring-teal-2/20")}
            >
              <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground"><m.icon className={cn("size-4", m.tone === "ok" ? "text-ok" : m.tone === "warn" ? "text-warn" : "text-bad")} /> {m.label}</span>
              <span className="font-display text-[26px] font-semibold tabular text-ink">{fmtNum(counts[s])}</span>
            </button>
          );
        })}
        <div className="col-span-2 flex flex-col gap-1 rounded-2xl bg-navy p-4 text-white lg:col-span-1">
          <span className="text-[13px] font-medium text-white/65">Received · {perLabel}</span>
          <span className="font-display text-[22px] font-semibold tabular">{fmtZAR(counts.collected)}</span>
          <span className="text-[12px] text-white/55 tabular">of {fmtZAR(counts.due)} billed</span>
        </div>
      </div>

      <Panel>
        <Toolbar>
          <div className="relative w-full sm:w-[240px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="pay-search" className="h-9 bg-card pl-9" placeholder="Name, number or reference" value={q} onChange={(e) => set("q", e.target.value)} />
          </div>
          <FilterSelect label="Period" allLabel={`${per.label} (current)`} value={period === per.id ? ALL : period} onChange={(v) => set("period", v === ALL ? per.id : v)} options={db.periods.filter((x) => !x.current).map((x) => ({ value: x.id, label: x.label }))} className="w-[230px]" />
          <FilterSelect label="Routes" value={route} onChange={(v) => set("route", v)} options={routeOptions(db)} />
          <FilterSelect label="Status" allLabel="Any status" value={status} onChange={(v) => set("status", v)} options={(["paid", "partial", "pending", "unpaid"] as const).map((s) => ({ value: s, label: PAYMENT_META[s].label }))} className="w-[140px]" />
          <span className="ml-auto text-[13px] text-muted-foreground tabular">{fmtNum(rows.length)} learners</span>
        </Toolbar>
        {rows.length === 0 ? (
          <EmptyState icon={CreditCard} title="No fares match these filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b text-left text-[12px] text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Learner</th>
                  <th className="px-3 py-2.5 font-medium">Route</th>
                  <th className="px-3 py-2.5 font-medium">Fare period</th>
                  <th className="px-3 py-2.5 text-right font-medium">Due</th>
                  <th className="px-3 py-2.5 text-right font-medium">Paid</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Reference</th>
                  <th className="px-3 py-2.5 font-medium">Payment date</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.l.id} onClick={() => nav(`/office/learners/${r.l.id}?tab=payments`)} className="cursor-pointer border-b last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-2.5"><div className="font-medium text-ink">{learnerName(r.l)}</div><div className="text-[12px] text-muted-foreground tabular">{r.l.id} · {r.l.className}</div></td>
                    <td className="px-3 py-2.5">{r.route?.code} · {r.route?.name}</td>
                    <td className="px-3 py-2.5">{perLabel}</td>
                    <td className="px-3 py-2.5 text-right tabular">{fmtZAR(r.c.due)}</td>
                    <td className="px-3 py-2.5 text-right font-medium tabular">{fmtZAR(r.c.paid)}{r.c.pending > 0 && <div className="text-[11px] font-normal text-warn">+{fmtZAR(r.c.pending)} pending</div>}</td>
                    <td className="px-3 py-2.5"><PaymentPill status={r.c.status} /></td>
                    <td className="px-3 py-2.5 font-mono text-[12px]">{r.last?.reference ?? <span className="font-sans text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2.5 tabular">{r.last ? fmtDate(r.last.date) : <span className="text-muted-foreground">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > PAGE && (
          <div className="flex items-center justify-between border-t px-5 py-3 text-[13px] text-muted-foreground">
            <span className="tabular">Showing {(p - 1) * PAGE + 1}–{Math.min(p * PAGE, rows.length)} of {fmtNum(rows.length)}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={p <= 1} onClick={() => set("page", String(p - 1))}><ChevronLeft /> Previous</Button>
              <span className="tabular">Page {p} of {pages}</span>
              <Button variant="outline" size="sm" disabled={p >= pages} onClick={() => set("page", String(p + 1))}>Next <ChevronRight /></Button>
            </div>
          </div>
        )}
      </Panel>
      <RecordPaymentDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
