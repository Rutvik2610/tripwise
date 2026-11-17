import {
  FlightPlanning,
  AccommodationDateWarning,
} from "../components/FlightPlanning";
import { activeAlternative } from "../lib/februaryFlights";
import { TransportationSummary } from "../components/TransportationSummary";
import { TransitPlanning } from "../components/TransitPlanning";
import { transportationTotals } from "../lib/transit";
import { ResearchUpdate } from "../components/ResearchUpdate";
import {
  ArrowRight,
  Clock,
  ExternalLink,
  Info,
  Plane,
  Plus,
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
    (t) => t.status !== "Cancelled" && activeAlternative(t),
  );
  const figures = transportationTotals(trip);
  const knownDurations = activeTransport
    .map(travelMinutes)
    .filter((n): n is number => n !== null && n >= 0);
  const byMode = [
    { name: "International airfare", estimated: figures.international },
    { name: "Domestic / regional flights", estimated: figures.domestic },
    { name: "Local / airport transport", estimated: figures.local },
  ];
  return (
    <>
      <AccommodationDateWarning />
      <TransportationSummary />
      <FlightPlanning />
      <ResearchUpdate />
      <TransitPlanning />
      <div className="stat-grid operational-stats">
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
          {trip.january2027Shift === 1 &&
            "Shifted travel dates are provisional and have not been independently reverified. "}
          Fares are illustrative. No flight schedules or protected connections
          are assumed. Enter local times; duration calculations use India
          UTC+5:30 and Malaysia / Singapore UTC+8. Other routes need manual
          verification.
        </span>
      </div>
      {connectionWarnings(activeTransport).map((w) => (
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
                    {`· Terminal ${t.arrivalTerminal || "Unverified"}`} ·{" "}
                    {travelMinutes(t) === null
                      ? "Duration pending"
                      : `${travelMinutes(t)} minutes`}
                  </p>
                  {t.mode.toLowerCase().includes("flight") && (
                    <p>
                      Cabin / handbag:{" "}
                      {t.cabinBaggagePieces == null
                        ? "Pieces unverified"
                        : `${t.cabinBaggagePieces} piece${t.cabinBaggagePieces === 1 ? "" : "s"}`}{" "}
                      ·{" "}
                      {t.cabinBaggageKg == null
                        ? "Weight unverified"
                        : `up to ${t.cabinBaggageKg} kg`}{" "}
                      · Checked baggage:{" "}
                      {t.checkedBaggageKg == null
                        ? "Unverified"
                        : `${t.checkedBaggageKg} kg`}
                    </p>
                  )}
                  {t.decisionId && (
                    <p>
                      <strong>
                        {t.selectedAlternative
                          ? "Selected return option"
                          : "Unselected alternative — excluded from forecast"}
                      </strong>
                    </p>
                  )}
                  {t.quoteStatus && <p>{t.quoteStatus}</p>}
                  {t.aircraft !== undefined && (
                    <p>
                      Aircraft: {t.aircraft || "Unverified"} · Operating
                      airline: {t.operatingCarrier || "Unverified"} · Cabin:{" "}
                      {t.cabinClass || "Unverified"} · Fare:{" "}
                      {t.fareType || "Unverified"}
                    </p>
                  )}
                  <details>
                    <summary>Fare & booking details</summary>
                    <p>
                      {t.fareGroupId
                        ? "Individual-leg allocation unknown. This flight is included in the shared round-trip fare; edit amounts on the ticket card."
                        : `Base ${t.fare} + taxes ${t.taxes} + baggage ${t.baggage} + seats ${t.seat} ${t.currency}. Rate: ${t.rate} INR/${t.currency}.`}
                    </p>
                    <p>
                      {t.refundable
                        ? "Refundable"
                        : t.number === "AK 6324" &&
                            t.quoteStatus === "User search quote"
                          ? "Non-refundable"
                          : "Refundability unverified"}{" "}
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
                      ? "Included in shared ticket"
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
      <Panel title="Transportation cost breakdown">
        <Bars format={money} data={byMode} />
      </Panel>
    </>
  );
}
