import { api } from "./api"

export const searchService = {
  searchAll: async (q: string, limit: number = 20, type?: "users" | "blogs") => {
    let url = `/search?q=${encodeURIComponent(q)}&limit=${limit}`
    if (type) url += `&type=${type}`
    const response = await api.get(url)
    return response.data
  },

  getSuggestions: async (q: string, type?: "users" | "blogs", signal?: AbortSignal) => {
    let url = `/search/suggestions?q=${encodeURIComponent(q)}`
    if (type) url += `&type=${type}`
    const response = await api.get(url, { signal })
    return response.data
  },

  trackSearch: async (query: string, blogId?: number) => {
    if (!query) return
    try {
      await api.post('/search/track', { query, blog_id: blogId })
    } catch (error) {
      console.error("Failed to track search", error)
    }
  }
}
