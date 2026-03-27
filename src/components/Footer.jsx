export default function Footer() {
  return (
    <footer className="border-t border-slate-200 py-6 dark:border-slate-800/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 text-center text-xs text-slate-500 sm:flex-row sm:px-6 sm:text-left">
        <div>© {new Date().getFullYear()} Smart Energy Meter Dashboard</div>
        <div className="text-slate-500">
          Built with React + Tailwind + Recharts
        </div>
      </div>
    </footer>
  )
}

