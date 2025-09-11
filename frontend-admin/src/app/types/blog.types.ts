export interface BlogPost {
  _id: string;
  slug: string;
  title: string;
  content: string;
  description?: string;
  image?: string;
  tags: string[];
  category?: string;
  draft: boolean;
  published: string;
  language: string;
  readingTime: number;
  views: number;
  words?: number;
  excerpt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostRequest {
  slug: string;
  title: string;
  content: string;
  description?: string;
  image?: string;
  tags?: string[];
  category?: string;
  draft?: boolean;
  published: string;
  language?: string;
  readingTime?: number;
}

export interface UpdatePostRequest extends Partial<CreatePostRequest> {}

export interface PostsResponse {
  posts: BlogPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PostQuery {
  search?: string;
  category?: string;
  tag?: string;
  draft?: boolean;
  language?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
