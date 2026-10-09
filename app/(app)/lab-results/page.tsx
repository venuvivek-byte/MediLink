"use client";

import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { DEMO_LAB_RESULTS, getDemoRepeatTestAlerts } from "@/lib/demo/data";
import { TestTube, TrendingDown, AlertCircle, Calendar } from "lucide-react";
import { VerificationBadge } from "@/components/ui/VerificationBadge";

export default function LabResultsPage() {
  const repeatAlerts = getDemoRepeatTestAlerts();

  // HbA1c trend chart data
  const hba1cData = [
    { date: "Jan 2025", value: 7.8, normalThreshold: 5.7 },
    { date: "Apr 2025", value: 7.4, normalThreshold: 5.7 },
    { date: "Jul 2025", value: 7.2, normalThreshold: 5.7 },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Lab Results & Biomarker Trends"
        subtitle="Longitudinal tracking across testing centers with repeat interval detection"
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Repeat Test Alert */}
        {repeatAlerts.length > 0 && (
          <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 text-foreground flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold">
                Repeat Testing Interval Flag: HbA1c
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                HbA1c was repeated within 88 days. Routine monitoring guideline for stable glycemic control is 90–120 days. Discuss with your physician to prevent unnecessary testing costs.
              </p>
            </div>
          </div>
        )}

        {/* HbA1c Longitudinal Trend Chart */}
        <Card className="bg-card/70 backdrop-blur-sm border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-health-emerald" />
                HbA1c Trend Analysis (Glycemic Control)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Target: &lt; 5.7% (Normal) | &lt; 7.0% (Clinical Target)
              </p>
            </div>
            <Badge variant="outline" className="bg-health-emerald/10 text-health-emerald border-health-emerald/30 text-xs font-semibold">
              Improving (-0.6% over 6 months)
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hba1cData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} />
                  <YAxis domain={[5, 9]} stroke="#888888" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.2 0.02 260)",
                      borderRadius: "8px",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <ReferenceLine
                    y={5.7}
                    label={{ value: "Normal Limit (<5.7%)", fill: "#10b981", fontSize: 10 }}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="HbA1c (%)"
                    stroke="#0ea5e9"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#0ea5e9" }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Full Lab Results Table */}
        <Card className="bg-card/70 backdrop-blur-sm border-border/80">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TestTube className="w-4 h-4 text-primary" />
              All Verified Lab Results
            </CardTitle>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {DEMO_LAB_RESULTS.length} Tests
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-y border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-medium">Test Name</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Result Value</th>
                    <th className="px-4 py-3 font-medium">Reference Range</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {DEMO_LAB_RESULTS.map((lab) => (
                    <tr key={lab.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-foreground">
                        {lab.test_name}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        {lab.test_date}
                      </td>
                      <td className="px-4 py-3.5 font-bold">
                        <span
                          className={
                            lab.is_abnormal ? "text-health-amber font-semibold" : "text-foreground"
                          }
                        >
                          {lab.result_value} {lab.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground font-mono">
                        {lab.reference_range}
                      </td>
                      <td className="px-4 py-3.5">
                        {lab.is_abnormal ? (
                          <Badge variant="outline" className="bg-health-amber/15 text-health-amber border-health-amber/30 text-[10px]">
                            High / Abnormal
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-health-emerald/15 text-health-emerald border-health-emerald/30 text-[10px]">
                            Within Normal
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <VerificationBadge status={lab.verification_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
