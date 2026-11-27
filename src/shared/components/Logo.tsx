import logo from "@/assets/koot-niemann-logo.jpg";
import { cn } from "@/shared/lib/utils";

export function Crest({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5", className)}
      style={{ width: size, height: size, padding: Math.round(size * 0.06) }}
    >
      <img src={logo} alt="Koot Niemann Primary School crest" className="h-full w-full object-contain" />
    </span>
  );
}

export function Brand({ inverted = false, compact = false }: { inverted?: boolean; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Crest size={compact ? 36 : 44} />
      <div className="min-w-0 leading-tight">
        <div className={cn("truncate text-[13px] font-semibold", inverted ? "text-white" : "text-ink")}>Koot Niemann Primary</div>
        <div className={cn("eyebrow", inverted ? "text-white/60" : "text-muted-foreground")}>School Transport</div>
      </div>
    </div>
  );
}
