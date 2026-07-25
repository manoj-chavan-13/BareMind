import { api } from './api';

export interface Blog {
  id: number;
  title: string;
  slug: string;
  content: string;
  is_published: boolean;
  author_id: number;
  author?: { first_name: string; last_name?: string; username?: string; avatar_url?: string };
  category_id?: number;
  category?: { id: number; name: string; slug: string };
  tags?: { id: number; name: string; slug: string }[];
  cover_image?: string;
  reading_time?: number;
  views?: number;
  likes_count?: number;
  comments_count?: number;
  is_liked_by_user?: boolean;
  is_bookmarked_by_user?: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface CreateBlogData {
  title: string;
  slug: string;
  content: string;
  is_published: boolean;
  category_id?: number;
  tags?: number[];
  cover_image?: string;
  scheduled_at?: string;
}

export const blogService = {
  async getFeed(skip = 0, limit = 100): Promise<Blog[]> {
    const response = await api.get(`/feed/?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  async getFollowingFeed(skip = 0, limit = 100): Promise<Blog[]> {
    const response = await api.get(`/feed/following?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  async getBlogs(skip = 0, limit = 100, tag?: string, category?: string, sort_by?: 'latest' | 'trending', search_query?: string): Promise<Blog[]> {
    let url = `/blogs/?skip=${skip}&limit=${limit}`;
    if (tag) url += `&tag=${encodeURIComponent(tag)}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (sort_by) url += `&sort_by=${encodeURIComponent(sort_by)}`;
    if (search_query) url += `&search_query=${encodeURIComponent(search_query)}`;
    const response = await api.get(url);
    return response.data;
  },

  async getBlog(id: number): Promise<Blog> {
    const response = await api.get(`/blogs/${id}`);
    return response.data;
  },

  async getBlogBySlug(slug: string): Promise<Blog> {
    const response = await api.get(`/blogs/slug/${slug}`);
    return response.data;
  },

  async createBlog(data: CreateBlogData): Promise<Blog> {
    const response = await api.post('/blogs/', data);
    return response.data;
  },

  async updateBlog(id: number, data: Partial<CreateBlogData>): Promise<Blog> {
    const response = await api.put(`/blogs/${id}`, data);
    return response.data;
  },

  async deleteBlog(id: number): Promise<Blog> {
    const response = await api.delete(`/blogs/${id}`);
    return response.data;
  },

  async getLikers(id: number): Promise<any[]> {
    const response = await api.get(`/blogs/${id}/likers`);
    return response.data;
  },

  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/uploads/image?folder=blog_covers', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.url;
  },

  async autoTag(title: string, content: string): Promise<{ id: number; name: string; slug: string }[]> {
    const response = await api.post('/blogs/auto-tag', { title, content });
    return response.data;
  },

  async autoCategory(title: string, content: string): Promise<{ id: number; name: string; slug: string }> {
    const response = await api.post('/blogs/auto-category', { title, content });
    return response.data;
  },
};
