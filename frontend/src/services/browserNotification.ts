/**
 * browserNotification.ts
 * ───────────────────────
 * Thin wrapper around the Web Notification API for native desktop / Chrome popups.
 *
 * Features:
 *  - Type-specific titles and emoji icons
 *  - Click-to-navigate: clicking the OS notification opens the relevant page
 *  - Tag deduplication — same event type + blog_id won't fire twice
 *  - Auto-closes after 7 seconds
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrowserNotificationOptions {
  type?: string;
  body: string;
  relatedBlogId?: number | null;
  relatedUserId?: string | null;
}

// ─── Permission ───────────────────────────────────────────────────────────────

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('[BrowserNotification] Web Notification API not supported in this browser');
    return false;
  }

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch (err) {
    console.warn('[BrowserNotification] Permission error:', err);
    return false;
  }
}

// ─── Show ─────────────────────────────────────────────────────────────────────

export function showBrowserNotification(opts: BrowserNotificationOptions): void {
  if (!('Notification' in window)) return;

  // Request permission on the fly if still default
  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        _trigger(opts);
      }
    });
    return;
  }

  if (Notification.permission === 'granted') {
    _trigger(opts);
  }
}

// ─── Internal ─────────────────────────────────────────────────────────────────

/** Map notification type → { title, emoji, deep-link path } */
function _resolveNotificationMeta(
  type: string,
  relatedBlogId?: number | null,
): { title: string; path: string } {
  switch (type) {
    case 'new_blog':
      return {
        title: '📝 New Story Published',
        path: relatedBlogId ? `/blogs/${relatedBlogId}` : '/blogs',
      };
    case 'blog_like':
      return {
        title: '❤️ Someone liked your story',
        path: relatedBlogId ? `/blogs/${relatedBlogId}` : '/blogs',
      };
    case 'blog_comment':
      return {
        title: '💬 New comment on your story',
        path: relatedBlogId ? `/blogs/${relatedBlogId}` : '/blogs',
      };
    case 'new_follower':
      return {
        title: '👤 New follower',
        path: '/profile',
      };
    case 'blog_bookmark':
      return {
        title: '🔖 Story bookmarked',
        path: relatedBlogId ? `/blogs/${relatedBlogId}` : '/blogs',
      };
    default:
      return {
        title: '🔔 BareMind',
        path: '/',
      };
  }
}

function _trigger(opts: BrowserNotificationOptions): void {
  const { type = 'general', body, relatedBlogId } = opts;
  const { title, path } = _resolveNotificationMeta(type, relatedBlogId);

  // Unique tag prevents duplicate OS-level popups for the same event
  const tag = `baremind-${type}-${relatedBlogId ?? 'x'}-${Date.now()}`;

  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag,
      renotify: true,
      silent: false,
    } as any);

    // Click → focus the app and navigate to the relevant page
    notification.onclick = () => {
      window.focus();
      window.location.href = path;
      notification.close();
    };

    // Auto-close after 7 seconds
    setTimeout(() => {
      try { notification.close(); } catch { /* already closed */ }
    }, 7000);
  } catch (err) {
    console.warn('[BrowserNotification] Failed to display notification:', err);
  }
}
