import { blankExpense } from "../lib/factories";
import { singaporeSuggestedSchedule } from "../lib/singaporeSchedule";
import { useState } from "react";
import { Plane, Info, ExternalLink } from "lucide-react";
import { usePlanner } from "../lib/context";
import { Editor } from "./Editor";
import { Panel } from "./Shared";
import { convert, paymentState, netPaid } from "../lib/calc";
import { schemas, validate } from "../lib/storage";
import type { FareGroup, Layover } from "../lib/model";
import { safeUrl, shortDate } from "../lib/format";
import {
  applyMalaysiaPlan,
  isMalaysiaOnly,
  malaysiaPlanReview,
  roundTripTicket,
  layoverMinutes,
  attachedLayoverLeg,
} from "../lib/transit";
export function MalaysiaPlanUpdate() {
  const { trip, updateTrip, money, editActions } = usePlanner();
  const [open, setOpen] = useState(false);
  if (!isMalaysiaOnly(trip)) return null;
  const r = malaysiaPlanReview(trip);
  if (r.ticket && trip.layovers?.length) return null;
  return (
    <Panel
      title="Malaysia-only return ticket & Singapore transit"
      sub="Provisional ₹35,550 combined return airfare · no Singapore hotel nights"
      action={
        <button className="button secondary" onClick={() => setOpen(!open)}>
          {open ? "Close review" : "Review Malaysia flight update"}
        </button>
      }
    >
      {open && (
        <div className="transit-body">
          <p>
            Replace only untouched, unpaid international planning fares with one
            Mumbai ↔ Kuala Lumpur ticket. Both directions share {money(35550)}{" "}
            once, without allocating it to legs. Domestic flights, hotels and
            the other scenario remain unchanged.
          </p>
          {r.oldReturn && (
            <p>
              Obsolete unpaid Penang → Mumbai estimates are removed by the
              Malaysia itinerary correction. Actual booking and payment history
              remains protected.
            </p>
          )}
          {r.protectedRecords.length > 0 && (
            <div className="notice warning">
              Paid, booked, cancelled, referenced or already-linked records are
              protected. The ticket cannot be applied automatically.
            </div>
          )}
          {r.ambiguous && (
            <div className="notice warning">
              Multiple matching legs need manual reconciliation; no new ticket
              will be added.
            </div>
          )}
          {[...r.protectedRecords, ...r.needsReview].map((f) => (
            <div className="transit-review" key={f.id}>
              <span>
                {f.source} → {f.destination} ·{" "}
                {f.departureDate || "Date pending"}
              </span>
              {editActions("transport", f)}
            </div>
          ))}
          <div className="button-group">
            <button
              className="button"
              onClick={() => updateTrip((t) => applyMalaysiaPlan(t))}
            >
              {r.canApply
                ? "Apply round-trip & transit plan"
                : "Add provisional transit details only"}
            </button>
            {!r.ticket &&
              !r.ambiguous &&
              !r.protectedRecords.length &&
              r.needsReview.length > 0 && (
                <button
                  className="button secondary"
                  onClick={() => {
                    if (
                      confirm(
                        "Replace these unpaid provisional international fares with the combined return quote? Paid/booked records stay protected. The old Penang return estimate is retained as superseded history.",
                      )
                    )
                      updateTrip((t) => applyMalaysiaPlan(t, true));
                  }}
                >
                  Use quote after reviewing unpaid fares
                </button>
              )}
          </div>
        </div>
      )}
    </Panel>
  );
}
export function TransitPlanning({
  view = "transportation",
}: {
  view?: "transportation" | "itinerary" | "overview";
}) {
  const { trip, store, setStore, money, startEdit, go } = usePlanner();
  const [editing, setEditing] = useState<{
    kind: "fareGroups" | "layovers";
    value: FareGroup | Layover;
  } | null>(null);
  const ticket = roundTripTicket(trip);
  const save = (raw: unknown) => {
    if (!editing) return;
    const parsed = schemas[editing.kind].parse(raw) as FareGroup | Layover;
    const nextTrip = {
      ...trip,
      [editing.kind]: (trip[editing.kind] ?? []).map((r) =>
        r.id === parsed.id ? parsed : r,
      ),
    };
    if (editing.kind === "layovers") {
      const l = parsed as Layover;
      nextTrip.activities = nextTrip.activities.map((a) =>
        a.layoverId === l.id && !a.retiredTransit
          ? { ...a, date: attachedLayoverLeg(nextTrip, l) ? l.date : "" }
          : a,
      );
    }
    const next = {
      ...store,
      trips: store.trips.map((t) => (t.id === trip.id ? nextTrip : t)),
    };
    validate(next);
    setStore(next);
    setEditing(null);
  };
  return (
    <>
      {view === "transportation" && <MalaysiaPlanUpdate />}
      {view === "transportation" && ticket && (
        <Panel
          title="International round-trip ticket"
          sub="One combined fare covers both directions; individual-leg prices are unknown."
          action={
            <button
              className="text-button"
              onClick={() => setEditing({ kind: "fareGroups", value: ticket })}
            >
              Edit ticket & payments
            </button>
          }
        >
          <div className="transit-body">
            <div className="ticket-head">
              <Plane size={23} />
              <div>
                <h3>{ticket.name}</h3>
                <p>
                  {ticket.passengers} adult · {ticket.cabin} · {ticket.status} /{" "}
                  {paymentState(
                    convert(ticket.amount, ticket.rate),
                    ticket.paid,
                    ticket.refunded,
                  )}
                </p>
              </div>
              <strong data-testid="return-ticket-total">
                {money(convert(ticket.amount, ticket.rate))}
              </strong>
            </div>
            <p>
              <strong>{ticket.quoteStatus}</strong>
            </p>
            <p>
              Fare counted once, not per direction.{" "}
              {money(netPaid(ticket.paid, ticket.refunded))} net paid. Airline,
              allowance, fare conditions and connection protection remain
              unverified.
            </p>
            <div className="ticket-legs">
              {trip.transport
                .filter((t) => t.fareGroupId === ticket.id)
                .map((t) => (
                  <div key={t.id}>
                    <strong>
                      {t.source} → {t.destination}
                    </strong>
                    <span>
                      {t.departureDate
                        ? shortDate(t.departureDate)
                        : "Date pending"}{" "}
                      · Included in ticket — allocation unknown
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </Panel>
      )}
      {(trip.layovers ?? []).map((l) => {
        const duration = layoverMinutes(l),
          leg = attachedLayoverLeg(trip, l),
          retained = trip.expenses.filter((e) => e.layoverId === l.id);
        if (l.connectionOnly && view === "transportation") return null;
        if (l.connectionOnly || l.needsReconfirmation)
          return (
            <Panel
              key={l.id}
              title={
                l.connectionOnly
                  ? "Singapore Changi (SIN) — outbound connection"
                  : "Singapore return transit — reconfirmation required"
              }
              sub={
                l.connectionOnly
                  ? "24 January 2027 · user flight-search details"
                  : "Old schedule is not verified for the new travel window"
              }
              action={
                <button
                  className="text-button"
                  onClick={() => setEditing({ kind: "layovers", value: l })}
                >
                  Edit transit details
                </button>
              }
            >
              <div className="transit-body">
                <p>
                  {l.connectionOnly
                    ? `Arrival ${l.arrivalTime} · Connecting departure ${l.departureTime} · 4h 30m · UTC+8`
                    : "Exact date, flight schedule, connection time and terminal details need reconfirmation. The old 08:15–18:50 connection is not a verified new-date schedule."}
                </p>
                {l.connectionOnly && (
                  <p>
                    Arrival terminal: Unverified (screenshot Terminal 0 is not
                    valid confirmation) · Departure terminal:{" "}
                    {l.departureTerminal || "Unverified"}
                  </p>
                )}
                <p>{l.notes}</p>
              </div>
            </Panel>
          );
        return (
          <Panel
            key={l.id}
            title="Singapore Changi Airport — Transit Stop"
            sub={
              trip.january2027Shift === 1
                ? "Transit / sightseeing only · no overnight stay · Provisional schedule, not independently reverified"
                : "Transit / sightseeing only · no overnight stay"
            }
            action={
              <button
                className="text-button"
                onClick={() => setEditing({ kind: "layovers", value: l })}
              >
                Edit transit details
              </button>
            }
          >
            <div className="transit-body compact-transit">
              <div className="transit-time-grid">
                <div>
                  <small>ARRIVAL · UTC+8</small>
                  <strong>{l.arrivalTime || "Pending"}</strong>
                </div>
                <div>
                  <small>DEPARTURE · UTC+8</small>
                  <strong>{l.departureTime || "Pending"}</strong>
                </div>
                <div>
                  <small>LAYOVER · SINGAPORE LOCAL</small>
                  <strong>
                    {duration === null
                      ? "Pending"
                      : `${Math.floor(duration / 60)}h ${duration % 60}m`}
                  </strong>
                </div>
              </div>
              <p>
                <strong>Entry status:</strong> {l.entry} ·{" "}
                <strong>Sightseeing plan:</strong> Marina Bay / Merlion Park
                (suggested)
              </p>
              <p>
                Date: {l.date ? shortDate(l.date) : "Confirmation pending"} ·
                Direction:{" "}
                {l.direction === "Unknown"
                  ? "Confirmation pending"
                  : l.direction}
              </p>
              <div className="notice warning transit-entry-warning">
                <Info size={17} />
                <span>
                  Leaving transit requires valid Singapore entry permission;
                  Indian citizenship or a long layover does not establish
                  visa/VFTF eligibility. Plan to return around 15:30, verify
                  airline requirements and actual timings, and allow extra time
                  when needed. Jewel is landside and is not an airside fallback.
                  {l.arrivalTime !== "08:15" || l.departureTime !== "18:50"
                    ? " Connection times have changed; reassess the suggested schedule below."
                    : ""}
                </span>
              </div>
              {l.entry === "Not permitted" ? (
                <p className="airside-fallback">
                  <strong>
                    Remain airside at Changi Airport and use available
                    transit-area facilities.
                  </strong>
                </p>
              ) : (
                <details className="suggested-transit">
                  <summary>
                    Suggested schedule — conditional on entry permission and
                    actual flight timings
                  </summary>
                  <p>
                    Planning allowances for an 08:15–18:50 connection. No entry
                    permission, flight date, journey direction, reservation, or
                    travel duration is guaranteed.
                  </p>
                  <ol>
                    {singaporeSuggestedSchedule.map((row) => (
                      <li key={row.time}>
                        <span>{row.time}</span>
                        <div>
                          <h4>{row.title}</h4>
                          <p>{row.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <p>
                    <strong>If entry is not permitted:</strong> Remain airside
                    at Changi Airport and use available transit-area facilities.
                  </p>
                </details>
              )}
              <details className="transit-confirmations">
                <summary>Connection details & official guidance</summary>
                <p>
                  {leg
                    ? `Associated leg: ${leg.source} → ${leg.destination}`
                    : "Not attached to a flight until both date and direction are confirmed."}
                </p>
                <p>
                  Baggage checked through: {l.baggage} · Protected connection:{" "}
                  {l.protectedConnection} · Extra check-in:{" "}
                  {l.additionalCheckIn}
                </p>
                <p>
                  Terminals: {l.arrivalTerminal || "Unknown"} →{" "}
                  {l.departureTerminal || "Unknown"}
                </p>
                <div className="transit-sources">
                  <a
                    href="https://www.ica.gov.sg/enter-transit-depart"
                    target="_blank"
                    rel="noreferrer"
                  >
                    ICA: entry, visa & transit guidance{" "}
                    <ExternalLink size={12} />
                  </a>
                  <a
                    href="https://www.ica.gov.sg/enter-transit-depart/entering-singapore/sg-arrival-card"
                    target="_blank"
                    rel="noreferrer"
                  >
                    ICA: SG Arrival Card <ExternalLink size={12} />
                  </a>
                  <a
                    href="https://www.changiairport.com/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Changi Airport guidance <ExternalLink size={12} />
                  </a>
                  {safeUrl(l.airlineUrl) && (
                    <a
                      href={safeUrl(l.airlineUrl)!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Your airline’s official guidance{" "}
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <p>{l.notes}</p>
              </details>
              <div className="transit-expense-link">
                <p>
                  Plan MRT, taxi, meal or attraction costs in Expenses. No
                  prices are assumed.
                  {retained.length
                    ? ` ${retained.length} existing transit cost record(s) retained there.`
                    : ""}
                </p>
                <button className="text-button" onClick={() => go("Expenses")}>
                  View transit costs in Expenses
                </button>
                <button
                  className="text-button"
                  onClick={() =>
                    startEdit(
                      "expenses",
                      {
                        ...blankExpense(),
                        destination: "Singapore (transit only)",
                        date: l.date,
                        description: "Singapore transit — ",
                        category: "Local transportation",
                        layoverId: l.id,
                        includeInBudget: true,
                      },
                      "Add transit expense",
                    )
                  }
                >
                  Add planning expense
                </button>
              </div>
            </div>
          </Panel>
        );
      })}
      {editing && (
        <Editor
          key={editing.value.id}
          title={
            editing.kind === "fareGroups"
              ? "Edit shared round-trip ticket"
              : "Edit Singapore transit details"
          }
          kind={editing.kind}
          initial={editing.value}
          rates={store.rates}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </>
  );
}
