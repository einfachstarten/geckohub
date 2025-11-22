"use client";

import {
  Flame,
  Leaf,
  MoonStar,
  PanelsTopLeft,
  SunMedium,
  ThermometerSun,
  Waves,
  Wind,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

const climateTrend = [
  { time: "08:00", temperature: 24.5, humidity: 72, uv: 0.6 },
  { time: "10:00", temperature: 26.1, humidity: 70, uv: 1.2 },
  { time: "12:00", temperature: 27.8, humidity: 68, uv: 2.4 },
  { time: "14:00", temperature: 28.6, humidity: 67, uv: 3.1 },
  { time: "16:00", temperature: 27.2, humidity: 69, uv: 1.8 },
  { time: "18:00", temperature: 25.4, humidity: 71, uv: 0.9 },
  { time: "20:00", temperature: 24.1, humidity: 73, uv: 0.3 },
];

const statCards = [
  {
    title: "Temperatur",
    value: "26.4°C",
    delta: "+0.3°C vs. gestern",
    icon: ThermometerSun,
    intent: "warning",
  },
  {
    title: "Luftfeuchtigkeit",
    value: "68%",
    delta: "-2% vs. gestern",
    icon: Waves,
    intent: "success",
  },
  {
    title: "UV / Beleuchtung",
    value: "2.1 UVI",
    delta: "Stabil",
    icon: SunMedium,
    intent: "neutral",
  },
  {
    title: "Wasserstand",
    value: "42%",
    delta: "Nachfüllung in ~2 Tagen",
    icon: Leaf,
    intent: "alert",
  },
];

const automationRules = [
  {
    title: "Nebler",
    description: "Aktiv zwischen 06:00–20:00 | 5 Min. alle 2 Std.",
    status: "Aktiv",
    icon: Wind,
    color: "bg-sky-500/10 text-sky-600 border-sky-200",
  },
  {
    title: "Wärmelampe",
    description: "Ziel 27°C tagsüber, 23°C nachts",
    status: "Standby",
    icon: Flame,
    color: "bg-orange-500/10 text-orange-600 border-orange-200",
  },
  {
    title: "UV-B / Tag-Nacht",
    description: "12 Std. Zyklus | Sonnenaufgang 07:30",
    status: "Aktiv",
    icon: SunMedium,
    color: "bg-yellow-400/10 text-yellow-700 border-yellow-200",
  },
  {
    title: "Nachtmodus",
    description: "Mondlicht bei < 22°C und < 30 lux",
    status: "Auto",
    icon: MoonStar,
    color: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
  },
];

function StatBadge({ intent = "neutral" }) {
  const base = "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium";
  const styles = {
    success: "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-100",
    warning: "bg-amber-500/10 text-amber-600 ring-1 ring-amber-100",
    alert: "bg-red-500/10 text-red-600 ring-1 ring-red-100",
    neutral: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200",
  };

  return <span className={twMerge(base, styles[intent])}>Live</span>;
}

function StatCard({ title, value, delta, icon: Icon, intent }) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-zinc-100 bg-white/80 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{value}</p>
        </div>
        <div
          className={clsx(
            "flex h-12 w-12 items-center justify-center rounded-full border-2",
            intent === "warning" && "border-amber-200 bg-amber-50 text-amber-600",
            intent === "success" && "border-emerald-200 bg-emerald-50 text-emerald-600",
            intent === "alert" && "border-red-200 bg-red-50 text-red-600",
            intent === "neutral" && "border-zinc-200 bg-zinc-50 text-zinc-700"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{delta}</p>
        <StatBadge intent={intent} />
      </div>
    </article>
  );
}

function AutomationCard({ title, description, status, icon: Icon, color }) {
  return (
    <div
      className={twMerge(
        "flex items-start gap-3 rounded-2xl border bg-white/70 p-4 shadow-sm ring-1 ring-black/5 backdrop-blur",
        color
      )}
    >
      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-inherit ring-1 ring-inherit/30">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
            <p className="text-sm text-zinc-600">{description}</p>
          </div>
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-600 ring-1 ring-inherit/20">
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/90 px-3 py-2 text-sm shadow-lg">
      <p className="text-xs text-zinc-500">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="font-medium text-zinc-800">
          {item.name}: {item.value}
          {item.dataKey === "temperature" ? "°C" : item.dataKey === "humidity" ? "%" : ""}
        </p>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50 px-4 py-10 text-zinc-900">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 pb-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">GeckoHub</p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">Terrarium Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Live-Telemetrie, Automationen und Wartungsempfehlungen für dein Terrarium.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-100">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden />
          Sensoren online · Aktualisiert vor 2 Min.
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-3xl border border-zinc-100 bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between pb-4">
              <div>
                <p className="text-sm text-zinc-500">Verlauf (letzte 24 Std.)</p>
                <h2 className="text-xl font-semibold text-zinc-900">Klima-Entwicklung</h2>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200">
                <PanelsTopLeft className="h-4 w-4" />
                Govee Sensoren
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={climateTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="temp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="humidity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" tick={{ fill: "#52525b", fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    tick={{ fill: "#52525b", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[22, 30]}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "#52525b", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[60, 80]}
                  />
                  <Tooltip content={<TooltipContent />} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: 12 }} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="temperature"
                    name="Temperatur"
                    stroke="#f59e0b"
                    fill="url(#temp)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#f59e0b" }}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="humidity"
                    name="Feuchte"
                    stroke="#10b981"
                    fill="url(#humidity)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#10b981" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-zinc-100 bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-900">Systemstatus</h2>
              <StatBadge />
            </div>
            <div className="space-y-3 text-sm text-zinc-700">
              <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-100">
                <div className="flex items-center gap-3">
                  <SunMedium className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-semibold">Lichtplan</p>
                    <p className="text-xs text-zinc-500">12h Sonnenbogen · Nächster Wechsel 21:00</p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Tags</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-100">
                <div className="flex items-center gap-3">
                  <Wind className="h-5 w-5 text-sky-500" />
                  <div>
                    <p className="font-semibold">Luftstrom</p>
                    <p className="text-xs text-zinc-500">Lüfter auf 35% · CO₂ 540 ppm</p>
                  </div>
                </div>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">Auto</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-100">
                <div className="flex items-center gap-3">
                  <Leaf className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="font-semibold">Bewässerung</p>
                    <p className="text-xs text-zinc-500">Wasserstand 42% · Verbrauch 1.2L/Tag</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Bereit</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-100">
                <div className="flex items-center gap-3">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="font-semibold">Heizung</p>
                    <p className="text-xs text-zinc-500">Grundwärme 25°C · Peak 29°C</p>
                  </div>
                </div>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">Stabil</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-zinc-100 bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between pb-4">
              <h2 className="text-xl font-semibold text-zinc-900">Automationen</h2>
              <p className="text-sm text-zinc-500">Shelly Cloud + interne Regeln</p>
            </div>
            <div className="space-y-3">
              {automationRules.map((rule) => (
                <AutomationCard key={rule.title} {...rule} />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-100 bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-xl font-semibold text-zinc-900">Alarme & Hinweise</h2>
              <StatBadge intent="alert" />
            </div>
            <div className="space-y-3 text-sm text-zinc-700">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                <p className="font-semibold">Wasser nachfüllen</p>
                <p className="text-xs">Berechne Nachfüllung für 18. Juni (Restlaufzeit ~48 Std.).</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
                <p className="font-semibold">Letzte Fütterung</p>
                <p className="text-xs">Gestern 19:45 | Nächste Erinnerung in 2 Tagen.</p>
              </div>
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                <p className="font-semibold">UV-Lampe Laufzeit</p>
                <p className="text-xs">3.200 h genutzt · Austausch nach 3.500 h empfohlen.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
