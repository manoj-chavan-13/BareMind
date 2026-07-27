import { useEffect, useRef, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight,
  ChevronDown,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  PenLine,
  Settings,
  User,
  X,
  Bell,
  Hash,
  Users,
  Globe,
} from "lucide-react"

import type { RootState } from "@/store"
import { logout } from "@/store/slices/authSlice"
import { resetUnreadCount } from "@/store/slices/notificationSlice"
import { authService } from "@/services/authService"
import { getUserAvatar } from "@/utils/avatar"
import NotificationSidebar from "./NotificationSidebar"

const BRAND = "#E05A47"

/* =========================================================
   NAVBAR
========================================================= */

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [visible, setVisible] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  const previousScroll = useRef(0)
  const profileRef = useRef<HTMLDivElement>(null)

  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  )

  const unreadCount = useSelector(
    (state: RootState) => state.notifications.unreadCount
  )

  const dispatch = useDispatch()
  const location = useLocation()

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const navLinks = isAuthenticated
    ? [
      {
        name: "Feed",
        path: "/blogs",
        icon: Compass,
      },
      {
        name: "Topics",
        path: "/topics",
        icon: Hash,
      },
      {
        name: "Writers",
        path: "/writers",
        icon: User,
      },
      {
        name: "Dashboard",
        path: "/dashboard",
        icon: LayoutDashboard,
      },
    ]
    : [
      {
        name: "Home",
        path: "/",
      },
      {
        name: "Feed",
        path: "/blogs",
      },
      {
        name: "Topics",
        path: "/topics",
      },
      {
        name: "Writers",
        path: "/writers",
      },
    ]

  /* =======================================================
     ACTIVE ROUTE
  ======================================================= */

  const isActiveRoute = (path: string) => {
    if (path === "/") {
      return location.pathname === "/"
    }

    if (path === "/blogs") {
      return (
        location.pathname === "/blogs" ||
        (
          location.pathname.startsWith("/blogs/") &&
          !location.pathname.startsWith("/blogs/create") &&
          !location.pathname.includes("/edit")
        )
      )
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    )
  }

  /* =======================================================
     SCROLL BEHAVIOUR
  ======================================================= */

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY

      setScrolled(currentScroll > 12)

      /*
       * Hide only after meaningful scrolling.
       * Tiny scroll movements won't make the navbar flicker.
       */
      if (currentScroll > 120) {
        const difference =
          currentScroll - previousScroll.current

        if (difference > 8) {
          setVisible(false)
          setProfileOpen(false)
          setMobileMenuOpen(false)
        }

        if (difference < -8) {
          setVisible(true)
        }
      } else {
        setVisible(true)
      }

      previousScroll.current = currentScroll
    }

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    })

    return () =>
      window.removeEventListener("scroll", handleScroll)
  }, [])

  /* =======================================================
     ROUTE CHANGE
  ======================================================= */

  useEffect(() => {
    setMobileMenuOpen(false)
    setProfileOpen(false)
  }, [location.pathname])

  /* =======================================================
     CLICK OUTSIDE PROFILE
  ======================================================= */

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      )
  }, [])

  /* =======================================================
     ESCAPE
  ======================================================= */

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false)
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscape)

    return () =>
      document.removeEventListener("keydown", handleEscape)
  }, [])

  /* =======================================================
     BODY LOCK
  ======================================================= */

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileMenuOpen])

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch {
      // Ignore error and proceed to clear local state
    } finally {
      dispatch(logout())
      setProfileOpen(false)
      setMobileMenuOpen(false)
    }
  }

  /* =======================================================
     USER
  ======================================================= */

  const avatar = getUserAvatar(
    user?.avatar_url,
    user?.username ||
    user?.first_name ||
    user?.email
  )

  const displayName =
    user?.first_name ||
    user?.username ||
    "Member"

  const profilePath = user?.username
    ? `/u/${user.username}`
    : "/profile"

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <header
        className={`
          fixed
          inset-x-0
          top-0
          z-50

          transform

          transition-[transform,background-color,border-color,box-shadow]
          duration-300
          ease-out

          ${visible
            ? "translate-y-0"
            : "-translate-y-full"
          }

          ${scrolled
            ? `
                border-b
                border-slate-200/70
                bg-white/90
                shadow-[0_1px_2px_rgba(15,23,42,0.02),0_8px_30px_rgba(15,23,42,0.035)]
                backdrop-blur-xl
              `
            : `
                border-b
                border-slate-200/50
                bg-white/80
                backdrop-blur-lg
              `
          }
        `}
      >
        <div
          className="
            mx-auto
            flex
            h-16
            max-w-[1240px]

            items-center
            justify-between

            px-4

            sm:px-6
            lg:px-8
          "
        >
          {/* =================================================
              LOGO
          ================================================= */}

          <Link
            to={isAuthenticated ? "/blogs" : "/"}
            aria-label="BareMind"
            className="
              group
              flex
              shrink-0
              items-center
              gap-2.5
            "
          >
            {/* <div
              className="
                flex
                size-9
                items-center
                justify-center

                overflow-hidden

                

                transition-transform
                duration-200

                group-hover:scale-[1.03]
              "
            >
              <img
                src="/BareMind.png"
                alt=""
                className="
                  h-full
                  w-full
                  object-contain
                "
              />
            </div> */}

            <img
              src="/baremind-text.png"
              alt="BareMind"
              className="
                h-[22px]
                w-auto
                object-contain

                sm:h-6
              "
            />
          </Link>

          {/* =================================================
              DESKTOP NAVIGATION
          ================================================= */}

          <nav
            className="
              absolute
              left-1/2

              hidden
              -translate-x-1/2

              items-center

              rounded-full

              border
              border-slate-200/70

              bg-slate-50/70

              p-1

              md:flex
            "
          >
            {navLinks.map((link) => {
              const active =
                isActiveRoute(link.path)

              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`
                    relative

                    flex
                    h-8
                    items-center
                    justify-center

                    rounded-full

                    px-4

                    text-[11px]
                    font-bold

                    transition-all
                    duration-200

                    ${active
                      ? `
                          bg-white
                          text-slate-950
                          shadow-[0_1px_3px_rgba(15,23,42,0.08)]
                        `
                      : `
                          text-slate-500
                          hover:text-slate-900
                        `
                    }
                  `}
                >
                  {link.name}
                </Link>
              )
            })}
          </nav>

          {/* =================================================
              DESKTOP ACTIONS
          ================================================= */}

          <div
            className="
              hidden
              items-center
              gap-2

              md:flex
            "
          >
            {isAuthenticated ? (
              <>
                {/* WRITE */}

                <Link
                  to="/blogs/create"
                  className="
                    group

                    flex
                    h-9
                    items-center
                    justify-center

                    gap-1.5

                    rounded-full

                    bg-slate-950

                    px-4

                    text-[10px]
                    font-extrabold
                    text-white

                    shadow-sm

                    transition-all
                    duration-200

                    hover:bg-[#E05A47]
                    hover:shadow-md
                  "
                >
                  <PenLine
                    className="
                      size-3.5

                      transition-transform

                      group-hover:-rotate-6
                    "
                  />

                  Write
                </Link>

                {/* NOTIFICATIONS */}
                <button
                  id="navbar-notifications-btn"
                  onClick={() => {
                    setIsNotificationsOpen(true)
                    dispatch(resetUnreadCount())
                  }}
                  className="
                    relative
                    flex
                    size-9
                    items-center
                    justify-center
                    rounded-full
                    text-slate-500
                    transition-colors
                    hover:bg-slate-50
                    hover:text-slate-900
                  "
                  aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                >
                  <Bell className="size-4" />

                  {/* Unread badge */}
                  <AnimatePresence>
                    {unreadCount > 0 && (
                      <motion.span
                        key="badge"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 400 }}
                        className="
                          absolute
                          -right-0.5
                          -top-0.5
                          flex
                          min-w-[16px]
                          items-center
                          justify-center
                          rounded-full
                          border-2
                          border-white
                          bg-[#E05A47]
                          px-1
                          text-[8px]
                          font-extrabold
                          leading-none
                          text-white
                          shadow-sm
                          h-4
                        "
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>

                {/* PROFILE */}

                <div
                  ref={profileRef}
                  className="relative"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setProfileOpen(
                        (previous) => !previous
                      )
                    }
                    aria-expanded={profileOpen}
                    aria-label="Open account menu"
                    className={`
                      flex
                      h-10
                      items-center

                      gap-2

                      rounded-full

                      border

                      pl-1
                      pr-2.5

                      transition-all
                      duration-200

                      ${profileOpen
                        ? `
                            border-slate-300
                            bg-slate-50
                          `
                        : `
                            border-transparent
                            bg-transparent
                            hover:border-slate-200
                            hover:bg-slate-50
                          `
                      }
                    `}
                  >
                    <div
                      className="
                        size-8
                        shrink-0

                        overflow-hidden

                        rounded-full

                        bg-[#fff0ee]

                        ring-1
                        ring-slate-200
                      "
                    >
                      <img
                        src={avatar}
                        alt={displayName}
                        className="
                          h-full
                          w-full
                          object-cover
                        "
                      />
                    </div>

                    <div
                      className="
                        hidden
                        max-w-[100px]
                        text-left

                        lg:block
                      "
                    >
                      <p
                        className="
                          truncate

                          text-[10px]
                          font-extrabold
                          leading-none
                          text-slate-800
                        "
                      >
                        {displayName}
                      </p>

                      {user?.username && (
                        <p
                          className="
                            mt-1

                            truncate

                            text-[8px]
                            font-medium
                            leading-none
                            text-slate-400
                          "
                        >
                          @{user.username}
                        </p>
                      )}
                    </div>

                    <ChevronDown
                      className={`
                        size-3
                        text-slate-400

                        transition-transform
                        duration-200

                        ${profileOpen
                          ? "rotate-180"
                          : ""
                        }
                      `}
                    />
                  </button>

                  {/* =========================================
                      PROFILE DROPDOWN
                  ========================================= */}

                  <div
                    className={`
                      absolute
                      right-0
                      top-[calc(100%+10px)]

                      w-[230px]

                      origin-top-right

                      overflow-hidden

                      rounded-2xl

                      border
                      border-slate-200/80

                      bg-white

                      shadow-[0_20px_60px_rgba(15,23,42,0.14)]

                      transition-all
                      duration-150

                      ${profileOpen
                        ? `
                            visible
                            translate-y-0
                            scale-100
                            opacity-100
                          `
                        : `
                            invisible
                            -translate-y-1
                            scale-[0.98]
                            opacity-0
                          `
                      }
                    `}
                  >
                    {/* ACCOUNT */}

                    <div
                      className="
                        flex
                        items-center
                        gap-3

                        border-b
                        border-slate-100

                        px-4
                        py-4
                      "
                    >
                      <div
                        className="
                          size-10
                          shrink-0

                          overflow-hidden

                          rounded-full

                          bg-[#fff0ee]

                          ring-1
                          ring-slate-200
                        "
                      >
                        <img
                          src={avatar}
                          alt={displayName}
                          className="
                            h-full
                            w-full
                            object-cover
                          "
                        />
                      </div>

                      <div className="min-w-0">
                        <p
                          className="
                            truncate

                            text-[11px]
                            font-extrabold
                            text-slate-900
                          "
                        >
                          {displayName}
                        </p>

                        <p
                          className="
                            mt-0.5
                            truncate

                            text-[9px]
                            font-medium
                            text-slate-400
                          "
                        >
                          {user?.username
                            ? `@${user.username}`
                            : user?.email}
                        </p>
                      </div>
                    </div>

                    {/* LINKS */}

                    <div className="p-2">
                      <Link
                        to={profilePath}
                        className="
                          flex
                          h-9
                          items-center

                          gap-2.5

                          rounded-xl

                          px-3

                          text-[10px]
                          font-bold
                          text-slate-600

                          transition-colors

                          hover:bg-slate-50
                          hover:text-slate-950
                        "
                      >
                        <User className="size-3.5" />

                        Profile
                      </Link>

                      <Link
                        to="/dashboard"
                        className="
                          flex
                          h-9
                          items-center

                          gap-2.5

                          rounded-xl

                          px-3

                          text-[10px]
                          font-bold
                          text-slate-600

                          transition-colors

                          hover:bg-slate-50
                          hover:text-slate-950
                        "
                      >
                        <LayoutDashboard className="size-3.5" />

                        Dashboard
                      </Link>

                      <Link
                        to="/settings"
                        className="
                          flex
                          h-9
                          items-center

                          gap-2.5

                          rounded-xl

                          px-3

                          text-[10px]
                          font-bold
                          text-slate-600

                          transition-colors

                          hover:bg-slate-50
                          hover:text-slate-950
                        "
                      >
                        <Settings className="size-3.5" />

                        Settings
                      </Link>
                    </div>

                    {/* LOGOUT */}

                    <div
                      className="
                        border-t
                        border-slate-100

                        p-2
                      "
                    >
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="
                          flex
                          h-9
                          w-full
                          items-center

                          gap-2.5

                          rounded-xl

                          px-3

                          text-[10px]
                          font-bold
                          text-slate-500

                          transition-colors

                          hover:bg-red-50
                          hover:text-red-600
                        "
                      >
                        <LogOut className="size-3.5" />

                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* LOGIN */}

                <Link
                  to="/login"
                  className="
                    flex
                    h-9
                    items-center
                    justify-center

                    rounded-full

                    px-3

                    text-[10px]
                    font-bold
                    text-slate-600

                    transition-colors

                    hover:bg-slate-50
                    hover:text-slate-950
                  "
                >
                  Sign in
                </Link>

                {/* JOIN */}

                <Link
                  to="/register"
                  className="
                    group

                    flex
                    h-9
                    items-center
                    justify-center

                    gap-1.5

                    rounded-full

                    bg-slate-950

                    px-4

                    text-[10px]
                    font-extrabold
                    text-white

                    shadow-sm

                    transition-all

                    hover:bg-[#E05A47]
                    hover:shadow-md
                  "
                >
                  Join free

                  <ArrowRight
                    className="
                      size-3

                      transition-transform

                      group-hover:translate-x-0.5
                    "
                  />
                </Link>
              </>
            )}
          </div>

          {/* =================================================
              MOBILE RIGHT
          ================================================= */}

          <div
            className="
              flex
              items-center
              gap-1.5

              md:hidden
            "
          >
            {isAuthenticated && (
              <Link
                to="/blogs/create"
                aria-label="Write story"
                className="
                  flex
                  size-9
                  items-center
                  justify-center

                  rounded-full

                  bg-slate-950

                  text-white

                  shadow-sm

                  transition

                  active:scale-95
                "
              >
                <PenLine className="size-3.5" />
              </Link>
            )}

            {/* Mobile Bell */}
            {isAuthenticated && (
              <button
                type="button"
                id="mobile-notifications-btn"
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                onClick={() => {
                  setIsNotificationsOpen(true)
                  dispatch(resetUnreadCount())
                }}
                className="
                  relative
                  flex
                  size-9
                  items-center
                  justify-center
                  rounded-full
                  text-slate-600
                  transition-colors
                  hover:bg-slate-100
                "
              >
                <Bell className="size-4" />
                <AnimatePresence>
                  {unreadCount > 0 && (
                    <motion.span
                      key="mobile-badge"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', damping: 15, stiffness: 400 }}
                      className="
                        absolute
                        -right-0.5
                        -top-0.5
                        flex
                        h-4
                        min-w-[16px]
                        items-center
                        justify-center
                        rounded-full
                        border-2
                        border-white
                        bg-[#E05A47]
                        px-1
                        text-[8px]
                        font-extrabold
                        leading-none
                        text-white
                      "
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            )}

            <button
              type="button"
              aria-label={
                mobileMenuOpen
                  ? "Close navigation"
                  : "Open navigation"
              }
              aria-expanded={mobileMenuOpen}
              onClick={() =>
                setMobileMenuOpen(
                  (previous) => !previous
                )
              }
              className="
                flex
                size-9
                items-center
                justify-center

                rounded-full

                text-slate-600

                transition-colors

                hover:bg-slate-100
                hover:text-slate-950
              "
            >
              {mobileMenuOpen ? (
                <X className="size-4.5" />
              ) : (
                <Menu className="size-4.5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          MOBILE BACKDROP
      ===================================================== */}

      <div
        onClick={() =>
          setMobileMenuOpen(false)
        }
        className={`
          fixed
          inset-0
          z-40

          bg-slate-950/15

          backdrop-blur-[2px]

          transition-opacity
          duration-200

          md:hidden

          ${mobileMenuOpen
            ? `
                visible
                opacity-100
              `
            : `
                invisible
                opacity-0
                pointer-events-none
              `
          }
        `}
      />

      {/* =====================================================
          MOBILE MENU
      ===================================================== */}

      <div
        className={`
          fixed
          inset-x-3
          top-[72px]
          z-50

          origin-top

          overflow-hidden

          rounded-[22px]

          border
          border-slate-200/80

          bg-white

          shadow-[0_24px_80px_rgba(15,23,42,0.18)]

          transition-all
          duration-200
          ease-out

          md:hidden

          ${mobileMenuOpen
            ? `
                visible
                translate-y-0
                scale-100
                opacity-100
              `
            : `
                invisible
                -translate-y-2
                scale-[0.98]
                opacity-0
                pointer-events-none
              `
          }
        `}
      >
        {/* ===============================================
            AUTHENTICATED USER HEADER
        =============================================== */}

        {isAuthenticated && (
          <Link
            to={profilePath}
            className="
              flex
              items-center
              gap-3

              border-b
              border-slate-100

              px-4
              py-4

              transition-colors

              hover:bg-slate-50
            "
          >
            <div
              className="
                size-11
                shrink-0

                overflow-hidden

                rounded-full

                bg-[#fff0ee]

                ring-1
                ring-slate-200
              "
            >
              <img
                src={avatar}
                alt={displayName}
                className="
                  h-full
                  w-full
                  object-cover
                "
              />
            </div>

            <div className="min-w-0 flex-1">
              <p
                className="
                  truncate

                  text-[12px]
                  font-extrabold
                  text-slate-900
                "
              >
                {displayName}
              </p>

              <p
                className="
                  mt-0.5
                  truncate

                  text-[9px]
                  font-medium
                  text-slate-400
                "
              >
                {user?.username
                  ? `@${user.username}`
                  : user?.email}
              </p>
            </div>

            <ArrowRight
              className="
                size-3.5
                shrink-0
                text-slate-300
              "
            />
          </Link>
        )}

        {/* ===============================================
            NAVIGATION
        =============================================== */}

        <nav className="p-2">
          {navLinks.map((link) => {
            const active =
              isActiveRoute(link.path)

            const Icon =
              "icon" in link
                ? link.icon
                : undefined

            return (
              <Link
                key={link.name}
                to={link.path}
                className={`
                  flex
                  min-h-11
                  items-center

                  gap-3

                  rounded-xl

                  px-3.5

                  text-[11px]
                  font-bold

                  transition-colors

                  ${active
                    ? `
                        bg-slate-950
                        text-white
                      `
                    : `
                        text-slate-600
                        hover:bg-slate-50
                        hover:text-slate-950
                      `
                  }
                `}
              >
                {Icon && (
                  <Icon
                    className={`
                      size-4

                      ${active
                        ? "text-white"
                        : "text-slate-400"
                      }
                    `}
                  />
                )}

                {link.name}

                {active && (
                  <span
                    className="
                      ml-auto

                      size-1.5

                      rounded-full

                      bg-[#E05A47]
                    "
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* ===============================================
            AUTH ACTIONS
        =============================================== */}

        {isAuthenticated ? (
          <>
            <div
              className="
                mx-2
                h-px
                bg-slate-100
              "
            />

            <div className="p-2">
              <Link
                to="/blogs/create"
                className="
                  flex
                  min-h-11
                  items-center

                  gap-3

                  rounded-xl

                  px-3.5

                  text-[11px]
                  font-bold
                  text-slate-600

                  transition-colors

                  hover:bg-slate-50
                  hover:text-slate-950
                "
              >
                <PenLine className="size-4 text-slate-400" />

                Write a story
              </Link>

              <Link
                to="/settings"
                className="
                  flex
                  min-h-11
                  items-center

                  gap-3

                  rounded-xl

                  px-3.5

                  text-[11px]
                  font-bold
                  text-slate-600

                  transition-colors

                  hover:bg-slate-50
                  hover:text-slate-950
                "
              >
                <Settings className="size-4 text-slate-400" />

                Settings
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="
                  flex
                  min-h-11
                  w-full
                  items-center

                  gap-3

                  rounded-xl

                  px-3.5

                  text-[11px]
                  font-bold
                  text-slate-500

                  transition-colors

                  hover:bg-red-50
                  hover:text-red-600
                "
              >
                <LogOut className="size-4" />

                Sign out
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              className="
                mx-2
                h-px
                bg-slate-100
              "
            />

            <div
              className="
                grid
                grid-cols-2
                gap-2

                p-3
              "
            >
              <Link
                to="/login"
                className="
                  flex
                  h-11
                  items-center
                  justify-center

                  rounded-xl

                  border
                  border-slate-200

                  bg-white

                  text-[10px]
                  font-extrabold
                  text-slate-700

                  transition-colors

                  hover:bg-slate-50
                "
              >
                Sign in
              </Link>

              <Link
                to="/register"
                className="
                  flex
                  h-11
                  items-center
                  justify-center

                  gap-1.5

                  rounded-xl

                  bg-slate-950

                  text-[10px]
                  font-extrabold
                  text-white

                  shadow-sm

                  transition-colors

                  hover:bg-[#E05A47]
                "
              >
                Join free

                <ArrowRight className="size-3" />
              </Link>
            </div>
          </>
        )}
      </div>

      <NotificationSidebar 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
      />
    </>
  )
}