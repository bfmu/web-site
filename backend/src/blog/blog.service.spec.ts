import { Test, TestingModule } from '@nestjs/testing';
import { BlogService } from './blog.service';
import { getModelToken } from '@nestjs/mongoose';
import { Post } from './schemas/post.schema';

// Mock de Mongoose que soporta 'new' y métodos con .exec()
function createMockModel() {
  const model: any = jest.fn((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue(data),
  }));
  model.create = jest.fn();
  model.find = jest.fn();
  model.findOne = jest.fn();
  model.findOneAndUpdate = jest.fn();
  model.deleteOne = jest.fn();
  model.countDocuments = jest.fn();
  model.distinct = jest.fn();
  model.updateOne = jest.fn();
  return model;
}

describe('BlogService', () => {
  let service: BlogService;
  let model: ReturnType<typeof createMockModel>;

  beforeEach(async () => {
    const mockModel = createMockModel();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogService,
        {
          provide: getModelToken(Post.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<BlogService>(BlogService);
    model = module.get(getModelToken(Post.name));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create() debe crear un post', async () => {
    const dto = {
      slug: 'test',
      title: 'Test',
      content: '...',
      published: new Date().toISOString(),
    };
    model.create.mockResolvedValue(dto);
    // Simula new this.postModel({...}).save()
    const result = await service.create(dto as any);
    expect(result.slug).toBe(dto.slug);
    expect(result.title).toBe(dto.title);
    expect(result.content).toBe(dto.content);
    expect(new Date(result.published).toISOString()).toBe(dto.published);
  });

  it('findAll() debe devolver posts y paginación', async () => {
    model.find.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({ exec: () => Promise.resolve([{ slug: 'test' }]) }),
        }),
      }),
    });
    model.countDocuments.mockReturnValue({ exec: () => Promise.resolve(1) });
    const result = await service.findAll({} as any);
    expect(result.posts).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('findOne() debe devolver un post', async () => {
    model.findOne.mockReturnValue({
      exec: () => Promise.resolve({ slug: 'test' }),
    });
    model.updateOne.mockReturnValue({ exec: () => Promise.resolve() });
    const result = await service.findOne('test');
    expect(result.slug).toBe('test');
  });

  it('update() debe actualizar un post', async () => {
    model.findOneAndUpdate.mockReturnValue({
      exec: () => Promise.resolve({ slug: 'test', title: 'Nuevo' }),
    });
    const result = await service.update('test', { title: 'Nuevo' } as any);
    expect(result.title).toBe('Nuevo');
  });

  it('remove() debe eliminar un post', async () => {
    model.deleteOne.mockReturnValue({
      exec: () => Promise.resolve({ deletedCount: 1 }),
    });
    await expect(service.remove('test')).resolves.toBeUndefined();
  });
});
