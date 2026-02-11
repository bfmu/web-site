import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HomepageConfig, HomepageConfigDocument } from './schemas/homepage-config.schema';
import { UpdateHomepageDto } from './dto/update-homepage.dto';

const DEFAULT_SECTIONS = [
  {
    id: 'hero',
    enabled: true,
    order: 0,
    config: {
      imageUrls: [] as string[],
      carouselIntervalSeconds: 5.5,
      heightVh: 70,
      title: 'Desarrollo, Fotografía y Reflexión',
      subtitle: 'Desarrollo soluciones. Capturo momentos. Reflexiono sobre historias. Aquí es donde todo converge.',
      ctaText: 'Explorar',
      ctaHref: '#explore',
    },
  },
  {
    id: 'intro',
    enabled: true,
    order: 1,
    config: {
      title: '¡Hola! Soy Bryan Muñoz',
      bio: 'Bienvenido a mi espacio digital, donde comparto mis proyectos, ideas y pasiones. Aquí podrás explorar mi portafolio de desarrollo, aprender con mis artículos técnicos, descubrir mis fotografías y reflexiones sobre libros y música. ¡Espero que encuentres algo que te inspire!',
      avatarUrl: '',
      ctaText: 'Ver mi trabajo',
      ctaHref: '#work',
    },
  },
  {
    id: 'secciones',
    enabled: true,
    order: 2,
    config: {
      title: 'Explora mi contenido',
      subtitle: 'Descubre mis proyectos, ideas y pasiones a través de estas secciones.',
      items: [
        { titulo: '🎧 Música que me inspira', descripcion: 'Canciones y playlists que forman parte de mi día a día.', enlace: '/music/', icono: 'music' },
        { titulo: '🌟 Exploraciones artísticas', descripcion: 'Fotografía y momentos que inspiran.', enlace: '/gallery/', icono: 'gallery' },
        { titulo: '📝 Resúmenes y opiniones', descripcion: 'Libros que leo y reflexiones sobre ellos.', enlace: '/blogs/', icono: 'blog' },
        { titulo: '📚 Guías y artículos', descripcion: 'Soluciones y optimización de procesos.', enlace: '/archive/', icono: 'archive' },
        { titulo: '💻 Portafolio', descripcion: 'Proyectos destacados de desarrollo de software.', enlace: 'https://portfolio.bfmu.dev', icono: 'portfolio' },
      ],
    },
  },
  {
    id: 'gallery-preview',
    enabled: true,
    order: 3,
    config: {
      title: 'Galería',
      ctaText: 'Ver galería completa',
      ctaHref: '/gallery/',
      albumSlugs: [] as string[],
    },
  },
  {
    id: 'ultimos-posts',
    enabled: true,
    order: 4,
    config: {
      title: 'Últimos artículos',
      subtitle: 'Explora las publicaciones más recientes de mi blog.',
      limit: 3,
      ctaText: 'Ver todos los artículos',
      ctaHref: '/blogs/',
    },
  },
  {
    id: 'now-listening',
    enabled: true,
    order: 5,
    config: {},
  },
];

@Injectable()
export class HomepageService {
  constructor(
    @InjectModel(HomepageConfig.name)
    private readonly homepageConfigModel: Model<HomepageConfigDocument>,
  ) {}

  async getConfig(): Promise<{ sections: Array<{ id: string; enabled: boolean; order: number; config: Record<string, unknown> }> }> {
    const doc = await this.homepageConfigModel.findOne().lean().exec();
    if (!doc || !doc.sections || doc.sections.length === 0) {
      return { sections: DEFAULT_SECTIONS };
    }
    const sections = [...doc.sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return { sections };
  }

  async updateConfig(dto: UpdateHomepageDto, userId: string): Promise<{ sections: Array<{ id: string; enabled: boolean; order: number; config: Record<string, unknown> }> }> {
    if (!dto.sections || dto.sections.length === 0) {
      return this.getConfig();
    }
    const sections = dto.sections.map((s, i) => ({
      id: s.id,
      enabled: s.enabled ?? true,
      order: s.order ?? i,
      config: s.config ?? {},
    }));
    await this.homepageConfigModel.findOneAndUpdate(
      {},
      { $set: { sections } },
      { new: true, upsert: true },
    );
    return this.getConfig();
  }
}
