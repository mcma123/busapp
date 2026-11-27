import { initials } from "@/domain/rules";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import QrScanner from "qr-scanner";
import { CameraOff, FlaskConical, Keyboard, Loader2, Search, VideoOff, History } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Input } from "@/shared/components/ui/input";
import { clearanceFor, learnerName, type Outcome } from "@/domain/rules";
import type { Learner } from "@/domain/types";
import { cn } from "@/shared/lib/utils";
import { useDriver } from "./useDriver";
import { ResultOverlay, useBoarding, useRecent } from "./boarding";

type CamState = "starting" | "live" | "denied" | "unavailable" | "error" | "off";

function useCamera(enabled: boolean, onCode: (code: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CamState>("off");
  const cb = useRef(onCode);
  cb.current = onCode;

  useEffect(() => {
    if (!enabled || !videoRef.current) { setState("off"); return; }
    let cancelled = false;
    setState("starting");
    const scanner = new QrScanner(videoRef.current, (r) => cb.current(r.data), {
      preferredCamera: "environment",
      maxScansPerSecond: 8,
      returnDetailedScanResult: true,
    });
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("unsupported"), { name: "NotFoundError" });
        const has = await QrScanner.hasCamera();
        if (!has) { if (!cancelled) setState("unavailable"); return; }
        await scanner.start();
        if (!cancelled) setState("live");
      } catch (e) {
        if (cancelled) return;
        const msg = String((e as Error)?.name ?? e) + String((e as Error)?.message ?? "");
        if (/NotAllowed|denied|Permission/i.test(msg)) setState("denied");
        else if (/NotFound|unsupported|No camera/i.test(msg)) setState("unavailable");
        else setState("error");
      }
    })();
    return () => {
      cancelled = true;
      scanner.stop();
      scanner.destroy();
    };
  }, [enabled]);

  return { videoRef, state };
}

export function DriverScan() {
  const { db, active, info } = useDriver();
  const nav = useNavigate();
  const board = useBoarding();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const lastRead = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const timer = useRef<number>();
  const busy = !!outcome || demoOpen || findOpen;

  const canScan = !!active && active.status === "in_progress";

  const show = useCallback((o: Outcome) => {
    window.clearTimeout(timer.current);
    setOutcome(o);
    if (o.kind === "boarded") timer.current = window.setTimeout(() => setOutcome(null), 1300);
    else if (o.kind === "already_boarded") timer.current = window.setTimeout(() => setOutcome(null), 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onCode = useCallback(
    (code: string) => {
      if (busy || !active) return;
      const now = Date.now();
      // debounce the same code while it stays in frame
      if (code === lastRead.current.code && now - lastRead.current.at < 3000) { lastRead.current.at = now; return; }
      lastRead.current = { code, at: now };
      show(board({ token: code, tripId: active.id, method: "qr" }));
    },
    [busy, active, board, show],
  );

  const { videoRef, state } = useCamera(canScan, onCode);

  const run = (input: { token?: string; learnerId?: string; method: "demo" | "manual" }) => {
    setDemoOpen(false);
    setFindOpen(false);
    if (!active) return;
    show(board({ ...input, tripId: active.id }));
  };

  if (!canScan) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-teal-tint text-teal"><CameraOff className="size-8" /></span>
        <div className="font-display text-[22px] font-semibold">Select a trip to start scanning</div>
        <p className="max-w-xs text-[15px] text-muted-foreground">
          {active?.status === "completed" ? "This trip has ended and is read only." : "Scanning opens once a trip is in progress."}
        </p>
        <button onClick={() => nav("/driver")} className="h-12 rounded-xl bg-navy px-6 text-[16px] font-semibold text-white">Go to Today</button>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-black">
      {/* camera */}
      <div className="relative min-h-[300px] flex-1 overflow-hidden">
        <video ref={videoRef} className={cn("absolute inset-0 h-full w-full object-cover", state !== "live" && "opacity-0")} muted playsInline />
        {state === "live" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative size-[min(68vw,260px)] rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
              {["left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl"].map((c) => (
                <span key={c} className={cn("absolute size-12 border-white", c)} />
              ))}
              <span className="absolute inset-x-6 top-1/2 h-0.5 animate-pulse bg-[#7fe0a8]/80" />
            </div>
            <div className="absolute bottom-5 rounded-full bg-black/55 px-4 py-1.5 text-[14px] font-medium text-white">Hold the pass inside the frame</div>
          </div>
        )}
        {state !== "live" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-white">
            {state === "starting" && (<><Loader2 className="size-10 animate-spin text-white/70" /><div className="text-[16px] font-semibold">Opening camera…</div><p className="text-[14px] text-white/65">Allow camera access when your phone asks.</p></>)}
            {state === "denied" && (<><VideoOff className="size-10 text-[#ffb4a8]" /><div className="text-[17px] font-semibold">Camera access is blocked</div><p className="text-[14px] text-white/70">Allow the camera for this site in your browser settings, or use Find learner and Try demo scan below.</p></>)}
            {state === "unavailable" && (<><CameraOff className="size-10 text-white/60" /><div className="text-[17px] font-semibold">No camera found</div><p className="text-[14px] text-white/70">Use Try demo scan or Find learner to check learners in.</p></>)}
            {state === "error" && (<><VideoOff className="size-10 text-[#ffb4a8]" /><div className="text-[17px] font-semibold">The camera could not start</div><p className="text-[14px] text-white/70">Close other apps using the camera and reopen Scan. Camera needs HTTPS or localhost.</p></>)}
          </div>
        )}
        {outcome && (
          <ResultOverlay
            outcome={outcome}
            onNext={() => setOutcome(null)}
            onFind={() => { setOutcome(null); setFindOpen(true); }}
          />
        )}
      </div>

      {/* controls within thumb reach */}
      <div className="grid grid-cols-2 gap-3 bg-[#0b0e24] p-4">
        <button onClick={() => setFindOpen(true)} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-white text-[16px] font-semibold text-ink active:scale-[0.99]">
          <Search className="size-5" /> Find learner
        </button>
        <button onClick={() => setDemoOpen(true)} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-teal text-[16px] font-semibold text-white ring-1 ring-white/10 active:scale-[0.99]">
          <FlaskConical className="size-5" /> Try demo scan
        </button>
      </div>

      <DemoScanSheet open={demoOpen} onOpenChange={setDemoOpen} onRun={(token) => run({ token, method: "demo" })} />
      <FindLearnerSheet open={findOpen} onOpenChange={setFindOpen} onPick={(learnerId) => run({ learnerId, method: "manual" })} tripRouteId={info?.route.id} />
      <span className="sr-only" aria-live="polite">{db.today}</span>
    </div>
  );
}

function DemoScanSheet({ open, onOpenChange, onRun }: { open: boolean; onOpenChange: (o: boolean) => void; onRun: (token: string) => void }) {
  const { db, active } = useDriver();
  const recent = useRecent((s) => s.items);
  const [code, setCode] = useState("");

  const scenarios = useMemo(() => {
    if (!active) return [];
    const dir = active.direction;
    const tokenOf = (l?: Learner) => (l ? db.activePass.get(l.id)?.token : undefined);
    const rostered = db.learners.filter((l) => db.assignments[l.id]?.[dir] === active.vehicleId);
    const notBoarded = rostered.filter((l) => !db.eventByLearnerTrip.has(`${l.id}|${active.id}`));
    const byStatus = (s: string) => notBoarded.find((l) => clearanceFor(db, l.id).status === s);
    const paid = notBoarded.find((l) => clearanceFor(db, l.id).cleared);
    const boarded = rostered.find((l) => db.eventByLearnerTrip.has(`${l.id}|${active.id}`));
    const otherRoute = db.learners.find((l) => l.rider && l.routeId !== active.routeId && db.assignments[l.id]?.[dir]);
    const otherBus = db.learners.find((l) => l.routeId === active.routeId && db.assignments[l.id]?.[dir] && db.assignments[l.id][dir] !== active.vehicleId);
    const noTrip = db.learners.find((l) => !l.rider) ;
    const revoked = db.passes.find((p) => p.status === "revoked");
    const list: { key: string; title: string; sub: string; token?: string; tone: string }[] = [
      { key: "paid", title: "Paid learner on this bus", sub: paid ? learnerName(paid) : "Everyone cleared has boarded", token: tokenOf(paid), tone: "bg-ok" },
      { key: "dup", title: "Learner already on board", sub: boarded ? learnerName(boarded) : "Board someone first", token: tokenOf(boarded), tone: "bg-teal" },
      { key: "route", title: "Learner from another route", sub: otherRoute ? `${learnerName(otherRoute)} · ${db.routeById.get(otherRoute.routeId!)?.name}` : "", token: tokenOf(otherRoute), tone: "bg-bad" },
      { key: "bus", title: "Same route, other bus", sub: otherBus ? `${learnerName(otherBus)} · ${db.vehicleById.get(db.assignments[otherBus.id][dir]!)?.label}` : "", token: tokenOf(otherBus), tone: "bg-bad" },
      { key: "unpaid", title: "Unpaid fare", sub: byStatus("unpaid") ? learnerName(byStatus("unpaid")) : "None on this trip", token: tokenOf(byStatus("unpaid")), tone: "bg-warn" },
      { key: "partial", title: "Partial payment", sub: byStatus("partial") ? learnerName(byStatus("partial")) : "None on this trip", token: tokenOf(byStatus("partial")), tone: "bg-warn" },
      { key: "pending", title: "Payment still pending", sub: byStatus("pending") ? learnerName(byStatus("pending")) : "None on this trip", token: tokenOf(byStatus("pending")), tone: "bg-warn" },
      { key: "notrip", title: "Learner without transport", sub: noTrip ? `${learnerName(noTrip)} · not a bus rider` : "", token: tokenOf(noTrip), tone: "bg-bad" },
      { key: "revoked", title: "Replaced (old) pass", sub: revoked ? `${learnerName(db.learnerById.get(revoked.learnerId))} · old code` : "", token: revoked?.token, tone: "bg-bad" },
      { key: "unknown", title: "Unknown code", sub: "A QR code that is not a school pass", token: "KN-ZZZZ-0000", tone: "bg-bad" },
    ];
    return list;
  }, [db, active]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader className="px-0">
          <SheetTitle>Try demo scan</SheetTitle>
          <SheetDescription>Each option sends a pass code through the same checks as the camera.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2">
          {recent.filter((r) => r.token).length > 0 && (
            <div className="mb-2">
              <div className="eyebrow mb-1.5 flex items-center gap-1 text-muted-foreground"><History className="size-3.5" /> Scan again</div>
              <div className="flex flex-wrap gap-2">
                {recent.filter((r) => r.token).map((r) => (
                  <button key={r.token} onClick={() => onRun(r.token!)} className="h-11 rounded-full border bg-card px-4 text-[14px] font-medium hover:bg-muted">
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {scenarios.map((s) => (
            <button
              key={s.key}
              disabled={!s.token}
              onClick={() => s.token && onRun(s.token)}
              className="flex min-h-14 items-center gap-3 rounded-2xl border bg-card px-4 py-2.5 text-left hover:bg-muted/60 disabled:opacity-45"
            >
              <span className={cn("size-2.5 shrink-0 rounded-full", s.tone)} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{s.title}</span>
                <span className="block truncate text-[13px] text-muted-foreground">{s.sub}</span>
              </span>
              {s.token && <code className="hidden text-[11px] text-muted-foreground min-[400px]:block">{s.token}</code>}
            </button>
          ))}
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => { e.preventDefault(); if (code.trim()) { onRun(code.trim().toUpperCase()); setCode(""); } }}
          >
            <div className="relative flex-1">
              <Keyboard className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="demo-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Type a pass code, e.g. KN-ABCD-1234" className="h-12 pl-9 text-[15px]" />
            </div>
            <button className="h-12 rounded-xl bg-navy px-5 font-semibold text-white">Check</button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function FindLearnerSheet({ open, onOpenChange, onPick, tripRouteId }: { open: boolean; onOpenChange: (o: boolean) => void; onPick: (learnerId: string) => void; tripRouteId?: string }) {
  const { db, active } = useDriver();
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = db.learners;
    if (!s) list = list.filter((l) => active && db.assignments[l.id]?.[active.direction] === active.vehicleId);
    else list = list.filter((l) => `${l.firstName} ${l.lastName} ${l.id}`.toLowerCase().includes(s));
    return list.slice(0, 40);
  }, [db, q, active]);

  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setQ(""); }}>
      <SheetContent side="bottom" className="flex h-[85dvh] flex-col rounded-t-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader className="px-0">
          <SheetTitle>Find learner</SheetTitle>
          <SheetDescription>For a forgotten or damaged pass. Check-in uses the same rules and is logged as manual.</SheetDescription>
        </SheetHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input id="find-learner" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or learner number" className="h-12 pl-10 text-[16px]" />
        </div>
        <div className="eyebrow mt-3 text-muted-foreground">{q ? "Search results" : "Expected on this trip"}</div>
        <div className="-mx-1 mt-1 min-h-0 flex-1 overflow-y-auto">
          {results.map((l) => {
            const boarded = active && db.eventByLearnerTrip.has(`${l.id}|${active.id}`);
            return (
              <button key={l.id} onClick={() => onPick(l.id)} className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-tint text-[13px] font-semibold text-teal">{initials(l)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{learnerName(l)}</span>
                  <span className="block text-[13px] text-muted-foreground">
                    Gr {l.className} · {l.id}
                    {l.routeId && l.routeId !== tripRouteId ? ` · ${db.routeById.get(l.routeId)?.name}` : ""}
                    {!l.rider ? " · not a rider" : ""}
                  </span>
                </span>
                {boarded ? <span className="text-[13px] font-semibold text-ok">On board</span> : <span className="text-[13px] font-semibold text-teal">Check in</span>}
              </button>
            );
          })}
          {results.length === 0 && <div className="py-10 text-center text-muted-foreground">No learners match “{q}”.</div>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
