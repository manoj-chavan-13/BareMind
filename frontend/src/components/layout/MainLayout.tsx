import { Outlet, Link } from "react-router-dom"
import Navbar from "./Navbar"

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ color: "#404040", backgroundColor: "#ffffff" }}>
      <Navbar />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>

      {/* ── Minimal Footer ── */}
      <footer className="border-t border-slate-100 py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <img src="/BareMind.png" alt="BareMind" className="h-5 w-5 object-contain" />
            <span>© {new Date().getFullYear()} BareMind Platform. Free and open for developers.</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/blogs" className="hover:text-slate-700 transition-colors">Explore</Link>
            <Link to="/register" className="hover:text-slate-700 transition-colors">Join</Link>
            <Link to="/login" className="hover:text-slate-700 transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
