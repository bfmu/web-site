import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Book, BookDocument } from './schemas/book.schema';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@Injectable()
export class BooksService {
  constructor(
    @InjectModel(Book.name) private readonly bookModel: Model<BookDocument>,
  ) {}

  async findAll(): Promise<BookDocument[]> {
    return this.bookModel
      .find()
      .sort({ readAt: -1, createdAt: -1 })
      .lean()
      .exec();
  }

  async findOne(id: string): Promise<BookDocument> {
    const book = await this.bookModel.findById(id).lean().exec();
    if (!book) throw new NotFoundException('Libro no encontrado');
    return book;
  }

  async create(dto: CreateBookDto): Promise<BookDocument> {
    const book = new this.bookModel({
      ...dto,
      readAt: dto.readAt ? new Date(dto.readAt) : undefined,
    });
    return book.save();
  }

  async update(id: string, dto: UpdateBookDto): Promise<BookDocument> {
    const update: Record<string, unknown> = { ...dto };
    if (dto.readAt) update.readAt = new Date(dto.readAt);
    const book = await this.bookModel
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .lean()
      .exec();
    if (!book) throw new NotFoundException('Libro no encontrado');
    return book;
  }

  async remove(id: string): Promise<void> {
    const result = await this.bookModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Libro no encontrado');
  }
}
