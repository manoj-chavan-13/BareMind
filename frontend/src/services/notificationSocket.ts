/**
 * notificationSocket.ts
 * ─────────────────────
 * Manages the WebSocket connection to the real-time notification stream.
 *
 * Features:
 *  - Auto-connects when authenticated (called from App.tsx)
 *  - Prevents redundant socket reconnect loops
 *  - Dispatches addToast + incrementUnread to Redux on new messages
 *  - Fires browser Notification API
 *  - Reconnects with exponential back-off (max 30s) on disconnect
 *  - Heartbeat ping every 25s to keep the connection alive
 */

import { store } from '@/store';
import { addToast, incrementUnread } from '@/store/slices/notificationSlice';
import { showBrowserNotification } from './browserNotification';

const WS_BASE =
  (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1')
    .replace(/^http/, 'ws')           // http → ws, https → wss
    .replace(/\/api\/v1\/?$/, '');    // strip /api/v1 — we add /api/v1/ws/...

let socket: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let pingInterval: ReturnType<typeof setInterval> | null = null;
let reconnectDelay = 1000;   // ms, doubles on each retry up to 30s
let shouldReconnect = true;

// ─── Connect ─────────────────────────────────────────────────────────────────

export function connectNotificationSocket(token: string): void {
  // If already connected or currently connecting, do not interrupt
  if (
    socket &&
    (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  shouldReconnect = true;
  _connect(token);
}

function _connect(token: string): void {
  if (socket) {
    socket.onclose = null;  // prevent old handlers from triggering
    socket.onerror = null;
    socket.close();
  }

  const url = `${WS_BASE}/api/v1/ws/notifications?token=${encodeURIComponent(token)}`;
  console.info('[NotificationSocket] Connecting to:', url);
  socket = new WebSocket(url);

  socket.onopen = () => {
    console.info('[NotificationSocket] connected successfully ✓');
    reconnectDelay = 1000;  // reset back-off
    _startPing(token);
  };

  socket.onmessage = (event: MessageEvent) => {
    try {
      if (event.data === 'pong') return;   // heartbeat reply
      const msg = JSON.parse(event.data as string);
      if (msg.event === 'notification' && msg.data) {
        console.info('[NotificationSocket] Notification received:', msg.data);
        _handleNotification(msg.data);
      }
    } catch (err) {
      console.warn('[NotificationSocket] Parse error:', err);
    }
  };

  socket.onerror = (err) => {
    console.warn('[NotificationSocket] connection error:', err);
  };

  socket.onclose = (event) => {
    _stopPing();
    console.info(`[NotificationSocket] closed (code ${event.code})`);
    if (shouldReconnect && event.code !== 1008) {
      console.info(`[NotificationSocket] Reconnecting in ${reconnectDelay}ms...`);
      reconnectTimeout = setTimeout(() => {
        const freshToken = store.getState().auth.token;
        if (freshToken) _connect(freshToken);
      }, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
    }
  };
}

// ─── Disconnect ───────────────────────────────────────────────────────────────

export function disconnectNotificationSocket(): void {
  shouldReconnect = false;
  _stopPing();
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  if (socket) {
    socket.onclose = null;
    socket.onerror = null;
    socket.close();
    socket = null;
  }
  console.info('[NotificationSocket] disconnected');
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────

function _startPing(token: string): void {
  _stopPing();
  pingInterval = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send('ping');
    } else if (shouldReconnect) {
      _stopPing();
      const freshToken = store.getState().auth.token;
      if (freshToken) _connect(freshToken);
    }
  }, 25_000);
}

function _stopPing(): void {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
}

// ─── Handle incoming notification ────────────────────────────────────────────

function _handleNotification(data: Record<string, unknown>): void {
  const toastId = `toast-${data.id || Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // 1. Add to Redux toast queue (shows pop-up toast card)
  store.dispatch(
    addToast({
      id: toastId,
      notificationId: data.id as number | undefined,
      type: (data.type as string) ?? 'general',
      content: (data.content as string) ?? '',
      related_blog_id: data.related_blog_id as number | null | undefined,
      related_user_id: data.related_user_id as string | null | undefined,
      created_at: (data.created_at as string) ?? new Date().toISOString(),
    })
  );

  // 2. Increment bell badge count
  store.dispatch(incrementUnread());

  // 3. Fire native OS / Chrome / Windows notification with rich options
  showBrowserNotification({
    type: (data.type as string) ?? 'general',
    body: (data.content as string) ?? 'You have a new activity on BareMind',
    relatedBlogId: data.related_blog_id as number | null | undefined,
    relatedUserId: data.related_user_id as string | null | undefined,
  });
}

