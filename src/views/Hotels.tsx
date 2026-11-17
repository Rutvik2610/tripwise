import { AccommodationDateWarning } from "../components/FlightPlanning";
import { ResearchUpdate } from "../components/ResearchUpdate";
import { hotelDifference } from "../lib/overview";
import { blankHotel } from "../lib/factories";
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
  hotelBreakdown,
  paymentState,
  selectHotel,
  stayKey,
} from "../lib/calc";
import { usePlanner } from "../lib/context";
import { dateLabel, safeUrl, shortDate } from "../lib/format";

export default function Hotels() {
  const {
    trip,
    summary,
    money,
    updateTrip,
    startEdit,
    editActions,
    setToast,
    hotelFocus,
    setHotelFocus,
  } = usePlanner();
  const [hotelDestination, setHotelDestination] = useState("");
  const [sort, setSort] = useState("total");
  const hotelStops = [
    ...new Set([
      ...trip.stops.map((s) => s.name),
      ...trip.hotels.map((h) => h.destination),
    ]),
  ];
  const validFocus =
    hotelFocus &&
    [
      ...trip.stops.map((s) => `${s.name.toLowerCase()}|${s.start}|${s.end}`),
      ...trip.hotels.map((h) => stayKey(h).toLowerCase()),
    ].includes(hotelFocus)
      ? hotelFocus
      : "";
  const focused = hotelStops.find(
    (d) => d.toLowerCase() === validFocus.split("|")[0],
  );
  const currentDestination =
    focused ??
    (hotelStops.includes(hotelDestination)
      ? hotelDestination
      : hotelStops.includes("Langkawi")
        ? "Langkawi"
        : (hotelStops[0] ?? ""));
  const hotelOptions = trip.hotels.filter(
    (h) => h.destination === currentDestination,
  );
  const hotelGroups = [
    ...new Set([
      ...hotelOptions.map(stayKey),
      ...trip.stops
        .filter((s) => s.name === currentDestination)
        .map((s) => `${s.name}|${s.start}|${s.end}`),
    ]),
  ]
    .sort((a, b) => a.localeCompare(b))
    .filter((key) => !validFocus || key.toLowerCase() === validFocus);
  const addHotel = () => {
    const parts = validFocus.split("|");
    const stop = trip.stops.find((s) => s.name === currentDestination);
    startEdit(
      "hotels",
      {
        ...blankHotel(),
        destination: currentDestination,
        checkIn: parts[1] || stop?.start || trip.start,
        checkOut: parts[2] || stop?.end || trip.end,
      },
      "Add hotel option",
    );
  };
  return (
    <>
      <AccommodationDateWarning />
      <ResearchUpdate />
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
              onClick={() => {
                setHotelDestination(d);
                setHotelFocus("");
              }}
            >
              {d}
            </button>
          ))}
        </div>
        <label className="hotel-sort">
          Sort hotels{" "}
          <select
            aria-label="Sort hotels"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="total">Total stay cost</option>
            <option value="nightly">Complete nightly cost</option>
            <option value="review">Review score</option>
          </select>
        </label>
        <button className="button" onClick={addHotel}>
          <Plus size={16} />
          Add hotel
        </button>
      </div>
      {hotelGroups.map((key) => {
        const [, checkIn, checkOut] = key.split("|");
        const options = hotelOptions
          .filter((h) => stayKey(h) === key)
          .sort((a, b) => {
            if (sort === "review") return (b.rating ?? -1) - (a.rating ?? -1);
            const price = (h: typeof a) => {
              const total = hotelTotal(h);
              return total === null
                ? Infinity
                : sort === "nightly"
                  ? total / (daysBetween(h.checkIn, h.checkOut) || 1)
                  : total;
            };
            return price(a) - price(b);
          });
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
            title={`${currentDestination} · ${daysBetween(checkIn, checkOut)} ${daysBetween(checkIn, checkOut) === 1 ? "night" : "nights"}`}
            sub={`${dateLabel(checkIn)} – ${dateLabel(checkOut)} · Only one selected hotel counts`}
          >
            {!options.length && (
              <Empty
                label="Selection pending for this stay"
                onAdd={() =>
                  startEdit(
                    "hotels",
                    {
                      ...blankHotel(),
                      destination: currentDestination,
                      checkIn,
                      checkOut,
                    },
                    "Add hotel option",
                  )
                }
              />
            )}
            <div className="hotel-grid">
              {options.map((h) => {
                const cost = hotelTotal(h);
                const breakdown = hotelBreakdown(h);
                const difference = hotelDifference(trip, h.id);
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
                          : money(
                              (cost ?? convert(h.nightly, h.rate)) /
                                (breakdown.nights || 1),
                            )}
                      </strong>
                      <span>{h.nightly !== null ? "/ night" : ""}</span>
                    </div>
                    {h.nightly !== null && (
                      <p className="hotel-price-detail">
                        {money(convert(h.nightly, h.rate))} displayed room /
                        night + {money(breakdown.generalTax)} separate general
                        tax per stay. Nightly headline spreads the full stay
                        total over {breakdown.nights} nights.
                      </p>
                    )}
                    {difference !== null && !h.selected && (
                      <div className="hotel-difference">
                        {difference < 0
                          ? `${money(-difference)} less than selected stay`
                          : difference > 0
                            ? `${money(difference)} more than selected stay`
                            : "Same price as selected stay"}
                      </div>
                    )}
                    <div className="hotel-facts">
                      <div>
                        <span>Total stay, incl. property charges</span>
                        <strong>
                          {cost === null ? "Unknown" : money(cost)}
                        </strong>
                      </div>
                      <div>
                        <span>Payable in person at hotel</span>
                        <strong>{money(breakdown.atProperty)}</strong>
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
                        Room: {h.nightly ?? "Pending"} {h.currency} ×{" "}
                        {breakdown.nights} nights. General tax:{" "}
                        {h.taxMode === "Included"
                          ? "already included in nightly price (not added again)"
                          : `${h.taxes} ${h.currency} added once per stay`}
                        . Tourism: {h.tourismTax}; heritage: {h.heritageTax}{" "}
                        {h.currency}{" "}
                        {h.propertyTaxBasis === "Per night"
                          ? `per night × ${breakdown.nights} nights`
                          : "for the whole stay (legacy basis retained)"}
                        . Both payable in person at the hotel. Other property
                        fees: {h.propertyFees} {h.currency} per stay.
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
        <Empty label="Find a place to call home" onAdd={addHotel} />
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
