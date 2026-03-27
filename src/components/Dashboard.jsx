import { useEffect, useState } from 'react'
import { FiActivity, FiDroplet, FiZap } from 'react-icons/fi'

import useBlynkMetrics from '../hooks/useBlynkMetrics.js'
import useTheme from '../hooks/useTheme.js'
import Footer from './Footer.jsx'
import Header from './Header.jsx'
import MetricChart from './MetricChart.jsx'
import MetricCard from './MetricCard.jsx'
import StatusPill from './StatusPill.jsx'

function toCsvValue(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  const s = String(v)
  // Basic CSV escaping
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replaceAll('"', '""')}"`
  }
  return s
}

function downloadTextFile({ filename, text, mime = 'text/plain;charset=utf-8' }) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function formatLastUpdated(date) {
  if (!date) return '—'
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function Dashboard() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  const { data, loading, error, lastUpdated, online } = useBlynkMetrics({
    intervalMs: 2000,
  })

  // Ensure theme class is applied on first render (hook handles updates).
  // Tailwind's dark variant is class-based in this project.
  // (No extra comments elsewhere; this avoids a brief flash on some browsers.)

  const [points, setPoints] = useState([])

  // Keep a rolling 60s window (2s interval → ~30 points).
  useEffect(() => {
    const voltageOk = typeof data.voltage === 'number' && Number.isFinite(data.voltage)
    const currentOk = typeof data.current === 'number' && Number.isFinite(data.current)
    const powerOk = typeof data.power === 'number' && Number.isFinite(data.power)
    if (!voltageOk && !currentOk && !powerOk) return

    setPoints((prev) => {
      const next = [
        ...prev,
        {
          at: new Date(),
          voltage: voltageOk ? data.voltage : null,
          current: currentOk ? data.current : null,
          power: powerOk ? data.power : null,
        },
      ]
      const cutoff = Date.now() - 60_000
      return next.filter((p) => p.at.getTime() >= cutoff).slice(-90)
    })
  }, [data.voltage, data.current, data.power])

  const exportCsv = () => {
    if (!points.length) return

    const header = ['timestamp', 'voltage_V', 'current_A', 'power_W']
    const rows = points.map((p) => [
      new Date(p.at).toISOString(),
      toCsvValue(p.voltage),
      toCsvValue(p.current),
      toCsvValue(p.power),
    ])
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n') + '\n'

    const stamp = new Date().toISOString().replaceAll(':', '-')
    downloadTextFile({
      filename: `energy-meter-60s-${stamp}.csv`,
      text: csv,
      mime: 'text/csv;charset=utf-8',
    })
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Light-mode background tint + dark-mode subtle vignette */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(900px_circle_at_20%_10%,rgba(99,102,241,0.10),transparent_60%),radial-gradient(900px_circle_at_80%_0%,rgba(14,165,233,0.08),transparent_55%)] dark:bg-[radial-gradient(900px_circle_at_20%_10%,rgba(99,102,241,0.14),transparent_60%),radial-gradient(900px_circle_at_80%_0%,rgba(20,184,166,0.12),transparent_55%)]" />
      <Header theme={theme} onToggleTheme={toggle} />

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
              Overview
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Live metrics from your ESP32 energy meter (Blynk V0/V1/V2)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <StatusPill online={online} />
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/30 dark:text-slate-300">
              Last updated:{' '}
              <span className="text-slate-900 dark:text-slate-100">
                {formatLastUpdated(lastUpdated)}
              </span>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              disabled={points.length === 0}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800/60 dark:bg-slate-900/30 dark:text-slate-200 dark:hover:border-blue-600/60 dark:hover:bg-slate-900/50 dark:focus:ring-blue-500/30"
              title="Download last 60 seconds as CSV"
            >
              Export CSV (60s)
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4">
            <MetricCard
              title="Voltage"
              value={data.voltage}
              unit="V"
              icon={<FiZap aria-hidden="true" />}
              accent="violet"
              decimals={2}
              hint="Blynk virtual pin: V0 • Voltage (V)"
            />
            <MetricChart
              title="Voltage"
              unit="V"
              points={points}
              valueKey="voltage"
              isDark={isDark}
              accent="indigo"
            />
          </div>

          <div className="space-y-4">
            <MetricCard
              title="Current"
              value={data.current}
              unit="A"
              icon={<FiDroplet aria-hidden="true" />}
              accent="cyan"
              decimals={3}
              hint="Blynk virtual pin: V1 • Current (A)"
            />
            <MetricChart
              title="Current"
              unit="A"
              points={points}
              valueKey="current"
              isDark={isDark}
              accent="cyan"
            />
          </div>

          <div className="space-y-4">
            <MetricCard
              title="Power"
              value={data.power}
              unit="W"
              icon={<FiActivity aria-hidden="true" />}
              accent="emerald"
              decimals={2}
              hint="Blynk virtual pin: V2 • Power (W)"
            />
            <MetricChart
              title="Power"
              unit="W"
              points={points}
              valueKey="power"
              isDark={isDark}
              accent="emerald"
            />
          </div>
        </div>

        <div className="mt-4 space-y-4">

          {loading && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800/60 dark:bg-slate-900/30 dark:text-slate-300">
              Loading live data…
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
              <div className="font-medium">Error fetching data</div>
              <div className="mt-1 text-xs text-rose-700 dark:text-rose-200/80">
                {error.message}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

