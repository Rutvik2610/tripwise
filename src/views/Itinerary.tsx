import { TransitPlanning } from "../components/TransitPlanning";
import { attachedLayoverLeg } from "../lib/transit";
import { GripVertical, MapPin, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { TimelineChart } from "../components/Charts";
import { Badge, Panel } from "../components/Shared";
import { groupBy } from "../lib/calc";
import { usePlanner } from "../lib/context";
import { dateLabel, shortDate } from "../lib/format";
import { blankActivity } from "../lib/seed";

export default function Itinerary() {
  const { trip, summary, money, updateTrip, startEdit, add, editActions } =
    usePlanner();
  const visibleActivities = trip.activities.filter(
    (a) =>
      !a.layoverId ||
      trip.layovers?.some(
        (l) => l.id === a.layoverId && !!attachedLayoverLeg(trip, l),
      ),
  );
  const duration = summary.days;
  const [itineraryView, setItineraryView] = useState("Timeline");
  const [dayFilter, setDayFilter] = useState("All");
  const dragId = useRef("");
  const days = Array.from({ length: Math.min(duration, 730) }, (_, i) => {
    const d = new Date(trip.start + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const orderActivity = (id: string, direction: number) =>
    updateTrip((t) => {
      const a = [...t.activities];
      const i = a.findIndex((x) => x.id === id);
      const candidates = a
        .map((x, j) => ({ x, j }))
        .filter(({ x }) => x.date === a[i]?.date);
      const p = candidates.findIndex((x) => x.j === i);
      const target = candidates[p + direction]?.j;
      if (i >= 0 && target !== undefined) [a[i], a[target]] = [a[target], a[i]];
      return { ...t, activities: a };
    });
  const moveActivity = (targetId: string) => {
    const id = dragId.current;
    if (!id || id === targetId) return;
    updateTrip((t) => {
      const a = [...t.activities];
      const from = a.findIndex((x) => x.id === id);
      const target = a.find((x) => x.id === targetId);
      if (from < 0 || !target) return t;
      const [entry] = a.splice(from, 1);
      a.splice(
        a.findIndex((x) => x.id === targetId),
        0,
        { ...entry, date: target.date, destination: target.destination },
      );
      return { ...t, activities: a };
    });
  };
  return (
    <>
      <TransitPlanning />
      <div className="page-actions">
        <div className="tabs">
          {["Timeline", "Calendar"].map((v) => (
            <button
              className={v === itineraryView ? "active" : ""}
              key={v}
              onClick={() => setItineraryView(v)}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="button-group">
          <button className="button secondary" onClick={() => add("stops")}>
            <MapPin size={15} />
            Add destination
          </button>
          <button className="button" onClick={() => add("activities")}>
            <Plus size={16} />
            Add activity
          </button>
        </div>
      </div>
      <Panel title="The route" sub="Your destination dates are fully editable">
        <div className="stop-editor">
          {trip.stops.map((s) => (
            <article key={s.id}>
              <div>
                <strong>{s.name}</strong>
                <p>
                  {s.country} · {shortDate(s.start)} – {shortDate(s.end)}
                </p>
              </div>
              {editActions("stops", s)}
            </article>
          ))}
        </div>
      </Panel>
      <div className="notice">
        <GripVertical size={17} />
        <span>
          Drag activities to reorder or move between populated days. Use the
          arrow buttons to reorder without dragging. Optional activities count
          in estimates until cancelled or removed.
        </span>
      </div>
      <div className="day-tabs">
        <button
          className={dayFilter === "All" ? "active" : ""}
          onClick={() => setDayFilter("All")}
        >
          All days
        </button>
        {days.map((d, i) => (
          <button
            key={d}
            className={dayFilter === d ? "active" : ""}
            onClick={() => setDayFilter(d)}
          >
            <small>DAY {i + 1}</small>
            {shortDate(d)}
          </button>
        ))}
      </div>
      <div
        className={
          itineraryView === "Calendar" ? "calendar-grid" : "timeline-days"
        }
      >
        {[...new Set([...days, ...visibleActivities.map((a) => a.date)])]
          .sort()
          .filter((d) => dayFilter === "All" || d === dayFilter)
          .map((d) => (
            <section className="day-section" key={d}>
              <header>
                <div>
                  <span className="eyebrow">
                    {days.includes(d)
                      ? `DAY ${days.indexOf(d) + 1}`
                      : "OUTSIDE TRIP"}
                  </span>
                  <h3>{dateLabel(d)}</h3>
                </div>
                <span className="muted">
                  {money(
                    trip.activities
                      .filter(
                        (a) =>
                          a.date === d &&
                          a.status !== "Cancelled" &&
                          a.includeInBudget !== false,
                      )
                      .reduce((s, a) => s + a.cost, 0),
                  )}
                </span>
              </header>
              {visibleActivities
                .filter((a) => a.date === d)
                .map((a) => (
                  <article
                    className={
                      "activity " +
                      (a.status === "Cancelled" ? "cancelled" : "")
                    }
                    key={a.id}
                    draggable
                    onDragStart={() => {
                      dragId.current = a.id;
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => moveActivity(a.id)}
                  >
                    <GripVertical size={15} className="grip" />
                    <div className="activity-time">
                      {a.start || "Any time"}
                      <small>{a.end}</small>
                    </div>
                    <div className="activity-info">
                      <small>
                        {a.category} · {a.destination}
                      </small>
                      <h4>{a.name}</h4>
                      <div className="activity-meta">
                        <Badge tone={a.status === "Booked" ? "green" : ""}>
                          {a.status}
                        </Badge>
                        <span>
                          {a.costPending ? "Price pending" : money(a.cost)}
                          {a.includeInBudget === false
                            ? " · Optional / excluded"
                            : ""}
                        </span>
                        {a.bookingRequired && <span>Booking required</span>}
                      </div>
                      <details>
                        <summary>Notes & transport</summary>
                        <p>{a.notes}</p>
                        <p>{a.transport || "Transport not specified"}</p>
                      </details>
                    </div>
                    <div className="activity-controls">
                      <div className="row-actions">
                        <button
                          aria-label="Move activity up"
                          onClick={() => orderActivity(a.id, -1)}
                        >
                          ↑
                        </button>
                        <button
                          aria-label="Move activity down"
                          onClick={() => orderActivity(a.id, 1)}
                        >
                          ↓
                        </button>
                      </div>
                      {editActions("activities", a)}
                    </div>
                  </article>
                ))}
              {!visibleActivities.some((a) => a.date === d) && (
                <button
                  className="day-empty"
                  onClick={() =>
                    startEdit(
                      "activities",
                      {
                        ...blankActivity(),
                        date: d,
                        destination:
                          trip.stops.find((s) => s.start <= d && s.end >= d)
                            ?.name ?? "",
                      },
                      "Add activity",
                    )
                  }
                >
                  <Plus size={15} />A little room for spontaneity
                </button>
              )}
            </section>
          ))}
      </div>
      <Panel
        title="Daily spending timeline"
        sub="All dated estimates, including bookings and activities"
      >
        <TimelineChart
          format={money}
          data={groupBy(trip, "date").sort((a, b) =>
            a.name.localeCompare(b.name),
          )}
        />
      </Panel>
    </>
  );
}
