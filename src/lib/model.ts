export const currencies = ["INR", "MYR", "SGD", "USD"] as const;
export type Currency = (typeof currencies)[number];
export const categories = [
  "International flights",
  "Domestic/regional flights",
  "Hotels",
  "Airport transfers",
  "Local transportation",
  "Food",
  "Attractions",
  "Adventure activities",
  "Visa",
  "Travel insurance",
  "SIM/eSIM",
  "Shopping",
  "Emergency/contingency",
  "Miscellaneous",
];
export const bookingStatuses = [
  "Researching",
  "Shortlisted",
  "Planned",
  "Booked",
  "Cancelled",
];
export const paymentStatuses = ["Unpaid", "Partially Paid", "Paid", "Refunded"];
export interface Expense {
  id: string;
  description: string;
  destination: string;
  category: string;
  date: string;
  currency: Currency;
  amount: number;
  rate: number;
  paid: number;
  refunded: number;
  paymentStatus: string;
  bookingStatus: string;
  refundable: boolean;
  reference: string;
  vendor: string;
  url: string;
  notes: string;
  receipt: string;
}
export interface Hotel {
  id: string;
  name: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  room: string;
  currency: Currency;
  rate: number;
  nightly: number | null;
  taxes: number;
  propertyTaxBasis?: "Per night" | "Whole stay";
  tourismTax: number;
  heritageTax: number;
  propertyFees: number;
  taxMode: string;
  breakfast: boolean;
  freeCancellation: boolean;
  cancellationDeadline: string;
  bathroom: boolean;
  window: boolean;
  rating: number | null;
  cleanliness: number | null;
  distance: number | null;
  website: string;
  url: string;
  notes: string;
  status: string;
  selected: boolean;
  paid: number;
  refunded: number;
}
export interface Transport {
  fareGroupId?: string;
  id: string;
  source: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  mode: string;
  provider: string;
  number: string;
  departureTerminal: string;
  arrivalTerminal: string;
  currency: Currency;
  rate: number;
  fare: number;
  taxes: number;
  baggage: number;
  seat: number;
  refundable: boolean;
  reference: string;
  url: string;
  status: string;
  paid: number;
  refunded: number;
  notes: string;
}
export interface Activity {
  layoverId?: string;
  includeInBudget?: boolean;
  costPending?: boolean;
  id: string;
  name: string;
  date: string;
  start: string;
  end: string;
  destination: string;
  category: string;
  cost: number;
  bookingRequired: boolean;
  transport: string;
  notes: string;
  status: string;
}
export interface CheckItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  due: string;
  notes: string;
  related: string;
}
export interface Stop {
  id: string;
  name: string;
  country: string;
  start: string;
  end: string;
}
export interface Simulation {
  preset: string;
  nights: number;
  nightly: number;
  flights: number;
  food: number;
  transport: number;
  attractions: number;
  contingency: number;
}
export interface FareGroup {
  id: string;
  name: string;
  amount: number;
  currency: Currency;
  rate: number;
  status: string;
  paid: number;
  refunded: number;
  reference: string;
  notes: string;
  passengers: number;
  cabin: string;
}
export interface Layover {
  id: string;
  fareGroupId?: string;
  airport: string;
  timezone: "Asia/Singapore";
  date: string;
  direction: "Unknown" | "Outbound" | "Inbound";
  arrivalTime: string;
  departureTime: string;
  arrivalTerminal: string;
  departureTerminal: string;
  entry: "Verification pending" | "Verified permitted" | "Not permitted";
  baggage: "Unknown" | "Yes" | "No";
  protectedConnection: "Unknown" | "Yes" | "No";
  additionalCheckIn: "Unknown" | "Yes" | "No";
  option: "Undecided" | "Airport" | "City";
  disembarkation: number | null;
  immigration: number | null;
  travelOut: number | null;
  travelBack: number | null;
  formalities: number | null;
  baggageCheckIn: number | null;
  safetyBuffer: number | null;
  airlineUrl: string;
  notes: string;
}
export interface Trip {
  fareGroups?: FareGroup[];
  layovers?: Layover[];
  id: string;
  name: string;
  departure: string;
  start: string;
  end: string;
  travellers: number;
  homeCurrency: Currency;
  budget: number;
  stretch: number;
  accommodationBudget: number;
  status: string;
  archived: boolean;
  stops: Stop[];
  expenses: Expense[];
  hotels: Hotel[];
  transport: Transport[];
  activities: Activity[];
  checklist: CheckItem[];
  simulation: Simulation;
}
export interface Store {
  version: 1;
  trips: Trip[];
  activeId: string;
  rates: Record<Currency, number>;
  theme: "light" | "dark";
}
export const uid = () => crypto.randomUUID();
