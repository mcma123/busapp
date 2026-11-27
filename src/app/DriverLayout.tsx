import { useLayoutEffect } from "react";
import { Navigate, NavLink, Outlet, useNavigate, useSearchParams } from "react-router-dom";
import { CalendarClock, ClipboardList, EllipsisVertical, LogOut, RotateCcw, ScanLine, Repeat2 } from "lucide-react";
import { Crest } from "@/shared/components/Logo";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";
import { useDriver } from "@/features/driver/useDriver";
import { useSession } from "./session";
import { ResetDemo } from "./ResetDemo";

export function DriverLayout() {
  const [params, setParams] = useSearchParams();
  const as = params.get("as");
  const driverId = useSession((s) => s.driverId);
  const signIn = useSession((s) => s.signInDriver);
  const signOut = useSession((s) => s.signOutDriver);
  const nav = useNavigate();
  const { driver, active, info } = useDriver();

  useLayoutEffect(() => {
    if (as) {
      if (as !== driverId) signIn(as);
      setParams({}, { replace: true });
    }
  }, [as, driverId, signIn, setParams]);

  if (as) return null;
  if (!driver) return <Navigate to="/" replace />;

  return (
    <div className="min-h-full bg-[#0b0e24] sm:py-0">
      <div className="mx-auto flex h-dvh max-w-[480px] flex-col bg-surface text-ink sm:shadow-2xl">
        {/* app bar */}
        <header className="bg-navy pt-[env(safe-area-inset-top)] text-white">
          <div className="flex h-14 items-center gap-3 px-4">
            <Crest size={34} className="rounded-lg" />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[15px] font-semibold">{driver.name}</div>
              <div className="eyebrow text-white/55">Koot Niemann · Driver</div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="grid size-12 place-items-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50" aria-label="More options">
                <EllipsisVertical className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{driver.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="h-11" onSelect={() => nav("/driver")}><Repeat2 /> Switch trip</DropdownMenuItem>
                <ResetDemo trigger={<DropdownMenuItem className="h-11" onSelect={(e) => e.preventDefault()}><RotateCcw /> Reset demo</DropdownMenuItem>} />
                <DropdownMenuItem className="h-11" onSelect={() => { signOut(); nav("/"); }}><LogOut /> Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* persistent trip header */}
          {active && info ? (
            <div className="flex items-end justify-between gap-3 border-t border-white/10 bg-[#11163a] px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-bold tracking-wide", active.direction === "AM" ? "bg-[#ffd666] text-[#3d2a00]" : "bg-[#b9c3ff] text-navy")}>
                    {active.direction} · {active.direction === "AM" ? "To school" : "From school"}
                  </span>
                  {active.status === "completed" && <span className="text-[11px] font-semibold text-white/60">Ended · read only</span>}
                </div>
                <div className="mt-1 font-display text-[22px] font-semibold leading-none">{info.vehicle.label}</div>
                <div className="mt-1 truncate text-[13px] text-white/70">
                  {info.route.code} · {info.route.name} · departs {active.departure}
                  {info.substituted && <span className="text-[#ffd666]"> · replaces {info.planned.label}</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-[34px] font-bold leading-none tabular">
                  {info.boarded.length}<span className="text-lg font-medium text-white/50">/{info.roster.length}</span>
                </div>
                <div className="eyebrow mt-1 text-white/55">On board</div>
              </div>
            </div>
          ) : (
            <div className="border-t border-white/10 bg-[#11163a] px-4 py-3 text-[14px] text-white/75">No trip in progress. Start one from Today.</div>
          )}
        </header>

        <main className="relative min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>

        {/* bottom navigation */}
        <nav className="grid grid-cols-3 border-t bg-card pb-[env(safe-area-inset-bottom)]" aria-label="Driver">
          {[
            { to: "/driver", label: "Today", icon: CalendarClock, end: true },
            { to: "/driver/scan", label: "Scan", icon: ScanLine },
            { to: "/driver/register", label: "Register", icon: ClipboardList },
          ].map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn("flex h-16 flex-col items-center justify-center gap-1 text-[12px] font-semibold text-muted-foreground", isActive && "text-navy")
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn("grid h-8 w-14 place-items-center rounded-full transition", isActive && "bg-teal-tint text-teal")}>
                    <n.icon className="size-[22px]" />
                  </span>
                  {n.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
