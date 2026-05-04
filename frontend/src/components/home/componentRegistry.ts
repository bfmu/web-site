/**
 * IDs de secciones de la página de inicio.
 * El backend y HomeSection.astro usan estos ids para renderizar cada bloque.
 */
export const HOME_SECTION_IDS = [
  'hero',
  'now-listening',
  'actividad-reciente',
  'intro',
  'secciones',
  'gallery-preview',
  'ultimos-posts',
  'now-footer',
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export interface HomepageSection {
  id: string;
  enabled: boolean;
  order: number;
  config: Record<string, unknown>;
}

/** Configuración por defecto cuando la API no está disponible */
export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSection[] = [
  {
    id: 'hero',
    enabled: true,
    order: 0,
    config: {
      imageUrls: [] as string[],
      carouselIntervalSeconds: 5.5,
      heightVh: 70,
      title: 'Desarrollo, Fotografía y Reflexión',
      subtitle:
        'Desarrollo soluciones. Capturo momentos. Reflexiono sobre historias. Aquí es donde todo converge.',
      ctaText: 'Explorar',
      ctaHref: '#explore',
    },
  },
  {
    id: 'now-listening',
    enabled: true,
    order: 1,
    config: {},
  },
  {
    id: 'actividad-reciente',
    enabled: true,
    order: 2,
    config: {},
  },
  {
    id: 'intro',
    enabled: true,
    order: 3,
    config: {
      title: '¡Hola! Soy Bryan Muñoz',
      bio: 'Bienvenido a mi espacio digital, donde comparto mis proyectos, ideas y pasiones.',
      avatarUrl: '',
      ctaText: 'Ver mi trabajo',
      ctaHref: '#work',
    },
  },
  {
    id: 'secciones',
    enabled: true,
    order: 4,
    config: {
      title: 'Explora mi contenido',
      subtitle: 'Descubre mis proyectos, ideas y pasiones a través de estas secciones.',
      items: [
        {
          titulo: '🎧 Música que me inspira',
          descripcion: 'Canciones y playlists que forman parte de mi día a día.',
          enlace: '/music/',
          icono: 'music',
        },
        {
          titulo: '🌟 Exploraciones artísticas',
          descripcion: 'Fotografía y momentos que inspiran.',
          enlace: '/gallery/',
          icono: 'gallery',
        },
        {
          titulo: '📝 Resúmenes y opiniones',
          descripcion: 'Libros que leo y reflexiones sobre ellos.',
          enlace: '/blogs/',
          icono: 'blog',
        },
        {
          titulo: '📚 Guías y artículos',
          descripcion: 'Soluciones y optimización de procesos.',
          enlace: '/archive/',
          icono: 'archive',
        },
        {
          titulo: '📚 Libros',
          descripcion: 'Los libros que estoy leyendo y mis notas sobre ellos.',
          enlace: '/books/',
          icono: 'books',
        },
        {
          titulo: '💻 Portafolio',
          descripcion: 'Proyectos destacados de desarrollo de software.',
          enlace: 'https://portfolio.bfmu.dev',
          icono: 'portfolio',
        },
      ],
    },
  },
  {
    id: 'gallery-preview',
    enabled: true,
    order: 5,
    config: {
      title: 'Galería',
      ctaText: 'Ver galería completa',
      ctaHref: '/gallery/',
      albumSlugs: [],
    },
  },
  {
    id: 'ultimos-posts',
    enabled: true,
    order: 6,
    config: {
      title: 'Últimos artículos',
      subtitle: 'Explora las publicaciones más recientes de mi blog.',
      limit: 4,
      ctaText: 'Ver todos los artículos',
      ctaHref: '/blogs/',
    },
  },
  {
    id: 'now-footer',
    enabled: true,
    order: 7,
    config: {},
  },
];
