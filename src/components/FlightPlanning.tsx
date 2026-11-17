import { useState } from "react";
import { Editor } from "./Editor";
import { schemas, validate } from "../lib/storage";
import type { FareGroup } from "../lib/model";
import { Panel } from "./Shared";
import { usePlanner } from "../lib/context";
import {
  activeAlternative,
  accommodationNeedsReview,
  hasHistory,
  selectFlightAlternative,
} from "../lib/februaryFlights";
import { convert, transportTotal } from "../lib/calc";

export function AccommodationDateWarning() {
  const { trip } = usePlanner();
  if (!trip.february2027Revision || !accommodationNeedsReview(trip))
    return null;
  return (
    <div className="notice warning" role="status">
      <span>
        <strong>Accommodation dates need review.</strong> Existing hotel dates,
        prices, selections and bookings have been preserved. Update them
        separately to match the revised itinerary.
      </span>
    </div>
  );
}
export function FlightPlanning() {
  const { trip, updateTrip, money, store, setStore } = usePlanner();
  const [editing, setEditing] = useState<FareGroup | null>(null);
  const tickets = (trip.fareGroups ?? []).filter(
    (g) => g.id.endsWith(":feb-outbound") || g.name.includes("Subang (SZB)"),
  );
  const decisions = [
    ...new Set(
      trip.transport.flatMap((r) => (r.decisionId ? [r.decisionId] : [])),
    ),
  ];
  const known =
    (trip.fareGroups ?? [])
      .filter(
        (g) =>
          g.quoteStatus === "User search quote" &&
          g.includeInBudget !== false &&
          g.status !== "Cancelled",
      )
      .reduce((s, g) => s + convert(g.amount, g.rate), 0) +
    trip.transport
      .filter(
        (r) =>
          r.quoteStatus === "User search quote" &&
          !r.fareGroupId &&
          activeAlternative(r) &&
          r.status !== "Cancelled",
      )
      .reduce((s, r) => s + transportTotal(r), 0);
  return (
    <>
      {trip.february2027Revision === 1 && (
        <div className="notice" role="status">
          <span>
            <strong data-testid="known-airfare-subtotal">
              Budgeted current search-quote subtotal: {money(known)}.
            </strong>{" "}
            This is not the full airfare forecast: older active estimates may
            still be included below. Search details are user-supplied,
            unpurchased quotes. Arrival is at{" "}
            <strong>SZB — Kuala Lumpur Subang</strong>; the Langkawi departure
            remains <strong>KUL T2</strong>. Plan the appropriate airport
            transfers separately.
          </span>
        </div>
      )}
      {(trip.flightUpdateConflicts ?? []).map((message, i) => (
        <div className="notice warning" role="status" key={i}>
          {message}
        </div>
      ))}
      {tickets.map((ticket) => (
        <Panel
          key={ticket.id}
          title="Connecting outbound ticket"
          sub="MakeMyTrip · Singapore Airlines · Economy Value"
          action={
            <button className="text-button" onClick={() => setEditing(ticket)}>
              Edit outbound ticket & payments
            </button>
          }
        >
          <div className="transit-body">
            <div className="ticket-head">
              <h3>{ticket.name}</h3>
              <strong>{money(convert(ticket.amount, ticket.rate))}</strong>
            </div>
            <p>
              {ticket.status} · {ticket.quoteStatus} ·{" "}
              {ticket.paid > 0 ? `${money(ticket.paid)} paid` : "Unpaid"}. One
              combined fare for SQ 423 and SQ 8584.
            </p>
            <p>
              {ticket.includeInBudget === false
                ? "Comparison only — excluded from forecast to avoid overlapping the retained older Malaysia round-trip estimate. The ₹35,550 older fare requires an updated quotation."
                : "Included once in the airfare forecast; individual segment allocation is unknown."}
            </p>
            <p>{ticket.notes}</p>
            <div className="ticket-legs">
              {trip.transport
                .filter((r) => r.fareGroupId === ticket.id)
                .map((r) => (
                  <div key={r.id}>
                    <strong>
                      {r.number}: {r.source} → {r.destination}
                    </strong>
                    <span>
                      {r.departureDate} {r.departureTime} → {r.arrivalDate}{" "}
                      {r.arrivalTime} (local airport times)
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </Panel>
      ))}
      {decisions.map((id) => {
        const options = trip.transport.filter((r) => r.decisionId === id),
          locked = options.some(hasHistory);
        return (
          <Panel
            key={id}
            title="Singapore → Mumbai return alternatives"
            sub="3 February 2027 · only the selected option contributes to the forecast"
          >
            <div className="transit-body">
              {options.map((r) => (
                <div key={r.id} className="transport-card">
                  <div>
                    <h3>
                      {r.number} ·{" "}
                      {r.selectedAlternative
                        ? "Selected return option"
                        : "Alternative — excluded from forecast"}
                    </h3>
                    <p>
                      {r.departureTime} SGT → {r.arrivalTime} IST ·{" "}
                      {money(transportTotal(r))}
                    </p>
                    <p>
                      {r.aircraft || "Aircraft unverified"} · Departure
                      terminal: {r.departureTerminal || "Unverified"} · Arrival
                      terminal: {r.arrivalTerminal || "Unverified"}
                    </p>
                    <p>
                      Cabin baggage:{" "}
                      {r.cabinBaggageKg == null
                        ? "Unverified"
                        : `${r.cabinBaggageKg} kg`}{" "}
                      · Checked baggage:{" "}
                      {r.checkedBaggageKg == null
                        ? "Unverified"
                        : `${r.checkedBaggageKg} kg`}
                    </p>
                    <details>
                      <summary>Quote conditions & retained notes</summary>
                      <p>{r.notes}</p>
                    </details>
                    <button
                      className="button secondary"
                      disabled={locked || r.selectedAlternative}
                      onClick={() =>
                        updateTrip((t) => selectFlightAlternative(t, r.id))
                      }
                    >
                      {r.selectedAlternative
                        ? `${r.number} selected`
                        : `Select ${r.number}`}
                    </button>
                  </div>
                </div>
              ))}
              {locked && (
                <p>
                  Booking/payment history prevents changing this decision until
                  it is reconciled.
                </p>
              )}
            </div>
          </Panel>
        );
      })}
      {editing && (
        <Editor
          kind="fareGroups"
          title="Edit connecting ticket"
          initial={editing}
          rates={store.rates}
          onClose={() => setEditing(null)}
          onSave={(raw) => {
            const record = schemas.fareGroups.parse(raw);
            const next = {
              ...store,
              trips: store.trips.map((t) =>
                t.id === trip.id
                  ? {
                      ...t,
                      fareGroups: t.fareGroups?.map((g) =>
                        g.id === record.id ? record : g,
                      ),
                    }
                  : t,
              ),
            };
            validate(next);
            setStore(next);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}
