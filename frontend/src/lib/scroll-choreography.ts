/**
 * Coreografía de scroll para la homepage (GSAP ScrollTrigger).
 * Solo corre en / y respeta prefers-reduced-motion. Se llama desde
 * Layout.astro en carga directa y tras cada navegación Swup — las
 * instancias previas se destruyen antes de crear las nuevas para
 * evitar triggers duplicados o fugas de memoria.
 */
let triggers: Array<{ kill: () => void }> = []

/**
 * Destruye las instancias activas. Se exporta para que el dispatcher de
 * Layout.astro la llame al navegar a cualquier página vía Swup — así los
 * triggers no quedan apuntando a nodos DOM que Swup ya reemplazó.
 */
export function killScrollChoreography(): void {
  triggers.forEach((t) => t.kill())
  triggers = []
}

export async function initScrollChoreography(): Promise<void> {
  if (typeof window === 'undefined') return
  killScrollChoreography()

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const hero = document.querySelector<HTMLElement>('[data-hero]')
  const rules = document.querySelectorAll<HTMLElement>('.chapter__rule')
  if (!hero && rules.length === 0) return

  const { gsap } = await import('gsap')
  const { ScrollTrigger } = await import('gsap/ScrollTrigger')
  gsap.registerPlugin(ScrollTrigger)

  // El DOM pudo cambiar mientras se cargaban los módulos (navegación rápida)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  // Efecto 1: el hero "se aleja" cinematográficamente al salir de cuadro
  if (hero) {
    const tween = gsap.to(hero, {
      scale: 0.94,
      opacity: 0.75,
      transformOrigin: 'center top',
      ease: 'none',
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    })
    triggers.push(tween.scrollTrigger as unknown as { kill: () => void })
  }

  // Efecto 2: la regla de cada capítulo se dibuja al entrar en viewport
  rules.forEach((rule) => {
    gsap.set(rule, { scaleX: 0, transformOrigin: 'left center' })
    const tween = gsap.to(rule, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: rule,
        start: 'top 85%',
        end: 'top 55%',
        scrub: true,
      },
    })
    triggers.push(tween.scrollTrigger as unknown as { kill: () => void })
  })
}
