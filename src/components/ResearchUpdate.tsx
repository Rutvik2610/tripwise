import { useState } from "react";
import { Info, RefreshCw } from "lucide-react";
import { usePlanner } from "../lib/context";
import {
  applyResearchUpdate,
  isResearchTrip,
  researchChanges,
} from "../lib/research";
import { Panel, Badge } from "./Shared";
export function ResearchUpdate() {
  const { trip, updateTrip, money, exportData, startEdit } = usePlanner();
  const [open, setOpen] = useState(false);
  if (!isResearchTrip(trip)) return null;
  const changes = researchChanges(trip),
    pending = changes.filter((c) => c.state !== "current");
  return (
    <section className="research-update">
      <div className="research-heading">
        <Info size={18} />
        <div>
          <strong>January 2027 research pack</strong>
          <p>
            {pending.length
              ? `${pending.length} additions or records to review. Existing selections and payments stay intact.`
              : "All applicable research quotes are available."}{" "}
            Manually supplied estimates, not live prices.
          </p>
        </div>
        <button className="button secondary" onClick={() => setOpen(!open)}>
          {open ? "Close review" : "Review research update"}
        </button>
      </div>
      {open && (
        <Panel
          title="Review before applying"
          sub="Only the current trip changes. Shared Kuala Lumpur candidates apply to both itineraries; Singapore quotes apply only to that itinerary. Export a backup first if you wish."
          action={
            <button className="text-button" onClick={exportData}>
              Export backup
            </button>
          }
        >
          <div className="research-actions">
            <button
              className="button"
              disabled={!changes.some((c) => c.state === "ready")}
              onClick={() =>
                updateTrip((t) =>
                  applyResearchUpdate(
                    t,
                    researchChanges(t)
                      .filter((c) => c.state === "ready")
                      .map((c) => c.key),
                  ),
                )
              }
            >
              <RefreshCw size={15} />
              Apply safe additions & untouched fares
            </button>
            <span>Conflicting or protected records are excluded.</span>
          </div>
          <div className="research-list">
            {changes.map((c) => (
              <article key={c.key}>
                <div>
                  <h4>{c.label}</h4>
                  <p>
                    {c.current === null
                      ? "New candidate"
                      : `Existing ${money(c.current)}`}{" "}
                    → {money(c.proposed)} supplied estimate
                  </p>
                  <p>{c.reason}</p>
                </div>
                <Badge
                  tone={
                    c.state === "current"
                      ? "green"
                      : c.state === "ready"
                        ? ""
                        : "sand"
                  }
                >
                  {c.state === "current"
                    ? "Up to date"
                    : c.state === "protected"
                      ? "Preserved"
                      : c.state === "review"
                        ? "Needs review"
                        : "Ready"}
                </Badge>
                {c.state === "review" && (
                  <button
                    className="button secondary"
                    onClick={() => {
                      if (
                        confirm(
                          "Use the supplied price for this unpaid planning record? Existing selections, payments, provider and schedule remain. Fare components will be replaced for flights.",
                        )
                      )
                        updateTrip((t) =>
                          applyResearchUpdate(t, [c.key], true),
                        );
                    }}
                  >
                    Use supplied price
                  </button>
                )}
                {c.state === "protected" && c.existingId && (
                  <button
                    className="text-button"
                    onClick={() =>
                      startEdit(
                        c.kind,
                        trip[c.kind].find((r) => r.id === c.existingId)!,
                        "Review preserved record",
                      )
                    }
                  >
                    Review existing record
                  </button>
                )}
              </article>
            ))}
          </div>
        </Panel>
      )}
    </section>
  );
}
