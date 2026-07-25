import { api } from "./api"

export interface Category {
  id: number
  name: string
  slug: string
  description?: string
  followers_count?: number
  is_following?: boolean
}

export interface Tag {
  id: number
  name: string
  slug: string
}

export const taxonomyService = {
  getCategories: async (search?: string): Promise<Category[]> => {
    const params = new URLSearchParams()
    if (search) params.append("q", search)
    const response = await api.get(`/taxonomy/categories?${params.toString()}`)
    return response.data
  },

  followCategory: async (id: number) => {
    const response = await api.post(`/taxonomy/categories/${id}/follow`)
    return response.data
  },
  
  getCategoryWriters: async (slug: string, limit: number = 5): Promise<any[]> => {
    const response = await api.get(`/taxonomy/categories/${slug}/writers?limit=${limit}`)
    return response.data
  },
  
  getTags: async (): Promise<Tag[]> => {
    const response = await api.get("/taxonomy/tags")
    return response.data
  },

  getPopularTags: async (): Promise<Tag[]> => {
    const response = await api.get("/taxonomy/popular-tags")
    return response.data
  }
}
