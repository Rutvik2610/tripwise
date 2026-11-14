import {
  Archive,
  ArrowRight,
  Compass,
  Copy,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { inr } from "../components/Charts";
import { Badge } from "../components/Shared";
import { totals } from "../lib/calc";
import { usePlanner } from "../lib/context";
import { dateLabel, shortDate } from "../lib/format";
import type { Trip } from "../lib/model";
import { uid } from "../lib/model";
import { makeTrip } from "../lib/seed";

export default function Trips() {
  const { store, setStore, go, startEdit, setToast } = usePlanner();

  const duplicateTrip = (t: Trip) => {
    const copied = structuredClone(t);
    copied.id = uid();
    copied.name = t.name + " (copy)";
    copied.archived = false;
    const idMap = new Map<string, string>();
    (
      [
        "stops",
        "expenses",
        "hotels",
        "transport",
        "activities",
        "checklist",
      ] as const
    ).forEach((k) =>
      copied[k].forEach((x) => {
        const old = x.id;
        x.id = uid();
        idMap.set(old, x.id);
      }),
    );
    copied.checklist.forEach((c) => {
      c.related = idMap.get(c.related) ?? c.related;
    });
    setStore((s) => ({
      ...s,
      trips: [...s.trips, copied],
      activeId: copied.id,
    }));
    setToast("Trip duplicated with its complete plan");
  };
  return (
    <>
      <div className="page-actions">
        <p className="muted">Keep separate plans for every possibility.</p>
        <button
          className="button"
          onClick={() => {
            const t = makeTrip();
            t.name = "My next adventure";
            t.stops = [];
            t.expenses = [];
            t.hotels = [];
            t.transport = [];
            t.activities = [];
            t.checklist = [];
            setStore((s) => ({ ...s, trips: [...s.trips, t], activeId: t.id }));
            startEdit("trip", t, "Create your trip");
          }}
        >
          <Plus size={16} />
          Create trip
        </button>
      </div>
      <div className="trip-grid">
        {store.trips.map((t) => (
          <article
            className={"trip-card " + (t.archived ? "archived" : "")}
            key={t.id}
          >
            <div className="trip-card-art">
              <Compass size={45} />
              <Badge tone="light">{t.archived ? "Archived" : t.status}</Badge>
            </div>
            <div className="trip-card-content">
              <h3>{t.name}</h3>
              <p>
                {shortDate(t.start)} – {dateLabel(t.end)}
              </p>
              <p>
                {t.stops.map((s) => s.name).join(" · ") ||
                  "Your next destination awaits"}
              </p>
              <strong>
                {inr(totals(t).estimated)} <small>estimated</small>
              </strong>
              <div className="trip-card-actions">
                <button
                  className="button secondary"
                  onClick={() => {
                    setStore((s) => ({ ...s, activeId: t.id }));
                    go("Overview");
                  }}
                >
                  Open trip <ArrowRight size={15} />
                </button>
                <div className="row-actions">
                  <button
                    aria-label={`Edit ${t.name}`}
                    onClick={() => {
                      setStore((s) => ({ ...s, activeId: t.id }));
                      startEdit("trip", t, "Edit trip");
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    aria-label={`Duplicate ${t.name}`}
                    onClick={() => duplicateTrip(t)}
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    aria-label={t.archived ? "Restore trip" : "Archive trip"}
                    onClick={() =>
                      setStore((s) => ({
                        ...s,
                        trips: s.trips.map((x) =>
                          x.id === t.id ? { ...x, archived: !x.archived } : x,
                        ),
                      }))
                    }
                  >
                    <Archive size={15} />
                  </button>
                  <button
                    disabled={store.trips.length === 1}
                    aria-label={`Delete ${t.name}`}
                    onClick={() => {
                      if (
                        confirm(
                          `Delete ${t.name} and all its data? Export a backup first if needed.`,
                        )
                      )
                        setStore((s) => {
                          const trips = s.trips.filter((x) => x.id !== t.id);
                          return {
                            ...s,
                            trips,
                            activeId:
                              s.activeId === t.id ? trips[0].id : s.activeId,
                          };
                        });
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
