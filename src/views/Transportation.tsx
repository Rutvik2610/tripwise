import { TransitPlanning } from "../components/TransitPlanning";
import { transportationTotals } from "../lib/transit";
import { convert } from "../lib/calc";
import { ResearchUpdate } from "../components/ResearchUpdate";
import {
  ArrowRight,
  Clock,
  ExternalLink,
  Info,
  Plane,
  Plus,
  Wallet,
} from "lucide-react";
import { Bars } from "../components/Charts";
import { Badge, Empty, Panel, Stat } from "../components/Shared";
import {
  connectionWarnings,
  paymentState,
  transportTotal,
  travelMinutes,
} from "../lib/calc";
import { usePlanner } from "../lib/context";
import { safeUrl, shortDate } from "../lib/format";

export default function Transportation() {
  const { trip, money, add, editActions } = usePlanner();

  const activeTransport = trip.transport.filter(
    (t) => t.status !== "Cancelled",
  );
  const figures = transportationTotals(trip);
  const transportCost = figures.total;
  const knownDurations = activeTransport
    .map(travelMinutes)
    .filter((n): n is number => n !== null && n >= 0);
  const byMode = [...new Set(activeTransport.map((t) => t.mode))].map(
    (mode) => ({
      name: mode,
      estimated: activeTransport
        .filter((t) => t.mode === mode)
        .reduce((s, t) => s + transportTotal(t), 0),
    }),
  );
  for (const g of trip.fareGroups ?? []) {
    if (g.status === "Cancelled") continue;
    const found = byMode.find((r) => r.name === "International flight");
    const value = convert(g.amount, g.rate);
    if (found) found.estimated += value;
    else byMode.push({ name: "International flight", estimated: value });
  }
  const remainingTransport =
    transportCost - byMode.reduce((s, r) => s + r.estimated, 0);
  if (remainingTransport > 0)
    byMode.push({
      name: "Other transport estimates",
      estimated: remainingTransport,
    });
  return (
    <>
      <ResearchUpdate />
      <TransitPlanning />
      <div className="stat-grid three">
        <Stat
          label="TRANSPORTATION ESTIMATE"
          value={money(transportCost)}
          detail="Ticket fares + domestic flights + local / airport transport"
          icon={Wallet}
        />
        <Stat
          label="FLIGHTS PLANNED"
          value={String(
            activeTransport.filter((t) => t.mode.includes("flight")).length,
          )}
          detail="Provisional until booked"
          icon={Plane}
        />
        <Stat
          label="SCHEDULED TRAVEL TIME"
          value={
            knownDurations.length
              ? `${Math.floor(knownDurations.reduce((s, n) => s + n, 0) / 60)}h ${knownDurations.reduce((s, n) => s + n, 0) % 60}m`
              : "Not scheduled"
          }
          detail={`${knownDurations.length} of ${activeTransport.length} legs with times`}
          icon={Clock}
        />
      </div>
      <div className="notice">
        <Info size={17} />
        <span>
          Fares are illustrative. No flight schedules or protected connections
          are assumed. Enter local times; duration calculations use India
          UTC+5:30 and Malaysia / Singapore UTC+8. Other routes need manual
          verification.
        </span>
      </div>
      {connectionWarnings(trip.transport).map((w) => (
        <div className="notice warning" key={w}>
          <Info size={18} />
          {w}
        </div>
      ))}
      <Panel
        title="Your journey, leg by leg"
        sub="Every route, connection, and booking in one place"
        action={
          <button className="button" onClick={() => add("transport")}>
            <Plus size={16} />
            Add transport
          </button>
        }
      >
        {trip.transport.length ? (
          <div className="transport-list">
            {trip.transport.map((t) => (
              <article
                className={
                  "transport-card " +
                  (t.status === "Cancelled" ? "cancelled" : "")
                }
                key={t.id}
              >
                <div className="transport-icon">
                  <Plane size={22} />
                </div>
                <div className="transport-route">
                  <small>
                    {t.mode} · {t.provider || "Provider unverified"} {t.number}
                  </small>
                  <h3>
                    {t.source}
                    <ArrowRight size={16} />
                    {t.destination}
                  </h3>
                  <p>
                    {shortDate(t.departureDate)} ·{" "}
                    {t.departureTime || "Time pending"}{" "}
                    {t.departureTerminal &&
                      ` · Terminal ${t.departureTerminal}`}
                  </p>
                  <p>
                    Arrival:{" "}
                    {t.arrivalDate ? shortDate(t.arrivalDate) : "Pending"}{" "}
                    {t.arrivalTime}{" "}
                    {t.arrivalTerminal && `· Terminal ${t.arrivalTerminal}`} ·{" "}
                    {travelMinutes(t) === null
                      ? "Duration pending"
                      : `${travelMinutes(t)} minutes`}
                  </p>
                  <details>
                    <summary>Fare & booking details</summary>
                    <p>
                      {t.fareGroupId
                        ? "Individual-leg allocation unknown. This flight is included in the shared round-trip fare; edit amounts on the ticket card."
                        : `Base ${t.fare} + taxes ${t.taxes} + baggage ${t.baggage} + seats ${t.seat} ${t.currency}. Rate: ${t.rate} INR/${t.currency}.`}
                    </p>
                    <p>
                      {t.refundable ? "Refundable" : "Refundability unverified"}{" "}
                      · Ref: {t.reference || "None"} ·{" "}
                      {t.fareGroupId
                        ? "Payment recorded on ticket"
                        : paymentState(transportTotal(t), t.paid, t.refunded)}
                    </p>
                    <p>{t.notes}</p>
                    {safeUrl(t.url) && (
                      <a
                        href={safeUrl(t.url)!}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Booking provider <ExternalLink size={12} />
                      </a>
                    )}
                  </details>
                </div>
                <div className="transport-price">
                  <strong className={t.fareGroupId ? "linked-fare-label" : ""}>
                    {t.fareGroupId
                      ? "Included in round-trip ticket"
                      : money(transportTotal(t))}
                  </strong>
                  <Badge tone={t.status === "Booked" ? "green" : ""}>
                    {t.fareGroupId
                      ? `Ticket: ${trip.fareGroups?.find((g) => g.id === t.fareGroupId)?.status ?? "Researching"}`
                      : t.notes.includes("Superseded unpaid Penang")
                        ? "Superseded estimate"
                        : t.status}
                  </Badge>
                  {editActions("transport", t)}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            label="Your route starts here"
            onAdd={() => add("transport")}
          />
        )}
      </Panel>
      <Panel title="Transportation by mode">
        <Bars format={money} data={byMode} />
      </Panel>
    </>
  );
}
