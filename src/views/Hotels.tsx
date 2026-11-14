import {
  BedDouble,
  Check,
  ExternalLink,
  Info,
  MapPin,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { Bars } from "../components/Charts";
import { Badge, Empty, Panel } from "../components/Shared";
import {
  convert,
  daysBetween,
  hotelTotal,
  paymentState,
  selectHotel,
  stayKey,
} from "../lib/calc";
import { usePlanner } from "../lib/context";
import { dateLabel, safeUrl, shortDate } from "../lib/format";

export default function Hotels() {
  const { trip, summary, money, updateTrip, add, editActions, setToast } =
    usePlanner();
  const [hotelDestination, setHotelDestination] = useState("");
  const hotelStops = [...new Set(trip.hotels.map((h) => h.destination))];
  const currentDestination = hotelStops.includes(hotelDestination)
    ? hotelDestination
    : hotelStops.includes("Langkawi")
      ? "Langkawi"
      : (hotelStops[0] ?? "");
  const hotelOptions = trip.hotels.filter(
    (h) => h.destination === currentDestination,
  );
  const hotelGroups = [...new Set(hotelOptions.map(stayKey))];
  return (
    <>
      <div className="notice">
        <Info size={17} />
        <span>
          All seeded prices are indicative, not live quotes. Room types,
          amenities, taxes, and cancellation conditions are unverified. Blank
          scores and prices mean unknown, never zero.
        </span>
      </div>
      <div className="page-actions">
        <div className="tabs">
          {hotelStops.map((d) => (
            <button
              className={d === currentDestination ? "active" : ""}
              key={d}
              onClick={() => setHotelDestination(d)}
            >
              {d}
            </button>
          ))}
        </div>
        <button className="button" onClick={() => add("hotels")}>
          <Plus size={16} />
          Add hotel
        </button>
      </div>
      {hotelGroups.map((key) => {
        const options = hotelOptions.filter((h) => stayKey(h) === key);
        const priced = options.filter(
          (h) => hotelTotal(h) !== null && h.status !== "Cancelled",
        );
        const cheapest = priced.length
          ? Math.min(...priced.map((h) => hotelTotal(h)!))
          : null;
        const bestRating = Math.max(0, ...options.map((h) => h.rating ?? 0));
        const bestClean = Math.max(
          0,
          ...options.map((h) => h.cleanliness ?? 0),
        );
        const bestDistance = Math.min(
          Infinity,
          ...options.map((h) => h.distance ?? Infinity),
        );
        const valued = priced.filter(
          (h) => h.rating !== null && (hotelTotal(h) ?? 0) > 0,
        );
        const bestValue = Math.max(
          0,
          ...valued.map((h) => h.rating! / hotelTotal(h)!),
        );
        return (
          <Panel
            key={key}
            title={`${currentDestination} · ${daysBetween(options[0].checkIn, options[0].checkOut)} nights`}
            sub={`${dateLabel(options[0].checkIn)} – ${dateLabel(options[0].checkOut)} · Only one selected hotel counts`}
          >
            <div className="hotel-grid">
              {options.map((h) => {
                const cost = hotelTotal(h);
                return (
                  <article
                    key={h.id}
                    className={"hotel-card " + (h.selected ? "selected" : "")}
                  >
                    <div className="hotel-card-top">
                      <div className="hotel-symbol">
                        <BedDouble size={22} />
                      </div>
                      {h.selected ? (
                        <Badge tone="green">
                          <Check size={12} />
                          Selected stay
                        </Badge>
                      ) : cost !== null && cost === cheapest ? (
                        <Badge tone="sand">Lowest cost</Badge>
                      ) : (
                        <Badge>
                          {cost === null ? "Price pending" : h.status}
                        </Badge>
                      )}
                    </div>
                    <h3>{h.name}</h3>
                    <p className="muted">
                      <MapPin size={13} />
                      {h.destination} · {h.room}
                    </p>
                    <div className="hotel-price">
                      <strong>
                        {h.nightly === null
                          ? "Price pending"
                          : money(convert(h.nightly, h.rate))}
                      </strong>
                      <span>{h.nightly !== null ? "/ night" : ""}</span>
                    </div>
                    <div className="hotel-facts">
                      <div>
                        <span>True booking total</span>
                        <strong>
                          {cost === null ? "Unknown" : money(cost)}
                        </strong>
                      </div>
                      <div>
                        <span>Review / cleanliness</span>
                        <strong>
                          {h.rating ?? "—"} / {h.cleanliness ?? "—"}
                        </strong>
                      </div>
                      <div>
                        <span>Breakfast / cancellation</span>
                        <strong>
                          {h.breakfast ? "Included" : "Unverified"} /{" "}
                          {h.freeCancellation ? "Free" : "Unverified"}
                        </strong>
                      </div>
                      <div>
                        <span>Private bath / window</span>
                        <strong>
                          {h.bathroom ? "Yes" : "Unverified"} /{" "}
                          {h.window ? "Yes" : "Unverified"}
                        </strong>
                      </div>
                      <div>
                        <span>Distance to attractions</span>
                        <strong>
                          {h.distance === null
                            ? "Unverified"
                            : `${h.distance} km`}
                        </strong>
                      </div>
                      <div>
                        <span>Payment / booking</span>
                        <strong>
                          {paymentState(cost ?? 0, h.paid, h.refunded)} /{" "}
                          {h.status}
                        </strong>
                      </div>
                    </div>
                    <div className="hotel-awards">
                      {h.rating !== null && h.rating === bestRating && (
                        <Badge tone="green">Best review</Badge>
                      )}
                      {h.cleanliness !== null &&
                        h.cleanliness === bestClean && <Badge>Cleanest</Badge>}
                      {h.distance !== null && h.distance === bestDistance && (
                        <Badge>Best location</Badge>
                      )}
                      {cost !== null &&
                        h.rating !== null &&
                        cost > 0 &&
                        h.rating / cost === bestValue && (
                          <Badge tone="sand">Best value</Badge>
                        )}
                    </div>
                    <details>
                      <summary>Tax breakdown & conditions</summary>
                      <p>
                        {h.taxMode === "Included"
                          ? "General taxes included in nightly price."
                          : "General taxes separate: " +
                            h.taxes +
                            " " +
                            h.currency}
                        . Tourism: {h.tourismTax}; heritage: {h.heritageTax};
                        other property fees: {h.propertyFees} {h.currency} per
                        stay. Do not repeat included taxes.
                      </p>
                      <p>{h.notes}</p>
                      {h.cancellationDeadline && (
                        <p>
                          Cancellation deadline:{" "}
                          {dateLabel(h.cancellationDeadline)}
                        </p>
                      )}
                      {safeUrl(h.url) && (
                        <a
                          href={safeUrl(h.url)!}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Check provider <ExternalLink size={12} />
                        </a>
                      )}
                    </details>
                    <div className="hotel-footer">
                      <button
                        disabled={h.status === "Cancelled"}
                        className={"button " + (h.selected ? "secondary" : "")}
                        onClick={() => {
                          if (
                            h.status === "Booked" ||
                            trip.hotels.some(
                              (x) =>
                                x.id !== h.id &&
                                stayKey(x) === stayKey(h) &&
                                x.status === "Booked",
                            )
                          ) {
                            setToast(
                              "Cancel or change the booked hotel before changing this stay selection.",
                            );
                            return;
                          }
                          updateTrip((t) =>
                            h.selected
                              ? {
                                  ...t,
                                  hotels: t.hotels.map((x) =>
                                    x.id === h.id
                                      ? { ...x, selected: false }
                                      : x,
                                  ),
                                }
                              : selectHotel(t, h.id),
                          );
                        }}
                      >
                        {h.selected ? "Deselect" : "Select stay"}
                      </button>
                      {editActions("hotels", h)}
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="table-scroll hotel-compare-table">
              <table>
                <caption className="sr-only">
                  Compare hotels for the same stay
                </caption>
                <thead>
                  <tr>
                    <th>Hotel option</th>
                    <th>Final stay cost</th>
                    <th>Review / cleanliness</th>
                    <th>Location</th>
                    <th>Cancellation</th>
                  </tr>
                </thead>
                <tbody>
                  {options.map((h) => (
                    <tr className={h.selected ? "selected-row" : ""} key={h.id}>
                      <td>
                        {h.name}
                        {h.selected && <small>Selected stay</small>}
                      </td>
                      <td>
                        {hotelTotal(h) === null
                          ? "Pending"
                          : money(hotelTotal(h)!)}
                        {hotelTotal(h) !== null &&
                          hotelTotal(h) === cheapest && (
                            <small className="teal">Lowest cost</small>
                          )}
                      </td>
                      <td>
                        {h.rating ?? "—"} / {h.cleanliness ?? "—"}
                        {h.rating !== null && h.rating === bestRating && (
                          <small className="teal">Best review</small>
                        )}
                        {h.cleanliness !== null &&
                          h.cleanliness === bestClean && (
                            <small className="teal">Best cleanliness</small>
                          )}
                      </td>
                      <td>
                        {h.distance === null
                          ? "Unverified"
                          : `${h.distance} km`}
                        {h.distance !== null && h.distance === bestDistance && (
                          <small className="teal">Closest</small>
                        )}
                      </td>
                      <td>
                        {h.freeCancellation
                          ? "Free cancellation"
                          : "Unverified"}
                        {h.cancellationDeadline && (
                          <small>
                            Until {shortDate(h.cancellationDeadline)}
                          </small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="hotel-comparison-chart">
              <Bars
                format={money}
                data={options
                  .filter((h) => hotelTotal(h) !== null)
                  .map((h) => ({ name: h.name, estimated: hotelTotal(h) }))}
                label="Full stay cost"
              />
            </div>
          </Panel>
        );
      })}
      {!hotelOptions.length && (
        <Empty label="Find a place to call home" onAdd={() => add("hotels")} />
      )}
      <Panel
        title="Your selected accommodation"
        sub={`Total ${money(summary.hotels)} · preferred budget ${money(trip.accommodationBudget)}`}
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Hotel</th>
                <th>Destination</th>
                <th>Nights</th>
                <th>True total</th>
              </tr>
            </thead>
            <tbody>
              {trip.hotels
                .filter((h) => h.selected && h.status !== "Cancelled")
                .map((h) => (
                  <tr key={h.id}>
                    <td>{h.name}</td>
                    <td>{h.destination}</td>
                    <td>{daysBetween(h.checkIn, h.checkOut)}</td>
                    <td>
                      {hotelTotal(h) === null
                        ? "Pending"
                        : money(hotelTotal(h)!)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
