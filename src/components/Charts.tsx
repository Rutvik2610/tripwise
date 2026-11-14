import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
export const palette = [
  "#25877c",
  "#e4ac62",
  "#8ca4c4",
  "#cc8d7c",
  "#79b8a1",
  "#b0a4c5",
  "#aac8cc",
  "#d4c793",
];
export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export function Donut({
  data,
  format = inr,
}: {
  format?: (n: number) => string;
  data: { name: string; estimated: number }[];
}) {
  return (
    <div className="donut-wrap">
      <ResponsiveContainer width="100%" height={230}>
        <PieChart>
          <Pie
            data={data.filter((d) => d.estimated > 0)}
            isAnimationActive={false}
            dataKey="estimated"
            nameKey="name"
            innerRadius={72}
            outerRadius={100}
            paddingAngle={3}
            stroke="none"
          >
            {data
              .filter((d) => d.estimated > 0)
              .map((_, i) => (
                <Cell key={i} fill={palette[i % palette.length]} />
              ))}
          </Pie>
          <Tooltip formatter={(v) => format(Number(v))} />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-center">
        <small>ESTIMATED</small>
        <strong>{format(data.reduce((s, d) => s + d.estimated, 0))}</strong>
      </div>
    </div>
  );
}
export function Bars({
  data,
  second = false,
  label = "Estimated",
  format = inr,
}: {
  format?: (n: number) => string;
  data: object[];
  second?: boolean;
  label?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 0, right: 10, top: 15, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 4" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10 }}
          interval={0}
          tickFormatter={(s) =>
            String(s).length > 16 ? String(s).slice(0, 14) + "…" : s
          }
        />
        <YAxis
          tick={{ fontSize: 10 }}
          width={70}
          tickFormatter={(v) => format(Number(v))}
        />
        <Tooltip formatter={(v) => format(Number(v))} />
        <Bar
          name={label}
          isAnimationActive={false}
          dataKey="estimated"
          fill="#298a7d"
          radius={[5, 5, 0, 0]}
          maxBarSize={42}
        />
        {second && (
          <Bar
            name="Paid"
            isAnimationActive={false}
            dataKey="paid"
            fill="#e3b16d"
            radius={[5, 5, 0, 0]}
            maxBarSize={42}
          />
        )}
        <Legend />
      </BarChart>
    </ResponsiveContainer>
  );
}
export function TimelineChart({
  data,
  format = inr,
}: {
  data: object[];
  format?: (n: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#298a7d" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#298a7d" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis
          width={70}
          tick={{ fontSize: 10 }}
          tickFormatter={(v) => format(Number(v))}
        />
        <Tooltip formatter={(v) => format(Number(v))} />
        <Area
          type="monotone"
          isAnimationActive={false}
          dataKey="estimated"
          name="Planned"
          stroke="#298a7d"
          fill="url(#area)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
