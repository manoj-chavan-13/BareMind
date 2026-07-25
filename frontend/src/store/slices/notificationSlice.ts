import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface ToastNotification {
  id: string;           // unique per toast
  notificationId?: number;
  type: string;
  content: string;
  related_blog_id?: number | null;
  related_user_id?: string | null;
  created_at: string;
}

interface NotificationState {
  unreadCount: number;
  toasts: ToastNotification[];
}

const initialState: NotificationState = {
  unreadCount: 0,
  toasts: [],
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    /** Set the initial unread count fetched from the API */
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },

    /** Increment when a new notification arrives via WebSocket */
    incrementUnread: (state) => {
      state.unreadCount += 1;
    },

    /** Reset to zero when the sidebar is opened */
    resetUnreadCount: (state) => {
      state.unreadCount = 0;
    },

    /** Add a toast notification to the queue (with duplicate prevention) */
    addToast: (state, action: PayloadAction<ToastNotification>) => {
      const incoming = action.payload;

      // Check for recent duplicate content or same notificationId
      const isDuplicate = state.toasts.some(
        (t) =>
          (incoming.notificationId && t.notificationId === incoming.notificationId) ||
          (t.content === incoming.content && t.type === incoming.type)
      );

      if (isDuplicate) return;

      // Cap at 5 toasts visible at once
      if (state.toasts.length >= 5) {
        state.toasts.shift();
      }
      state.toasts.push(incoming);
    },

    /** Remove a specific toast by its id */
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },

    /** Clear all toasts */
    clearToasts: (state) => {
      state.toasts = [];
    },
  },
});

export const {
  setUnreadCount,
  incrementUnread,
  resetUnreadCount,
  addToast,
  removeToast,
  clearToasts,
} = notificationSlice.actions;

export default notificationSlice.reducer;
