import { useEffect, useState } from 'react'
import { FiDatabase, FiRefreshCw, FiX } from 'react-icons/fi'

import { fetchRecentReadings, isSupabaseConfigured } from '../lib/supabase.js'

function formatDateTime(value) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined) return '—'
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(decimals)
}

export default function StoredReadingsDialog({ open, onClose }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    if (!isSupabaseConfigured) {
      setError(new Error('Supabase is not configured. Check VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.'))
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await fetchRecentReadings({ limit: 100 })
    setLoading(false)
    if (err) {
      setError(err)
      return
    }
    setRows(data)
  }

  useEffect(() => {
    if (open) {
      void load()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stored-readings-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-900/40 backdrop-blur-sm dark:bg-slate-950/60"
      />

      <div className="relative z-10 flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800/60 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800/60 dark:bg-blue-900/30 dark:text-blue-200">
              <FiDatabase aria-hidden="true" />
            </span>
            <div>
              <div id="stored-readings-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Stored Readings
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Latest entries from Supabase (meter_readings)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:border-blue-600/60 dark:hover:bg-slate-900/60"
              title="Refresh"
            >
              <FiRefreshCw aria-hidden="true" className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Loading' : 'Refresh'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:border-rose-600/60 dark:hover:bg-rose-900/30 dark:hover:text-rose-200"
              title="Close"
              aria-label="Close"
            >
              <FiX aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {error && (
            <div className="m-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
              <div className="font-medium">Could not load stored readings</div>
              <div className="mt-1 text-xs text-rose-700 dark:text-rose-200/80">{error.message}</div>
            </div>
          )}

          {!error && rows.length === 0 && !loading && (
            <div className="p-10 text-center text-sm text-slate-600 dark:text-slate-400">
              No readings stored yet. Data will appear here a few seconds after the device is online.
            </div>
          )}

          {rows.length > 0 && (
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-900/80 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Recorded at</th>
                  <th className="px-4 py-2 text-right font-medium">Voltage (V)</th>
                  <th className="px-4 py-2 text-right font-medium">Current (mA)</th>
                  <th className="px-4 py-2 text-right font-medium">Power (W)</th>
                  <th className="px-4 py-2 text-right font-medium">Energy (kWh)</th>
                  <th className="px-4 py-2 text-right font-medium">Cost (₹)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-slate-100 odd:bg-white even:bg-slate-50/60 dark:border-slate-800/40 dark:odd:bg-slate-900/30 dark:even:bg-slate-900/10"
                  >
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                      {formatDateTime(row.recorded_at)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-900 dark:text-slate-100">
                      {formatNumber(row.voltage)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-900 dark:text-slate-100">
                      {formatNumber(row.current_ma)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-900 dark:text-slate-100">
                      {formatNumber(row.power)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-900 dark:text-slate-100">
                      {formatNumber(row.energy, 3)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-900 dark:text-slate-100">
                      {formatNumber(row.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-slate-200 px-5 py-2 text-right text-xs text-slate-500 dark:border-slate-800/60 dark:text-slate-400">
          {rows.length > 0 ? `Showing ${rows.length} latest readings` : ' '}
        </div>
      </div>
    </div>
  )
}
