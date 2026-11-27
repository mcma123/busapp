import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { newId, useDb, useDispatch } from "@/demo/store";
import { clearanceFor, currentPeriod, learnerName } from "@/domain/rules";
import type { Payment } from "@/domain/types";
import { PaymentPill } from "@/shared/components/Status";
import { fmtZAR } from "@/shared/lib/format";

export function RecordPaymentDialog({ open, onOpenChange, learnerId: fixedLearner }: { open: boolean; onOpenChange: (o: boolean) => void; learnerId?: string }) {
  const db = useDb();
  const dispatch = useDispatch();
  const per = currentPeriod(db);
  const [learnerId, setLearnerId] = useState(fixedLearner ?? "");
  const [q, setQ] = useState("");
  const [periodId, setPeriodId] = useState(per.id);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Payment["method"]>("EFT");
  const [status, setStatus] = useState<Payment["status"]>("confirmed");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(db.today);

  useEffect(() => {
    if (!open) return;
    setLearnerId(fixedLearner ?? "");
    setQ("");
    setPeriodId(per.id);
    setMethod("EFT");
    setStatus("confirmed");
    setDate(db.today);
    setReference("");
    setAmount("");
  }, [open, fixedLearner, per.id, db.today]);

  const learner = learnerId ? db.learnerById.get(learnerId) : undefined;
  const clearance = learner ? clearanceFor(db, learner.id, periodId) : undefined;
  const outstanding = clearance ? Math.max(0, clearance.due - clearance.paid) : 0;

  useEffect(() => {
    if (learner && clearance && amount === "") setAmount(String(outstanding || clearance.due));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learnerId, periodId]);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return db.learners.filter((l) => l.rider && `${l.firstName} ${l.lastName} ${l.id}`.toLowerCase().includes(s)).slice(0, 6);
  }, [db, q]);

  const amt = Number(amount);
  const valid = !!learner && amt > 0 && reference.trim().length > 0 && !!date;
  const willClear = clearance && status === "confirmed" && clearance.paid + amt >= clearance.due;

  const submit = () => {
    if (!valid || !learner) return;
    const now = new Date();
    const hh = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
    dispatch({
      type: "payment",
      payment: { id: newId("P"), learnerId: learner.id, periodId, amount: amt, method, reference: reference.trim(), date: `${date}T${hh}:00+02:00`, status, recordedBy: "School office" },
    });
    const pLabel = db.periods.find((p) => p.id === periodId)?.label;
    toast.success(`${fmtZAR(amt)} recorded for ${learnerName(learner)}`, {
      description: willClear ? `${pLabel} fare is now cleared for boarding.` : `${pLabel} fare is still not cleared.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Record demo payment</DialogTitle>
          <DialogDescription>Only a confirmed payment that covers the full fare clears the learner for the selected period.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {!fixedLearner && (
            <div className="grid gap-1.5">
              <Label htmlFor="pay-learner">Learner</Label>
              {learner ? (
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
                  <div className="text-sm"><span className="font-medium">{learnerName(learner)}</span> <span className="text-muted-foreground">· {learner.id} · Gr {learner.className}</span></div>
                  <Button variant="ghost" size="sm" onClick={() => { setLearnerId(""); setAmount(""); }}>Change</Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="pay-learner" className="pl-9" placeholder="Search by name or learner number" value={q} onChange={(e) => setQ(e.target.value)} />
                  {matches.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-lg">
                      {matches.map((l) => (
                        <button key={l.id} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setLearnerId(l.id); setAmount(""); }}>
                          <span>{learnerName(l)} <span className="text-muted-foreground">· {l.id}</span></span>
                          <PaymentPill status={clearanceFor(db, l.id).status} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Fare period</Label>
              <Select value={periodId} onValueChange={(v) => { setPeriodId(v); setAmount(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {db.periods.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}{p.current ? " (current)" : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pay-amount">Amount (R)</Label>
              <Input id="pay-amount" type="number" min={1} step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as Payment["method"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["EFT", "Card", "Cash", "Debit order"] as const).map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Payment["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending (not yet cleared)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pay-ref">Reference</Label>
              <Input id="pay-ref" placeholder={learner ? `KN ${learner.id.slice(2)}` : "Bank reference"} value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pay-date">Payment date</Label>
              <Input id="pay-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          {clearance && (
            <div className="rounded-xl border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{db.periods.find((p) => p.id === periodId)?.label}</span>
                <PaymentPill status={clearance.status} />
              </div>
              <div className="mt-1 tabular">
                Due {fmtZAR(clearance.due)} · Paid {fmtZAR(clearance.paid)} · Outstanding <strong>{fmtZAR(outstanding)}</strong>
              </div>
              {amt > 0 && (
                <div className={willClear ? "mt-1 font-medium text-ok" : "mt-1 font-medium text-warn"}>
                  {willClear ? "This payment clears the fare for boarding." : status === "pending" ? "Pending payments do not clear boarding." : "This payment does not cover the full fare."}
                  {periodId !== per.id && " It is not for the current period, so current boarding clearance is unchanged."}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!valid} onClick={submit}>Record payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
