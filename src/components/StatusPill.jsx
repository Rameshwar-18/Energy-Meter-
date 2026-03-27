export default function StatusPill({ online }) {
  return (
    <div
      className={[
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
        online
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
          : 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200',
      ].join(' ')}
      aria-live="polite"
    >
      <span
        className={[
          'size-2 rounded-full',
          online ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-rose-500 dark:bg-rose-400',
        ].join(' ')}
        aria-hidden="true"
      />
      {online ? 'Online' : 'Offline'}
    </div>
  )
}

