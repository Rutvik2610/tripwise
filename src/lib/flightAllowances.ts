import type { Trip } from "./model";

const airport = (value: string) =>
  value.match(/\(([A-Za-z]{3})\)/)?.[1]?.toUpperCase() ??
  value.match(/\b(BOM|KUL|KLA|SIN|LGK|PEN)\b/i)?.[1]?.toUpperCase();
export function withFlightAllowances(t: Trip): Trip {
  const malaysia = new Set(["KUL", "LGK", "PEN"]);
  return {
    ...t,
    transport: t.transport.map((r) => {
      if (!r.mode.toLowerCase().includes("flight")) return r;
      const source = airport(r.source)?.replace("KLA", "KUL"),
        destination = airport(r.destination)?.replace("KLA", "KUL");
      const checked =
        source === "BOM" && destination === "KUL"
          ? 30
          : (source === "KUL" || source === "SIN") && destination === "BOM"
            ? 25
            : source === "LGK" && destination === "SIN"
              ? 25
              : source &&
                  destination &&
                  malaysia.has(source) &&
                  malaysia.has(destination)
                ? 20
                : undefined;
      return {
        ...r,
        cabinBaggagePieces: r.cabinBaggagePieces ?? 1,
        cabinBaggageKg: r.cabinBaggageKg ?? 7,
        ...(checked === undefined
          ? {}
          : { checkedBaggageKg: r.checkedBaggageKg ?? checked }),
      };
    }),
  };
}
