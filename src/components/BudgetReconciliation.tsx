import { useState } from "react";
import { usePlanner } from "../lib/context";
import { reconciliation, allowanceUsage } from "../lib/finance";
import { rowForecast } from "../lib/calc";
import { Panel } from "./Shared";
export function BudgetReconciliation() {
  const { trip, money } = usePlanner();
  const [view, setView] = useState("Category");
  const report = reconciliation(trip);
  const groups = view === "Category" ? report.categories : report.sources;
  const allowances = trip.expenses.filter((e) => e.kind === "Allowance");
  return (
    <Panel
      title="Budget reconciliation"
      sub="One forecast across all modules. Expand a row to see exactly which records contribute."
    >
      <div className="toolbar">
        <div className="tabs">
          {["Category", "Source"].map((v) => (
            <button
              key={v}
              className={view === v ? "active" : ""}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <p className="reconciliation-note">
        Expense records contribute {money(report.expensesContribution)}.
        Itinerary activities, flights and hotels also contribute to the
        whole-trip forecast. Local transport from Expenses appears once under
        local transportation.
      </p>
      <div className="reconciliation-groups">
        {groups.map((g) => (
          <details key={g.name} className="reconciliation-group">
            <summary>
              <strong>{g.name}</strong>
              <span>Forecast {money(g.forecast)}</span>
              <span>Paid {money(g.paid)}</span>
              <span>Still expected {money(g.remaining)}</span>
            </summary>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Contributing record</th>
                    <th>Estimate / unallocated plan</th>
                    <th>Forecast</th>
                    <th>Adjustment</th>
                    <th>Net paid</th>
                    <th>Still expected</th>
                  </tr>
                </thead>
                <tbody>
                  {g.records.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {r.label}
                        <small>
                          {r.source}
                          {!r.active ? " · Retained unrecovered payment" : ""}
                        </small>
                      </td>
                      <td>{money(r.active ? r.total : 0)}</td>
                      <td>{money(rowForecast(r))}</td>
                      <td>
                        {money(
                          Math.max(
                            0,
                            rowForecast(r) - (r.active ? r.total : 0),
                          ),
                        )}
                      </td>
                      <td>{money(r.paid)}</td>
                      <td>{money(Math.max(0, rowForecast(r) - r.paid))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>
      <div className="reconciliation-total" data-testid="reconciliation-total">
        <strong>Total projected cost {money(report.summary.estimated)}</strong>
        <span>Net paid {money(report.summary.paid)}</span>
        <span>
          Remaining forecast spending {money(report.summary.remainingForecast)}
        </span>
      </div>
      <p className="reconciliation-note">
        Confirmed but unpaid: {money(report.summary.unpaid)}. This is part of
        remaining forecast spending, not an additional cost. New unbudgeted
        spending increases the forecast; paying an existing estimate does not
        add it again.
      </p>
      {allowances.length > 0 && (
        <details className="allowance-summary">
          <summary>Budget allowance usage</summary>
          <p>
            Only explicitly linked items consume an allowance. Other spending is
            additional.
          </p>
          {allowances.map((e) => {
            const usage = allowanceUsage(trip, e);
            return (
              <div className="allowance-usage" key={e.id}>
                <strong>{e.description}</strong>
                <span>
                  Target {money(usage.target)} · Net paid {money(usage.paid)} ·
                  Remaining allowance {money(usage.remaining)}
                  {usage.overrun > 0
                    ? ` · Over allowance ${money(usage.overrun)}`
                    : ""}{" "}
                  · {usage.count} linked items
                </span>
              </div>
            );
          })}
        </details>
      )}
    </Panel>
  );
}
