"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const MONO = "'Lexend', sans-serif";

const TOOLTIP = {
  background: "var(--white)",
  border: "1px solid var(--rule)",
  borderRadius: 0,
  fontSize: 12,
  fontFamily: MONO,
  color: "var(--ink)",
};

const TICK = { fontSize: 10, fontFamily: MONO, fill: "currentColor" };

const PRIORITY_COLORS: Record<string, string> = {
  hot: "#e03131",
  warm: "#e8590c",
  cold: "#228be6",
};

export function PriorityDonut({ data }: { data: Record<string, number> }) {
  const rows = Object.entries(data).map(([name, value]) => ({ name, value }));
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (total === 0) return <p className="sub">No analyzed leads yet.</p>;
  return (
    <div style={{ width: "100%" }} role="img" aria-label="Leads by priority chart">
      <div style={{ width: "100%", height: 190 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={80}
              paddingAngle={3}
              strokeWidth={0}
            >
              {rows.map((r) => (
                <Cell key={r.name} fill={PRIORITY_COLORS[r.name] ?? "#c4c4be"} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="chips" style={{ justifyContent: "center", marginTop: 4 }}>
        {rows.map((r) => (
          <span key={r.name} className={`tag tag-${r.name}`}>
            {r.name} · {r.value}
          </span>
        ))}
      </div>
    </div>
  );
}

export function IntentBars({ data }: { data: Record<string, number> }) {
  const rows = Object.entries(data).map(([intent, count]) => ({ intent, count }));
  if (rows.length === 0) return <p className="sub">No intents yet.</p>;
  return (
    <div className="chart-mono" style={{ width: "100%", height: 210 }} role="img" aria-label="Leads by intent chart">
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ left: -14, right: 8, top: 4 }} barCategoryGap="30%">
          <CartesianGrid stroke="currentColor" strokeOpacity={0.25} vertical={false} />
          <XAxis dataKey="intent" tick={TICK} axisLine={{ stroke: "currentColor", opacity: 0.4 }} tickLine={false} interval={0} />
          <YAxis allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "currentColor", fillOpacity: 0.08 }} />
          <Bar dataKey="count" fill="currentColor" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BudgetBars({ data }: { data: { bucket: string; count: number }[] }) {  return (
    <div className="chart-mono" style={{ width: "100%", height: 210 }} role="img" aria-label="Leads by budget chart">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4 }} barCategoryGap="28%">
          <CartesianGrid stroke="currentColor" strokeOpacity={0.25} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="bucket" tick={TICK} width={80} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "currentColor", fillOpacity: 0.08 }} />
          <Bar dataKey="count" fill="currentColor" barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function shortINR(v: number): string {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(0)}L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)}k`;
  return `₹${v}`;
}

export function ValueBars({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="chart-mono" style={{ width: "100%", height: 210 }} role="img" aria-label="Pipeline value by priority chart">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -6, right: 8, top: 4 }} barCategoryGap="30%">
          <CartesianGrid stroke="currentColor" strokeOpacity={0.25} vertical={false} />
          <XAxis dataKey="name" tick={TICK} axisLine={{ stroke: "currentColor", opacity: 0.4 }} tickLine={false} interval={0} />
          <YAxis tickFormatter={shortINR} tick={TICK} axisLine={false} tickLine={false} width={64} />
          <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "currentColor", fillOpacity: 0.08 }} formatter={(v) => [shortINR(Number(v)), "value"]} />
          <Bar dataKey="value" radius={[6, 6, 6, 6]}>
            {data.map((r, i) => (
              <Cell key={r.name} fill={i === 0 ? "#e03131" : i === 1 ? "#e8590c" : "#228be6"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LeadsOverTime({ data }: { data: { day: string; count: number }[] }) {
  if (data.length === 0) return <p className="sub">No leads yet.</p>;
  return (
    <div className="chart-mono" style={{ width: "100%", height: 210 }} role="img" aria-label="Leads over time chart">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: -14, right: 8, top: 4 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.25} vertical={false} />
          <XAxis dataKey="day" tick={TICK} axisLine={{ stroke: "currentColor", opacity: 0.4 }} tickLine={false} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP} />
          <Area type="monotone" dataKey="count" stroke="currentColor" fill="currentColor" fillOpacity={0.12} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
