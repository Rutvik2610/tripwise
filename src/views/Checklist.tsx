import { CheckCircle2, Circle, Info, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Badge, Empty, Panel } from "../components/Shared";
import { ledger } from "../lib/calc";
import { usePlanner } from "../lib/context";
import { dateLabel } from "../lib/format";

export default function Checklist() {
  const { trip, updateTrip, add, editActions } = usePlanner();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  return (
    <>
      <div className="checklist-banner">
        <div className="checklist-circle">
          {Math.round(
            (trip.checklist.filter((c) => c.status === "Done").length /
              (trip.checklist.length || 1)) *
              100,
          )}
          <small>%</small>
        </div>
        <div>
          <h2>A little more ready for the world.</h2>
          <p>
            {trip.checklist.filter((c) => c.status === "Done").length} of{" "}
            {trip.checklist.length} things taken care of. You’ve got this.
          </p>
        </div>
      </div>
      <div className="notice">
        <Info size={17} />
        <span>
          Visa and entry rules change. Verify current official requirements for
          your passport and travel dates; checklist completion is your own
          confirmation.
        </span>
      </div>
      <Panel
        title="Your departure checklist"
        action={
          <button className="button" onClick={() => add("checklist")}>
            <Plus size={16} />
            Add item
          </button>
        }
      >
        <div className="toolbar">
          <div className="search-input">
            <Search size={16} />
            <input
              placeholder="Find a checklist item…"
              aria-label="Search checklist"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Checklist status filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {["All", "To do", "In progress", "Done"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="checklist-full">
          {trip.checklist
            .filter(
              (c) =>
                (filter === "All" || c.status === filter) &&
                c.title.toLowerCase().includes(search.toLowerCase()),
            )
            .map((c) => (
              <article key={c.id}>
                <button
                  className="check-toggle"
                  aria-label={`Mark ${c.title} ${c.status === "Done" ? "to do" : "done"}`}
                  onClick={() =>
                    updateTrip((t) => ({
                      ...t,
                      checklist: t.checklist.map((x) =>
                        x.id === c.id
                          ? {
                              ...x,
                              status: x.status === "Done" ? "To do" : "Done",
                            }
                          : x,
                      ),
                    }))
                  }
                >
                  {c.status === "Done" ? (
                    <CheckCircle2 size={23} className="teal" />
                  ) : (
                    <Circle size={23} />
                  )}
                </button>
                <div className="check-details">
                  <h4 className={c.status === "Done" ? "done" : ""}>
                    {c.title}
                  </h4>
                  <p>
                    {c.due ? "Due " + dateLabel(c.due) : "No due date"}
                    {c.related &&
                      " · Related: " +
                        (ledger(trip).find((r) => r.id === c.related)?.label ??
                          c.related)}
                  </p>
                  {c.notes && <p>{c.notes}</p>}
                </div>
                <Badge tone={c.priority === "High" ? "sand" : ""}>
                  {c.priority}
                </Badge>
                <Badge tone={c.status === "Done" ? "green" : ""}>
                  {c.status}
                </Badge>
                {editActions("checklist", c)}
              </article>
            ))}
        </div>
        {trip.checklist.length === 0 && (
          <Empty label="A fresh checklist" onAdd={() => add("checklist")} />
        )}
      </Panel>
    </>
  );
}
