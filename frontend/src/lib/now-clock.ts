/**
 * Reloj en vivo del NowFooter (homepage).
 * Se llama desde Layout.astro en carga directa y tras transiciones Swup (content:replace).
 */
let clockTimer: ReturnType<typeof setInterval> | null = null

export function initNowClock(): void {
  if (typeof window === 'undefined') return

  // Limpiar el interval anterior (el nodo viejo quedó detached tras Swup)
  if (clockTimer) {
    clearInterval(clockTimer)
    clockTimer = null
  }

  const el = document.getElementById('now-clock')
  if (!el) return

  function tick(): void {
    if (!el) return
    const now = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }),
    )
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    el.textContent = `${hh}:${mm}:${ss}`
    el.setAttribute('datetime', now.toISOString())
  }

  tick()
  clockTimer = setInterval(tick, 1000)
}
