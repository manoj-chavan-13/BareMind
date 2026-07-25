import { api } from "./api"

export const interactionService = {
  getComments: async (blogId: number, skip = 0, limit = 100) => {
    const response = await api.get(`/interactions/blogs/${blogId}/comments`, {
      params: { skip, limit }
    })
    return response.data
  },
  
  createComment: async (blogId: number, content: string, parentId?: number) => {
    const response = await api.post(`/interactions/blogs/${blogId}/comments`, {
      content,
      parent_id: parentId
    })
    return response.data
  },
  
  toggleLike: async (blogId: number) => {
    const response = await api.post(`/interactions/blogs/${blogId}/like`)
    return response.data
  },
  
  toggleBookmark: async (blogId: number) => {
    const response = await api.post(`/interactions/blogs/${blogId}/bookmark`)
    return response.data
  },
  
  recordView: async (blogId: number) => {
    const response = await api.post(`/blogs/${blogId}/view`)
    return response.data
  }
}
