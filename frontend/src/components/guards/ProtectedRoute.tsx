import { Navigate, Outlet } from "react-router-dom"
import { useSelector } from "react-redux"
import type { RootState } from "@/store"

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth)

  // ⏳ Auth is still initializing (silent refresh in-flight).
  // Don't redirect yet — wait for the cookie-based session restore to complete.
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid #f0f0f0",
            borderTopColor: "#E05A47",
            borderRadius: "50%",
            animation: "spin 0.75s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
