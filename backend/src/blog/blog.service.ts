import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostDto } from './dto/query-post.dto';

@Injectable()
export class BlogService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  async create(createPostDto: CreatePostDto): Promise<Post> {
    const createdPost = new this.postModel({
      ...createPostDto,
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

    // Construir filtros
    const filter: any = {};

    if (draft !== undefined) {
      filter.draft = draft;
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

    // Ejecutar consulta
    const [posts, total] = await Promise.all([
      this.postModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.postModel.countDocuments(filter).exec(),
    ]);

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(slug: string): Promise<Post> {
    const post = await this.postModel.findOne({ slug }).exec();
    if (!post) {
      throw new NotFoundException(`Post with slug "${slug}" not found`);
    }

    // Incrementar vistas
    await this.postModel.updateOne({ slug }, { $inc: { views: 1 } }).exec();

    return post;
  }

  async update(slug: string, updatePostDto: UpdatePostDto): Promise<Post> {
    const updateData = { ...updatePostDto };

    // Convertir fecha si se proporciona
    if (updatePostDto.published) {
      // Aceptar string o Date, pero no forzar el tipo
      updateData.published = updatePostDto.published;
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

  async getTags(): Promise<string[]> {
    const tags = await this.postModel.distinct('tags').exec();
    return tags.filter((tag) => tag && tag.trim() !== '');
  }

  async getRecentPosts(limit: number = 5): Promise<Post[]> {
    return this.postModel
      .find({ draft: false })
      .sort({ published: -1 })
      .limit(limit)
      .exec();
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
}
