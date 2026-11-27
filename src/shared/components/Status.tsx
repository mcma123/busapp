import {
  AlertTriangle, Ban, Bus, CheckCircle2, CircleDashed, Clock, CreditCard, HelpCircle, MapPinOff, Route as RouteIcon, ShieldCheck, XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { OutcomeKind, PaymentStatus, TripStatus } from "@/domain/types";
import type { RosterStatus } from "@/domain/rules";

export type Tone = "ok" | "warn" | "bad" | "info" | "neutral";

const TONE: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok ring-ok/20",
  warn: "bg-warn-bg text-warn ring-warn/25",
  bad: "bg-bad-bg text-bad ring-bad/20",
  info: "bg-teal-tint text-teal ring-teal/20",
  neutral: "bg-muted text-muted-foreground ring-black/5",
};

export function Pill({ tone, icon: Icon, children, className }: { tone: Tone; icon?: LucideIcon; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", TONE[tone], className)}>
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </span>
  );
}

export const PAYMENT_META: Record<PaymentStatus, { tone: Tone; label: string; icon: LucideIcon }> = {
  paid: { tone: "ok", label: "Paid", icon: CheckCircle2 },
  partial: { tone: "warn", label: "Partial", icon: AlertTriangle },
  pending: { tone: "warn", label: "Pending", icon: Clock },
  unpaid: { tone: "bad", label: "Unpaid", icon: XCircle },
};
export function PaymentPill({ status }: { status: PaymentStatus }) {
  const m = PAYMENT_META[status];
  return <Pill tone={m.tone} icon={m.icon}>{m.label}</Pill>;
}

export const TRIP_META: Record<TripStatus, { tone: Tone; label: string; icon: LucideIcon }> = {
  planned: { tone: "neutral", label: "Planned", icon: CircleDashed },
  in_progress: { tone: "info", label: "In progress", icon: Bus },
  completed: { tone: "ok", label: "Completed", icon: CheckCircle2 },
};
export function TripPill({ status }: { status: TripStatus }) {
  const m = TRIP_META[status];
  return <Pill tone={m.tone} icon={m.icon}>{m.label}</Pill>;
}

export const ROSTER_META: Record<RosterStatus, { tone: Tone; label: string; icon: LucideIcon }> = {
  boarded: { tone: "ok", label: "Boarded", icon: CheckCircle2 },
  not_boarded_yet: { tone: "neutral", label: "Not boarded yet", icon: Clock },
  not_recorded: { tone: "warn", label: "Not recorded", icon: HelpCircle },
  planned: { tone: "neutral", label: "Trip not started", icon: CircleDashed },
};
export function RosterPill({ status }: { status: RosterStatus }) {
  const m = ROSTER_META[status];
  return <Pill tone={m.tone} icon={m.icon}>{m.label}</Pill>;
}

export const OUTCOME_META: Record<OutcomeKind, { tone: Tone; icon: LucideIcon }> = {
  boarded: { tone: "ok", icon: CheckCircle2 },
  already_boarded: { tone: "info", icon: ShieldCheck },
  wrong_route: { tone: "bad", icon: MapPinOff },
  no_trip: { tone: "bad", icon: RouteIcon },
  wrong_bus: { tone: "bad", icon: Bus },
  fare: { tone: "warn", icon: CreditCard },
  unknown_pass: { tone: "bad", icon: HelpCircle },
  revoked_pass: { tone: "bad", icon: Ban },
  no_active_trip: { tone: "neutral", icon: CircleDashed },
};

export const EXC_META: Record<string, { tone: Tone; icon: LucideIcon }> = {
  fare: { tone: "warn", icon: CreditCard },
  wrong_route: { tone: "bad", icon: MapPinOff },
  wrong_bus: { tone: "bad", icon: Bus },
  no_trip: { tone: "bad", icon: RouteIcon },
  unknown_pass: { tone: "bad", icon: HelpCircle },
  revoked_pass: { tone: "bad", icon: Ban },
};

export function DirPill({ dir, short = false }: { dir: "AM" | "PM"; short?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold tracking-wide",
        dir === "AM" ? "bg-[#fff1cc] text-[#7a4f00]" : "bg-[#e3e6f7] text-navy",
      )}
    >
      {dir}
      {!short && <span className="font-medium"> · {dir === "AM" ? "To school" : "From school"}</span>}
    </span>
  );
}
