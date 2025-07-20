import { Test, TestingModule } from '@nestjs/testing';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';

const mockBlogService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  getRecentPosts: jest.fn(),
  getCategories: jest.fn(),
  getTags: jest.fn(),
  getRelatedPosts: jest.fn(),
};

describe('BlogController', () => {
  let controller: BlogController;
  let service: typeof mockBlogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlogController],
      providers: [
        {
          provide: BlogService,
          useValue: mockBlogService,
        },
      ],
    }).compile();

    controller = module.get<BlogController>(BlogController);
    service = module.get(BlogService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create() debe delegar al servicio', async () => {
    service.create.mockResolvedValue({ slug: 'test' });
    const result = await controller.create({
      slug: 'test',
      title: 'Test',
      content: '...',
      published: new Date().toISOString(),
    } as any);
    expect(result.slug).toBe('test');
    expect(service.create).toHaveBeenCalled();
  });

  it('findAll() debe delegar al servicio', async () => {
    service.findAll.mockResolvedValue({
      posts: [{ slug: 'test' }],
      pagination: { total: 1 },
    });
    const result = await controller.findAll({} as any);
    expect(result.posts).toHaveLength(1);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('findOne() debe delegar al servicio', async () => {
    service.findOne.mockResolvedValue({ slug: 'test' });
    const result = await controller.findOne('test');
    expect(result.slug).toBe('test');
    expect(service.findOne).toHaveBeenCalledWith('test');
  });

  it('update() debe delegar al servicio', async () => {
    service.update.mockResolvedValue({ slug: 'test', title: 'Nuevo' });
    const result = await controller.update('test', { title: 'Nuevo' } as any);
    expect(result.title).toBe('Nuevo');
    expect(service.update).toHaveBeenCalled();
  });

  it('remove() debe delegar al servicio', async () => {
    service.remove.mockResolvedValue(undefined);
    await expect(controller.remove('test')).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith('test');
  });

  it('getRecentPosts() debe delegar al servicio', async () => {
    service.getRecentPosts.mockResolvedValue([{ slug: 'test' }]);
    const result = await controller.getRecentPosts('1');
    expect(result[0].slug).toBe('test');
    expect(service.getRecentPosts).toHaveBeenCalled();
  });

  it('getCategories() debe delegar al servicio', async () => {
    service.getCategories.mockResolvedValue(['General']);
    const result = await controller.getCategories();
    expect(result).toContain('General');
    expect(service.getCategories).toHaveBeenCalled();
  });

  it('getTags() debe delegar al servicio', async () => {
    service.getTags.mockResolvedValue(['tag1']);
    const result = await controller.getTags();
    expect(result).toContain('tag1');
    expect(service.getTags).toHaveBeenCalled();
  });

  it('getRelatedPosts() debe delegar al servicio', async () => {
    service.getRelatedPosts.mockResolvedValue([{ slug: 'rel' }]);
    const result = await controller.getRelatedPosts('test', '1');
    expect(result[0].slug).toBe('rel');
    expect(service.getRelatedPosts).toHaveBeenCalled();
  });
});
