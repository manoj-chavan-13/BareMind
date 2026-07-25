import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useDispatch } from "react-redux"
import {
  Bell,
  Check,
  CheckCheck,
  Heart,
  MessageSquare,
  UserPlus,
  X,
  Loader2,
  RefreshCw,
  Inbox,
} from "lucide-react"

import { userService } from "@/services/userService"
import { resetUnreadCount } from "@/store/slices/notificationSlice"

interface Notification {
  id: number
  type: string
  content: string
  is_read: boolean
  created_at: string
}

interface NotificationSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const BRAND = "#E05A47"

/* =========================================================
   HELPERS
========================================================= */

function getRelativeTime(dateString: string) {
  const date = new Date(dateString)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 30) return "Just now"
  if (minutes < 1) return "Less than a minute ago"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== now.getFullYear()
        ? "numeric"
        : undefined,
  })
}

function getNotificationMeta(type: string) {
  switch (type) {
    case "new_follower":
      return {
        icon: UserPlus,
        label: "New follower",
        iconClass:
          "bg-blue-50 text-blue-600 ring-blue-100",
      }

    case "blog_like":
    case "new_like":
      return {
        icon: Heart,
        label: "New like",
        iconClass:
          "bg-rose-50 text-rose-500 ring-rose-100",
      }

    case "new_comment":
      return {
        icon: MessageSquare,
        label: "New comment",
        iconClass:
          "bg-emerald-50 text-emerald-600 ring-emerald-100",
      }

    default:
      return {
        icon: Bell,
        label: "Notification",
        iconClass:
          "bg-slate-100 text-slate-500 ring-slate-200",
      }
  }
}

/* =========================================================
   COMPONENT
========================================================= */

export default function NotificationSidebar({
  isOpen,
  onClose,
}: NotificationSidebarProps) {
  const dispatch = useDispatch()

  const [notifications, setNotifications] = useState<
    Notification[]
  >([])

  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [markingAll, setMarkingAll] = useState(false)

  const [processingIds, setProcessingIds] = useState<
    number[]
  >([])

  const [error, setError] = useState<string | null>(null)


  /* =======================================================
     DERIVED
  ======================================================= */

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) => !notification.is_read
      ).length,
    [notifications]
  )

  const hasUnread = unreadCount > 0

  /* =======================================================
     FETCH
  ======================================================= */

  const fetchNotifications = useCallback(
    async (silent = false) => {
      try {
        if (silent) {
          setRefreshing(true)
        } else {
          setLoading(true)
        }

        setError(null)

        const data =
          await userService.getNotifications()

        setNotifications(data)
      } catch (error) {
        console.error(
          "Failed to fetch notifications:",
          error
        )

        setError(
          "We couldn't load your notifications."
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    []
  )

  /* =======================================================
     OPEN / CLOSE BEHAVIOR
  ======================================================= */

  useEffect(() => {
    if (!isOpen) return

    fetchNotifications()

    // Reset the navbar bell badge to 0 when sidebar is opened
    dispatch(resetUnreadCount())

    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow = "hidden"

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    )

    return () => {
      document.body.style.overflow =
        previousOverflow

      window.removeEventListener(
        "keydown",
        handleKeyDown
      )
    }
  }, [isOpen, fetchNotifications, onClose, dispatch])

  /* =======================================================
     MARK ONE
  ======================================================= */

  async function handleMarkAsRead(id: number) {
    const target = notifications.find(
      (notification) => notification.id === id
    )

    if (!target || target.is_read) return

    /*
      Optimistic update:
      update UI immediately instead of making the
      user wait for the API.
    */

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? {
            ...notification,
            is_read: true,
          }
          : notification
      )
    )

    setProcessingIds((current) => [
      ...current,
      id,
    ])

    try {
      await userService.markNotificationAsRead(
        id
      )
    } catch (error) {
      console.error(
        "Failed to mark notification as read:",
        error
      )

      /*
        Restore unread state if API fails.
      */

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? {
              ...notification,
              is_read: false,
            }
            : notification
        )
      )
    } finally {
      setProcessingIds((current) =>
        current.filter(
          (notificationId) =>
            notificationId !== id
        )
      )
    }
  }

  /* =======================================================
     MARK ALL
  ======================================================= */

  async function handleMarkAllAsRead() {
    const unreadNotifications =
      notifications.filter(
        (notification) =>
          !notification.is_read
      )

    if (
      unreadNotifications.length === 0 ||
      markingAll
    ) {
      return
    }

    const unreadIds =
      unreadNotifications.map(
        (notification) => notification.id
      )

    /*
      Optimistically mark everything read.
    */

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        is_read: true,
      }))
    )

    try {
      setMarkingAll(true)

      /*
        Run requests concurrently instead of
        awaiting every notification sequentially.
    */

      await Promise.all(
        unreadIds.map((id) =>
          userService.markNotificationAsRead(id)
        )
      )
    } catch (error) {
      console.error(
        "Failed to mark all notifications as read:",
        error
      )

      /*
        Refresh from server so client state
        reflects what actually succeeded.
      */

      await fetchNotifications(true)
    } finally {
      setMarkingAll(false)
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* =============================================
              BACKDROP
          ============================================= */}

          <motion.button
            type="button"
            aria-label="Close notifications"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.2,
            }}
            onClick={onClose}
            className="
              fixed
              inset-0
              z-[100]
              cursor-default
              bg-slate-950/20
              backdrop-blur-[2px]
            "
          />

          {/* =============================================
              SIDEBAR
          ============================================= */}

          <motion.aside
            initial={{
              x: "100%",
            }}
            animate={{
              x: 0,
            }}
            exit={{
              x: "100%",
            }}
            transition={{
              duration: 0.28,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="
              fixed
              bottom-0
              right-0
              top-0
              z-[101]

              flex
              w-full
              flex-col

              border-l
              border-slate-200
              bg-white

              shadow-[-20px_0_60px_rgba(15,23,42,0.10)]

              sm:max-w-[420px]
            "
          >
            {/* ===========================================
                HEADER
            =========================================== */}

            <header
              className="
                shrink-0
                border-b
                border-slate-200
                bg-white
              "
            >
              <div
                className="
                  flex
                  h-[68px]
                  items-center
                  justify-between
                  px-4
                  sm:px-5
                "
              >
                {/* LEFT */}

                <div className="flex items-center gap-3">

                  <div
                    className="
                      relative
                      flex
                      size-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-[#fff1ee]
                      text-[#E05A47]
                    "
                  >
                    <Bell className="size-[17px]" />

                    {hasUnread && (
                      <span
                        className="
                          absolute
                          -right-0.5
                          -top-0.5

                          flex
                          size-3
                          items-center
                          justify-center

                          rounded-full
                          border-2
                          border-white
                          bg-[#E05A47]
                        "
                      />
                    )}
                  </div>

                  <div>

                    <div className="flex items-center gap-2">

                      <h2
                        className="
                          text-[15px]
                          font-extrabold
                          tracking-[-0.025em]
                          text-slate-950
                        "
                      >
                        Notifications
                      </h2>

                      {hasUnread && (
                        <span
                          className="
                            flex
                            min-w-5
                            items-center
                            justify-center
                            rounded-full
                            bg-[#E05A47]
                            px-1.5
                            py-0.5
                            text-[8px]
                            font-extrabold
                            text-white
                          "
                        >
                          {unreadCount > 99
                            ? "99+"
                            : unreadCount}
                        </span>
                      )}

                    </div>

                    <p
                      className="
                        mt-0.5
                        text-[9px]
                        font-medium
                        text-slate-400
                      "
                    >
                      Activity from your BareMind community
                    </p>

                  </div>

                </div>

                {/* RIGHT */}

                <div className="flex items-center gap-1">

                  <button
                    type="button"
                    onClick={() =>
                      fetchNotifications(true)
                    }
                    disabled={
                      refreshing || loading
                    }
                    title="Refresh notifications"
                    className="
                      flex
                      size-8
                      items-center
                      justify-center
                      rounded-lg

                      text-slate-400

                      transition-colors

                      hover:bg-slate-100
                      hover:text-slate-700

                      disabled:opacity-40
                    "
                  >
                    <RefreshCw
                      className={`
                        size-3.5

                        ${refreshing
                          ? "animate-spin"
                          : ""
                        }
                      `}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close notifications"
                    className="
                      flex
                      size-8
                      items-center
                      justify-center
                      rounded-lg

                      text-slate-400

                      transition-colors

                      hover:bg-slate-100
                      hover:text-slate-700
                    "
                  >
                    <X className="size-4" />
                  </button>

                </div>

              </div>

              {/* -----------------------------------------
                  SECONDARY ACTION BAR
              ----------------------------------------- */}

              {notifications.length > 0 && (
                <div
                  className="
                    flex
                    h-10
                    items-center
                    justify-between
                    border-t
                    border-slate-100
                    px-4
                    sm:px-5
                  "
                >

                  <p
                    className="
                      text-[9px]
                      font-semibold
                      text-slate-400
                    "
                  >
                    {hasUnread
                      ? `${unreadCount} unread ${unreadCount === 1
                        ? "notification"
                        : "notifications"
                      }`
                      : "You're all caught up"}
                  </p>

                  {hasUnread && (
                    <button
                      type="button"
                      onClick={
                        handleMarkAllAsRead
                      }
                      disabled={markingAll}
                      className="
                        flex
                        items-center
                        gap-1.5
                        rounded-lg
                        px-2
                        py-1.5

                        text-[9px]
                        font-bold
                        text-slate-500

                        transition

                        hover:bg-slate-100
                        hover:text-slate-900

                        disabled:opacity-50
                      "
                    >
                      {markingAll ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <CheckCheck className="size-3" />
                      )}

                      Mark all as read
                    </button>
                  )}

                </div>
              )}

            </header>

            {/* ===========================================
                CONTENT
            =========================================== */}

            <div
              className="
                min-h-0
                flex-1
                overflow-y-auto
                overscroll-contain
                bg-white

                [-ms-overflow-style:none]
                [scrollbar-width:none]
                [&::-webkit-scrollbar]:hidden
              "
            >

              {/* -----------------------------------------
                  LOADING
              ----------------------------------------- */}

              {loading ? (
                <NotificationLoading />
              ) : error ? (
                /* ---------------------------------------
                   ERROR
                --------------------------------------- */

                <ErrorState
                  message={error}
                  onRetry={() =>
                    fetchNotifications()
                  }
                />
              ) : notifications.length === 0 ? (
                /* ---------------------------------------
                   EMPTY
                --------------------------------------- */

                <EmptyState />
              ) : (
                /* ---------------------------------------
                   NOTIFICATIONS
                --------------------------------------- */

                <div>

                  {notifications.map(
                    (notification, index) => (
                      <NotificationItem
                        key={notification.id}
                        notification={
                          notification
                        }
                        processing={processingIds.includes(
                          notification.id
                        )}
                        onMarkRead={
                          handleMarkAsRead
                        }
                        isLast={
                          index ===
                          notifications.length - 1
                        }
                      />
                    )
                  )}

                </div>
              )}

            </div>

            {/* ===========================================
                FOOTER
            =========================================== */}

            {!loading &&
              !error &&
              notifications.length > 0 && (
                <footer
                  className="
                    shrink-0
                    border-t
                    border-slate-200
                    bg-white
                    px-5
                    py-3
                  "
                >
                  <p
                    className="
                      text-center
                      text-[8px]
                      font-medium
                      text-slate-400
                    "
                  >
                    You're viewing your latest BareMind activity.
                  </p>
                </footer>
              )}

          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

/* =========================================================
   NOTIFICATION ITEM
========================================================= */

function NotificationItem({
  notification,
  processing,
  onMarkRead,
  isLast,
}: {
  notification: Notification
  processing: boolean
  onMarkRead: (id: number) => void
  isLast: boolean
}) {
  const meta = getNotificationMeta(
    notification.type
  )

  const Icon = meta.icon

  const unread = !notification.is_read

  return (
    <motion.div
      layout
      initial={{
        opacity: 0,
        y: 4,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className={`
        group
        relative

        transition-colors
        duration-150

        ${unread
          ? "bg-[#fffaf9]"
          : "bg-white hover:bg-slate-50/70"
        }

        ${!isLast
          ? "border-b border-slate-100"
          : ""
        }
      `}
    >
      {/* UNREAD ACCENT */}

      {unread && (
        <div
          className="
            absolute
            bottom-0
            left-0
            top-0
            w-[2px]
            bg-[#E05A47]
          "
        />
      )}

      <div
        className="
          flex
          items-start
          gap-3
          px-4
          py-4
          sm:px-5
        "
      >

        {/* ICON */}

        <div
          className={`
            mt-0.5

            flex
            size-9
            shrink-0
            items-center
            justify-center

            rounded-full

            ring-1
            ring-inset

            ${meta.iconClass}
          `}
        >
          <Icon className="size-[15px]" />
        </div>

        {/* CONTENT */}

        <div className="min-w-0 flex-1">

          <div
            className="
              flex
              items-center
              gap-2
            "
          >

            <span
              className="
                text-[8px]
                font-extrabold
                uppercase
                tracking-[0.08em]
                text-slate-400
              "
            >
              {meta.label}
            </span>

            {unread && (
              <span
                className="
                  size-1.5
                  rounded-full
                  bg-[#E05A47]
                "
              />
            )}

          </div>

          <p
            className={`
              mt-1

              text-[12px]
              leading-[1.55]

              ${unread
                ? "font-semibold text-slate-900"
                : "font-medium text-slate-600"
              }
            `}
          >
            {notification.content}
          </p>

          <div
            className="
              mt-2
              flex
              items-center
              justify-between
              gap-3
            "
          >

            <time
              dateTime={
                notification.created_at
              }
              title={new Date(
                notification.created_at
              ).toLocaleString()}
              className="
                text-[8px]
                font-semibold
                text-slate-400
              "
            >
              {getRelativeTime(
                notification.created_at
              )}
            </time>

            {/* MARK READ */}

            {unread && (
              <button
                type="button"
                onClick={() =>
                  onMarkRead(notification.id)
                }
                disabled={processing}
                className="
                  flex
                  items-center
                  gap-1

                  rounded-md
                  px-1.5
                  py-1

                  text-[8px]
                  font-bold
                  text-slate-400

                  opacity-100

                  transition-all

                  hover:bg-[#fff1ee]
                  hover:text-[#E05A47]

                  disabled:opacity-50

                  sm:opacity-0
                  sm:group-hover:opacity-100
                  sm:focus:opacity-100
                "
              >
                {processing ? (
                  <Loader2 className="size-2.5 animate-spin" />
                ) : (
                  <Check className="size-2.5" />
                )}

                Read
              </button>
            )}

          </div>

        </div>

      </div>
    </motion.div>
  )
}

/* =========================================================
   LOADING
========================================================= */

function NotificationLoading() {
  return (
    <div>

      {[1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className="
            flex
            gap-3
            border-b
            border-slate-100
            px-5
            py-4
          "
        >

          <div
            className="
              size-9
              shrink-0
              animate-pulse
              rounded-full
              bg-slate-100
            "
          />

          <div className="flex-1">

            <div
              className="
                h-2
                w-16
                animate-pulse
                rounded-full
                bg-slate-100
              "
            />

            <div
              className="
                mt-2.5
                h-2.5
                w-[92%]
                animate-pulse
                rounded-full
                bg-slate-100
              "
            />

            <div
              className="
                mt-2
                h-2.5
                w-[65%]
                animate-pulse
                rounded-full
                bg-slate-100
              "
            />

            <div
              className="
                mt-3
                h-2
                w-12
                animate-pulse
                rounded-full
                bg-slate-100
              "
            />

          </div>

        </div>
      ))}

    </div>
  )
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyState() {
  return (
    <div
      className="
        flex
        min-h-full
        flex-col
        items-center
        justify-center
        px-8
        py-16
        text-center
      "
    >

      <div
        className="
          relative
          mb-5
          flex
          size-14
          items-center
          justify-center
          rounded-2xl
          border
          border-slate-200
          bg-slate-50
        "
      >
        <Inbox className="size-5 text-slate-400" />

        <div
          className="
            absolute
            -right-1
            -top-1
            flex
            size-5
            items-center
            justify-center
            rounded-full
            border-2
            border-white
            bg-emerald-500
            text-white
          "
        >
          <Check className="size-2.5" />
        </div>

      </div>

      <h3
        className="
          text-[14px]
          font-extrabold
          tracking-[-0.02em]
          text-slate-900
        "
      >
        You're all caught up
      </h3>

      <p
        className="
          mt-1.5
          max-w-[240px]
          text-[10px]
          font-medium
          leading-5
          text-slate-400
        "
      >
        New likes, comments, followers and other
        community activity will appear here.
      </p>

    </div>
  )
}

/* =========================================================
   ERROR
========================================================= */

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div
      className="
        flex
        min-h-full
        flex-col
        items-center
        justify-center
        px-8
        py-16
        text-center
      "
    >

      <div
        className="
          mb-4
          flex
          size-12
          items-center
          justify-center
          rounded-xl
          bg-red-50
          text-red-500
        "
      >
        <Bell className="size-5" />
      </div>

      <h3
        className="
          text-[13px]
          font-extrabold
          text-slate-900
        "
      >
        Unable to load notifications
      </h3>

      <p
        className="
          mt-1.5
          max-w-[240px]
          text-[10px]
          font-medium
          leading-5
          text-slate-400
        "
      >
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="
          mt-4
          flex
          h-8
          items-center
          gap-1.5
          rounded-lg
          border
          border-slate-200
          bg-white
          px-3

          text-[9px]
          font-bold
          text-slate-600

          shadow-sm

          transition

          hover:border-slate-300
          hover:bg-slate-50
          hover:text-slate-900
        "
      >
        <RefreshCw className="size-3" />
        Try again
      </button>

    </div>
  )
}