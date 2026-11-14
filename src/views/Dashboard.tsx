import {
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  GitCompareArrows,
  MapPin,
  MoreHorizontal,
  Plane,
  Sparkles,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { Donut, palette } from "../components/Charts";
import { Badge, Panel, Stat } from "../components/Shared";
import { daysBetween, groupBy, insights, ledger, savings } from "../lib/calc";
import { usePlanner } from "../lib/context";
import { dateLabel, shortDate } from "../lib/format";

export default function Dashboard() {
  const { trip, summary, money, updateTrip, go, startEdit } = usePlanner();
  const duration = summary.days;
  const daysAway = Math.max(
    0,
    daysBetween(
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
      trip.start,
    ),
  );
  const progress =
    trip.budget > 0 ? (summary.estimated / trip.budget) * 100 : 0;
  const recent = ledger(trip)
    .filter((r) => r.active)
    .slice(0, 5);
  return (
    <>
      <section className="hero">
        <img
          src={`${import.meta.env.BASE_URL}journey.svg`}
          alt="Illustrated Kuala Lumpur and Singapore skyline beside tropical waters"
        />
        <div className="hero-shade" />
        <div className="hero-copy">
          <span className="hero-tag">
            <span /> YOUR NEXT ADVENTURE
          </span>
          <h2>
            {trip.stops.map((s) => s.name).join(" to ").length > 45
              ? trip.name
              : trip.stops.map((s) => s.name).join(" · ")}
          </h2>
          <p>
            <MapPin size={15} />
            {trip.departure} <span>→</span>{" "}
            {trip.stops
              .map((s) => s.country)
              .filter((v, i, a) => a.indexOf(v) === i)
              .join(" & ")}
          </p>
          <div className="hero-meta">
            <span>
              <CalendarDays size={15} />
              {shortDate(trip.start)} – {dateLabel(trip.end)}
            </span>
            <i />
            <span>
              {duration} days · {trip.travellers}{" "}
              {trip.travellers === 1 ? "traveller" : "travellers"}
            </span>
            <Badge tone="light">{trip.status}</Badge>
          </div>
          <button className="hero-button" onClick={() => go("Itinerary")}>
            Explore itinerary <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="countdown">
          <Plane size={21} />
          <div>
            <strong>{daysAway}</strong>
            <span>DAYS TO TAKEOFF</span>
          </div>
        </div>
      </section>
      <div className="section-label">
        <h3>Your trip, at a glance</h3>
        <span>
          <span className="dot" />
          All amounts in {trip.homeCurrency} · Auto-saved locally
        </span>
      </div>
      <div className="stat-grid">
        <Stat
          label="PLANNED BUDGET"
          value={money(trip.budget)}
          detail={"Stretch: " + money(trip.stretch)}
          icon={Wallet}
          onClick={() => startEdit("trip", trip, "Edit trip budget")}
        />
        <Stat
          label="ESTIMATED TRIP COST"
          value={money(summary.estimated)}
          detail={money(summary.estimated / duration) + " per day"}
          icon={TrendingDown}
          onClick={() => go("Expenses")}
        />
        <Stat
          label="ACTUALLY PAID"
          value={money(summary.paid)}
          detail={money(summary.unpaid) + " confirmed, still unpaid"}
          icon={CheckCircle2}
          onClick={() => go("Expenses")}
        />
        <Stat
          label="BUDGET REMAINING"
          value={money(summary.remaining)}
          detail={
            summary.remaining >= 0
              ? "A little room for the unexpected"
              : "Above your planned budget"
          }
          icon={Wallet}
          accent={summary.remaining >= 0 ? "mint" : "coral"}
          onClick={() => go("Budget simulator")}
        />
      </div>
      <div className="overview-grid">
        <Panel
          title="Where your money goes"
          sub="Your estimated budget, thoughtfully divided"
          action={
            <button
              className="icon-button"
              title="View expense details"
              onClick={() => go("Expenses")}
            >
              <MoreHorizontal size={20} />
            </button>
          }
        >
          <div className="allocation">
            <Donut format={money} data={groupBy(trip, "category")} />
            <div className="chart-legend">
              {groupBy(trip, "category")
                .filter((d) => d.estimated > 0)
                .sort((a, b) => b.estimated - a.estimated)
                .slice(0, 5)
                .map((d) => (
                  <div key={d.name}>
                    <span className="legend-label">
                      <i
                        style={{
                          background:
                            palette[
                              groupBy(trip, "category")
                                .filter((d) => d.estimated > 0)
                                .findIndex((g) => g.name === d.name) %
                                palette.length
                            ],
                        }}
                      />
                      {d.name}
                    </span>
                    <strong>{money(d.estimated)}</strong>
                  </div>
                ))}
            </div>
          </div>
          <div className="budget-track">
            <div>
              <span>{Math.round(progress)}% of planned budget</span>
              <strong>{money(summary.remaining)} left</strong>
            </div>
            <div className="track">
              <span
                style={{
                  width: Math.min(progress, 100) + "%",
                  background: progress > 100 ? "#bd725f" : undefined,
                }}
              />
            </div>
            <p>Estimates include selected hotels and planned activities.</p>
          </div>
        </Panel>
        <Panel
          title="Your route, your rhythm"
          sub={`${trip.stops.length} destinations. One unforgettable journey.`}
          action={
            <button className="text-button" onClick={() => go("Itinerary")}>
              View plan <ArrowUpRight size={15} />
            </button>
          }
        >
          <div className="route-list">
            {trip.stops.map((stop, i) => (
              <div className="route-stop" key={stop.id}>
                <div className={"destination-art art-" + i}>
                  <span>{["🏙", "🌴", "✦"][i % 3]}</span>
                </div>
                <div className="route-copy">
                  <small>
                    STOP {String(i + 1).padStart(2, "0")}{" "}
                    <span>· {stop.country}</span>
                  </small>
                  <h4>{stop.name}</h4>
                  <p>
                    {shortDate(stop.start)} – {shortDate(stop.end)}{" "}
                    <span>· {daysBetween(stop.start, stop.end)} nights</span>
                  </p>
                </div>
                <ChevronRight size={17} />
              </div>
            ))}
          </div>
          <button className="route-footer" onClick={() => go("Compare trips")}>
            <GitCompareArrows size={17} />
            <span>Malaysia only, or a little Singapore too?</span>
            <ArrowRight size={16} />
          </button>
        </Panel>
      </div>
      <div className="overview-bottom">
        <Panel
          title="A little insight goes a long way"
          sub="Practical ideas, based on your plan"
          action={<Sparkles size={18} className="teal" />}
        >
          <div className="insight-list">
            {insights(trip)
              .slice(0, 3)
              .map((x, i) => (
                <div key={x}>
                  <span className={"insight-icon insight-" + i}>
                    {i === 0 ? (
                      <Wallet size={18} />
                    ) : i === 1 ? (
                      <TrendingDown size={18} />
                    ) : (
                      <BedDouble size={18} />
                    )}
                  </span>
                  <div>
                    <h4>
                      {i === 0
                        ? "Keep an eye on your budget"
                        : i === 1 && savings(trip) > 0
                          ? "A smarter stay, a little more freedom"
                          : "Good to know"}
                    </h4>
                    <p>{x}</p>
                  </div>
                </div>
              ))}
          </div>
        </Panel>
        <Panel
          title="Before you go"
          sub="Small steps toward a smooth takeoff"
          action={
            <button className="text-button" onClick={() => go("Checklist")}>
              View all <ArrowUpRight size={15} />
            </button>
          }
        >
          <div className="check-preview">
            {trip.checklist.slice(0, 4).map((c) => (
              <button
                key={c.id}
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
                  <CheckCircle2 className="teal" size={19} />
                ) : (
                  <Circle size={19} />
                )}
                <span className={c.status === "Done" ? "done" : ""}>
                  {c.title}
                </span>
                {c.priority === "High" && <span className="priority-dot" />}
              </button>
            ))}
          </div>
          <div className="check-progress">
            <span>
              {trip.checklist.filter((c) => c.status === "Done").length} of{" "}
              {trip.checklist.length} ready
            </span>
            <div className="track">
              <span
                style={{
                  width:
                    (trip.checklist.filter((c) => c.status === "Done").length /
                      (trip.checklist.length || 1)) *
                      100 +
                    "%",
                }}
              />
            </div>
          </div>
        </Panel>
      </div>
      <Panel
        title="The numbers behind the adventure"
        sub="Booking commitments and useful planning details"
      >
        <div className="mini-stats">
          <div>
            <small>CONFIRMED BOOKINGS</small>
            <strong>{money(summary.confirmed)}</strong>
            <span>{summary.bookings} bookings confirmed</span>
          </div>
          <div>
            <small>ACCOMMODATION / NIGHT</small>
            <strong>{money(summary.hotels / (summary.nights || 1))}</strong>
            <span>{summary.nights} trip nights</span>
          </div>
          <div>
            <small>POTENTIAL HOTEL SAVINGS</small>
            <strong>{money(savings(trip))}</strong>
            <span>Unbooked, unpaid stays only</span>
          </div>
          <div>
            <small>PROJECTED POSITION</small>
            <strong>{money(Math.abs(summary.remaining))}</strong>
            <span>
              {summary.remaining >= 0 ? "under" : "over"} planned budget
            </span>
          </div>
        </div>
      </Panel>
      <Panel
        title="In your plan"
        sub="An overview of your planned costs"
        action={
          <button className="text-button" onClick={() => go("Expenses")}>
            All expenses <ArrowUpRight size={15} />
          </button>
        }
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Expense</th>
                <th>Destination</th>
                <th>Status</th>
                <th className="right">Estimate</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td>{r.label}</td>
                  <td>{r.destination}</td>
                  <td>
                    <Badge tone={r.booked ? "green" : ""}>
                      {r.booked ? "Booked" : "Provisional"}
                    </Badge>
                  </td>
                  <td className="right number">{money(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
