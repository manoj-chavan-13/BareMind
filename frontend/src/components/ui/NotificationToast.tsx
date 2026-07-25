/**
 * NotificationToast.tsx
 * ──────────────────────
 * Global animated toast container for real-time notification pop-ups.
 *
 * Features:
 *  - Shows up to 5 toasts simultaneously (bottom-right)
 *  - Auto-dismisses after 5 seconds with a progress bar countdown
 *  - Pause timer on hover
 *  - Smooth slide-in / slide-out via framer-motion
 *  - Click navigates to related blog or closes sidebar
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import { Bell, Heart, MessageSquare, UserPlus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import type { RootState } from '@/store'
import { removeToast, type ToastNotification } from '@/store/slices/notificationSlice'

// ─── Icon helpers ─────────────────────────────────────────────────────────────

function getToastMeta(type: string) {
  switch (type) {
    case 'new_follower':
      return { Icon: UserPlus, bg: 'from-blue-500 to-indigo-600', ring: 'ring-blue-200', dot: 'bg-blue-500' }
    case 'blog_like':
    case 'new_like':
      return { Icon: Heart, bg: 'from-rose-500 to-pink-600', ring: 'ring-rose-200', dot: 'bg-rose-500' }
    case 'new_comment':
      return { Icon: MessageSquare, bg: 'from-emerald-500 to-teal-600', ring: 'ring-emerald-200', dot: 'bg-emerald-500' }
    default:
      return { Icon: Bell, bg: 'from-slate-600 to-slate-700', ring: 'ring-slate-200', dot: 'bg-slate-500' }
  }
}

const TOAST_DURATION = 5000   // ms

// ─── Single Toast ─────────────────────────────────────────────────────────────

function Toast({ toast }: { toast: ToastNotification }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [progress, setProgress] = useState(100)
  const pausedRef = useRef(false)
  const startRef = useRef(Date.now())
  const remainingRef = useRef(TOAST_DURATION)
  const rafRef = useRef<number>(0)

  const dismiss = useCallback(() => {
    dispatch(removeToast(toast.id))
  }, [dispatch, toast.id])

  // ── Progress bar + auto-dismiss ───────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      if (!pausedRef.current) {
        const elapsed = Date.now() - startRef.current
        const pct = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100)
        setProgress(pct)

        if (pct <= 0) {
          dismiss()
          return
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [dismiss])

  const handleMouseEnter = () => {
    pausedRef.current = true
    remainingRef.current -= Date.now() - startRef.current
  }

  const handleMouseLeave = () => {
    startRef.current = Date.now() - (TOAST_DURATION - remainingRef.current)
    pausedRef.current = false
  }

  const handleClick = () => {
    if (toast.related_blog_id) {
      navigate(`/blogs/${toast.related_blog_id}`)
    }
    dismiss()
  }

  const { Icon, bg, ring, dot } = getToastMeta(toast.type)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.92, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', damping: 22, stiffness: 320 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="alert"
      aria-live="polite"
      className={`
        relative w-[340px] overflow-hidden
        cursor-pointer select-none
        rounded-2xl
        border border-white/20
        bg-white
        shadow-[0_8px_32px_rgba(15,23,42,0.18)]
        ring-1 ${ring}
        transition-shadow hover:shadow-[0_12px_40px_rgba(15,23,42,0.24)]
      `}
    >
      {/* ── Content ── */}
      <div className="flex items-start gap-3 p-4">
        {/* Icon badge */}
        <div className={`
          flex size-10 shrink-0 items-center justify-center
          rounded-xl bg-gradient-to-br ${bg}
          text-white shadow-sm
        `}>
          <Icon className="size-4" />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${dot} shrink-0`} />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              New Notification
            </p>
          </div>
          <p className="mt-0.5 text-[12px] font-semibold leading-snug text-slate-800 line-clamp-2">
            {toast.content}
          </p>
          <p className="mt-1 text-[9px] font-medium text-slate-400">
            Just now · BareMind
          </p>
        </div>

        {/* Dismiss button */}
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={(e) => { e.stopPropagation(); dismiss() }}
          className="
            flex size-6 shrink-0 items-center justify-center
            rounded-full text-slate-300
            transition-colors hover:bg-slate-100 hover:text-slate-600
          "
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* ── Progress bar ── */}
      <div className="absolute bottom-0 left-0 h-[3px] w-full bg-slate-100">
        <div
          className={`h-full bg-gradient-to-r ${bg} transition-none`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  )
}

// ─── Container ────────────────────────────────────────────────────────────────

export default function NotificationToastContainer() {
  const toasts = useSelector((state: RootState) => state.notifications.toasts)

  return (
    <div
      aria-label="Notification toasts"
      className="
        pointer-events-none
        fixed bottom-6 right-6
        z-[9999]
        flex flex-col-reverse gap-3
      "
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
