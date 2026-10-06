// Kleiner fetch-Wrapper: gleicher Ursprung (nginx bzw. Vite-Proxy) → Session-Cookie wird automatisch mitgeschickt

export async function api(pfad, { method = 'GET', body, form } = {}) {
  const optionen = { method, headers: {} }
  if (form) {
    optionen.body = form
  } else if (body !== undefined) {
    optionen.headers['Content-Type'] = 'application/json'
    optionen.body = JSON.stringify(body)
  }
  const response = await fetch(pfad, optionen)
  let daten = {}
  try {
    daten = await response.json()
  } catch {
    daten = { success: false, message: 'Ungültige Antwort vom Server.' }
  }
  if (response.status === 401 && !pfad.startsWith('/api/login') && !location.pathname.startsWith('/login')) {
    location.href = '/login'
  }
  if (!response.ok && daten.success === undefined) daten.success = false
  return daten
}

export function datum(iso) {
  if (!iso) return '–'
  const [j, m, t] = iso.slice(0, 10).split('-')
  return `${t}.${m}.${j}`
}

export function euro(betrag) {
  if (betrag === null || betrag === undefined) return '–'
  return betrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

export function zyklusText(monate) {
  const namen = { 1: 'monatlich', 2: 'alle 2 Monate', 3: 'vierteljährlich', 6: 'halbjährlich', 12: 'jährlich', 24: 'zweijährlich', 36: 'dreijährlich', 60: 'fünfjährlich' }
  return namen[monate] || `alle ${monate} Monate`
}
