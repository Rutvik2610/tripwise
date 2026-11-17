import { AccommodationDateWarning } from "./FlightPlanning";
import { Plane, BedDouble, Wallet, ArrowUpRight } from "lucide-react";
import { usePlanner } from "../lib/context";
import { costOverview } from "../lib/overview";
import { shortDate } from "../lib/format";
import { Panel, Badge } from "./Shared";
export function CostOverview() {
  const { trip, money, go, startEdit } = usePlanner();
  const s = costOverview(trip);
  return (
    <section className="cost-overview" aria-label="Trip cost summary">
      <AccommodationDateWarning />
      <div className="cost-headline">
        <div className="cost-primary">
          <span className="eyebrow">
            TRIP COST OVERVIEW · {trip.homeCurrency}
          </span>
          <h2>Total projected trip cost</h2>
          <strong data-testid="total-trip-cost">{money(s.estimated)}</strong>
          <p>
            {money(s.estimated / s.days)} per day · {s.days} days / {s.nights}{" "}
            hotel nights
          </p>
          <small>
            {s.complete
              ? "Includes your selected accommodation."
              : "Known costs only — accommodation incomplete."}{" "}
            Estimates include payments; payments are never added a second time.
          </small>
        </div>
        <div className={"cost-budget " + (s.remaining < 0 ? "over" : "under")}>
          <span>
            {s.remaining < 0 ? "OVER BUDGET" : "TRIP BUDGET REMAINING"}
          </span>
          <strong data-testid="remaining-budget">
            {money(Math.abs(s.remaining))}
          </strong>
          <p>
            Budget {money(trip.budget)} − projected {money(s.estimated)}
          </p>
          <button
            className="text-button"
            onClick={() => startEdit("trip", trip, "Edit trip budget")}
          >
            Edit budget <ArrowUpRight size={14} />
          </button>
          <small>Stretch budget {money(trip.stretch)}</small>
        </div>
      </div>
      <div className="financial-summary-grid">
        <div>
          <span>Total paid</span>
          <strong data-testid="total-paid">{money(s.paid)}</strong>
          <small>Actual payments, net of refunds</small>
        </div>
        <div>
          <span>Remaining forecast spending</span>
          <strong data-testid="remaining-forecast">
            {money(s.remainingForecast)}
          </strong>
          <small>Projected cost minus net payments</small>
        </div>
        <div>
          <span>Confirmed but unpaid</span>
          <strong data-testid="confirmed-unpaid">{money(s.unpaid)}</strong>
          <small>A subset of remaining forecast spending</small>
        </div>
      </div>
      <div className="cost-breakdown">
        <button onClick={() => go("Transportation")} className="cost-detail">
          <span>
            <Plane size={18} />
            Flights
          </span>
          <strong data-testid="flights-total">{money(s.flights)}</strong>
          <p>{s.flightCount} active planned flights</p>
          <small>
            Booked {money(s.bookedFlights)} · Unbooked / retained costs{" "}
            {money(s.unbookedFlights)}
          </small>
        </button>
        <button onClick={() => go("Hotels")} className="cost-detail">
          <span>
            <BedDouble size={18} />
            Selected Hotels
          </span>
          <strong data-testid="selected-hotels-total">
            {money(s.selectedHotels)}
          </strong>
          <p>
            {s.nights} nights · {s.selectedStays} stays selected · {s.pending}{" "}
            pending
          </p>
          <small>
            {s.selectedStays === 0
              ? "No hotel selected yet"
              : s.complete
                ? "Selected full stay prices, including property charges."
                : "Select and price each stay to complete your accommodation estimate."}
          </small>
        </button>
        <button onClick={() => go("Expenses")} className="cost-detail">
          <span>
            <Wallet size={18} />
            Other projected costs
          </span>
          <strong data-testid="other-expenses-total">{money(s.other)}</strong>
          <p>Expenses module + itinerary activities + retained costs</p>
          <small>
            Excludes flights and selected hotels.
            {s.retainedHotelCosts > 0
              ? ` Includes ${money(s.retainedHotelCosts)} in hotel expenses or retained historical costs.`
              : ""}
          </small>
        </button>
      </div>
      <div className="flight-hotel-subtotal">
        <div>
          <span>Flights + Hotels</span>
          <strong data-testid="flights-hotels-total">
            {money(s.flightsAndHotels)}
          </strong>
        </div>
        <Badge tone={s.complete ? "green" : "sand"}>
          {s.complete
            ? "Selected accommodation included"
            : "Partial — accommodation incomplete"}
        </Badge>
        <p>
          {money(s.flights)} flights + {money(s.selectedHotels)} selected hotels
          + {money(s.other)} other expenses = {money(s.estimated)} projected
          total
        </p>
      </div>
      {!s.complete && (
        <div className="cost-warning" role="status">
          {s.stays.length
            ? `Accommodation estimate incomplete: ${s.pending} ${s.pending === 1 ? "stay needs" : "stays need"} a selected, priced hotel.`
            : "Add your stay destinations and dates to complete the accommodation estimate."}{" "}
          Unselected research alternatives are excluded.
        </div>
      )}
    </section>
  );
}
export function StaySummary() {
  const { trip, money, go, setHotelFocus } = usePlanner();
  const s = costOverview(trip);
  return (
    <Panel
      title="Accommodation stay summary"
      sub="Only selected hotels contribute to the active stay estimate. Research alternatives stay separate."
    >
      <div className="table-scroll stay-table">
        <table>
          <thead>
            <tr>
              <th>Stay</th>
              <th>Dates</th>
              <th>Nights</th>
              <th>Selected hotel</th>
              <th>Estimated cost</th>
              <th>Compare</th>
            </tr>
          </thead>
          <tbody>
            {s.stays.map((stay) => (
              <tr key={stay.key}>
                <td>{stay.destination}</td>
                <td>
                  {shortDate(stay.start)} – {shortDate(stay.end)}
                </td>
                <td>{stay.nights}</td>
                <td>{stay.selected?.name ?? "Selection pending"}</td>
                <td>{stay.total === null ? "Pending" : money(stay.total)}</td>
                <td>
                  <button
                    className="text-button"
                    onClick={() => {
                      setHotelFocus(stay.key);
                      go("Hotels");
                    }}
                  >
                    Compare alternatives <ArrowUpRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="stay-mobile-cards">
        {s.stays.map((stay) => (
          <article key={stay.key}>
            <header>
              <strong>{stay.destination}</strong>
              <span>{stay.total === null ? "Pending" : money(stay.total)}</span>
            </header>
            <p>
              {shortDate(stay.start)} – {shortDate(stay.end)} · {stay.nights}{" "}
              nights
            </p>
            <h4>{stay.selected?.name ?? "Selection pending"}</h4>
            <button
              className="text-button"
              onClick={() => {
                setHotelFocus(stay.key);
                go("Hotels");
              }}
            >
              Compare alternatives <ArrowUpRight size={14} />
            </button>
          </article>
        ))}
      </div>
      {!s.stays.length && (
        <p className="settings-note">
          Add your destinations and stay dates in the itinerary to plan
          accommodation.
        </p>
      )}
    </Panel>
  );
}
