import { ArrowRight, BedDouble, SlidersHorizontal, Wallet } from "lucide-react";
import { Bars } from "../components/Charts";
import { Panel, RateInputs } from "../components/Shared";
import { simulate } from "../lib/calc";
import { usePlanner } from "../lib/context";
import type { Trip } from "../lib/model";

export default function Simulator() {
  const { trip, summary, store, setStore, money, updateTrip, go } =
    usePlanner();
  const duration = summary.days;
  const sim = simulate(trip);
  const simFields: [keyof Trip["simulation"], string, number, number][] = [
    ["nights", "Hotel nights", 0, 30],
    ["nightly", "Hotel price / night", 0, 15000],
    ["flights", "All flight fares", 0, 80000],
    ["food", "Daily food allowance", 0, 5000],
    ["transport", "Daily transport allowance", 0, 3000],
    ["attractions", "Attraction budget", 0, 40000],
    ["contingency", "Contingency %", 0, 50],
  ];
  const presets = {
    Budget: {
      nightly: 2200,
      flights: 23000,
      food: 800,
      transport: 300,
      attractions: 8000,
      contingency: 10,
    },
    Balanced: {
      nightly: 3500,
      flights: 28000,
      food: 1200,
      transport: 450,
      attractions: 15000,
      contingency: 10,
    },
    Comfortable: {
      nightly: 6500,
      flights: 40000,
      food: 2000,
      transport: 800,
      attractions: 25000,
      contingency: 15,
    },
  };
  return (
    <>
      <div className="notice">
        <SlidersHorizontal size={17} />
        <span>
          This sandbox updates instantly and saves separately from your itemized
          ledger. It never overwrites bookings or historical payments. Budget
          changes apply to this trip.
        </span>
      </div>
      <div className="simulator-grid">
        <Panel
          title="Find your travel sweet spot"
          sub="All slider inputs are in INR"
        >
          <div className="tabs sim-tabs">
            {["Budget", "Balanced", "Comfortable", "Custom"].map((p) => (
              <button
                className={trip.simulation.preset === p ? "active" : ""}
                key={p}
                onClick={() =>
                  updateTrip((t) => ({
                    ...t,
                    simulation: {
                      ...t.simulation,
                      ...(p === "Custom"
                        ? {}
                        : presets[p as keyof typeof presets]),
                      preset: p,
                    },
                  }))
                }
              >
                {p}
              </button>
            ))}
          </div>
          <label className="budget-input">
            Your total budget{" "}
            <div>
              <span>₹</span>
              <input
                aria-label="Simulation trip budget"
                type="number"
                min="0"
                max="10000000"
                value={trip.budget}
                onChange={(e) =>
                  updateTrip((t) => ({
                    ...t,
                    budget: Math.min(1e10, Math.max(0, Number(e.target.value))),
                  }))
                }
              />
            </div>
          </label>
          <div className="sliders">
            {simFields.map(([key, label, min, max]) => (
              <label key={key}>
                <div>
                  <span>{label}</span>
                  <input
                    aria-label={label}
                    type="number"
                    min={min}
                    max={key === "contingency" ? 100 : undefined}
                    value={trip.simulation[key]}
                    onChange={(e) =>
                      updateTrip((t) => ({
                        ...t,
                        simulation: {
                          ...t.simulation,
                          preset: "Custom",
                          [key]: Math.max(
                            min,
                            key === "nights"
                              ? Math.min(
                                  3650,
                                  Math.floor(Number(e.target.value)),
                                )
                              : Math.min(
                                  key === "contingency" ? 100 : 1e8,
                                  Number(e.target.value),
                                ),
                          ),
                        },
                      }))
                    }
                  />
                </div>
                <input
                  aria-label={label + " slider"}
                  type="range"
                  min={min}
                  max={Math.max(max, Number(trip.simulation[key]))}
                  step={key === "nights" || key === "contingency" ? 1 : 50}
                  value={trip.simulation[key]}
                  onChange={(e) =>
                    updateTrip((t) => ({
                      ...t,
                      simulation: {
                        ...t.simulation,
                        preset: "Custom",
                        [key]: Number(e.target.value),
                      },
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </Panel>
        <div className="sim-result">
          <section className="simulation-total">
            <span className="eyebrow">
              YOUR {trip.simulation.preset.toUpperCase()} JOURNEY
            </span>
            <h2>{money(sim.total)}</h2>
            <p>
              Estimated spending, including {trip.simulation.contingency}%
              contingency
            </p>
            <div className="sim-divider" />
            <div>
              <span>Budget remaining</span>
              <strong>{money(trip.budget - sim.total)}</strong>
            </div>
            <div>
              <span>Daily average</span>
              <strong>{money(sim.total / duration)}</strong>
            </div>
            <div>
              <span>Difference from itemized plan</span>
              <strong>{money(sim.total - summary.estimated)}</strong>
            </div>
            <div className="track">
              <span
                style={{
                  width:
                    Math.min(100, (sim.total / (trip.budget || 1)) * 100) + "%",
                }}
              />
            </div>
            <p>
              {sim.total > trip.budget
                ? "Try reducing nightly accommodation or flight costs."
                : "Your plan fits. Leave some headroom for discovery."}
            </p>
          </section>
          <Panel title="The biggest opportunities">
            <div className="insight-list">
              <div>
                <BedDouble size={20} />
                <p>
                  Reducing your hotel rate by ₹500 saves{" "}
                  {money(trip.simulation.nights * 500)} before contingency.
                </p>
              </div>
              <div>
                <Wallet size={20} />
                <p>
                  Reducing daily food spending by ₹200 saves{" "}
                  {money(duration * 200)} across {duration} days.
                </p>
              </div>
            </div>
          </Panel>
          <Panel
            title="Currency assumptions"
            sub="Illustrative manual rates, not live market data"
          >
            <RateInputs
              rates={store.rates}
              onChange={(currency, rate) =>
                setStore((s) => ({
                  ...s,
                  rates: { ...s.rates, [currency]: rate },
                }))
              }
            />
            <button className="text-button" onClick={() => go("Settings")}>
              Manage converter & estimate recalculation <ArrowRight size={15} />
            </button>
          </Panel>
        </div>
      </div>
      <Panel
        title="How the options compare"
        sub="Same trip duration and hotel nights, different spending styles"
      >
        <Bars
          format={money}
          data={Object.entries(presets)
            .map(([name, p]) => ({
              name,
              estimated: simulate({
                ...trip,
                simulation: { ...trip.simulation, ...p },
              }).total,
            }))
            .concat({ name: "Your scenario", estimated: sim.total })}
        />
      </Panel>
    </>
  );
}
