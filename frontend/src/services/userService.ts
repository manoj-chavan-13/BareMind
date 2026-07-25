import { api } from "./api"

export const userService = {
  /** Fetch any user profile by UUID or username — the backend handles both. */
  getUserByIdentifier: async (identifier: string) => {
    const response = await api.get(`/users/${identifier}`)
    return response.data
  },

  /** Convenience alias — same endpoint, just clearer intent. */
  getUserByUsername: async (username: string) => {
    const response = await api.get(`/users/${username}`)
    return response.data
  },

  /** @deprecated Use getUserByIdentifier instead */
  getUserProfile: async (userId: string) => {
    const response = await api.get(`/users/${userId}`)
    return response.data
  },

  getSuggestedAuthors: async (limit: number = 5, search?: string) => {
    const params = new URLSearchParams({ limit: limit.toString() })
    if (search) params.append("q", search)
    const response = await api.get(`/users/suggested-authors?${params.toString()}`)
    return response.data
  },

  updateProfile: async (data: any) => {
    const response = await api.put("/users/me", data)
    return response.data
  },

  followUser: async (identifier: string) => {
    const response = await api.post(`/users/${identifier}/follow`)
    return response.data
  },

  getFollowers: async (identifier: string, search?: string) => {
    const params = new URLSearchParams()
    if (search) params.append("q", search)
    const queryString = params.toString() ? `?${params.toString()}` : ""
    const response = await api.get(`/users/${identifier}/followers${queryString}`)
    return response.data
  },

  getFollowing: async (identifier: string, search?: string) => {
    const params = new URLSearchParams()
    if (search) params.append("q", search)
    const queryString = params.toString() ? `?${params.toString()}` : ""
    const response = await api.get(`/users/${identifier}/following${queryString}`)
    return response.data
  },

  changePassword: async (data: { current_password: string; new_password: string }) => {
    const response = await api.put("/users/me/password", data)
    return response.data
  },

  getBookmarks: async () => {
    const response = await api.get("/users/me/bookmarks")
    return response.data
  },

  getActivity: async () => {
    const response = await api.get("/users/me/activity")
    return response.data
  },

  getNotifications: async () => {
    const response = await api.get("/users/me/notifications")
    return response.data
  },

  getUnreadNotificationCount: async (): Promise<number> => {
    const response = await api.get("/users/me/notifications/unread-count")
    return response.data.unread_count ?? 0
  },

  markNotificationAsRead: async (id: number) => {
    const response = await api.put(`/users/me/notifications/${id}/read`)
    return response.data
  },

  uploadAvatar: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/uploads/image?folder=avatars', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.url;
  },
}
