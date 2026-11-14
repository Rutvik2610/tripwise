import type { LucideIcon } from "lucide-react";
import {
  Compass,
  Copy,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { expenseTotal, paymentState } from "../lib/calc";
import { safeUrl, shortDate } from "../lib/format";
import type { Currency, Store, Trip } from "../lib/model";
export function Badge({
  children,
  tone = "",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
export function Panel({
  title,
  sub,
  children,
  action,
  className = "",
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={"panel " + className}>
      <header className="panel-head">
        <div>
          <h3>{title}</h3>
          {sub && <p>{sub}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
export function Empty({ label, onAdd }: { label: string; onAdd?: () => void }) {
  return (
    <div className="empty">
      <Compass size={30} />
      <h3>{label}</h3>
      <p>A little planning goes a long way. Add your first entry.</p>
      {onAdd && (
        <button className="button" onClick={onAdd}>
          <Plus size={16} />
          Add entry
        </button>
      )}
    </div>
  );
}
export function Actions({
  onEdit,
  onCopy,
  onDelete,
}: {
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="row-actions">
      <button title="Edit" aria-label="Edit record" onClick={onEdit}>
        <Pencil size={15} />
      </button>
      <button title="Duplicate" aria-label="Duplicate record" onClick={onCopy}>
        <Copy size={15} />
      </button>
      <button title="Delete" aria-label="Delete record" onClick={onDelete}>
        <Trash2 size={15} />
      </button>
    </div>
  );
}
export function Stat({
  label,
  value,
  detail,
  icon: Icon,
  accent = "",
  onClick,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  accent?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="stat-label">
        <span>{label}</span>
        <Icon size={17} />
      </div>
      <strong>{value}</strong>
      <p>
        {accent === "mint" && <span className="dot" />}
        {detail}
      </p>
    </>
  );
  return onClick ? (
    <button className={"stat-card " + accent} onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className={"stat-card " + accent}>{content}</div>
  );
}
export function RateInputs({
  rates,
  onChange,
}: {
  rates: Store["rates"];
  onChange: (currency: Currency, rate: number) => void;
}) {
  return (
    <div className="rate-inputs">
      {(["MYR", "SGD", "USD"] as const).map((c) => (
        <label key={c}>
          <span>1 {c} =</span>
          <div>
            <span>₹</span>
            <input
              aria-label={"INR per " + c}
              type="number"
              min="0.01"
              max="100000"
              step="0.01"
              value={rates[c]}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (n > 0 && n <= 100000) onChange(c, n);
              }}
            />
          </div>
        </label>
      ))}
    </div>
  );
}
export function ExpenseTableRows({
  e,
  money,
  groupTitle,
  actions,
}: {
  e: Trip["expenses"][number];
  money: (n: number) => string;
  groupTitle: string;
  actions: React.ReactNode;
}) {
  return (
    <>
      {groupTitle && (
        <tr className="group-row">
          <td colSpan={7}>{groupTitle}</td>
        </tr>
      )}
      <tr className={e.bookingStatus === "Cancelled" ? "cancelled" : ""}>
        <td>
          <strong>{e.description}</strong>
          <small>
            {e.category}
            {e.vendor && " · " + e.vendor}
          </small>
          {(e.reference || e.notes || e.receipt || safeUrl(e.url)) && (
            <details>
              <summary>Details</summary>
              <p>{e.notes}</p>
              <p>
                Reference: {e.reference || "—"} · Receipt: {e.receipt || "—"} ·{" "}
                {e.refundable ? "Refundable" : "Refundability unverified"}
              </p>
              {safeUrl(e.url) && (
                <a href={safeUrl(e.url)!} target="_blank" rel="noreferrer">
                  Provider <ExternalLink size={12} />
                </a>
              )}
            </details>
          )}
        </td>
        <td>
          {shortDate(e.date)}
          <small>{e.destination}</small>
        </td>
        <td>
          {e.costPending
            ? "Price pending"
            : `${e.amount.toLocaleString("en-IN")} ${e.currency}`}
          <small>
            ₹{e.rate} / {e.currency}
          </small>
        </td>
        <td className="number">
          {e.costPending ? "Price pending" : money(expenseTotal(e))}
          {e.includeInBudget === false && <small>Not included in budget</small>}
        </td>
        <td>
          <Badge
            tone={
              paymentState(expenseTotal(e), e.paid, e.refunded) === "Paid"
                ? "green"
                : ""
            }
          >
            {paymentState(expenseTotal(e), e.paid, e.refunded)}
          </Badge>
          <small>{money(Math.max(0, e.paid - e.refunded))} net paid</small>
          <small>{money(e.refunded)} refunded</small>
        </td>
        <td>
          <Badge tone={e.bookingStatus === "Booked" ? "green" : ""}>
            {e.bookingStatus}
          </Badge>
        </td>
        <td>{actions}</td>
      </tr>
    </>
  );
}
