import { useMemo } from "react";
import { Printer, QrCode } from "lucide-react";
import { useDb } from "@/demo/store";
import { busOptions, routeOptions } from "@/domain/selectors";
import { EmptyState, PageHeader, Panel, Toolbar } from "@/shared/components/Page";
import { ALL, FilterSelect } from "@/shared/components/FilterSelect";
import { Button } from "@/shared/components/ui/button";
import { useParamState } from "@/shared/lib/useParamState";
import { PassCard } from "./PassCard";

export function BatchPasses() {
  const db = useDb();
  const { get, set } = useParamState();
  const route = get("route", "R1");
  const bus = get("bus");
  const rt = db.routeById.get(route);

  const learners = useMemo(
    () =>
      db.learners
        .filter((l) => (route === "none" ? !l.rider : l.routeId === route))
        .filter((l) => bus === ALL || db.assignments[l.id]?.AM === bus || db.assignments[l.id]?.PM === bus)
        .sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [db, route, bus],
  );

  return (
    <div>
      <PageHeader
        eyebrow="QR passes"
        title="Print passes"
        description="Print a batch sheet of passes for one route. Each pass shows the crest, the learner's name and a QR code linked to their account. To replace a lost pass, open the learner's profile."
        actions={<Button onClick={() => window.print()} disabled={!learners.length}><Printer /> Print {learners.length} passes</Button>}
      />
      <Panel>
        <Toolbar>
          <FilterSelect
            label="Route"
            allLabel="Choose a route"
            value={route}
            onChange={(v) => set("route", v === ALL ? "R1" : v, { bus: null })}
            options={[...routeOptions(db), { value: "none", label: "Non-riders" }]}
            className="w-[200px]"
          />
          {route !== "none" && <FilterSelect label="Buses" value={bus} onChange={(v) => set("bus", v)} options={busOptions(db, route)} className="w-[140px]" />}
          <span className="ml-auto text-[13px] text-muted-foreground">
            {rt ? `${rt.code} · ${rt.name}` : "Non-riders"} · {learners.length} passes · cards print at 85.6 × 54 mm
          </span>
        </Toolbar>
        {learners.length === 0 ? (
          <EmptyState icon={QrCode} title="No learners on this selection" />
        ) : (
          <div className="overflow-x-auto bg-muted/40 p-6">
            <div className="print-area grid w-max grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3 print:grid-cols-2 print:gap-[4mm]">
              {learners.map((l) => {
                const pass = db.activePass.get(l.id);
                return pass ? <PassCard key={l.id} db={db} learner={l} pass={pass} /> : null;
              })}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
