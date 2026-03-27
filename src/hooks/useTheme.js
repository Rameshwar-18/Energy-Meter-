import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'theme'

function applyThemeToDom(theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
}

export default function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    // Default is ALWAYS light. Only switch to dark if the user chose it.
    return saved === 'light' || saved === 'dark' ? saved : 'light'
  })

  useEffect(() => {
    applyThemeToDom(theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggle = useMemo(
    () => () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    [],
  )

  return { theme, toggle, setTheme }
}

