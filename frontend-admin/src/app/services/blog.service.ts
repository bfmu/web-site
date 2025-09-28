import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import {
  BlogPost,
  CreatePostRequest,
  UpdatePostRequest,
  PostsResponse,
  PostQuery
} from '../types/blog.types';

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:82/api/blog';
  
  // Signals para cache y estado
  private readonly _posts = signal<BlogPost[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _totalPosts = signal(0);
  
  readonly posts = this._posts.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly totalPosts = this._totalPosts.asReadonly();

  getPosts(query: PostQuery = {}): Observable<PostsResponse> {
    this._isLoading.set(true);
    
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params = params.set(key, value.toString());
      }
    });
    
    return this.http.get<PostsResponse>(this.API_URL, { params })
      .pipe(
        tap(response => {
          this._posts.set(response.posts);
          this._totalPosts.set(response.pagination.total);
          this._isLoading.set(false);
        })
      );
  }

  getPost(slug: string): Observable<BlogPost> {
    return this.http.get<BlogPost>(`${this.API_URL}/${slug}`);
  }

  createPost(post: CreatePostRequest): Observable<BlogPost> {
    return this.http.post<BlogPost>(this.API_URL, post)
      .pipe(
        tap(newPost => {
          const currentPosts = this._posts();
          this._posts.set([newPost, ...currentPosts]);
          this._totalPosts.update(total => total + 1);
        })
      );
  }

  updatePost(slug: string, post: UpdatePostRequest): Observable<BlogPost> {
    return this.http.patch<BlogPost>(`${this.API_URL}/${slug}`, post)
      .pipe(
        tap(updatedPost => {
          const currentPosts = this._posts();
          const index = currentPosts.findIndex(p => p.slug === slug);
          if (index !== -1) {
            const newPosts = [...currentPosts];
            newPosts[index] = updatedPost;
            this._posts.set(newPosts);
          }
        })
      );
  }

  deletePost(slug: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${slug}`)
      .pipe(
        tap(() => {
          const currentPosts = this._posts();
          this._posts.set(currentPosts.filter(p => p.slug !== slug));
          this._totalPosts.update(total => total - 1);
        })
      );
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_URL}/categories`);
  }

  getTags(): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_URL}/tags`);
  }

  getRecentPosts(limit: number = 5): Observable<BlogPost[]> {
    return this.http.get<BlogPost[]>(`${this.API_URL}/recent?limit=${limit}`);
  }

  getRelatedPosts(slug: string, limit: number = 3): Observable<BlogPost[]> {
    return this.http.get<BlogPost[]>(`${this.API_URL}/related/${slug}?limit=${limit}`);
  }

  validateSlug(slug: string, currentSlug?: string): Observable<{ isValid: boolean; suggestedSlug?: string }> {
    let params = new HttpParams();
    if (currentSlug) {
      params = params.set('currentSlug', currentSlug);
    }
    
    console.log('Making request to validate slug:', slug, 'with params:', params.toString());
    
    return this.http.get<{ isValid: boolean; suggestedSlug?: string }>(
      `${this.API_URL}/validate-slug/${slug}`, 
      { params }
    ).pipe(
      tap(result => console.log('Received validation result:', result)),
      catchError(error => {
        console.error('Validation request failed:', error);
        throw error;
      })
    );
  }
}
