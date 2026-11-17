import { costOverview } from "../lib/overview";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Bars, inr } from "../components/Charts";
import { Panel } from "../components/Shared";
import { ledger, totals, rowForecast } from "../lib/calc";
import { usePlanner } from "../lib/context";
import { dateLabel, shortDate } from "../lib/format";
import type { Trip } from "../lib/model";

export default function Comparison() {
  const { store, setStore, go } = usePlanner();
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const compareA =
    store.trips.find((t) => t.id === (compareIds[0] ?? store.trips[1]?.id)) ??
    store.trips[0];
  const compareB =
    store.trips.find((t) => t.id === (compareIds[1] ?? store.trips[0].id)) ??
    store.trips[0];
  const comparisonRows: [string, (t: Trip) => number][] = [
    ["Total estimated cost", (t) => totals(t).estimated],
    ["Accommodation", (t) => totals(t).hotels],
    ["Flights", (t) => costOverview(t).flights],
    [
      "Visa",
      (t) =>
        ledger(t)
          .filter((x) => x.category === "Visa")
          .reduce((s, x) => s + rowForecast(x), 0),
    ],
    [
      "Activities",
      (t) =>
        ledger(t)
          .filter((x) => x.source === "Activities")
          .reduce((s, x) => s + rowForecast(x), 0),
    ],
    [
      "Food",
      (t) =>
        ledger(t)
          .filter((x) => x.category === "Food")
          .reduce((s, x) => s + rowForecast(x), 0),
    ],
    [
      "Local transportation",
      (t) =>
        ledger(t)
          .filter((x) =>
            ["Local transportation", "Airport transfers"].includes(x.category),
          )
          .reduce((s, x) => s + rowForecast(x), 0),
    ],
    ["Daily average", (t) => totals(t).estimated / totals(t).days],
  ];
  const travelDays = (t: Trip) =>
    new Set(
      t.transport
        .filter((x) => x.status !== "Cancelled" && x.departureDate)
        .map((x) => x.departureDate),
    ).size;
  return (
    <>
      <div className="compare-selectors">
        {[compareA, compareB].map((t, i) => (
          <label key={i}>
            <span>SCENARIO {i === 0 ? "A" : "B"}</span>
            <select
              aria-label={`Scenario ${i === 0 ? "A" : "B"}`}
              value={t.id}
              onChange={(e) =>
                setCompareIds(
                  i === 0
                    ? [e.target.value, compareB.id]
                    : [compareA.id, e.target.value],
                )
              }
            >
              {store.trips.map((x) => (
                <option value={x.id} key={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="two-col">
        {[compareA, compareB].map((t, i) => {
          const s = totals(t);
          return (
            <section
              className={"comparison-card " + (i === 1 ? "featured" : "")}
              key={i}
            >
              <span className="eyebrow">SCENARIO {i === 0 ? "A" : "B"}</span>
              <h2>{t.stops.map((x) => x.name).join(" + ")}</h2>
              <p>
                {shortDate(t.start)} – {dateLabel(t.end)} · {s.days} days
              </p>
              <strong className="compare-total">{inr(s.estimated)}</strong>
              <p>estimated total · {inr(s.estimated / s.days)} per day</p>
              <div className="compare-difference">
                {inr(
                  Math.abs(
                    totals(compareA).estimated - totals(compareB).estimated,
                  ),
                )}{" "}
                difference between plans
              </div>
              <button
                className="button secondary"
                onClick={() => {
                  setStore((st) => ({ ...st, activeId: t.id }));
                  go("Overview");
                }}
              >
                Open this trip <ArrowUpRight size={16} />
              </button>
            </section>
          );
        })}
      </div>
      <Panel
        title="See the whole picture"
        sub="INR comparison · Each trip retains independent bookings and activities"
      >
        <div className="table-scroll">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Scenario A</th>
                <th>Scenario B</th>
                <th>B minus A</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map(([label, fn]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{inr(fn(compareA))}</td>
                  <td>{inr(fn(compareB))}</td>
                  <td
                    className={fn(compareB) <= fn(compareA) ? "teal" : "warm"}
                  >
                    {fn(compareB) >= fn(compareA) ? "+" : "−"}
                    {inr(Math.abs(fn(compareB) - fn(compareA)))}
                  </td>
                </tr>
              ))}
              <tr>
                <td>Travel days</td>
                <td>{travelDays(compareA)}</td>
                <td>{travelDays(compareB)}</td>
                <td>Based on departure dates</td>
              </tr>
              <tr>
                <td>Sightseeing days</td>
                <td>
                  {Math.max(0, totals(compareA).days - travelDays(compareA))}
                </td>
                <td>
                  {Math.max(0, totals(compareB).days - travelDays(compareB))}
                </td>
                <td>Non-travel days</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="two-col">
        <Panel title="Scenario comparison">
          <Bars
            data={[
              { name: "Scenario A", estimated: totals(compareA).estimated },
              { name: "Scenario B", estimated: totals(compareB).estimated },
            ]}
          />
        </Panel>
        <Panel title="Projected budget remaining">
          <Bars
            data={[
              { name: "Scenario A", estimated: totals(compareA).remaining },
              { name: "Scenario B", estimated: totals(compareB).remaining },
            ]}
            label="Remaining budget"
          />
        </Panel>
      </div>
    </>
  );
}
