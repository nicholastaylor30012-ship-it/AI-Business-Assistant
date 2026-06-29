"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import { Users, MessageSquare, FileText, Zap, TrendingUp, TrendingDown } from "lucide-react";
import { analyticsAPI } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { formatNumber } from "@/lib/utils";

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

// Mock chart data (replace with real API data in production)
const weeklyMessages = [
  { day: "Mon", messages: 34, tokens: 12400 },
  { day: "Tue", messages: 52, tokens: 19800 },
  { day: "Wed", messages: 41, tokens: 15200 },
  { day: "Thu", messages: 67, tokens: 24600 },
  { day: "Fri", messages: 58, tokens: 21300 },
  { day: "Sat", messages: 23, tokens: 8700 },
  { day: "Sun", messages: 19, tokens: 7100 },
];

const documentTypes = [
  { name: "PDF", value: 45 },
  { name: "DOCX", value: 28 },
  { name: "XLSX", value: 15 },
  { name: "TXT", value: 8 },
  { name: "CSV", value: 4 },
];

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  if (user?.role !== "admin") {
    router.push("/dashboard");
    return null;
  }

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => analyticsAPI.overview().then((r) => r.data),
  });

  const stats = analytics
    ? [
        {
          label: "Total Users",
          value: analytics.total_users,
          sub: `${analytics.new_users_this_week} new this week`,
          icon: Users,
          color: "#3b82f6",
          trend: analytics.new_users_this_week > 0,
        },
        {
          label: "Total Messages",
          value: analytics.total_messages,
          sub: `${analytics.messages_today} today`,
          icon: MessageSquare,
          color: "#10b981",
          trend: analytics.messages_today > 0,
        },
        {
          label: "Documents",
          value: analytics.total_documents,
          sub: "In knowledge base",
          icon: FileText,
          color: "#f59e0b",
          trend: null,
        },
        {
          label: "Tokens Used",
          value: analytics.total_tokens_used,
          sub: "All time",
          icon: Zap,
          color: "#8b5cf6",
          trend: null,
        },
      ]
    : [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="rounded-xl border p-3 text-sm shadow-lg"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
        >
          <p className="font-semibold mb-1">{label}</p>
          {payload.map((p: any) => (
            <p key={p.dataKey} style={{ color: p.color }}>
              {p.name}: {formatNumber(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Analytics</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Usage insights and platform metrics
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: "var(--bg-tertiary)" }} />
              ))
            : stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border p-5"
                  style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      {stat.label}
                    </p>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${stat.color}18` }}
                    >
                      <stat.icon size={16} style={{ color: stat.color }} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                    {formatNumber(stat.value)}
                  </p>
                  <div className="flex items-center gap-1">
                    {stat.trend === true && <TrendingUp size={12} style={{ color: "var(--success)" }} />}
                    {stat.trend === false && <TrendingDown size={12} style={{ color: "var(--danger)" }} />}
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{stat.sub}</p>
                  </div>
                </div>
              ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Messages this week */}
          <div
            className="lg:col-span-2 rounded-2xl border p-6"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Messages This Week
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyMessages} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--bg-hover)" }} />
                <Bar dataKey="messages" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Messages" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Document types pie */}
          <div
            className="rounded-2xl border p-6"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Document Types
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={documentTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {documentTypes.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Token usage */}
        <div
          className="rounded-2xl border p-6"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Token Usage This Week
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyMessages}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={45}
                tickFormatter={(v) => formatNumber(v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="tokens"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={{ fill: "#8b5cf6", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                name="Tokens"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
