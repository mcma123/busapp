import { cn } from "@/shared/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export function PageHeader({ title, eyebrow, description, actions }: { title: string; eyebrow?: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1 text-teal-2">{eyebrow}</div>}
        <h1 className="text-[26px] font-semibold leading-tight text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, actions, children, className, bodyClass }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn("min-w-0 rounded-2xl border bg-card shadow-[0_1px_2px_rgba(20,36,58,0.04)]", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {actions}
        </header>
      )}
      <div className={cn(bodyClass)}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, children }: { icon?: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-teal-tint text-teal"><Icon className="size-6" /></span>
      <div className="font-medium text-ink">{title}</div>
      {children && <div className="max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="eyebrow text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-medium text-ink">{children}</div>
    </div>
  );
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">{children}</div>;
}
