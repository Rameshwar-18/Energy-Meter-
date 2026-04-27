function formatValue(value, decimals = 2) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(decimals)
  }
  return String(value)
}

export default function MetricCard({ title, value, unit, accent = 'slate', decimals }) {
  const accentDot =
    accent === 'cyan'
      ? 'bg-cyan-400'
      : accent === 'emerald'
        ? 'bg-emerald-400'
        : accent === 'violet'
          ? 'bg-violet-400'
          : 'bg-slate-300'

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/20 dark:hover:border-blue-600/60 dark:hover:bg-slate-900/30 dark:hover:shadow-lg">
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <span className={['size-2 rounded-full', accentDot].join(' ')} aria-hidden="true" />
        <span>{title}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
          {formatValue(value, decimals ?? 2)}
        </div>
        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {unit}
        </div>
      </div>
    </div>
  )
}
