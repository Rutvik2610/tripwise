import { BudgetReconciliation } from "../components/BudgetReconciliation";
import { TransitPlanning } from "../components/TransitPlanning";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  MapPin,
  Plane,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Donut, palette } from "../components/Charts";
import { Panel, Badge } from "../components/Shared";
import { CostOverview, StaySummary } from "../components/CostOverview";
import { ResearchUpdate } from "../components/ResearchUpdate";
import { usePlanner } from "../lib/context";
import { daysBetween, groupBy, insights } from "../lib/calc";
import { dateLabel, shortDate } from "../lib/format";
export default function Dashboard() {
  const { trip, summary, money, go, updateTrip } = usePlanner();
  const allocation = groupBy(trip, "category").filter((d) => d.estimated > 0);
  const daysAway = daysBetween(
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
    trip.start,
  );
  return (
    <>
      <CostOverview />
      <TransitPlanning view="overview" />
      <ResearchUpdate />
      <Panel
        title="Where your money goes"
        sub="Projected costs by category. Payments are included in these costs, not added on top."
        action={
          <button className="text-button" onClick={() => go("Expenses")}>
            View expense ledger <ArrowUpRight size={15} />
          </button>
        }
      >
        <div className="allocation financial-allocation">
          <Donut format={money} data={allocation} />
          <div className="chart-legend">
            {allocation.map((d, i) => (
              <div key={d.name}>
                <span className="legend-label">
                  <i style={{ background: palette[i % palette.length] }} />
                  {d.name}
                </span>
                <strong>{money(d.estimated)}</strong>
              </div>
            ))}
          </div>
        </div>
      </Panel>
      <StaySummary />
      <BudgetReconciliation />
      <section className="hero schedule-hero">
        <img
          src={`${import.meta.env.BASE_URL}journey.svg`}
          alt="Illustrated tropical city skyline"
        />
        <div className="hero-shade" />
        <div className="hero-copy">
          <span className="hero-tag">
            YOUR JOURNEY · {daysAway} DAYS TO TAKEOFF
          </span>
          <h2>{trip.stops.map((s) => s.name).join(" · ") || trip.name}</h2>
          <p>
            <MapPin size={15} />
            {trip.departure}
          </p>
          <div className="hero-meta">
            <span>
              <CalendarDays size={15} />
              {shortDate(trip.start)} – {dateLabel(trip.end)}
            </span>
            <span>
              {summary.days} days · {summary.nights} nights · {trip.travellers}{" "}
              traveller(s)
            </span>
            <Badge tone="light">{trip.status}</Badge>
          </div>
          <button className="hero-button" onClick={() => go("Itinerary")}>
            Open itinerary <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="countdown">
          <Plane size={21} />
          <strong>{daysAway}</strong>
        </div>
      </section>
      <div className="overview-bottom">
        <Panel
          title="Insights from your plan"
          sub="Deterministic suggestions based on your own costs"
          action={<Sparkles size={18} className="teal" />}
        >
          <div className="insight-list">
            {insights(trip)
              .slice(0, 4)
              .map((text) => (
                <div key={text}>
                  <Wallet size={18} className="teal" />
                  <p>{text}</p>
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
                  <CheckCircle2 size={19} className="teal" />
                ) : (
                  <Circle size={19} />
                )}
                <span className={c.status === "Done" ? "done" : ""}>
                  {c.title}
                </span>
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
    </>
  );
}
