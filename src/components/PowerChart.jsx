import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function formatTimeLabel(date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function PowerChart({ points, isDark }) {
  const data = useMemo(
    () =>
      points.map((p) => ({
        t: formatTimeLabel(p.at),
        w: p.power,
      })),
    [points],
  )

  const stroke = isDark ? 'rgba(226,232,240,0.88)' : 'rgba(79,70,229,0.9)'
  const grid = isDark ? 'rgba(148,163,184,0.14)' : 'rgba(148,163,184,0.28)'
  const axis = isDark ? 'rgba(148,163,184,0.22)' : 'rgba(100,116,139,0.30)'
  const tick = isDark ? 'rgba(226,232,240,0.70)' : 'rgba(51,65,85,0.88)'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur hover:border-slate-300 hover:bg-slate-50 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/20 dark:hover:border-slate-700 dark:hover:bg-slate-900/30 dark:hover:shadow-lg">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Power (last 60s)
          </div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Trend
          </div>
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-500">
          Updates every 2 seconds
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid
              stroke={grid}
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="t"
              tick={{ fill: tick, fontSize: 12 }}
              axisLine={{ stroke: axis }}
              tickLine={{ stroke: axis }}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: tick, fontSize: 12 }}
              axisLine={{ stroke: axis }}
              tickLine={{ stroke: axis }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(2,6,23,0.92)',
                border: '1px solid rgba(148,163,184,0.25)',
                borderRadius: 12,
                color: 'rgba(226,232,240,0.9)',
              }}
              labelStyle={{ color: 'rgba(226,232,240,0.7)' }}
              formatter={(value) => [`${Number(value).toFixed(2)} W`, 'Power']}
            />
            <Line
              type="monotone"
              dataKey="w"
              stroke={stroke}
              strokeWidth={2.5}
              dot={false}
              activeDot={{
                r: 4,
                fill: isDark ? 'rgba(226,232,240,0.95)' : 'rgba(79,70,229,0.95)',
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

