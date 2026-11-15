import { migrateStore } from "./lib/januaryShift";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Compass,
  Download,
  GitCompareArrows,
  Info,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Menu,
  Moon,
  Pencil,
  Plane,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Editor } from "./components/Editor";
import { Actions } from "./components/Shared";
import {
  expenseTotal,
  paymentState,
  selectHotel,
  stayKey,
  totals,
} from "./lib/calc";
import type { Collection, Section } from "./lib/context";
import { PlannerContext } from "./lib/context";
import type { Hotel, Store, Trip } from "./lib/model";
import { uid } from "./lib/model";
import {
  blankActivity,
  blankCheck,
  blankExpense,
  blankHotel,
  blankTransport,
  seed,
} from "./lib/seed";
import { errorMessage, load, save, schemas, validate } from "./lib/storage";
import Checklist from "./views/Checklist";
import Comparison from "./views/Comparison";
import Dashboard from "./views/Dashboard";
import Expenses from "./views/Expenses";
import Hotels from "./views/Hotels";
import Itinerary from "./views/Itinerary";
import Settings from "./views/Settings";
import Simulator from "./views/Simulator";
import Transportation from "./views/Transportation";
import Trips from "./views/Trips";
const views: Record<Section, React.ComponentType> = {
  Overview: Dashboard,
  Expenses,
  Hotels,
  Transportation,
  Itinerary,
  "Budget simulator": Simulator,
  "Compare trips": Comparison,
  Checklist,
  "My trips": Trips,
  Settings,
};
const nav: { name: Section; icon: LucideIcon }[] = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Expenses", icon: Wallet },
  { name: "Hotels", icon: BedDouble },
  { name: "Transportation", icon: Plane },
  { name: "Itinerary", icon: CalendarDays },
  { name: "Budget simulator", icon: SlidersHorizontal },
  { name: "Compare trips", icon: GitCompareArrows },
  { name: "Checklist", icon: ListChecks },
];
export default function App() {
  const [initial] = useState(load);
  const [store, setStore] = useState<Store>(() => initial.data ?? seed());
  const [recovery, setRecovery] = useState(initial.error);
  const [saveError, setSaveError] = useState("");
  const [section, setSection] = useState<Section>("Overview");
  const [hotelFocus, setHotelFocus] = useState("");
  const [mobile, setMobile] = useState(false);
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState<{
    kind: Collection | "trip";
    value: object;
    title: string;
  } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const trip =
    store.trips.find((t) => t.id === store.activeId) ?? store.trips[0];
  const summary = totals(trip);
  const money = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: trip.homeCurrency,
      maximumFractionDigits: 0,
    }).format(n / store.rates[trip.homeCurrency]);
  useEffect(() => {
    document.documentElement.dataset.theme = store.theme;
    if (recovery) return;
    try {
      save(store);
    } catch {
      queueMicrotask(() =>
        setSaveError(
          "Changes could not be saved. Storage may be full or blocked. Export a backup now.",
        ),
      );
    }
  }, [store, recovery]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const updateTrip = (fn: (t: Trip) => Trip) =>
    setStore((s) => ({
      ...s,
      trips: s.trips.map((t) => (t.id === s.activeId ? fn(t) : t)),
    }));
  const go = (s: Section) => {
    setSection(s);
    setMobile(false);
  };
  const startEdit = (kind: Collection | "trip", value: object, title: string) =>
    setEditing({ kind, value, title });
  const add = (kind: Collection) => {
    const value =
      kind === "expenses"
        ? blankExpense()
        : kind === "hotels"
          ? blankHotel()
          : kind === "transport"
            ? blankTransport()
            : kind === "activities"
              ? blankActivity()
              : kind === "checklist"
                ? blankCheck()
                : {
                    id: uid(),
                    name: "",
                    country: "",
                    start: trip.start,
                    end: trip.end,
                  };
    if ("date" in value) value.date = trip.start;
    if ("destination" in value && kind !== "transport")
      value.destination = trip.stops[0]?.name ?? "";
    if (kind === "hotels" && "checkIn" in value) {
      const stop =
        trip.stops.find((s) => s.name === "Langkawi") ?? trip.stops[0];
      value.destination = stop?.name ?? "";
      value.checkIn = stop?.start || trip.start;
      value.checkOut = stop?.end || trip.end;
    }
    if (kind === "transport" && "departureDate" in value) {
      value.departureDate = trip.start;
      value.source = trip.departure;
      value.destination = trip.stops[0]?.name ?? "";
    }
    startEdit(
      kind,
      value,
      "Add " +
        {
          expenses: "expense",
          hotels: "hotel option",
          transport: "transport",
          activities: "activity",
          checklist: "checklist item",
          stops: "destination",
        }[kind],
    );
  };
  const remove = (kind: Collection, id: string) => {
    if (
      kind === "transport" &&
      trip.transport.find((r) => r.id === id)?.fareGroupId
    ) {
      setToast(
        "This leg belongs to a shared return ticket. Edit the leg or cancel the ticket from its card instead.",
      );
      return;
    }
    if (confirm("Delete this entry? This cannot be undone."))
      updateTrip((t) => ({ ...t, [kind]: t[kind].filter((x) => x.id !== id) }));
  };
  const duplicate = (kind: Collection, id: string) =>
    updateTrip((t) => {
      const item = t[kind].find((x) => x.id === id);
      if (
        kind === "transport" &&
        item &&
        "fareGroupId" in item &&
        item.fareGroupId
      ) {
        setToast(
          "Linked ticket legs share one fare. Add a separate transport record if you need another journey.",
        );
        return t;
      }
      return item
        ? {
            ...t,
            [kind]: [
              ...t[kind],
              {
                ...item,
                id: uid(),
                ...("selected" in item
                  ? {
                      selected: false,
                      paid: 0,
                      refunded: 0,
                      status: "Shortlisted",
                    }
                  : {}),
                ...("bookingStatus" in item
                  ? {
                      paid: 0,
                      refunded: 0,
                      bookingStatus: "Planned",
                      paymentStatus: "Unpaid",
                      reference: "",
                    }
                  : {}),
                ...(kind === "transport"
                  ? {
                      paid: 0,
                      refunded: 0,
                      status: "Researching",
                      reference: "",
                    }
                  : {}),
                ...(kind === "activities" ? { status: "Planned" } : {}),
              },
            ],
          }
        : t;
    });
  const editActions = (kind: Collection, item: { id: string }) => (
    <Actions
      onEdit={() =>
        startEdit(
          kind,
          item,
          "Edit " +
            {
              expenses: "expense",
              hotels: "hotel option",
              transport: "transport",
              activities: "activity",
              checklist: "checklist item",
              stops: "destination",
            }[kind],
        )
      }
      onCopy={() => duplicate(kind, item.id)}
      onDelete={() => remove(kind, item.id)}
    />
  );
  const saveRecord = (raw: unknown) => {
    if (!editing) return;
    const parsed = schemas[editing.kind].parse(raw);
    let next: Store;
    if (editing.kind === "trip") {
      next = {
        ...store,
        trips: store.trips.map((t) =>
          t.id === trip.id ? { ...t, ...parsed } : t,
        ),
      } as Store;
    } else {
      const kind = editing.kind;
      const collection = trip[kind];
      const record = parsed as { id: string };
      const list = collection.some((x) => x.id === record.id)
        ? collection.map((x) => (x.id === record.id ? record : x))
        : [...collection, record];
      let nextTrip = { ...trip, [kind]: list } as Trip;
      if (kind === "expenses")
        nextTrip = {
          ...nextTrip,
          expenses: nextTrip.expenses.map((e) => ({
            ...e,
            paymentStatus: paymentState(expenseTotal(e), e.paid, e.refunded),
          })),
        };
      if (kind === "hotels") {
        const h = record as Hotel;
        if (
          (h.selected || h.status === "Booked") &&
          nextTrip.hotels.some(
            (other) =>
              other.id !== h.id &&
              stayKey(other) === stayKey(h) &&
              other.status === "Booked",
          )
        )
          throw Error(
            "Cancel or change the currently booked hotel before selecting another for this stay.",
          );
        if (h.selected || h.status === "Booked")
          nextTrip = selectHotel(nextTrip, record.id);
      }
      next = {
        ...store,
        trips: store.trips.map((t) => (t.id === trip.id ? nextTrip : t)),
      };
    }
    validate(next);
    setStore(next);
    setEditing(null);
    setToast("Changes saved to this device");
  };
  const download = (raw: string, name: string) => {
    const url = URL.createObjectURL(
      new Blob([raw], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const exportData = () =>
    download(
      JSON.stringify(store, null, 2),
      `tripwise-backup-${new Date().toISOString().slice(0, 10)}.json`,
    );
  const importData = async (file: File) => {
    try {
      if (file.size > 10_000_000) throw Error("Backup exceeds 10 MB.");
      const data = validate(
        migrateStore(validate(JSON.parse(await file.text()))),
      );
      if (
        !confirm(
          "Replace all trips and settings with this backup? Export your current data first if needed.",
        )
      )
        return;
      setStore(data);
      setRecovery("");
      setSaveError("");
      setToast("Backup restored successfully");
    } catch (err) {
      setToast("Import failed: " + errorMessage(err));
    }
  };
  const headerTitles: Record<Section, [string, string]> = {
    Overview: [
      "A little planning. A great adventure.",
      "Your next chapter starts here. Let’s make every rupee count.",
    ],
    Expenses: [
      "Every rupee, accounted for.",
      "Plan confidently with estimates, bookings, and payments kept separate.",
    ],
    Hotels: [
      "Find your perfect place to stay.",
      "Compare the real cost. Choose the stay that feels right.",
    ],
    Transportation: [
      "Enjoy the journey, too.",
      "Keep every leg, fare, and connection in one place.",
    ],
    Itinerary: [
      "Make room for discovery.",
      "A thoughtful plan with plenty of space for the unexpected.",
    ],
    "Budget simulator": [
      "What if you travelled your way?",
      "Explore the possibilities before you make a booking.",
    ],
    "Compare trips": [
      "Two journeys. One good decision.",
      "Compare independent plans without losing a single detail.",
    ],
    Checklist: [
      "Good trips start with the little things.",
      "A calmer departure, one check at a time.",
    ],
    "My trips": [
      "A world of possibilities.",
      "Your plans, past adventures, and the journeys still to come.",
    ],
    Settings: [
      "Make TripWise your own.",
      "Your data stays on this device. Your journey stays yours.",
    ],
  };
  const View = views[section];
  return (
    <PlannerContext.Provider
      value={{
        hotelFocus,
        setHotelFocus,
        trip,
        summary,
        store,
        setStore,
        money,
        updateTrip,
        go,
        startEdit,
        add,
        editActions,
        exportData,
        importRef,
        recovery,
        setRecovery,
        setSaveError,
        setToast,
        download,
      }}
    >
      <div className="app-shell">
        {mobile && (
          <div className="mobile-overlay" onClick={() => setMobile(false)} />
        )}
        <aside className={"sidebar " + (mobile ? "is-open" : "")}>
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              go("Overview");
            }}
          >
            <span className="brand-mark">
              <Compass size={27} />
            </span>
            <span>
              tripwise<span className="brand-period">.</span>
            </span>
          </a>
          <div className="workspace-label">YOUR PERSONAL TRAVEL SPACE</div>
          <button className="trip-nav" onClick={() => go("My trips")}>
            <span className="trip-nav-icon">
              <MapPin size={18} />
            </span>
            <span>
              <strong>
                {trip.stops.some((s) => s.name === "Singapore")
                  ? "Malaysia + Singapore"
                  : trip.name}
              </strong>
              <small>
                {new Date(trip.start + "T12:00:00")
                  .toLocaleDateString("en-GB", {
                    month: "long",
                    year: "numeric",
                  })
                  .toUpperCase()}{" "}
                <ChevronDown size={12} />
              </small>
            </span>
          </button>
          <div className="nav-label">PLAN YOUR ADVENTURE</div>
          <nav aria-label="Main navigation">
            {nav.map(({ name, icon: Icon }) => (
              <button
                aria-label={name}
                className={section === name ? "active" : ""}
                key={name}
                onClick={() => go(name)}
              >
                <Icon size={18} />
                <span>{name}</span>
                {name === "Checklist" && (
                  <span className="nav-count">
                    {trip.checklist.filter((c) => c.status !== "Done").length}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <button
            className={
              "my-trips-nav " + (section === "My trips" ? "active" : "")
            }
            onClick={() => go("My trips")}
          >
            <Compass size={18} />
            My trips
            <ArrowUpRight size={15} />
          </button>
          <div className="sidebar-bottom">
            <div className="sidebar-note">
              <span className="little-spark">✧</span>
              <h4>
                Less guesswork.
                <br />
                More going places.
              </h4>
              <p>A thoughtful plan makes room for beautiful detours.</p>
              <button onClick={() => go("Budget simulator")}>
                Find your balance <ArrowRight size={13} />
              </button>
            </div>
            <button className="help-link" onClick={() => go("Settings")}>
              <CircleHelp size={17} />
              Settings & backups
            </button>
            <div className="profile">
              <div className="avatar">R</div>
              <div>
                <strong>Your travel space</strong>
                <small>
                  <span className="dot" />
                  Local & private
                </small>
              </div>
              <button
                className="icon-button"
                aria-label="Toggle theme"
                onClick={() =>
                  setStore((s) => ({
                    ...s,
                    theme: s.theme === "light" ? "dark" : "light",
                  }))
                }
              >
                {store.theme === "light" ? (
                  <Moon size={17} />
                ) : (
                  <Sun size={17} />
                )}
              </button>
            </div>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="mobile-menu icon-button"
                aria-label="Open navigation"
                onClick={() => setMobile(true)}
              >
                <Menu size={22} />
              </button>
              <span>My workspace</span>
              <ChevronRight size={14} />
              <strong>{section}</strong>
            </div>
            <div className="topbar-actions">
              <span className="saved-state">
                <span className="dot" />
                {saveError || recovery ? "Backup needed" : "All changes saved"}
              </span>
              <button
                className="icon-button"
                aria-label="Export backup"
                onClick={exportData}
              >
                <Download size={18} />
              </button>
              <button
                className="icon-button notification"
                aria-label="View outstanding checklist"
                onClick={() => go("Checklist")}
              >
                <Bell size={19} />
                {trip.checklist.some((c) => c.status !== "Done") && <i />}
              </button>
              <div className="top-avatar">R</div>
            </div>
          </header>
          <main>
            <div className="page-heading">
              <div>
                <span className="eyebrow">
                  {section === "Overview"
                    ? "THE WORLD IS WAITING"
                    : section.toUpperCase()}
                </span>
                <h1>{headerTitles[section][0]}</h1>
                <p>{headerTitles[section][1]}</p>
              </div>
              <div className="heading-actions">
                <select
                  aria-label="Active trip"
                  value={trip.id}
                  onChange={(e) =>
                    setStore((s) => ({ ...s, activeId: e.target.value }))
                  }
                >
                  {store.trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.archived ? "[Archived] " : ""}
                      {t.name}
                    </option>
                  ))}
                </select>
                {section === "Overview" && (
                  <button
                    className="button secondary"
                    onClick={() => startEdit("trip", trip, "Edit trip")}
                  >
                    <Pencil size={14} />
                    Edit trip
                  </button>
                )}
              </div>
            </div>
            {(saveError || recovery) && (
              <div className="error" role="alert">
                {saveError || recovery}{" "}
                <button onClick={() => go("Settings")}>
                  Backup & recovery
                </button>
              </div>
            )}
            {trip.hotels.some(
              (h) =>
                h.selected && h.status !== "Cancelled" && h.nightly === null,
            ) && (
              <div className="notice warning">
                <Info size={17} />
                <span>
                  A selected hotel has no price yet. Totals include known costs
                  only; add a quote before relying on the projected budget.
                </span>
              </div>
            )}
            <View />
            <footer className="app-footer">
              <span className="footer-brand">
                <Compass size={16} />
                tripwise.
              </span>
              <span>Made for the journey, not just the destination.</span>
              <span>
                <ShieldCheck size={13} />
                Your data stays with you
              </span>
            </footer>
          </main>
        </div>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Import JSON backup"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importData(file);
            e.target.value = "";
          }}
        />
        {editing && (
          <Editor
            key={JSON.stringify(editing.value)}
            rates={store.rates}
            title={editing.title}
            initial={editing.value}
            kind={editing.kind}
            onClose={() => setEditing(null)}
            onSave={saveRecord}
          />
        )}{" "}
        {toast && (
          <div className="toast" role="status">
            <CheckCircle2 size={18} />
            <span>{toast}</span>
            <button
              className="icon-button"
              aria-label="Dismiss message"
              onClick={() => setToast("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </PlannerContext.Provider>
  );
}
