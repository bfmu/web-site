/**
 * Contador animado de stats del IntroPersonal (homepage).
 * Se llama desde Layout.astro en carga directa y tras transiciones Swup (content:replace).
 */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

function countUp(el: HTMLElement, target: number, duration = 1300): void {
  const start = performance.now()
  ;(function step(now: number) {
    const p = Math.min((now - start) / duration, 1)
    el.textContent = String(Math.round(easeOutCubic(p) * target))
    if (p < 1) requestAnimationFrame(step)
  })(performance.now())
}

async function fetchStatCounts(): Promise<{
  posts: number | null
  albums: number | null
  books: number | null
}> {
  const base =
    (import.meta.env.PUBLIC_BACKEND_URL as string | undefined)?.replace(
      /\/$/,
      '',
    ) ?? 'http://localhost:3000'
  const [postsRes, albumsRes, booksRes] = await Promise.allSettled([
    fetch(`${base}/api/blog?limit=1&page=1&draft=false`).then(r =>
      r.ok ? r.json() : null,
    ),
    fetch(`${base}/api/gallery/albums`).then(r => (r.ok ? r.json() : null)),
    fetch(`${base}/api/books`).then(r => (r.ok ? r.json() : null)),
  ])
  const albumsVal = albumsRes.status === 'fulfilled' ? albumsRes.value : null
  return {
    posts:
      postsRes.status === 'fulfilled'
        ? (postsRes.value?.pagination?.total ?? null)
        : null,
    albums:
      albumsVal != null
        ? albumsVal.pagination?.total || albumsVal.albums?.length || null
        : null,
    books:
      booksRes.status === 'fulfilled' && Array.isArray(booksRes.value)
        ? booksRes.value.length
        : null,
  }
}

export function initIntroStats(): void {
  if (typeof window === 'undefined') return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const root = document.querySelector<HTMLElement>('[data-stats-root]')
  if (!root) return
  // Evitar doble init sobre el mismo DOM (Swup reemplaza el nodo en cada navegación)
  if (root.dataset.statsInit === 'true') return
  root.dataset.statsInit = 'true'

  const stats = root.querySelectorAll<HTMLElement>('[data-count]')

  let intersected = false
  let fetchDone = false

  function runAnimation(): void {
    if (!intersected || !fetchDone) return
    stats.forEach(stat => {
      const target = Number.parseInt(stat.dataset.count ?? '0', 10)
      const num = stat.querySelector<HTMLElement>('[data-stat-num]')
      if (!num) return
      if (reduced) {
        num.textContent = String(target)
        return
      }
      countUp(num, target)
    })
  }

  // Fetch client-side para corregir ceros cuando el SSR no alcanzó el backend
  fetchStatCounts()
    .then(counts => {
      stats.forEach(stat => {
        const label =
          stat
            .querySelector<HTMLElement>('[data-stat-label]')
            ?.textContent?.trim() ??
          stat
            .querySelector<HTMLElement>('.about-card__stat-label')
            ?.textContent?.trim() ??
          ''
        if (label.includes('artículos') && counts.posts !== null)
          stat.dataset.count = String(counts.posts)
        if (label.includes('álbum') && counts.albums !== null)
          stat.dataset.count = String(counts.albums)
        if (label.includes('libro') && counts.books !== null)
          stat.dataset.count = String(counts.books)
      })
      fetchDone = true
      runAnimation()
    })
    .catch(() => {
      fetchDone = true
      runAnimation()
    })

  const obs = new IntersectionObserver(
    entries => {
      if (!entries[0].isIntersecting) return
      obs.disconnect()
      intersected = true
      runAnimation()
    },
    { threshold: 0.3 },
  )

  obs.observe(root)
}
