const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function initWordReveal(el: HTMLElement): void {
  const text = (el.dataset.text ?? el.textContent ?? '').trim()
  const words = text.split(/\s+/)

  el.innerHTML =
    `<span class="sr-only">${text}</span>` +
    words
      .map(
        (w, i) =>
          `<span class="hw" aria-hidden="true" style="--wi:${i}">${w}</span>`,
      )
      .join(' ')

  if (reduced()) {
    el.querySelectorAll<HTMLElement>('.hw').forEach(s =>
      s.classList.add('hw--v'),
    )
    return
  }

  words.forEach((_, i) => {
    setTimeout(
      () =>
        (el.querySelectorAll('.hw')[i] as HTMLElement | null)?.classList.add(
          'hw--v',
        ),
      350 + i * 110,
    )
  })
}

export function initSubtitleReveal(el: HTMLElement): void {
  const delay = reduced() ? 0 : 950
  setTimeout(() => el.classList.add('hero__subtitle--v'), delay)
}

/* Los listeners globales (document/window) se registran una sola vez y
   apuntan al elemento vigente vía estas referencias — el init puede
   re-ejecutarse tras cada navegación Swup sin acumular listeners. */
let parallaxBg: HTMLElement | null = null
let parallaxAttached = false

export function initParallax(bg: HTMLElement): void {
  if (reduced()) return
  parallaxBg = bg
  if (parallaxAttached) return
  parallaxAttached = true
  let mx = 0,
    my = 0,
    sy = 0

  const update = () => {
    if (!parallaxBg) return
    parallaxBg.style.transform = `translate(${mx * 18}px, ${my * 10 + sy * 0.1}px) scale(1.12)`
  }

  document.addEventListener(
    'mousemove',
    e => {
      mx = e.clientX / window.innerWidth - 0.5
      my = e.clientY / window.innerHeight - 0.5
      requestAnimationFrame(update)
    },
    { passive: true },
  )

  window.addEventListener(
    'scroll',
    () => {
      sy = window.scrollY
      requestAnimationFrame(update)
    },
    { passive: true },
  )
}

let magneticBtn: HTMLElement | null = null
let magneticAttached = false

export function initMagnetic(btn: HTMLElement): void {
  if (reduced() || window.matchMedia('(hover: none)').matches) return
  magneticBtn = btn
  if (magneticAttached) return
  magneticAttached = true
  const R = 115,
    S = 0.38

  document.addEventListener(
    'mousemove',
    e => {
      if (!magneticBtn) return
      const r = magneticBtn.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      const d = Math.hypot(dx, dy)
      magneticBtn.style.transform =
        d < R
          ? `translate(${dx * S * (1 - d / R)}px, ${dy * S * (1 - d / R)}px)`
          : ''
    },
    { passive: true },
  )
}

let scrollCue: HTMLElement | null = null
let scrollCueAttached = false

export function initScrollCue(cue: HTMLElement): void {
  scrollCue = cue
  if (scrollCueAttached) return
  scrollCueAttached = true
  window.addEventListener(
    'scroll',
    () => {
      if (!scrollCue) return
      const gone = window.scrollY > 50
      scrollCue.style.opacity = gone ? '0' : '1'
      scrollCue.style.pointerEvents = gone ? 'none' : ''
    },
    { passive: true },
  )
}

export function initHeroAnimations(): void {
  if (typeof window === 'undefined') return

  const title = document.querySelector<HTMLElement>('[data-word-reveal]')
  const subtitle = document.querySelector<HTMLElement>('[data-subtitle-reveal]')
  const bg = document.querySelector<HTMLElement>('[data-parallax-bg]')
  const cta = document.querySelector<HTMLElement>('[data-magnetic]')
  const cue = document.querySelector<HTMLElement>('[data-scroll-cue]')

  if (title) initWordReveal(title)
  if (subtitle) initSubtitleReveal(subtitle)
  if (bg) initParallax(bg)
  if (cta) initMagnetic(cta)
  if (cue) initScrollCue(cue)
}
