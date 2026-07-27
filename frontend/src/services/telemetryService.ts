import { api } from "./api";

export interface TelemetryEvent {
  event_type: string;
  path: string;
  timestamp: string;
  data?: Record<string, any>;
}

export interface TelemetryBatch {
  session_id: string;
  events: TelemetryEvent[];
}

class TelemetryService {
  private queue: TelemetryEvent[] = [];
  private sessionId: string;
  private readonly BATCH_SIZE = 50;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.startInterval();
    
    // Attempt to flush on page hide/unload
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush(true);
        }
      });
      window.addEventListener('beforeunload', () => {
        this.flush(true);
      });
    }
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'server';
    let sid = sessionStorage.getItem('bm_telemetry_sid');
    if (!sid) {
      sid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      sessionStorage.setItem('bm_telemetry_sid', sid);
    }
    return sid;
  }

  private startInterval() {
    if (typeof window !== 'undefined') {
      this.intervalId = setInterval(() => {
        this.flush();
      }, this.FLUSH_INTERVAL);
    }
  }

  public track(eventType: string, data?: Record<string, any>) {
    this.queue.push({
      event_type: eventType,
      path: typeof window !== 'undefined' ? window.location.pathname + window.location.search : '',
      timestamp: new Date().toISOString(),
      data
    });

    if (this.queue.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  public async flush(useBeacon = false) {
    if (this.queue.length === 0) return;

    const batch: TelemetryBatch = {
      session_id: this.sessionId,
      events: [...this.queue],
    };

    // Clear queue immediately to avoid duplicate sends
    this.queue = [];

    try {
      if (useBeacon && navigator.sendBeacon) {
        // sendBeacon doesn't work well with custom headers (like auth), 
        // but it's best effort for page unload
        const blob = new Blob([JSON.stringify(batch)], { type: 'application/json' });
        navigator.sendBeacon(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/telemetry/track`, blob);
      } else {
        await api.post('/telemetry/track', batch);
      }
    } catch (error) {
      console.error('Failed to flush telemetry queue', error);
      // In a more robust system, we might push them back to the queue
      // this.queue.unshift(...batch.events);
    }
  }
}

export const telemetryService = new TelemetryService();
