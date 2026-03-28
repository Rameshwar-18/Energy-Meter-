import { useEffect, useMemo, useRef, useState } from 'react'

const BLYNK_GET = 'https://blynk.cloud/external/api/get'
const BLYNK_STATUS = 'https://blynk.cloud/external/api/isHardwareConnected'

function clientToken() {
  const t = import.meta.env.VITE_BLYNK_TOKEN
  return typeof t === 'string' ? t.trim() : ''
}

/** Production + token in bundle → talk to Blynk only (no /api spam if Netlify function is misconfigured). */
function shouldUseDirectBlynkOnly() {
  return import.meta.env.PROD && Boolean(clientToken())
}

async function fetchStatusDirect({ signal }) {
  const token = clientToken()
  const res = await fetch(`${BLYNK_STATUS}?token=${encodeURIComponent(token)}`, {
    signal,
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    throw new Error(`Blynk status ${res.status}: ${msg || res.statusText}`)
  }
  const txt = (await res.text()).trim().toLowerCase()
  return txt === 'true' || txt === '1'
}

async function fetchPinDirect({ pin, signal }) {
  const token = clientToken()
  const res = await fetch(
    `${BLYNK_GET}?token=${encodeURIComponent(token)}&${pin}`,
    { signal },
  )
  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    throw new Error(`Blynk ${res.status}: ${msg || res.statusText}`)
  }
  const txt = await res.text()
  const asNumber = Number(txt)
  return Number.isFinite(asNumber) ? asNumber : txt
}

async function fetchHardwareConnected({ signal }) {
  if (shouldUseDirectBlynkOnly()) {
    return fetchStatusDirect({ signal })
  }

  const res = await fetch('/api/blynk?status=1', { signal })
  if (res.ok) {
    const txt = (await res.text()).trim().toLowerCase()
    return txt === 'true' || txt === '1'
  }

  const token = clientToken()
  if (!token) {
    const msg = await res.text().catch(() => '')
    throw new Error(`Blynk status error ${res.status}: ${msg || res.statusText}`)
  }

  return fetchStatusDirect({ signal })
}

async function fetchPinValue({ pin, signal }) {
  if (shouldUseDirectBlynkOnly()) {
    return fetchPinDirect({ pin, signal })
  }

  const res = await fetch(`/api/blynk?pin=${pin}`, { signal })
  if (res.ok) {
    const txt = await res.text()
    const asNumber = Number(txt)
    return Number.isFinite(asNumber) ? asNumber : txt
  }

  const token = clientToken()
  if (!token) {
    const msg = await res.text().catch(() => '')
    throw new Error(`Blynk error ${res.status}: ${msg || res.statusText}`)
  }

  return fetchPinDirect({ pin, signal })
}

export default function useBlynkMetrics({
  intervalMs = 2000,
  pins = { voltage: 'V0', current: 'V1', power: 'V2' },
}) {
  const [data, setData] = useState({
    voltage: null,
    current: null,
    power: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [online, setOnline] = useState(false)

  const tickRef = useRef(0)
  const canFetch = useMemo(() => true, [])

  useEffect(() => {
    let timer = null
    const controller = new AbortController()

    const run = async () => {
      const tick = ++tickRef.current
      try {
        if (tick === 1) setLoading(true)
        setError(null)

        const [connected, voltage, current, power] = await Promise.all([
          fetchHardwareConnected({ signal: controller.signal }),
          fetchPinValue({ pin: pins.voltage, signal: controller.signal }),
          fetchPinValue({ pin: pins.current, signal: controller.signal }),
          fetchPinValue({ pin: pins.power, signal: controller.signal }),
        ])

        setData({ voltage, current, power })
        setLastUpdated(new Date())
        setOnline(Boolean(connected))
      } catch (e) {
        if (controller.signal.aborted) return
        setOnline(false)
        setError(e instanceof Error ? e : new Error('Failed to fetch data'))
      } finally {
        if (tick === 1) setLoading(false)
      }
    }

    run()
    timer = setInterval(run, intervalMs)

    return () => {
      clearInterval(timer)
      controller.abort()
    }
  }, [canFetch, intervalMs, pins.voltage, pins.current, pins.power])

  return { data, loading, error, lastUpdated, online }
}
