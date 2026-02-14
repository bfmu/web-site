/**
 * Inicialización del carrusel del Hero. Se llama al cargar la página principal (/)
 * tanto en carga directa como tras transiciones Swup (content:replace).
 */
function initHeroCarousel(hero: Element): void {
  const slides = hero.querySelectorAll('.hero__slide');
  const dots = hero.querySelectorAll('.hero__dot');
  const count = slides.length;
  if (count <= 1) return;

  const intervalMs = Number((hero as HTMLElement).dataset.intervalMs) || 5500;
  let current = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  function goTo(i: number): void {
    current = (i + count) % count;
    slides.forEach((s, j) => s.classList.toggle('is-active', j === current));
    dots.forEach((d, j) => d.classList.toggle('is-active', j === current));
  }

  function next(): void {
    goTo(current + 1);
  }

  function startTimer(): void {
    stopTimer();
    timer = setInterval(next, intervalMs);
  }

  function stopTimer(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      goTo(i);
      startTimer();
    });
  });

  startTimer();
}

export function initHeroPage(): void {
  if (typeof window === 'undefined') return;

  const heroes = document.querySelectorAll('[data-hero]');
  heroes.forEach(initHeroCarousel);
}
