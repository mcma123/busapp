import { useState } from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  AlertOctagon, Bus, CreditCard, LayoutDashboard, LogOut, Menu, QrCode, RotateCcw, ScanLine, Smartphone, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Brand } from "@/shared/components/Logo";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { useDb } from "@/demo/store";
import { cn } from "@/shared/lib/utils";
import { fmtLongDay } from "@/shared/lib/format";
import { DEMO_DRIVER_ID } from "@/demo/seed";
import { useSession } from "./session";
import { ResetDemo } from "./ResetDemo";

const NAV: { to: string; label: string; icon: LucideIcon; end?: boolean; badge?: "exceptions" }[] = [
  { to: "/office", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/office/learners", label: "Learners", icon: Users },
  { to: "/office/passes", label: "QR passes", icon: QrCode },
  { to: "/office/fleet", label: "Routes & buses", icon: Bus },
  { to: "/office/payments", label: "Payments", icon: CreditCard },
  { to: "/office/activity", label: "Boarding activity", icon: ScanLine },
  { to: "/office/exceptions", label: "Exceptions", icon: AlertOctagon, badge: "exceptions" },
];

function Rail({ onNavigate, onPreview }: { onNavigate?: () => void; onPreview: () => void }) {
  const db = useDb();
  const nav = useNavigate();
  const signOut = useSession((s) => s.signOutOffice);
  const openToday = db.exceptions.filter((x) => x.date === db.today && x.status === "open").length;
  return (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="px-5 pb-5 pt-6"><Brand inverted /></div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Office">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white",
                isActive && "bg-white/[0.10] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
              )
            }
          >
            {({ isActive }) => (
              <>
                <n.icon className={cn("size-[18px]", isActive ? "text-[#8fd0ea]" : "text-white/55")} />
                <span className="flex-1">{n.label}</span>
                {n.badge && openToday > 0 && (
                  <span className="rounded-full bg-[#f59e0b] px-1.5 text-[11px] font-semibold tabular text-navy">{openToday}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="flex flex-col gap-1 border-t border-white/10 px-3 py-4">
        <button onClick={onPreview} className="flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium text-white/80 hover:bg-white/[0.06] hover:text-white">
          <Smartphone className="size-[18px] text-white/55" /> Driver phone preview
        </button>
        <ResetDemo
          trigger={
            <button className="flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium text-white/80 hover:bg-white/[0.06] hover:text-white">
              <RotateCcw className="size-[18px] text-white/55" /> Reset demo
            </button>
          }
        />
        <button
          onClick={() => { signOut(); nav("/"); }}
          className="flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium text-white/80 hover:bg-white/[0.06] hover:text-white"
        >
          <LogOut className="size-[18px] text-white/55" /> Sign out
        </button>
        <div className="mt-2 px-3 text-[11px] leading-snug text-white/40">Demo data · stored in this browser</div>
      </div>
    </div>
  );
}

export function OfficeLayout() {
  const office = useSession((s) => s.office);
  const db = useDb();
  const [menu, setMenu] = useState(false);
  const [preview, setPreview] = useState(false);
  if (!office) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 lg:block no-print">
        <Rail onPreview={() => setPreview(true)} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-navy px-4 text-white lg:hidden no-print">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setMenu(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <Brand inverted compact />
        </header>
        <div className="hidden h-12 items-center justify-end gap-3 border-b bg-card/70 px-8 text-[13px] text-muted-foreground backdrop-blur lg:flex no-print">
          <span>{fmtLongDay(db.today)}</span>
          <span className="h-4 w-px bg-border" />
          <span>School office</span>
        </div>
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>

      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="w-[260px] border-0 p-0 [&>button]:text-white">
          <SheetHeader className="sr-only"><SheetTitle>Menu</SheetTitle><SheetDescription>Office navigation</SheetDescription></SheetHeader>
          <Rail onNavigate={() => setMenu(false)} onPreview={() => { setMenu(false); setPreview(true); }} />
        </SheetContent>
      </Sheet>

      <Sheet open={preview} onOpenChange={setPreview}>
        <SheetContent side="right" className="w-full overflow-y-auto bg-[#e9eef3] sm:max-w-[460px]">
          <SheetHeader>
            <SheetTitle>Driver phone preview</SheetTitle>
            <SheetDescription>Shares the same demo records as this office view. Boardings appear here immediately.</SheetDescription>
          </SheetHeader>
          <div className="mx-auto mt-2 w-[390px] max-w-full rounded-[2.6rem] bg-[#0b0e24] p-3 shadow-2xl ring-1 ring-black/40">
            <div className="mx-auto mb-2 h-1.5 w-20 rounded-full bg-white/15" />
            <iframe title="Driver app" src={`/driver?as=${DEMO_DRIVER_ID}`} className="h-[760px] w-full rounded-[2rem] bg-white" allow="camera" />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
