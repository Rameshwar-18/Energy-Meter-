exports.handler = async (event) => {
  try {
    const token = process.env.BLYNK_TOKEN || process.env.VITE_BLYNK_TOKEN
    const params = event.queryStringParameters || {}
    const pin = params.pin
    const status = params.status

    if (!token) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing BLYNK_TOKEN environment variable' }),
      }
    }

    // Hardware connection status (true/false).
    if (String(status) === '1') {
      const upstream = await fetch(
        `https://blynk.cloud/external/api/isHardwareConnected?token=${token}`,
      )
      const text = await upstream.text()
      return {
        statusCode: upstream.status,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: text,
      }
    }

    if (!pin || !/^V\d+$/.test(String(pin))) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid pin. Use ?pin=V0' }),
      }
    }

    const upstream = await fetch(
      `https://blynk.cloud/external/api/get?token=${token}&${pin}`,
    )
    const text = await upstream.text()
    return {
      statusCode: upstream.status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: text,
    }
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e instanceof Error ? e.message : 'Server error' }),
    }
  }
}

