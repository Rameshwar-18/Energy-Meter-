import { FiMoon, FiSun } from 'react-icons/fi'

export default function Header({ theme, onToggleTheme }) {
  const isDark = theme === 'dark'

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/70 backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/80">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="leading-tight">
          <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg">
            Smart Energy Meter Dashboard
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-800/60 dark:bg-slate-900/30 dark:text-slate-200 dark:hover:border-blue-600/60 dark:hover:bg-slate-900/50 dark:hover:shadow-lg dark:focus:ring-blue-500/30"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <>
              <FiSun aria-hidden="true" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <FiMoon aria-hidden="true" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>
      </div>
    </header>
  )
}

