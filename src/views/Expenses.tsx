import {
  isEveryday,
  expenseStatus,
  reservationLabel,
  reconciliation,
  allowanceUsage,
} from "../lib/finance";
import {
  CheckCircle2,
  Info,
  Plus,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { Bars } from "../components/Charts";
import { Empty, ExpenseTableRows, Panel, Stat } from "../components/Shared";
import {
  expenseTotal,
  groupBy,
  ledger,
  netPaid,
  rowForecast,
} from "../lib/calc";
import { usePlanner } from "../lib/context";
import { categories } from "../lib/model";

export default function Expenses() {
  const { trip, summary, money, add, editActions } = usePlanner();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const report = reconciliation(trip);
  const accounting = ledger(trip);
  const contribution = (id: string) => {
    const row = accounting.find((r) => r.id === id);
    return row ? rowForecast(row) : 0;
  };
  const statuses =
    filter !== "All" && isEveryday(filter)
      ? ["Estimated", "Spent", "Partially spent", "Refunded", "Cancelled"]
      : [
          "Estimated",
          "Spent",
          "Partially spent",
          "Unpaid",
          "Paid",
          "Partially Paid",
          "Refunded",
          "Planned",
          "Booked",
          "Reserved",
          "Cancelled",
        ];
  const [sort, setSort] = useState("date");
  const [group, setGroup] = useState(false);
  const expenseRows = trip.expenses
    .filter(
      (e) =>
        (filter === "All" || e.category === filter) &&
        (statusFilter === "All" ||
          expenseStatus(e) === statusFilter ||
          reservationLabel(e.category, e.bookingStatus) === statusFilter) &&
        `${e.description} ${e.destination} ${e.vendor} ${e.bookingStatus} ${expenseStatus(e)} ${reservationLabel(e.category, e.bookingStatus)}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "amount"
        ? expenseTotal(b) - expenseTotal(a)
        : sort === "name"
          ? a.description.localeCompare(b.description)
          : a.date.localeCompare(b.date),
    );
  return (
    <>
      <div className="stat-grid three">
        <Stat
          label="EXPENSE RECORDS FORECAST"
          value={money(report.expensesContribution)}
          detail="Only the contribution from this module"
          icon={Wallet}
        />
        <Stat
          label="WHOLE-TRIP PROJECTED COST"
          value={money(summary.estimated)}
          detail="All modules · reconcile on Overview"
          icon={ShieldCheck}
        />
        <Stat
          label="PAYMENTS RECORDED HERE"
          value={money(
            trip.expenses.reduce((s, e) => s + netPaid(e.paid, e.refunded), 0),
          )}
          detail="Net of refunds · Includes linked activity payments"
          icon={CheckCircle2}
        />
      </div>
      <div className="notice">
        <Info size={17} />
        <span>
          Record hotel, transport, and activity costs in their dedicated
          modules. Add only other expenses here to avoid counting the same
          booking twice. Use Budget source to link a payment to an existing
          allowance or activity. Unlinked items add new costs. Payment and
          refund currencies are converted once using their saved rates.
        </span>
      </div>
      <Panel
        title="Expense ledger"
        sub={`${expenseRows.length} records · ${money(expenseRows.reduce((s, e) => s + contribution(e.id), 0))} forecast contribution`}
        action={
          <button className="button" onClick={() => add("expenses")}>
            <Plus size={16} />
            Add expense
          </button>
        }
      >
        <div className="toolbar">
          <div className="search-input">
            <Search size={16} />
            <input
              aria-label="Search expenses"
              placeholder="Search expenses, destinations, status…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Filter category"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setStatusFilter("All");
            }}
          >
            <option>All</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Filter status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All</option>
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          <select
            aria-label="Sort expenses"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="date">Date</option>
            <option value="amount">Highest cost</option>
            <option value="name">Name</option>
          </select>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={group}
              onChange={(e) => setGroup(e.target.checked)}
            />
            Group
          </label>
        </div>
        {expenseRows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Date / destination</th>
                  <th>Original / rate</th>
                  <th>Forecast contribution</th>
                  <th>Payment</th>
                  <th>Reservation</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(group
                  ? [...expenseRows].sort((a, b) =>
                      a.category.localeCompare(b.category),
                    )
                  : expenseRows
                ).map((e, i, a) => (
                  <ExpenseTableRows
                    key={e.id}
                    e={e}
                    money={money}
                    contribution={contribution(e.id)}
                    usage={
                      e.kind === "Allowance"
                        ? allowanceUsage(trip, e)
                        : undefined
                    }
                    relatedLabel={
                      e.plannedActivityId
                        ? `Included with activity: ${trip.activities.find((a) => a.id === e.plannedActivityId)?.name}`
                        : e.allowanceId
                          ? `Uses allowance: ${trip.expenses.find((a) => a.id === e.allowanceId)?.description}`
                          : ""
                    }
                    groupTitle={
                      group && (i === 0 || a[i - 1].category !== e.category)
                        ? e.category
                        : ""
                    }
                    actions={editActions("expenses", e)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty label="No expenses found" onAdd={() => add("expenses")} />
        )}
      </Panel>
      <div className="two-col">
        <Panel
          title="Estimated vs. paid"
          sub="Actual payments are part of the estimate, never added to it"
        >
          <Bars format={money} data={groupBy(trip, "category")} second />
        </Panel>
        <Panel
          title="Spending by destination"
          sub="Includes every active planning module"
        >
          <Bars format={money} data={groupBy(trip, "destination")} />
        </Panel>
      </div>
    </>
  );
}
