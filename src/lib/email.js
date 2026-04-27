import emailjs from '@emailjs/browser'

const SERVICE_ID = (import.meta.env.VITE_EMAILJS_SERVICE_ID ?? '').trim()
const TEMPLATE_ID = (import.meta.env.VITE_EMAILJS_TEMPLATE_ID ?? '').trim()
const PUBLIC_KEY = (import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? '').trim()
const TO_EMAIL = (import.meta.env.VITE_ALERT_EMAIL_TO ?? '').trim()

export const isEmailConfigured = Boolean(
  SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY && TO_EMAIL,
)

/**
 * Send an over-voltage alert email through EmailJS.
 *
 * Your EmailJS template can use the following variables:
 *   {{to_email}}    – recipient address
 *   {{subject}}     – mail subject
 *   {{voltage}}     – measured voltage (string, 2 decimals)
 *   {{threshold}}   – configured threshold (string)
 *   {{timestamp}}   – ISO timestamp of the event
 *   {{is_test}}     – "true" / "false"  (test button vs real alert)
 *   {{message}}     – pre-built human-readable body
 */
export async function sendOverVoltageEmail({
  voltage,
  threshold,
  isTest = false,
  at = new Date(),
} = {}) {
  if (!isEmailConfigured) {
    return {
      ok: false,
      error: new Error(
        'EmailJS is not configured. Set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY and VITE_ALERT_EMAIL_TO in .env',
      ),
    }
  }

  const v =
    typeof voltage === 'number' && Number.isFinite(voltage)
      ? voltage.toFixed(2)
      : '—'
  const t = typeof threshold === 'number' ? String(threshold) : String(threshold ?? '')
  const stamp = (at instanceof Date ? at : new Date()).toISOString()

  const subject = isTest
    ? `[TEST] Smart Energy Meter alert (Voltage ${v} V)`
    : `[ALERT] Over-voltage detected: ${v} V (> ${t} V)`

  const message = isTest
    ? `This is a TEST alert from the Smart Energy Meter dashboard.\nLatest measured voltage: ${v} V\nConfigured threshold: ${t} V\nTimestamp: ${stamp}\n\n(No fault condition is required for this test.)`
    : `Over-voltage condition detected on the Smart Energy Meter.\nMeasured voltage: ${v} V\nConfigured threshold: ${t} V\nTimestamp: ${stamp}\n\nPlease check the connected equipment.`

  const params = {
    to_email: TO_EMAIL,
    subject,
    voltage: v,
    threshold: t,
    timestamp: stamp,
    is_test: isTest ? 'true' : 'false',
    message,
  }

  try {
    const res = await emailjs.send(SERVICE_ID, TEMPLATE_ID, params, {
      publicKey: PUBLIC_KEY,
    })
    return { ok: true, status: res.status, text: res.text }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    }
  }
}
