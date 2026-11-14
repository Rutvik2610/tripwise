import { useState } from "react";
import { Plane, Info, ExternalLink } from "lucide-react";
import { usePlanner } from "../lib/context";
import { Editor } from "./Editor";
import { Panel, Badge } from "./Shared";
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
  sightseeingWindow,
  clockLabel,
  transportationTotals,
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
              The old Penang → Mumbai planning record will be retained as a
              superseded estimate. Plan Penang → Kuala Lumpur separately; no
              connecting fare or schedule is assumed.
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
export function TransitPlanning({ compact = false }: { compact?: boolean }) {
  const { trip, store, setStore, money, updateTrip, startEdit, editActions } =
    usePlanner();
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
        a.layoverId === l.id
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
  const figures = transportationTotals(trip);
  return (
    <>
      <MalaysiaPlanUpdate />
      {ticket && (
        <Panel
          title="International round-trip ticket"
          sub="One combined fare covers both directions. Individual-leg prices are unknown."
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
              Counted once, not per flight.{" "}
              {money(netPaid(ticket.paid, ticket.refunded))} net paid. Airline,
              baggage allowance, fare conditions and connection protection
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
            <div className="transit-totals">
              <span>
                International airfare{" "}
                <strong>{money(figures.international)}</strong>
              </span>
              <span>
                Domestic flights <strong>{money(figures.domestic)}</strong>
              </span>
              <span>
                Local / airport transport{" "}
                <strong>{money(figures.local)}</strong>
              </span>
              <span>
                Total transportation <strong>{money(figures.total)}</strong>
              </span>
            </div>
            <p className="transit-warning">
              Penang → Kuala Lumpur repositioning still needs confirmation and a
              price. This missing connection is not silently included in the
              quote.
            </p>
          </div>
        </Panel>
      )}
      {(trip.layovers ?? []).map((l) => {
        const mins = layoverMinutes(l),
          window = sightseeingWindow(l),
          leg = attachedLayoverLeg(trip, l),
          activity = trip.activities.find((a) => a.layoverId === l.id);
        return (
          <Panel
            key={l.id}
            title="Singapore Changi Airport — Transit Stop"
            sub="Provisional connection · not an overnight destination"
            action={
              <button
                className="text-button"
                onClick={() => setEditing({ kind: "layovers", value: l })}
              >
                Edit transit & time allowances
              </button>
            }
          >
            <div className="transit-body">
              <div className="transit-time-grid">
                <div>
                  <small>ARRIVAL · SINGAPORE LOCAL</small>
                  <strong>{l.arrivalTime || "Pending"}</strong>
                </div>
                <div>
                  <small>DEPARTURE · SINGAPORE LOCAL</small>
                  <strong>{l.departureTime || "Pending"}</strong>
                </div>
                <div>
                  <small>CONNECTION · UTC+8</small>
                  <strong>
                    {mins === null
                      ? "Pending"
                      : `${Math.floor(mins / 60)}h ${mins % 60}m`}
                  </strong>
                </div>
              </div>
              <div className="transit-facts">
                <p>
                  Date: {l.date ? shortDate(l.date) : "Confirmation pending"} ·
                  Direction:{" "}
                  {l.direction === "Unknown"
                    ? "Confirmation pending"
                    : l.direction}
                </p>
                <p>
                  Entry: {l.entry} · Baggage checked through: {l.baggage} ·
                  Protected connection: {l.protectedConnection}
                </p>
                <p>
                  Terminals: {l.arrivalTerminal || "Unknown"} →{" "}
                  {l.departureTerminal || "Unknown"} · Additional check-in:{" "}
                  {l.additionalCheckIn}
                </p>
                <p>
                  {leg
                    ? `Associated leg: ${leg.source} → ${leg.destination}`
                    : "Not attached to a flight until both date and direction are confirmed."}
                </p>
              </div>
              <div className="notice warning">
                <Info size={18} />
                <span>
                  The full layover is not sightseeing time. Leaving transit
                  requires verified entry permission. Indian citizenship and a
                  long connection do not establish Singapore visa or VFTF
                  eligibility. Jewel’s public areas are landside, so airport
                  sightseeing can also require entry permission.
                </span>
              </div>
              {activity ? (
                <section className="optional-excursion">
                  <header>
                    <h3>{activity.name}</h3>
                    <Badge>
                      {activity.includeInBudget
                        ? "Optional · included in plan"
                        : "Optional · not included"}
                    </Badge>
                  </header>
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      aria-label="Include optional Singapore sightseeing"
                      checked={activity.includeInBudget === true}
                      onChange={(e) =>
                        updateTrip((t) => ({
                          ...t,
                          activities: t.activities.map((a) =>
                            a.id === activity.id
                              ? { ...a, includeInBudget: e.target.checked }
                              : a,
                          ),
                        }))
                      }
                    />
                    Include optional excursion in this trip
                  </label>
                  <div className="transit-options">
                    <label>
                      <span>Sightseeing approach</span>
                      <select
                        aria-label="Singapore sightseeing option"
                        value={l.option}
                        onChange={(e) =>
                          updateTrip((t) => ({
                            ...t,
                            layovers: t.layovers?.map((x) =>
                              x.id === l.id
                                ? {
                                    ...x,
                                    option: e.target.value as Layover["option"],
                                  }
                                : x,
                            ),
                          }))
                        }
                      >
                        <option value="Undecided">Choose after research</option>
                        <option value="Airport">
                          Option A — Stay near airport / Jewel
                        </option>
                        <option value="City">
                          Option B — Central Singapore
                        </option>
                      </select>
                    </label>
                    <label>
                      <span>Optional excursion estimate (INR)</span>
                      <input
                        type="number"
                        min="0"
                        max="10000000"
                        aria-label="Optional layover cost"
                        placeholder="Estimate pending"
                        value={activity.costPending ? "" : activity.cost}
                        onChange={(e) =>
                          updateTrip((t) => ({
                            ...t,
                            activities: t.activities.map((a) =>
                              a.id === activity.id
                                ? {
                                    ...a,
                                    costPending: e.target.value === "",
                                    cost: Math.min(
                                      1e7,
                                      Math.max(0, Number(e.target.value)),
                                    ),
                                  }
                                : a,
                            ),
                          }))
                        }
                      />
                    </label>
                  </div>
                  <p>
                    {l.option === "City"
                      ? "Candidates: Marina Bay waterfront, Merlion Park, Gardens by the Bay outdoor areas. Choose only what fits after entry and timing are verified."
                      : l.option === "Airport"
                        ? "Candidate: Jewel Changi and nearby facilities. Verify entry/access requirements before leaving transit."
                        : "Sightseeing candidates only; no attraction has been automatically scheduled or booked."}
                  </p>
                  <p>
                    Estimated excursion:{" "}
                    {activity.costPending
                      ? "Price pending — no amount invented"
                      : money(activity.cost)}
                    .{" "}
                    {activity.includeInBudget
                      ? "Included once in the trip forecast."
                      : "Excluded from the trip forecast."}{" "}
                    Add MRT, food or tickets either here as one combined
                    estimate or as separate Expenses, not both.
                  </p>
                  {window ? (
                    <div className="usable-window">
                      <strong>
                        {window.minutes
                          ? `${clockLabel(window.start)}–${clockLabel(window.end)} · ${Math.floor(window.minutes / 60)}h ${window.minutes % 60}m estimated usable time`
                          : "No usable sightseeing time with these allowances"}
                      </strong>
                      <p>
                        Based on your manual allowances, not a confirmed
                        schedule or guarantee.{" "}
                        {window.conservativeBuffer
                          ? "Includes at least two hours of additional safety buffer."
                          : "Safety buffer is under the conservative two-hour planning safeguard; reassess using airline guidance."}
                      </p>
                    </div>
                  ) : (
                    <p className="transit-warning">
                      Sightseeing window provisional. Confirm date, direction,
                      entry, baggage, protection, check-in, terminals, option
                      and every time allowance before calculating usable time.
                    </p>
                  )}
                  {!compact && (
                    <div className="button-group">
                      <button
                        className="button secondary"
                        onClick={() =>
                          startEdit(
                            "activities",
                            activity,
                            "Edit optional layover excursion",
                          )
                        }
                      >
                        Edit excursion notes & costs
                      </button>
                      {editActions("activities", activity)}
                    </div>
                  )}
                </section>
              ) : (
                <p>
                  Optional excursion removed. The transit connection remains
                  recorded.
                </p>
              )}
              <div className="transit-sources">
                <a
                  href="https://www.ica.gov.sg/enter-transit-depart"
                  target="_blank"
                  rel="noreferrer"
                >
                  ICA: official entry, visa & transit guidance{" "}
                  <ExternalLink size={12} />
                </a>
                <a
                  href="https://www.ica.gov.sg/enter-transit-depart/entering-singapore/sg-arrival-card"
                  target="_blank"
                  rel="noreferrer"
                >
                  ICA: SG Arrival Card guidance <ExternalLink size={12} />
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
                    Your airline’s official guidance <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <p>{l.notes}</p>
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
              : "Edit provisional Singapore transit"
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
