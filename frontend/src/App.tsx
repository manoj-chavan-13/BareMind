import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { useEffect } from "react"
import { setCredentials, logout, setLoading, setToken } from "./store/slices/authSlice"
import { setUnreadCount } from "./store/slices/notificationSlice"
import { authService } from "./services/authService"
import { userService } from "./services/userService"
import { connectNotificationSocket, disconnectNotificationSocket } from "./services/notificationSocket"
import { requestBrowserNotificationPermission } from "./services/browserNotification"
import type { RootState } from "./store"

import AuthLayout from "./components/layout/AuthLayout"
import MainLayout from "./components/layout/MainLayout"
import Login from "./pages/auth/Login"
import Register from "./pages/auth/Register"
import VerifyEmail from "./pages/auth/VerifyEmail"
import ForgotPassword from "./pages/auth/ForgotPassword"
import ResetPassword from "./pages/auth/ResetPassword"
import ProtectedRoute from "./components/guards/ProtectedRoute"
import NotificationToastContainer from "./components/ui/NotificationToast"

import Home from "./pages/home/Home"
import Dashboard from "./pages/dashboard/Dashboard"
import BlogList from "./pages/blogs/BlogList"
import BlogView from "./pages/blogs/BlogView"
import CreateBlog from "./pages/blogs/CreateBlog"
import EditBlog from "./pages/blogs/EditBlog"
import Profile from "./pages/profile/Profile"
import Settings from "./pages/profile/Settings"
import Topics from "./pages/explore/Topics"
import TopicDetail from "./pages/explore/TopicDetail"
import Writers from "./pages/explore/Writers"
import Community from "./pages/explore/Community"

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  const dispatch = useDispatch()

  const { isLoading, isAuthenticated, token } = useSelector((state: RootState) => state.auth)

  // ── Initial auth restore ──────────────────────────────────────────────────
  useEffect(() => {
    /**
     * On app load, attempt a silent token refresh using the HttpOnly cookie.
     * This restores the session without touching localStorage.
     */
    const initAuth = async () => {
      dispatch(setLoading(true))
      try {
        const newToken = await authService.refresh()
        if (newToken) {
          dispatch(setToken(newToken))
          const user = await authService.getMe(newToken)
          dispatch(setCredentials({ user, token: newToken }))
        } else {
          dispatch(logout())
        }
      } catch {
        dispatch(logout())
      }
    }
    initAuth()

    // Prevent right-click context menu on images globally to deter saving
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName.toLowerCase() === 'img') {
        e.preventDefault()
      }
    }
    document.addEventListener("contextmenu", handleContextMenu)

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
    }
  }, [dispatch])

  // ── Single Active Session Monitor ─────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return

    const verifyActiveSession = async () => {
      try {
        await authService.getMe()
      } catch (err: any) {
        if (err?.response?.status === 401) {
          dispatch(logout())
        }
      }
    }

    const interval = setInterval(verifyActiveSession, 5000)
    window.addEventListener("focus", verifyActiveSession)

    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", verifyActiveSession)
    }
  }, [isAuthenticated, dispatch])

  // ── WebSocket lifecycle + initial unread count ────────────────────────────
  useEffect(() => {
    if (isAuthenticated && token) {
      // Connect to real-time notification stream
      connectNotificationSocket(token)

      // Fetch the initial unread count for the bell badge
      userService.getUnreadNotificationCount()
        .then((count) => dispatch(setUnreadCount(count)))
        .catch(() => { /* silently ignore if API is down */ })

      // Request browser notification permission (non-blocking, one-time)
      requestBrowserNotificationPermission()
        .then((granted) => {
          if (granted) {
            console.info('[App] Browser notifications permission granted ✓')
          }
        })
    } else {
      // Disconnect on logout
      disconnectNotificationSocket()
    }

    return () => {
      // Also disconnect on unmount (e.g., in dev hot-reload)
      // The connectNotificationSocket call in the next render will reconnect
    }
  }, [isAuthenticated, token, dispatch])

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    )
  }

  return (
    <Router>
      <ScrollToTop />

      {/* Global real-time notification toast container */}
      <NotificationToastContainer />

      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Public Main Routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/blogs" element={<BlogList />} />
          <Route path="/blogs/:slug" element={<BlogView />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/topics/:slug" element={<TopicDetail />} />
          <Route path="/writers" element={<Writers />} />
          <Route path="/community" element={<Community />} />

          {/* Public profile pages — viewable without login (e.g. /u/manojchavan) */}
          <Route path="/u/:username" element={<Profile />} />

          {/* Protected Routes inside MainLayout */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/blogs/create" element={<CreateBlog />} />
            <Route path="/blogs/edit/:id" element={<EditBlog />} />
            {/* Own profile — requires authentication */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            
            {/* Fallback for old notifications route */}
            <Route path="/notifications" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  )
}

export default App
