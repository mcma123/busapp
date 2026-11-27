import { QRCodeSVG } from "qrcode.react";
import logo from "@/assets/koot-niemann-logo.jpg";
import type { Learner, QrPass } from "@/domain/types";
import type { Db } from "@/demo/store";
import { cn } from "@/shared/lib/utils";

/** Printable learner pass: crest, display name as text, QR, route. Sized like a CR80 card (85.6 × 54 mm). */
export function PassCard({ db, learner, pass, className, revoked }: { db: Db; learner: Learner; pass: QrPass; className?: string; revoked?: boolean }) {
  const route = learner.routeId ? db.routeById.get(learner.routeId) : undefined;
  const am = db.assignments[learner.id]?.AM;
  const bus = am ? db.vehicleById.get(am)?.label : undefined;
  return (
    <div
      className={cn("print-break relative flex overflow-hidden rounded-[10px] border border-[#cfd8e3] bg-white text-ink", className)}
      style={{ width: "85.6mm", height: "54mm" }}
    >
      <div className="flex w-[34mm] shrink-0 flex-col items-center justify-center gap-1 bg-[#151a43] px-2 text-center text-white">
        <span className="rounded-md bg-white p-[2px]"><img src={logo} alt="" className="h-[15mm] w-auto" /></span>
        <div className="text-[7pt] font-semibold leading-tight">Koot Niemann<br />Primary School</div>
        <div className="text-[5.5pt] uppercase tracking-[0.14em] text-white/60">School Transport</div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between p-[3mm]">
        <div className="min-w-0">
          <div className="truncate font-display text-[11pt] font-semibold leading-tight">{learner.firstName} {learner.lastName}</div>
          <div className="text-[7pt] text-muted-foreground">Grade {learner.className} · {learner.id}</div>
          <div className="mt-[1mm] truncate text-[7pt] font-medium text-teal">
            {route ? `${route.code} ${route.name}${bus ? ` · ${bus}` : ""}` : "No school transport"}
          </div>
        </div>
        <div className="flex items-end justify-between gap-2">
          <code className="text-[6.5pt] tracking-wide text-muted-foreground">{pass.token}</code>
          <QRCodeSVG value={pass.token} size={84} level="M" marginSize={0} className="h-[21mm] w-[21mm]" />
        </div>
      </div>
      {revoked && (
        <div className="absolute inset-0 grid place-items-center bg-white/70">
          <span className="-rotate-12 rounded-md border-2 border-bad px-3 py-1 text-sm font-bold uppercase tracking-widest text-bad">Revoked</span>
        </div>
      )}
    </div>
  );
}
