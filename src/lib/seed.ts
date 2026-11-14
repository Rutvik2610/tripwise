import type {
  Activity,
  CheckItem,
  Expense,
  Hotel,
  Store,
  Transport,
  Trip,
} from "./model";
import { uid } from "./model";
export const blankExpense = (): Expense => ({
  id: uid(),
  description: "",
  destination: "Kuala Lumpur",
  category: "Food",
  date: "2027-01-18",
  currency: "INR",
  amount: 0,
  rate: 1,
  paid: 0,
  refunded: 0,
  paymentStatus: "Unpaid",
  bookingStatus: "Planned",
  refundable: false,
  reference: "",
  vendor: "",
  url: "",
  notes: "",
  receipt: "",
});
export const blankHotel = (): Hotel => ({
  id: uid(),
  name: "",
  destination: "Langkawi",
  checkIn: "2027-01-21",
  checkOut: "2027-01-24",
  room: "Unverified",
  currency: "INR",
  rate: 1,
  nightly: null,
  taxes: 0,
  tourismTax: 0,
  heritageTax: 0,
  propertyFees: 0,
  taxMode: "Included",
  breakfast: false,
  freeCancellation: false,
  cancellationDeadline: "",
  bathroom: false,
  window: false,
  rating: null,
  cleanliness: null,
  distance: null,
  website: "",
  url: "",
  notes:
    "Indicative price. Room, taxes, amenities and booking conditions unverified; confirm with provider.",
  status: "Shortlisted",
  selected: false,
  paid: 0,
  refunded: 0,
});
export const blankTransport = (): Transport => ({
  id: uid(),
  source: "",
  destination: "",
  departureDate: "2027-01-18",
  departureTime: "",
  arrivalDate: "",
  arrivalTime: "",
  mode: "International flight",
  provider: "",
  number: "",
  departureTerminal: "",
  arrivalTerminal: "",
  currency: "INR",
  rate: 1,
  fare: 0,
  taxes: 0,
  baggage: 0,
  seat: 0,
  refundable: false,
  reference: "",
  url: "",
  status: "Researching",
  paid: 0,
  refunded: 0,
  notes: "Provisional fare; schedule and connection protection unverified.",
});
export const blankActivity = (): Activity => ({
  id: uid(),
  name: "",
  date: "2027-01-18",
  start: "",
  end: "",
  destination: "Kuala Lumpur",
  category: "Sightseeing",
  cost: 0,
  bookingRequired: false,
  transport: "",
  notes: "Provisional activity; illustrative price, not booked.",
  status: "Planned",
});
export const blankCheck = (): CheckItem => ({
  id: uid(),
  title: "",
  status: "To do",
  priority: "Medium",
  due: "",
  notes: "",
  related: "",
});
const activityGroups: Record<string, [string, number, string][]> = {
  "Kuala Lumpur": [
    ["Petronas Twin Towers", 2200, "Sightseeing"],
    ["Batu Caves", 300, "Culture"],
    ["KL Tower", 1500, "Sightseeing"],
    ["Merdeka Square", 0, "Culture"],
    ["Central Market", 0, "Shopping"],
    ["Chinatown", 0, "Food"],
    ["Optional Melaka day trip", 2500, "Culture"],
  ],
  Langkawi: [
    ["SkyCab", 1800, "Adventure"],
    ["SkyBridge", 300, "Nature"],
    ["Oriental Village", 0, "Sightseeing"],
    ["Umgawa ziplining", 6500, "Adventure"],
    ["Guided ATV adventure", 3000, "Adventure"],
    ["Pantai Cenang", 0, "Relaxation"],
    ["Pantai Tengah", 0, "Relaxation"],
    ["Optional introductory scuba diving", 6500, "Adventure"],
    ["Optional mangrove boat excursion", 2200, "Nature"],
  ],
  Singapore: [
    ["Gardens by the Bay", 3000, "Nature"],
    ["Marina Bay Sands SkyPark", 2300, "Sightseeing"],
    ["Merlion Park", 0, "Sightseeing"],
    ["Chinatown", 0, "Culture"],
    ["Little India", 0, "Culture"],
    ["Kampong Glam", 0, "Culture"],
    ["Sentosa", 1200, "Relaxation"],
    ["Singapore Cable Car", 2200, "Sightseeing"],
    ["Universal Studios Singapore", 6000, "Adventure"],
    ["Jewel Changi Airport", 0, "Sightseeing"],
  ],
  Penang: [
    ["George Town heritage walk", 0, "Culture"],
    ["Penang Hill", 700, "Nature"],
    ["Kek Lok Si Temple", 300, "Culture"],
    ["Street food trail", 800, "Food"],
  ],
};
export function makeTrip(malaysia = false): Trip {
  const destinations = [
    "Kuala Lumpur",
    "Langkawi",
    malaysia ? "Penang" : "Singapore",
  ];
  const t: Trip = {
    id: uid(),
    name: malaysia
      ? "Malaysia only · Three islands & cities"
      : "Malaysia + Singapore Solo Trip 2027",
    departure: "Mumbai, India",
    start: "2027-01-18",
    end: "2027-01-28",
    travellers: 1,
    homeCurrency: "INR",
    budget: 100000,
    stretch: 125000,
    accommodationBudget: 35000,
    status: "Planning",
    archived: false,
    stops: destinations.map((name, i) => ({
      id: uid(),
      name,
      country: name === "Singapore" ? "Singapore" : "Malaysia",
      start: ["2027-01-18", "2027-01-21", "2027-01-24"][i],
      end: ["2027-01-21", "2027-01-24", "2027-01-28"][i],
    })),
    expenses: [],
    hotels: [],
    transport: [],
    activities: [],
    checklist: [],
    simulation: {
      preset: "Balanced",
      nights: 10,
      nightly: 3500,
      flights: 25000,
      food: 1200,
      transport: 450,
      attractions: 15000,
      contingency: 10,
    },
  };
  t.hotels = [
    {
      ...blankHotel(),
      name: "Kuala Lumpur · accommodation allowance",
      destination: "Kuala Lumpur",
      checkIn: "2027-01-18",
      checkOut: "2027-01-21",
      nightly: 2500,
      selected: true,
    },
    ...[
      "Nadias Hotel Cenang",
      "Malibest Resort",
      "Best Star Resort",
      "Century Langkasuka Resort",
      "Wings by Croske Resort",
      "Bed Attitude Hostel Cenang",
    ].map((name, i) => ({
      ...blankHotel(),
      name,
      nightly: [4278, 3886, 3894, 4376, 5207, null][i],
      selected: i === 0,
    })),
    {
      ...blankHotel(),
      name: malaysia
        ? "Summer Tree Hotel Penang"
        : "Singapore · accommodation allowance",
      destination: destinations[2],
      checkIn: "2027-01-24",
      checkOut: "2027-01-28",
      nightly: malaysia ? 3379 : 6500,
      selected: true,
    },
  ];
  t.transport = [
    {
      ...blankTransport(),
      source: "Mumbai (BOM)",
      destination: "Kuala Lumpur (KUL)",
      fare: 12500,
    },
    {
      ...blankTransport(),
      source: "Kuala Lumpur (KUL)",
      destination: "Langkawi (LGK)",
      departureDate: "2027-01-21",
      mode: "Domestic flight",
      fare: 3500,
    },
    {
      ...blankTransport(),
      source: "Langkawi (LGK)",
      destination: malaysia ? "Penang (PEN)" : "Singapore (SIN)",
      departureDate: "2027-01-24",
      mode: "Regional flight",
      fare: malaysia ? 2500 : 5500,
    },
    {
      ...blankTransport(),
      source: malaysia ? "Penang (PEN)" : "Singapore (SIN)",
      destination: "Mumbai (BOM)",
      departureDate: "2027-01-28",
      fare: malaysia ? 12000 : 14000,
    },
  ];
  t.expenses = [
    ["Daily meals allowance", "Food", malaysia ? 11000 : 14500],
    ["Local rides & airport transfers", "Local transportation", 5000],
    ["Entry & visa planning allowance", "Visa", malaysia ? 0 : 3500],
    ["Travel insurance allowance", "Travel insurance", 1200],
    ["eSIM allowance", "SIM/eSIM", 1000],
    ["Emergency reserve", "Emergency/contingency", 8000],
  ].map(([description, category, amount]) => ({
    ...blankExpense(),
    description: String(description),
    category: String(category),
    destination: "Trip-wide",
    amount: Number(amount),
  }));
  destinations.forEach((destination, i) => {
    (activityGroups[destination] ?? []).forEach(([name, cost, category], j) =>
      t.activities.push({
        ...blankActivity(),
        name,
        cost,
        category,
        destination,
        date: `2027-01-${String([18, 21, 24][i] + (j % [3, 3, 4][i])).padStart(2, "0")}`,
      }),
    );
  });
  const list = [
    "Passport validity",
    "Malaysia visa/entry requirements",
    ...(malaysia ? [] : ["Singapore visa"]),
    "International flights",
    "Kuala Lumpur hotel",
    "Langkawi hotel",
    malaysia ? "Penang hotel" : "Singapore hotel",
    "Kuala Lumpur–Langkawi flight",
    malaysia ? "Langkawi–Penang flight" : "Langkawi–Singapore flight",
    "Travel insurance",
    "Currency exchange",
    "eSIM",
    "SkyCab tickets",
    "Ziplining",
    "ATV tour",
    ...(malaysia ? [] : ["Singapore attraction tickets"]),
    "Airport transfers",
  ];
  t.checklist = list.map((title, i) => ({
    ...blankCheck(),
    title,
    priority: i < 3 ? "High" : "Medium",
    due: "2026-12-20",
    notes:
      i < 3
        ? "Verify current official requirements for your passport and dates."
        : "",
  }));
  return t;
}
export function seed(): Store {
  const trips = [makeTrip(), makeTrip(true)];
  return {
    version: 1,
    trips,
    activeId: trips[0].id,
    rates: { INR: 1, MYR: 19, SGD: 64, USD: 85 },
    theme: "light",
  };
}
