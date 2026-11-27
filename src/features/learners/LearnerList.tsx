import { initials } from "@/domain/rules";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useParamState } from "@/shared/lib/useParamState";
import { ChevronLeft, ChevronRight, Search, UserX } from "lucide-react";
import { useDb } from "@/demo/store";
import { clearanceFor, learnerName } from "@/domain/rules";
import { busOptions, routeOptions } from "@/domain/selectors";
import { EmptyState, PageHeader, Panel, Toolbar } from "@/shared/components/Page";
import { ALL, FilterSelect } from "@/shared/components/FilterSelect";
import { PaymentPill, Pill } from "@/shared/components/Status";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { fmtNum } from "@/shared/lib/format";

const PAGE = 50;

export function LearnerList() {
  const db = useDb();
  const nav = useNavigate();
  const { get, set } = useParamState();
  const q = get("q", "");
  const route = get("route");
  const bus = get("bus");
  const grade = get("grade");
  const rider = get("rider");
  const pay = get("pay");
  const page = Number(get("page", "1"));

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.learners.filter((l) => {
      if (s && !`${l.firstName} ${l.lastName} ${l.id}`.toLowerCase().includes(s)) return false;
      if (route !== ALL && l.routeId !== route) return false;
      if (bus !== ALL) {
        const a = db.assignments[l.id];
        if (a?.AM !== bus && a?.PM !== bus) return false;
      }
      if (grade !== ALL && l.grade !== grade) return false;
      if (rider === "yes" && !l.rider) return false;
      if (rider === "no" && l.rider) return false;
      if (pay !== ALL) {
        if (!l.rider) return false;
        if (clearanceFor(db, l.id).status !== pay) return false;
      }
      return true;
    });
  }, [db, q, route, bus, grade, rider, pay]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const p = Math.min(page, pages);
  const visible = rows.slice((p - 1) * PAGE, p * PAGE);

  return (
    <div>
      <PageHeader
        eyebrow="Learner directory"
        title="Learners"
        description={`${fmtNum(db.learners.length)} enrolled · ${fmtNum(db.learners.filter((l) => l.rider).length)} bus riders. Open a learner for payments, bus activity and their QR pass.`}
      />
      <Panel>
        <Toolbar>
          <div className="relative w-full sm:w-[260px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="learner-search" className="h-9 bg-card pl-9" placeholder="Search name or learner number" value={q} onChange={(e) => set("q", e.target.value)} />
          </div>
          <FilterSelect label="Routes" value={route} onChange={(v) => { set("route", v); }} options={routeOptions(db)} />
          <FilterSelect label="Buses" value={bus} onChange={(v) => set("bus", v)} options={busOptions(db, route)} className="w-[130px]" />
          <FilterSelect label="Grades" value={grade} onChange={(v) => set("grade", v)} options={["R", "1", "2", "3", "4", "5", "6", "7"].map((g) => ({ value: g, label: `Grade ${g}` }))} className="w-[130px]" />
          <FilterSelect label="Riders" allLabel="Riders and non-riders" value={rider} onChange={(v) => set("rider", v)} options={[{ value: "yes", label: "Bus riders" }, { value: "no", label: "Non-riders" }]} className="w-[180px]" />
          <FilterSelect label="Payment" allLabel="Any payment status" value={pay} onChange={(v) => set("pay", v)} options={[{ value: "paid", label: "Paid" }, { value: "partial", label: "Partial" }, { value: "pending", label: "Pending" }, { value: "unpaid", label: "Unpaid" }]} className="w-[170px]" />
          <span className="ml-auto text-[13px] text-muted-foreground tabular">{fmtNum(rows.length)} learners</span>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState icon={UserX} title="No learners match these filters">Clear a filter or search for a different name.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b text-left text-[12px] text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Learner</th>
                  <th className="px-3 py-2.5 font-medium">Class</th>
                  <th className="px-3 py-2.5 font-medium">Route & stop</th>
                  <th className="px-3 py-2.5 font-medium">AM bus</th>
                  <th className="px-3 py-2.5 font-medium">PM bus</th>
                  <th className="px-3 py-2.5 font-medium">Current fare</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => {
                  const a = db.assignments[l.id];
                  const r = l.routeId ? db.routeById.get(l.routeId) : undefined;
                  const stop = r?.stops.find((s) => s.id === l.stopId);
                  return (
                    <tr key={l.id} tabIndex={0} onClick={() => nav(`/office/learners/${l.id}`)} onKeyDown={(e) => e.key === "Enter" && nav(`/office/learners/${l.id}`)} className="cursor-pointer border-b last:border-0 hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none">
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-teal-tint text-[12px] font-semibold text-teal">{initials(l)}</span>
                          <div className="min-w-0">
                            <Link to={`/office/learners/${l.id}`} className="font-medium text-ink hover:underline" onClick={(e) => e.stopPropagation()}>{learnerName(l)}</Link>
                            <div className="text-[12px] text-muted-foreground tabular">{l.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 tabular">{l.className}</td>
                      <td className="px-3 py-2.5">
                        {r ? (<><div className="font-medium text-ink">{r.code} · {r.name}</div><div className="text-[12px] text-muted-foreground">{stop?.name}</div></>) : <Pill tone="neutral">Non-rider</Pill>}
                      </td>
                      <td className="px-3 py-2.5">{a?.AM ? db.vehicleById.get(a.AM)?.label : <span className="text-muted-foreground">None</span>}</td>
                      <td className="px-3 py-2.5">{a?.PM ? db.vehicleById.get(a.PM)?.label : <span className="text-muted-foreground">None</span>}</td>
                      <td className="px-3 py-2.5">{l.rider ? <PaymentPill status={clearanceFor(db, l.id).status} /> : <span className="text-[12px] text-muted-foreground">No fare</span>}</td>
                    </tr>
                  );
                })}
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
    </div>
  );
}
