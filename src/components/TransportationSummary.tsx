import { Panel } from "./Shared";
import { usePlanner } from "../lib/context";
import { transportationTotals } from "../lib/transit";
import { malaysiaCorrectionWarnings } from "../lib/malaysiaCorrection";
export function TransportationSummary() {
  const { trip, money } = usePlanner();
  const t = transportationTotals(trip),
    warnings = malaysiaCorrectionWarnings(trip);
  return (
    <Panel
      title="Transportation Summary"
      sub="Current trip forecast · payments and refunds follow the same ledger; linked return fares count once"
    >
      <div
        className="shared-transport-summary"
        aria-label="Transportation cost breakdown"
      >
        <div>
          <span>International airfare</span>
          <strong data-testid="international-airfare">
            {money(t.international)}
          </strong>
        </div>
        <div>
          <span>Domestic flights</span>
          <strong data-testid="domestic-airfare">{money(t.domestic)}</strong>
        </div>
        <div>
          <span>Local / airport transportation</span>
          <strong data-testid="local-transport">{money(t.local)}</strong>
        </div>
        <div className="summary-total">
          <span>Total transportation</span>
          <strong data-testid="transport-total">{money(t.total)}</strong>
        </div>
      </div>
      {warnings.length > 0 && (
        <div className="correction-notes" role="status">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}
    </Panel>
  );
}
