import { useEffect, useMemo, useRef, useState } from 'react'
import { FiDatabase, FiMail } from 'react-icons/fi'

import useBlynkMetrics from '../hooks/useBlynkMetrics.js'
import { isEmailConfigured, sendOverVoltageEmail } from '../lib/email.js'
import { insertReading, isSupabaseConfigured } from '../lib/supabase.js'
import Footer from './Footer.jsx'
import Header from './Header.jsx'
import MetricChart from './MetricChart.jsx'
import MetricCard from './MetricCard.jsx'
import StatusPill from './StatusPill.jsx'
import StoredReadingsDialog from './StoredReadingsDialog.jsx'

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

// When measured power is at or below this (Watts) we treat the meter as having
// no real load and force the displayed/charted current to 0 (suppresses CT noise).
const NO_LOAD_POWER_W = 0.05

// Voltage above this (Volts) triggers an automatic email alert.
const OVERVOLTAGE_THRESHOLD_V = 300

// Don't auto-send the over-voltage email more than once every N minutes,
// so a sustained over-voltage condition doesn't spam the inbox.
const OVERVOLTAGE_COOLDOWN_MS = 10 * 60 * 1000

export default function Dashboard() {
  const isDark = false

  const { data, loading, error, lastUpdated, online, setRelay } = useBlynkMetrics({
    intervalMs: 2000,
  })

  const relayOn = Number(data.relay) === 1
  const [relayBusy, setRelayBusy] = useState(false)

  const [points, setPoints] = useState([])
  const lastDbInsertRef = useRef(0)
  const lastInsertedVoltageRef = useRef(null)
  const [readingsOpen, setReadingsOpen] = useState(false)
  const lastAlertSentAtRef = useRef(0)
  const [alertStatus, setAlertStatus] = useState(null) // { kind: 'info'|'success'|'error'|'warning', title?, text }
  const [alertSending, setAlertSending] = useState(false)
  const [confirmTestAlert, setConfirmTestAlert] = useState(false)

  const handleToggleRelay = async (next) => {
    if (relayBusy) return
    setRelayBusy(true)
    const res = await setRelay(next)
    setRelayBusy(false)
    if (!res.ok) {
      setAlertStatus({
        kind: 'error',
        title: 'Relay control failed',
        text: `Could not ${next ? 'turn ON' : 'turn OFF'} the relay: ${res.error?.message ?? 'unknown error'}`,
      })
    }
  }

  const hasLoad =
    typeof data.power === 'number' &&
    Number.isFinite(data.power) &&
    data.power > NO_LOAD_POWER_W
  const displayedCurrent = online && hasLoad ? data.current : 0

  // Keep a rolling 60s window (2s interval → ~30 points).
  useEffect(() => {
    const voltageOk = typeof data.voltage === 'number' && Number.isFinite(data.voltage)
    const currentOk = typeof data.current === 'number' && Number.isFinite(data.current)
    const powerOk = typeof data.power === 'number' && Number.isFinite(data.power)
    if (!voltageOk && !currentOk && !powerOk) return

    const sampleHasLoad = powerOk && data.power > NO_LOAD_POWER_W
    const sampleCurrent = !online || !sampleHasLoad
      ? 0
      : currentOk
        ? data.current
        : null

    setPoints((prev) => {
      const next = [
        ...prev,
        {
          at: new Date(),
          voltage: voltageOk ? data.voltage : null,
          current: sampleCurrent,
          power: powerOk ? data.power : null,
        },
      ]
      const cutoff = Date.now() - 60_000
      return next.filter((p) => p.at.getTime() >= cutoff).slice(-90)
    })
  }, [data.voltage, data.current, data.power, online])

  const currentPointsMa = useMemo(() => points, [points])

  // Persist live readings to Supabase. Rules:
  //   - Skip if voltage is missing or zero (no real reading).
  //   - Skip if voltage hasn't changed meaningfully since the last stored row.
  //   - Still throttle to at most one insert per 2 minutes.
  useEffect(() => {
    if (!isSupabaseConfigured) return
    if (!online) return
    if (!lastUpdated) return

    const voltageOk = typeof data.voltage === 'number' && Number.isFinite(data.voltage)
    if (!voltageOk) return
    if (data.voltage <= 0) return // ignore zero / negative voltage readings

    // Only insert when voltage actually changed (>= 0.1 V difference).
    const lastV = lastInsertedVoltageRef.current
    if (lastV !== null && Math.abs(data.voltage - lastV) < 0.1) return

    const now = Date.now()
    if (now - lastDbInsertRef.current < 2 * 60 * 1000) return
    lastDbInsertRef.current = now
    lastInsertedVoltageRef.current = data.voltage

    const currentOk = typeof data.current === 'number' && Number.isFinite(data.current)
    const powerOk = typeof data.power === 'number' && Number.isFinite(data.power)
    const energyOk = typeof data.energy === 'number' && Number.isFinite(data.energy)
    const costOk = typeof data.cost === 'number' && Number.isFinite(data.cost)

    void insertReading({
      at: lastUpdated,
      voltage: data.voltage,
      current: currentOk ? data.current : null,
      power: powerOk ? data.power : null,
      energy: energyOk ? data.energy : null,
      cost: costOk ? data.cost : null,
    }).then(({ error: insertError }) => {
      if (insertError) {
        // eslint-disable-next-line no-console
        console.warn('[supabase] insert failed:', insertError.message)
      }
    })
  }, [lastUpdated, online, data.voltage, data.current, data.power, data.energy, data.cost])

  // Auto-send email if voltage crosses the configured threshold (with cooldown).
  useEffect(() => {
    if (!online) return
    if (!isEmailConfigured) return
    const v = data.voltage
    if (typeof v !== 'number' || !Number.isFinite(v)) return
    if (v <= OVERVOLTAGE_THRESHOLD_V) return

    const now = Date.now()
    if (now - lastAlertSentAtRef.current < OVERVOLTAGE_COOLDOWN_MS) return
    lastAlertSentAtRef.current = now

    setAlertStatus({ kind: 'info', text: `Over-voltage detected (${v.toFixed(2)} V). Sending alert email…` })
    void sendOverVoltageEmail({
      voltage: v,
      threshold: OVERVOLTAGE_THRESHOLD_V,
      isTest: false,
      at: lastUpdated ?? new Date(),
    }).then((res) => {
      if (res.ok) {
        setAlertStatus({ kind: 'success', text: `Alert email sent (voltage ${v.toFixed(2)} V > ${OVERVOLTAGE_THRESHOLD_V} V).` })
      } else {
        // eslint-disable-next-line no-console
        console.warn('[email] auto alert failed:', res.error?.message)
        setAlertStatus({ kind: 'error', text: `Failed to send alert email: ${res.error?.message ?? 'unknown error'}` })
      }
    })
  }, [data.voltage, online, lastUpdated])

  const handleTestAlertClick = () => {
    if (alertSending) return
    if (!isEmailConfigured) {
      setAlertStatus({
        kind: 'error',
        title: 'Email alert',
        text: 'EmailJS is not configured. Add VITE_EMAILJS_* and VITE_ALERT_EMAIL_TO to your .env file.',
      })
      return
    }
    setAlertStatus(null)
    setConfirmTestAlert(true)
  }

  const handleConfirmTestAlert = async () => {
    setConfirmTestAlert(false)
    setAlertSending(true)
    setAlertStatus({
      kind: 'warning',
      title: 'Test alert (simulated)',
      text: `This is just a TEST — simulating that voltage is above ${OVERVOLTAGE_THRESHOLD_V} V. Sending test email…`,
    })
    const res = await sendOverVoltageEmail({
      voltage: typeof data.voltage === 'number' ? data.voltage : 0,
      threshold: OVERVOLTAGE_THRESHOLD_V,
      isTest: true,
      at: lastUpdated ?? new Date(),
    })
    setAlertSending(false)
    if (res.ok) {
      setAlertStatus({
        kind: 'warning',
        title: 'Test alert (simulated)',
        text: `This is just a TEST — simulating that voltage is above ${OVERVOLTAGE_THRESHOLD_V} V. Test email sent successfully.`,
      })
    } else {
      setAlertStatus({
        kind: 'error',
        title: 'Test alert failed',
        text: `Failed to send test email: ${res.error?.message ?? 'unknown error'}`,
      })
    }
  }

  const handleCancelTestAlert = () => {
    setConfirmTestAlert(false)
  }

  const exportCsv = () => {
    if (!points.length) return

    const header = ['timestamp', 'voltage_V', 'current_mA', 'power_W']
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
      <Header
        relayOn={relayOn}
        relayDisabled={false}
        relayBusy={relayBusy}
        onToggleRelay={handleToggleRelay}
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
              Overview
            </h1>
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
              onClick={() => setReadingsOpen(true)}
              disabled={!isSupabaseConfigured}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800/60 dark:bg-slate-900/30 dark:text-slate-200 dark:hover:border-blue-600/60 dark:hover:bg-slate-900/50 dark:focus:ring-blue-500/30"
              title={isSupabaseConfigured ? 'View stored readings from Supabase' : 'Supabase is not configured'}
            >
              <FiDatabase aria-hidden="true" />
              <span>Stored Readings</span>
            </button>
            <button
              type="button"
              onClick={handleTestAlertClick}
              disabled={alertSending || !isEmailConfigured}
              className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 shadow-sm hover:border-amber-300 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/15 dark:focus:ring-amber-400/30"
              title={
                isEmailConfigured
                  ? `Send a test over-voltage alert email (threshold ${OVERVOLTAGE_THRESHOLD_V} V)`
                  : 'EmailJS is not configured. Set VITE_EMAILJS_* and VITE_ALERT_EMAIL_TO in .env'
              }
            >
              <FiMail aria-hidden="true" />
              <span>{alertSending ? 'Sending…' : 'Test alert'}</span>
            </button>
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

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <MetricCard
            title="Voltage"
            value={data.voltage}
            unit="V"
            accent="violet"
            decimals={2}
          />
          <MetricCard
            title="Current"
            value={displayedCurrent}
            unit="mA"
            accent="cyan"
            decimals={2}
          />
          <MetricCard
            title="Power"
            value={data.power}
            unit="W"
            accent="emerald"
            decimals={2}
          />
          <MetricCard
            title="Total Energy"
            value={data.energy}
            unit="kWh"
            accent="emerald"
            decimals={3}
          />
          <MetricCard
            title="Cost"
            value={
              typeof data.cost === 'number' && Number.isFinite(data.cost)
                ? `₹${data.cost.toFixed(2)}`
                : data.cost
            }
            unit=""
            accent="violet"
            decimals={2}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <MetricChart
            title="Voltage"
            unit="V"
            points={points}
            valueKey="voltage"
            isDark={isDark}
            accent="indigo"
          />
          <MetricChart
            title="Current"
            unit="mA"
            points={currentPointsMa}
            valueKey="current"
            isDark={isDark}
            accent="cyan"
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

          {confirmTestAlert && (
            <div
              role="alertdialog"
              aria-labelledby="confirm-test-alert-title"
              className="flex flex-col gap-3 rounded-xl border border-amber-400 bg-amber-100 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div id="confirm-test-alert-title" className="font-semibold">
                  Confirm test alert
                </div>
                <div className="mt-1 text-xs opacity-90">
                  This will send a TEST email simulating that voltage is above {OVERVOLTAGE_THRESHOLD_V} V.
                  No real over-voltage condition is happening. Continue?
                </div>
              </div>
              <div className="flex items-center gap-2 sm:shrink-0">
                <button
                  type="button"
                  onClick={handleConfirmTestAlert}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-500 bg-amber-500 px-3 py-1 text-xs font-medium text-white shadow-sm hover:border-amber-600 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  Send test email
                </button>
                <button
                  type="button"
                  onClick={handleCancelTestAlert}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900 shadow-sm hover:border-amber-400 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {alertStatus && (
            <div
              className={[
                'flex items-start justify-between gap-3 rounded-xl border p-3 text-sm',
                alertStatus.kind === 'success'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : alertStatus.kind === 'error'
                    ? 'border-rose-300 bg-rose-50 text-rose-800'
                    : alertStatus.kind === 'warning'
                      ? 'border-amber-400 bg-amber-100 text-amber-900'
                      : 'border-amber-300 bg-amber-50 text-amber-900',
              ].join(' ')}
              role={alertStatus.kind === 'error' || alertStatus.kind === 'warning' ? 'alert' : 'status'}
            >
              <div>
                <div className="font-semibold">
                  {alertStatus.title ??
                    (alertStatus.kind === 'success'
                      ? 'Email alert'
                      : alertStatus.kind === 'error'
                        ? 'Email alert failed'
                        : alertStatus.kind === 'warning'
                          ? 'Warning'
                          : 'Email alert')}
                </div>
                <div className="mt-1 text-xs opacity-90">{alertStatus.text}</div>
              </div>
              <button
                type="button"
                onClick={() => setAlertStatus(null)}
                className="text-xs font-medium underline-offset-2 hover:underline"
              >
                dismiss
              </button>
            </div>
          )}
        </div>

      </main>

      <StoredReadingsDialog open={readingsOpen} onClose={() => setReadingsOpen(false)} />

      <Footer />
    </div>
  )
}

