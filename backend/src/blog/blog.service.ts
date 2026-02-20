import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import * as readingTimeLib from 'reading-time';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostDto } from './dto/query-post.dto';

@Injectable()
export class BlogService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  async create(createPostDto: CreatePostDto): Promise<Post> {
    const computedReading =
      typeof createPostDto.readingTime === 'number'
        ? createPostDto.readingTime
        : estimateReadingMinutes(createPostDto.content || '');

    // Verificar si el slug ya existe y generar uno único si es necesario
    const uniqueSlug = await this.generateUniqueSlug(createPostDto.slug);

    const createdPost = new this.postModel({
      ...createPostDto,
      slug: uniqueSlug,
      readingTime: computedReading,
      published: new Date(createPostDto.published),
    });
    return createdPost.save();
  }

  async findAll(queryDto: QueryPostDto) {
    const {
      search,
      category,
      tag,
      draft,
      language,
      page = 1,
      limit = 10,
      sortBy = 'published',
      sortOrder = 'desc',
    } = queryDto;

    console.log('BlogService.findAll - queryDto:', queryDto);
    console.log('BlogService.findAll - draft parameter:', draft, typeof draft);

    // Construir filtros
    const filter: any = {};

    // Filtrar por draft solo si se especifica explícitamente
    // Si draft es undefined, mostrar todos los posts (tanto borradores como publicados)
    if (draft === false) {
      filter.draft = false;
      console.log('Draft false - filtering only published posts');
    } else if (draft === true) {
      filter.draft = true;
      console.log('Draft true - filtering only draft posts');
    } else {
      // draft es undefined - no filtrar por draft, mostrar todos
      console.log('Draft undefined - showing all posts (drafts and published)');
    }

    if (category) {
      filter.category = category;
    }

    if (tag) {
      filter.tags = tag;
    }

    if (language) {
      filter.language = language;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    // Calcular skip para paginación
    const skip = (page - 1) * limit;

    // Construir ordenamiento
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    console.log('Final filter:', JSON.stringify(filter));
    console.log('Sort:', JSON.stringify(sort));

    // Ejecutar consulta (seleccionar solo campos necesarios para listados)
    const [posts, total] = await Promise.all([
      this.postModel
        .find(filter)
        .select(
          'slug title description image tags category draft published language readingTime content',
        )
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.postModel.countDocuments(filter).exec(),
    ]);

    console.log(`Found ${posts.length} posts, total: ${total}`);
    console.log('Posts drafts status:', posts.map(p => ({ slug: p.slug, draft: p.draft })));

    // Enriquecer con excerpt calculado si no hay descripción
    const enriched = posts.map((p: any) => {
      const excerpt = p.description || generateExcerpt(String(p.content || ''));
      const readingTime =
        typeof p.readingTime === 'number' && p.readingTime > 0
          ? p.readingTime
          : estimateReadingMinutes(String(p.content || ''));
      const words = countWords(String(p.content || ''));
      // Eliminar content del resultado
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { content, ...rest } = p;
      return { ...rest, excerpt, readingTime, words };
    });

    return {
      posts: enriched,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(slug: string): Promise<any> {
    const post = await this.postModel.findOne({ slug }).lean().exec();
    if (!post) {
      throw new NotFoundException(`Post with slug "${slug}" not found`);
    }

    // Incrementar vistas
    await this.postModel.updateOne({ slug }, { $inc: { views: 1 } }).exec();

    // Enriquecer con métricas
    const words = countWords(String(post.content || ''));
    const readingTime =
      typeof post.readingTime === 'number' && post.readingTime > 0
        ? post.readingTime
        : estimateReadingMinutes(String(post.content || ''));

    return { ...post, words, readingTime };
  }

  async update(slug: string, updatePostDto: UpdatePostDto): Promise<Post> {
    const updateData: any = { ...updatePostDto };

    // Convertir fecha si se proporciona
    if (updatePostDto.published) {
      // Aceptar string o Date, pero no forzar el tipo
      updateData.published = updatePostDto.published;
    }

    // Si image es string vacío, establecerlo explícitamente para eliminar la imagen
    if (updatePostDto.image === '') {
      updateData.image = '';
    }

    // Si no envían readingTime pero cambió el contenido, recalcular
    if (
      (updatePostDto.readingTime === undefined ||
        updatePostDto.readingTime === null) &&
      typeof updatePostDto.content === 'string'
    ) {
      updateData.readingTime = estimateReadingMinutes(updatePostDto.content);
    }

    const updatedPost = await this.postModel
      .findOneAndUpdate({ slug }, updateData, { new: true })
      .exec();

    if (!updatedPost) {
      throw new NotFoundException(`Post with slug "${slug}" not found`);
    }

    return updatedPost;
  }

  async remove(slug: string): Promise<void> {
    const result = await this.postModel.deleteOne({ slug }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Post with slug "${slug}" not found`);
    }
  }

  async getCategories(): Promise<string[]> {
    const categories = await this.postModel.distinct('category').exec();
    return categories.filter((category) => category && category.trim() !== '');
  }

  async getCategoriesWithCount(): Promise<{ name: string; count: number }[]> {
    const categories = await this.postModel
      .aggregate([
        { $match: { draft: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $project: { name: '$_id', count: 1, _id: 0 } },
      ])
      .exec();

    return categories.filter((cat) => cat.name && cat.name.trim() !== '');
  }

  async getTags(): Promise<string[]> {
    const tags = await this.postModel.distinct('tags').exec();
    return tags.filter((tag) => tag && tag.trim() !== '');
  }

  async getRecentPosts(limit: number = 5): Promise<Post[]> {
    const posts = await this.postModel
      .find({ draft: false })
      .select(
        'slug title description image tags category draft published language readingTime content',
      )
      .sort({ published: -1 })
      .limit(limit)
      .lean()
      .exec();

    return posts.map((p: any) => {
      const excerpt = p.description || generateExcerpt(String(p.content || ''));
      const readingTime =
        typeof p.readingTime === 'number' && p.readingTime > 0
          ? p.readingTime
          : estimateReadingMinutes(String(p.content || ''));
      const words = countWords(String(p.content || ''));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { content, ...rest } = p;
      return { ...rest, excerpt, readingTime, words } as any;
    });
  }

  async getRelatedPosts(slug: string, limit: number = 3): Promise<Post[]> {
    const currentPost = await this.findOne(slug);

    return this.postModel
      .find({
        slug: { $ne: slug },
        draft: false,
        $or: [
          { category: currentPost.category },
          { tags: { $in: currentPost.tags } },
        ],
      })
      .sort({ published: -1 })
      .limit(limit)
      .exec();
  }

  async checkSlugExists(slug: string): Promise<boolean> {
    const post = await this.postModel.findOne({ slug }).exec();
    return !!post;
  }

  async generateUniqueSlug(baseSlug: string): Promise<string> {
    let uniqueSlug = baseSlug;
    let counter = 1;

    while (await this.checkSlugExists(uniqueSlug)) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }

  async validateSlug(slug: string, currentSlug?: string): Promise<{ isValid: boolean; suggestedSlug?: string }> {
    const exists = await this.checkSlugExists(slug);
    
    // Si es el mismo slug del post actual (en edición), es válido
    if (currentSlug && slug === currentSlug) {
      return { isValid: true };
    }

    if (!exists) {
      return { isValid: true };
    }

    // Si existe, generar una sugerencia
    const suggestedSlug = await this.generateUniqueSlug(slug);
    return { isValid: false, suggestedSlug };
  }
}

// Helpers - strip HTML and/or Markdown to plain text
function stripToPlainText(content: string): string {
  return String(content || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/`{1,3}[^`]*`{1,3}/g, ' ')
    .replace(/!\[[^\]]*\]\([^\)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^\)]*\)/g, ' ')
    .replace(/[#>*_~`\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateExcerpt(content: string, maxLen: number = 160): string {
  const plain = stripToPlainText(content);
  if (plain.length <= maxLen) return plain;
  return plain.slice(0, maxLen).trimEnd() + '…';
}

function estimateReadingMinutes(content: string): number {
  const text = stripToPlainText(content);
  const rt = (readingTimeLib as any)(text);
  return Math.max(1, Math.round(rt.minutes));
}

function countWords(content: string): number {
  const text = stripToPlainText(content);
  return rtWordCount(text);
}

function rtWordCount(text: string): number {
  // Mismo criterio que reading-time: dividir por espacios
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}
