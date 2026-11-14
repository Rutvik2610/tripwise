import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import { createContext, useContext } from "react";
import type { totals } from "./calc";
import type { Store, Trip } from "./model";
export type Section =
  | "Overview"
  | "Expenses"
  | "Hotels"
  | "Transportation"
  | "Itinerary"
  | "Budget simulator"
  | "Compare trips"
  | "Checklist"
  | "My trips"
  | "Settings";
export type Collection =
  "expenses" | "hotels" | "transport" | "activities" | "checklist" | "stops";
interface PlannerState {
  hotelFocus: string;
  setHotelFocus: Dispatch<SetStateAction<string>>;
  trip: Trip;
  summary: ReturnType<typeof totals>;
  store: Store;
  setStore: Dispatch<SetStateAction<Store>>;
  money: (n: number) => string;
  updateTrip: (fn: (t: Trip) => Trip) => void;
  go: (section: Section) => void;
  startEdit: (kind: Collection | "trip", value: object, title: string) => void;
  add: (kind: Collection) => void;
  editActions: (kind: Collection, item: { id: string }) => ReactNode;
  exportData: () => void;
  importRef: RefObject<HTMLInputElement | null>;
  recovery: string;
  setRecovery: Dispatch<SetStateAction<string>>;
  setSaveError: Dispatch<SetStateAction<string>>;
  setToast: Dispatch<SetStateAction<string>>;
  download: (raw: string, name: string) => void;
}
export const PlannerContext = createContext<PlannerState | null>(null);
export function usePlanner() {
  const value = useContext(PlannerContext);
  if (!value) throw Error("Planner provider is missing.");
  return value;
}
