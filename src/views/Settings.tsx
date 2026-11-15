import {
  ArrowRight,
  Download,
  Moon,
  RotateCcw,
  Sun,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { Panel, RateInputs } from "../components/Shared";
import { usePlanner } from "../lib/context";
import type { Currency } from "../lib/model";
import { seed } from "../lib/seed";
import { storageKey } from "../lib/storage";

export default function Settings() {
  const {
    store,
    setStore,
    updateTrip,
    exportData,
    importRef,
    recovery,
    setRecovery,
    setSaveError,
    setToast,
    download,
  } = usePlanner();
  const [converter, setConverter] = useState({
    amount: 100,
    from: "MYR" as Currency,
    to: "INR" as Currency,
  });
  const recalculate = () => {
    if (
      !confirm(
        "Update exchange rates on unbooked, unpaid planning records in this trip? Booked records and historical payments stay unchanged.",
      )
    )
      return;
    updateTrip((t) => ({
      ...t,
      ...(t.fareGroups
        ? {
            fareGroups: t.fareGroups.map((g) =>
              g.status !== "Booked" && g.paid === 0
                ? { ...g, rate: store.rates[g.currency] }
                : g,
            ),
          }
        : {}),
      expenses: t.expenses.map((e) =>
        e.bookingStatus !== "Booked" && e.paid === 0
          ? { ...e, rate: store.rates[e.currency] }
          : e,
      ),
      hotels: t.hotels.map((h) =>
        h.status !== "Booked" && h.paid === 0
          ? { ...h, rate: store.rates[h.currency] }
          : h,
      ),
      transport: t.transport.map((x) =>
        x.status !== "Booked" && x.paid === 0
          ? { ...x, rate: store.rates[x.currency] }
          : x,
      ),
    }));
    setToast("Unbooked, unpaid estimates recalculated");
  };
  return (
    <>
      <div className="two-col">
        <Panel
          title="Currency, without the guesswork"
          sub="Manual illustrative rates · 1 foreign unit in INR"
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
          <p className="settings-note">
            These defaults are illustrations, not live rates. Each record keeps
            its own exchange rate. Updating these rates does not silently
            rewrite your bookings or payments.
          </p>
          <button className="button secondary" onClick={recalculate}>
            <RotateCcw size={15} />
            Recalculate unpaid planning estimates
          </button>
        </Panel>
        <Panel
          title="A handy little converter"
          sub="Uses your manually entered rates"
        >
          <label className="converter-amount">
            Amount
            <input
              type="number"
              min="0"
              max="100000000"
              value={converter.amount}
              onChange={(e) =>
                setConverter({
                  ...converter,
                  amount: Math.max(0, Number(e.target.value)),
                })
              }
            />
          </label>
          <div className="converter-pair">
            <select
              aria-label="Convert from"
              value={converter.from}
              onChange={(e) =>
                setConverter({ ...converter, from: e.target.value as Currency })
              }
            >
              {Object.keys(store.rates).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <ArrowRight size={20} />
            <select
              aria-label="Convert to"
              value={converter.to}
              onChange={(e) =>
                setConverter({ ...converter, to: e.target.value as Currency })
              }
            >
              {Object.keys(store.rates).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <strong className="conversion-result">
            {new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: converter.to,
            }).format(
              (converter.amount * store.rates[converter.from]) /
                store.rates[converter.to],
            )}
          </strong>
        </Panel>
        <Panel
          title="Your plans, safely in your hands"
          sub="Versioned JSON backup & restoration"
        >
          <div className="settings-buttons">
            <button className="button" onClick={exportData}>
              <Download size={16} />
              Export all trips
            </button>
            <button
              className="button secondary"
              onClick={() => importRef.current?.click()}
            >
              <Upload size={16} />
              Import backup
            </button>
          </div>
          <p className="settings-note">
            Automatic saving is local to this browser. Export regularly,
            especially before clearing browser storage or switching devices.
            Backups include booking references and notes; store them privately.
            Imports are validated before replacing data.
          </p>
          {recovery && (
            <button
              className="button secondary"
              onClick={() =>
                download(
                  localStorage.getItem(storageKey) ?? "{}",
                  "tripwise-recovery.json",
                )
              }
            >
              Download raw recovery copy
            </button>
          )}
        </Panel>
        <Panel
          title="A fresh start"
          sub="Replace browser trips and settings with the latest published snapshot"
        >
          <p className="settings-note">
            This permanently replaces your local plans. Export a backup first.
            No bookings are made or changed with any provider.
          </p>
          <button
            className="button danger"
            onClick={() => {
              if (
                confirm(
                  "Reset ALL trips, expenses, and settings? This cannot be undone.",
                )
              ) {
                setRecovery("");
                setStore(seed());
                setSaveError("");
                setToast("Published data restored");
              }
            }}
          >
            <RotateCcw size={16} />
            Reset to published data
          </button>
        </Panel>
      </div>
      <Panel title="About this little travel companion">
        <p className="settings-note">
          TripWise is a private, account-free planning tool. It stores data in
          your browser and makes no bookings. The app shell is cached for
          offline use after your first production visit; offline availability
          depends on browser storage. All demo amounts and activities are
          editable. Verify prices, schedules, entry requirements, and booking
          conditions independently.
        </p>
        <button
          className="button secondary"
          onClick={() =>
            setStore((s) => ({
              ...s,
              theme: s.theme === "light" ? "dark" : "light",
            }))
          }
        >
          {store.theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          Switch to {store.theme === "light" ? "dark" : "light"} theme
        </button>
      </Panel>
    </>
  );
}
