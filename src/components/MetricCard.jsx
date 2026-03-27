import * as Tooltip from '@radix-ui/react-tooltip'

function formatValue(value, decimals = 2) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(decimals)
  }
  return String(value)
}

export default function MetricCard({
  title,
  value,
  unit,
  icon,
  accent = 'slate',
  decimals,
  hint,
}) {
  const accentDot =
    accent === 'cyan'
      ? 'bg-cyan-400'
      : accent === 'emerald'
        ? 'bg-emerald-400'
        : accent === 'violet'
          ? 'bg-violet-400'
          : 'bg-slate-300'

  const iconShell =
    accent === 'cyan'
      ? 'border-cyan-200 bg-gradient-to-br from-cyan-100 to-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_18px_-10px_rgba(6,182,212,0.7)] dark:border-cyan-800/60 dark:from-cyan-900/50 dark:to-slate-900 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_18px_-10px_rgba(6,182,212,0.55)]'
      : accent === 'emerald'
        ? 'border-emerald-200 bg-gradient-to-br from-emerald-100 to-lime-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_18px_-10px_rgba(16,185,129,0.7)] dark:border-emerald-800/60 dark:from-emerald-900/50 dark:to-slate-900 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_18px_-10px_rgba(16,185,129,0.55)]'
        : 'border-violet-200 bg-gradient-to-br from-violet-100 to-fuchsia-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_18px_-10px_rgba(139,92,246,0.75)] dark:border-violet-800/60 dark:from-violet-900/50 dark:to-slate-900 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_18px_-10px_rgba(139,92,246,0.6)]'

  const iconColor =
    accent === 'cyan'
      ? 'text-cyan-700 dark:text-cyan-200'
      : accent === 'emerald'
        ? 'text-emerald-700 dark:text-emerald-200'
        : 'text-violet-700 dark:text-violet-200'

  return (
    <Tooltip.Provider delayDuration={250}>
      <div className="group rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/20 dark:hover:border-blue-600/60 dark:hover:bg-slate-900/30 dark:hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
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

        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <div
              className={[
                'relative grid size-12 place-items-center rounded-2xl border',
                iconShell,
              ].join(' ')}
              aria-hidden="true"
            >
              <span className="pointer-events-none absolute inset-x-2 top-1 h-1.5 rounded-full bg-white/50 dark:bg-white/10" />
              <span className={['text-[1.15rem]', iconColor].join(' ')}>
                {icon}
              </span>
            </div>
          </Tooltip.Trigger>
          {hint ? (
            <Tooltip.Portal>
              <Tooltip.Content
                sideOffset={8}
                className="z-50 max-w-[260px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg dark:border-slate-800/60 dark:bg-slate-950 dark:text-slate-200"
              >
                {hint}
                <Tooltip.Arrow className="fill-white dark:fill-slate-950" />
              </Tooltip.Content>
            </Tooltip.Portal>
          ) : null}
        </Tooltip.Root>
      </div>

      <div className="mt-4 h-px w-full bg-slate-200 dark:bg-slate-800/50" />
      <div className="mt-3 text-xs text-slate-600 dark:text-slate-500">
        Live reading (Blynk virtual pin)
      </div>
      </div>
    </Tooltip.Provider>
  )
}

