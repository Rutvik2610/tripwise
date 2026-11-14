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
import { expenseTotal, groupBy, paymentState } from "../lib/calc";
import { usePlanner } from "../lib/context";
import { categories } from "../lib/model";

export default function Expenses() {
  const { trip, summary, money, add, editActions } = usePlanner();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("date");
  const [group, setGroup] = useState(false);
  const expenseRows = trip.expenses
    .filter(
      (e) =>
        (filter === "All" || e.category === filter) &&
        `${e.description} ${e.destination} ${e.vendor} ${e.bookingStatus} ${paymentState(expenseTotal(e), e.paid, e.refunded)}`
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
          label="ALL PLANNED COSTS"
          value={money(summary.estimated)}
          detail="Includes hotels, transport & activities"
          icon={Wallet}
        />
        <Stat
          label="CONFIRMED COMMITMENTS"
          value={money(summary.confirmed)}
          detail={`${summary.bookings} booked items · Not an extra cost`}
          icon={ShieldCheck}
        />
        <Stat
          label="NET PAYMENTS"
          value={money(summary.paid)}
          detail="Payments less refunds · Included in costs"
          icon={CheckCircle2}
        />
      </div>
      <div className="notice">
        <Info size={17} />
        <span>
          Record hotel, transport, and activity costs in their dedicated
          modules. Add only other expenses here to avoid counting the same
          booking twice. Payments and refunds are recorded in INR at the
          historical rate you paid. Unrefunded cancellation costs stay in the
          forecast.
        </span>
      </div>
      <Panel
        title="Expense ledger"
        sub={`${expenseRows.length} expenses · ${money(expenseRows.filter((e) => e.bookingStatus !== "Cancelled" && e.includeInBudget !== false).reduce((s, e) => s + expenseTotal(e), 0))} planned`}
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
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>All</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
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
                  <th>Estimate</th>
                  <th>Payment</th>
                  <th>Booking</th>
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
