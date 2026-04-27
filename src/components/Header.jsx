import { FiPower } from 'react-icons/fi'

export default function Header({
  relayOn = false,
  relayDisabled = false,
  relayBusy = false,
  onToggleRelay,
}) {
  const handleClick = () => {
    if (relayDisabled || relayBusy) return
    onToggleRelay?.(!relayOn)
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="leading-tight">
          <div className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
            Smart Energy Meter Dashboard
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={relayOn}
          aria-label={relayOn ? 'Turn circuit OFF' : 'Turn circuit ON'}
          disabled={relayDisabled || relayBusy}
          onClick={handleClick}
          title={
            relayDisabled
              ? 'Relay control unavailable'
              : relayOn
                ? 'Click to turn circuit OFF'
                : 'Click to turn circuit ON'
          }
          className={[
            'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
            relayOn
              ? 'border-emerald-300 bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-300'
              : 'border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 focus:ring-blue-200',
          ].join(' ')}
        >
          <span
            className={[
              'relative inline-flex h-4 w-7 items-center rounded-full transition',
              relayOn ? 'bg-white/30' : 'bg-slate-200',
            ].join(' ')}
            aria-hidden="true"
          >
            <span
              className={[
                'inline-block h-3 w-3 transform rounded-full bg-white shadow transition',
                relayOn ? 'translate-x-3' : 'translate-x-1',
              ].join(' ')}
            />
          </span>
          <FiPower aria-hidden="true" />
          <span>
            {relayBusy ? '...' : relayOn ? 'Relay ON' : 'Relay OFF'}
          </span>
        </button>
      </div>
    </header>
  )
}
