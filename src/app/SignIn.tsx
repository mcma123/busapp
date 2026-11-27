import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Smartphone } from "lucide-react";
import { Crest } from "@/shared/components/Logo";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useDb } from "@/demo/store";
import { DEMO_DRIVER_ID, SCHOOL } from "@/demo/seed";
import { fmtLongDay, fmtNum } from "@/shared/lib/format";
import { useSession } from "./session";

function RouteMotif() {
  // a stylised bus route: dashed line with stops, sits behind the hero copy
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18]" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <path d="M-20 640 C 120 600, 160 480, 280 470 S 460 380, 470 250 S 560 90, 640 60" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="2 14" strokeLinecap="round" />
      <path d="M-20 300 C 90 330, 200 260, 260 180 S 420 40, 520 -20" fill="none" stroke="#8fc3da" strokeWidth="2" strokeDasharray="1 10" strokeLinecap="round" />
      {[[60, 618], [190, 520], [330, 458], [445, 330], [495, 170]].map(([x, y]) => (
        <g key={`${x}`}>
          <circle cx={x} cy={y} r="9" fill="none" stroke="#fff" strokeWidth="2.5" />
          <circle cx={x} cy={y} r="3" fill="#fff" />
        </g>
      ))}
    </svg>
  );
}

export function SignIn() {
  const nav = useNavigate();
  const db = useDb();
  const { signInOffice, signInDriver } = useSession();
  const [driverId, setDriverId] = useState(DEMO_DRIVER_ID);
  const riders = db.learners.filter((l) => l.rider).length;

  return (
    <div className="grid min-h-full lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative overflow-hidden bg-[radial-gradient(120%_90%_at_10%_0%,#1f5875_0%,#194a61_30%,#151a43_75%)] px-6 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))] text-white sm:px-12 lg:pb-14">
        <RouteMotif />
        <div className="relative flex h-full flex-col gap-10 lg:justify-between">
          <div className="flex items-center gap-4">
            <Crest size={84} className="rounded-2xl shadow-lg shadow-black/20" />
            <div>
              <div className="eyebrow text-[#9fd0e6]">School Transport</div>
              <div className="font-display text-xl font-semibold leading-tight">Koot Niemann<br />Primary School</div>
            </div>
          </div>
          <div className="max-w-md">
            <h1 className="text-[34px] font-semibold leading-[1.1] sm:text-[42px]">Every learner, on the right bus, both ways.</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-white/75">
              Drivers scan each learner's pass as they board. The office sees who boarded, on which bus, and whether the fare is cleared.
            </p>
          </div>
          <dl className="grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15">
            {[
              [fmtNum(db.learners.length), "Learners"],
              [fmtNum(riders), "Bus riders"],
              [String(db.routes.length), "Routes"],
            ].map(([v, k]) => (
              <div key={k} className="bg-white/[0.04] px-4 py-3">
                <dt className="eyebrow text-white/55">{k}</dt>
                <dd className="font-display text-2xl font-semibold tabular">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="eyebrow text-teal-2">Demo sign-in</div>
          <h2 className="mt-1 text-2xl font-semibold text-ink">Choose how you're working today</h2>
          <p className="mt-1 text-sm text-muted-foreground">{fmtLongDay(db.today)} · all names and records are fictional</p>

          <div className="mt-7 flex flex-col gap-4">
            <button
              onClick={() => { signInOffice(); nav("/office"); }}
              className="group flex items-center gap-4 rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:border-teal-2/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-navy text-white"><Building2 className="size-6" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">Enter as school office</span>
                <span className="block text-sm text-muted-foreground">Payments, passes, routes, boarding registers and exceptions</span>
              </span>
              <ArrowRight className="size-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-teal" />
            </button>

            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-teal text-white"><Smartphone className="size-6" /></span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink">Enter as driver</div>
                  <div className="text-sm text-muted-foreground">Today's trips, scanner and boarding register</div>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Select value={driverId} onValueChange={setDriverId}>
                  <SelectTrigger className="h-11 flex-1" aria-label="Driver">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {db.drivers.map((d) => {
                      const v = db.vehicleById.get(d.vehicleId)!;
                      return (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} · {v.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button className="h-11 bg-teal px-5 hover:bg-teal/90" onClick={() => { signInDriver(driverId); nav("/driver"); }}>
                  Continue <ArrowRight />
                </Button>
              </div>
            </div>
          </div>

          <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
            Prototype for {SCHOOL.name}. Data is stored in this browser only. Fares, routes, vehicles and drivers are illustrative.
          </p>
        </div>
      </main>
    </div>
  );
}
