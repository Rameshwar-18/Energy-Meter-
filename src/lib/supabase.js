import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: false },
    })
  : null

const TABLE = 'meter_readings'

/**
 * Insert a single reading row.
 * Values that are not finite numbers are stored as NULL.
 */
export async function insertReading({ at, voltage, current, power, energy, cost }) {
  if (!supabase) return { error: new Error('Supabase not configured') }

  const recorded_at =
    at instanceof Date ? at.toISOString() : new Date().toISOString()

  const row = {
    recorded_at,
    voltage: Number.isFinite(voltage) ? voltage : null,
    current_ma: Number.isFinite(current) ? current : null,
    power: Number.isFinite(power) ? power : null,
    energy: Number.isFinite(energy) ? energy : null,
    cost: Number.isFinite(cost) ? cost : null,
  }

  const { error } = await supabase.from(TABLE).insert(row)
  return { error }
}

/**
 * Fetch the most recent readings (default 50, ordered newest first).
 */
export async function fetchRecentReadings({ limit = 50 } = {}) {
  if (!supabase) return { data: [], error: new Error('Supabase not configured') }

  const { data, error } = await supabase
    .from(TABLE)
    .select('id, recorded_at, voltage, current_ma, power, energy, cost')
    .order('recorded_at', { ascending: false })
    .limit(limit)

  return { data: data ?? [], error }
}
