"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LabSeries } from "@/lib/domain/insights";
import { formatDate } from "@/lib/format";

export function LabTrendChart({ series }: { series: LabSeries }) {
  const data = series.points.map((p) => ({ date: formatDate(p.date), value: p.value }));
  const label = `${series.testName} (${series.unit})`;

  return (
    <figure className="space-y-2">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} domain={["auto", "auto"]} />
            <Tooltip
              formatter={(value) => [`${value} ${series.unit}`, series.testName]}
              contentStyle={{
                backgroundColor: "var(--popover)",
                color: "var(--popover-foreground)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line type="linear" dataKey="value" name={label} stroke="var(--primary)" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Text alternative for screen readers and for checking exact values. */}
      <figcaption className="sr-only">
        {label}: {series.points.map((p) => `${formatDate(p.date)} ${p.value}`).join("; ")}
      </figcaption>
    </figure>
  );
}
