import { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"
import { Link } from "react-router-dom"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  FileText,
  Heart,
  LayoutGrid,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  PenLine,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react"

import type { RootState } from "@/store"
import { blogService, type Blog } from "@/services/blogService"
import { UserListModal } from "@/components/UserListModal"

/* =========================================================
   CONFIG
========================================================= */

const BRAND = "#E05A47"

const TABS = ["Stories", "Analytics", "Activity"] as const
type Tab = (typeof TABS)[number]

type StoryFilter = "all" | "published" | "drafts"

/* =========================================================
   HELPERS
========================================================= */

const readTime = (content = "") => {
  const words = content
    .trim()
    .split(/\s+/)
    .filter(Boolean).length

  return Math.max(1, Math.ceil(words / 200))
}

const fmtNum = (value = 0) =>
  new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value)

const fmtDate = (date?: string) => {
  if (!date) return "—"

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const fmtShortDate = (date?: string) => {
  if (!date) return "—"

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

const excerpt = (content = "", max = 100) => {
  const clean = content
    .replace(/[#*_`[\]()\n>!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!clean) return "No preview available."

  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

/* =========================================================
   DASHBOARD
========================================================= */

export default function Dashboard() {
  const { user } = useSelector((state: RootState) => state.auth)

  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)

  const [tab, setTab] = useState<Tab>("Stories")

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<StoryFilter>("all")

  const [deleteTarget, setDeleteTarget] = useState<Blog | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [likersTarget, setLikersTarget] = useState<Blog | null>(null)
  const [likersData, setLikersData] = useState<any[]>([])
  const [loadingLikers, setLoadingLikers] = useState(false)

  /* -------------------------
     LOAD STORIES
  ------------------------- */

  useEffect(() => {
    if (!user) return

    const load = async () => {
      setLoading(true)

      try {
        const all = await blogService.getBlogs()

        const ownBlogs = all
          .filter(
            (blog) =>
              String(blog.author_id) === String(user.id)
          )
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )

        setBlogs(ownBlogs)
      } catch (error) {
        console.error("Failed to load dashboard blogs:", error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user])

  /* -------------------------
     DELETE
  ------------------------- */

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      setDeletingId(deleteTarget.id)

      await blogService.deleteBlog(deleteTarget.id)

      setBlogs((prev) =>
        prev.filter((blog) => blog.id !== deleteTarget.id)
      )

      setDeleteTarget(null)
    } catch (error) {
      console.error("Failed to delete story:", error)
    } finally {
      setDeletingId(null)
    }
  }

  /* -------------------------
     LIKERS
  ------------------------- */

  const openLikers = async (blog: Blog) => {
    setLikersTarget(blog)
    setLoadingLikers(true)

    try {
      const data = await blogService.getLikers(blog.id)
      setLikersData(data)
    } catch {
      setLikersData([])
    } finally {
      setLoadingLikers(false)
    }
  }

  /* -------------------------
     DERIVED DATA
  ------------------------- */

  const published = useMemo(
    () => blogs.filter((blog) => blog.is_published),
    [blogs]
  )

  const drafts = useMemo(
    () => blogs.filter((blog) => !blog.is_published),
    [blogs]
  )

  const totalViews = useMemo(
    () =>
      published.reduce(
        (total, blog) => total + (blog.views ?? 0),
        0
      ),
    [published]
  )

  const totalLikes = useMemo(
    () =>
      published.reduce(
        (total, blog) => total + (blog.likes_count ?? 0),
        0
      ),
    [published]
  )

  const totalComments = useMemo(
    () =>
      published.reduce(
        (total, blog) => total + (blog.comments_count ?? 0),
        0
      ),
    [published]
  )

  const avgViews = published.length
    ? Math.round(totalViews / published.length)
    : 0

  const engagementRate =
    totalViews > 0
      ? Math.min(
        100,
        Math.round(
          ((totalLikes + totalComments) / totalViews) * 100
        )
      )
      : 0

  const bestStory = useMemo(() => {
    return [...published].sort(
      (a, b) => (b.views ?? 0) - (a.views ?? 0)
    )[0]
  }, [published])

  const visibleBlogs = useMemo(() => {
    const query = search.trim().toLowerCase()

    return blogs.filter((blog) => {
      const matchesSearch =
        !query ||
        blog.title.toLowerCase().includes(query) ||
        blog.category?.name?.toLowerCase().includes(query)

      const matchesFilter =
        filter === "all"
          ? true
          : filter === "published"
            ? blog.is_published
            : !blog.is_published

      return matchesSearch && matchesFilter
    })
  }, [blogs, search, filter])

  const userName =
    user?.first_name ||
    user?.email?.split("@")[0] ||
    "Writer"

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-slate-950">

      {/* =====================================================
          DELETE DIALOG
      ===================================================== */}

      {deleteTarget && (
        <DeleteDialog
          blog={deleteTarget}
          loading={deletingId === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onDelete={handleDelete}
        />
      )}

      {/* =====================================================
          CREATOR HEADER
      ===================================================== */}

      <CreatorHeader
        userName={userName}
        tab={tab}
        setTab={setTab}
        stories={blogs.length}
        views={totalViews}
        likes={totalLikes}
        engagement={engagementRate}
      />

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <main className="mx-auto w-full max-w-[1380px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        {tab === "Stories" && (
          <StoriesTab
            blogs={visibleBlogs}
            loading={loading}
            search={search}
            filter={filter}
            totalCount={blogs.length}
            publishedCount={published.length}
            draftCount={drafts.length}
            bestStory={bestStory}
            onSearch={setSearch}
            onFilter={setFilter}
            onDelete={setDeleteTarget}
            onOpenLikers={openLikers}
          />
        )}

        {tab === "Analytics" && (
          <AnalyticsTab
            published={published}
            drafts={drafts}
            totalViews={totalViews}
            totalLikes={totalLikes}
            totalComments={totalComments}
            avgViews={avgViews}
            engagementRate={engagementRate}
          />
        )}

        {tab === "Activity" && (
          <ActivityTab
            blogs={published}
            onOpenLikers={openLikers}
          />
        )}
      </main>

      {/* =====================================================
          LIKERS
      ===================================================== */}

      {likersTarget && (
        <UserListModal
          title={`Likes · ${likersTarget.title}`}
          users={likersData}
          loading={loadingLikers}
          currentUser={user}
          onClose={() => setLikersTarget(null)}
          emptyMessage="No likes yet."
        />
      )}
    </div>
  )
}

/* =========================================================
   HEADER
========================================================= */

function CreatorHeader({
  userName,
  tab,
  setTab,
  stories,
  views,
  likes,
  engagement,
}: {
  userName: string
  tab: Tab
  setTab: (tab: Tab) => void
  stories: number
  views: number
  likes: number
  engagement: number
}) {
  return (
    <header className="relative overflow-hidden border-b border-slate-200 bg-white">

      {/* Atmospheric glow orbs */}
      <div className="pointer-events-none absolute -right-32 -top-32 size-[420px] rounded-full bg-[#E05A47]/10 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-20 left-1/4 size-[320px] rounded-full bg-orange-500/10 blur-[80px]" />

      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent 40px),
                            repeating-linear-gradient(90deg, #000 0px, #000 1px, transparent 1px, transparent 40px)`,
        }}
      />

      <div className="relative mx-auto max-w-[1380px] px-4 sm:px-6 lg:px-8">

        {/* Top row */}

        <div className="flex flex-col gap-6 pb-6 pt-8 lg:flex-row lg:items-center lg:justify-between">

          <div className="min-w-0">
            {/* Label */}
            <div className="mb-3 flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-[#FFF0ED] ring-1 ring-[#E05A47]/20">
                <Sparkles className="size-3.5 text-[#E05A47]" />
              </div>

              <span className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                Creator Studio
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-[28px] font-black leading-[1.1] tracking-[-0.04em] text-slate-950 sm:text-[36px]">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-[#E05A47] to-[#f07060] bg-clip-text text-transparent">
                {userName}
              </span>
              .
            </h1>

            <p className="mt-2.5 max-w-md text-[11px] font-medium leading-5 text-slate-500">
              Manage your writing, understand your audience and keep
              publishing on BareMind.
            </p>
          </div>

          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center">

            {/* Stat pills */}
            <div className="grid grid-cols-4 divide-x divide-slate-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
              <HeaderMetric label="Stories"    value={fmtNum(stories)}     />
              <HeaderMetric label="Views"      value={fmtNum(views)}       />
              <HeaderMetric label="Likes"      value={fmtNum(likes)}       />
              <HeaderMetric label="Engagement" value={`${engagement}%`}    />
            </div>

            <Link
              to="/blogs/create"
              className="group inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#E05A47] px-4 text-[11px] font-extrabold text-white shadow-[0_8px_24px_rgba(224,90,71,0.35)] transition-all hover:-translate-y-px hover:bg-[#d04a37] hover:shadow-[0_12px_32px_rgba(224,90,71,0.45)]">
              <PenLine className="size-3.5" />
              Write story
              <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Tab nav */}

        <nav className="flex items-center gap-1 border-t border-slate-100">
          {TABS.map((item) => {
            const active = item === tab

            return (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`relative flex shrink-0 items-center gap-2 px-3 pb-3.5 pt-3 text-[10px] font-extrabold transition-colors
                  ${ active ? "text-slate-950" : "text-slate-400 hover:text-slate-700" }`}
              >
                {item === "Stories"   && <LayoutGrid className="size-3.5" />}
                {item === "Analytics" && <BarChart3   className="size-3.5" />}
                {item === "Activity"  && <Activity    className="size-3.5" />}
                {item}
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[#E05A47]" />
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[68px] px-3 py-2.5 sm:min-w-[78px]">
      <p className="text-[13px] font-black tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  )
}

/* =========================================================
   STORIES
========================================================= */

function StoriesTab({
  blogs,
  loading,
  search,
  filter,
  totalCount,
  publishedCount,
  draftCount,
  bestStory,
  onSearch,
  onFilter,
  onDelete,
  onOpenLikers,
}: {
  blogs: Blog[]
  loading: boolean
  search: string
  filter: StoryFilter
  totalCount: number
  publishedCount: number
  draftCount: number
  bestStory?: Blog
  onSearch: (value: string) => void
  onFilter: (value: StoryFilter) => void
  onDelete: (blog: Blog) => void
  onOpenLikers: (blog: Blog) => void
}) {
  return (
    <div>

      {/* Section heading */}

      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-black tracking-[-0.025em] text-slate-950">
            Your stories
          </h2>

          <p className="mt-1 text-[11px] font-medium text-slate-500">
            Draft, publish and manage everything you've written.
          </p>
        </div>

        <Link
          to="/blogs/create"
          className="hidden items-center gap-1.5 text-[10px] font-extrabold text-slate-500 transition-colors hover:text-[#E05A47] md:flex"
        >
          New story
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Top story */}

      {bestStory && !loading && (
        <TopStory blog={bestStory} />
      )}

      {/* Toolbar */}

      <div className="mt-5 flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex items-center gap-1 overflow-x-auto">
          <FilterButton
            active={filter === "all"}
            label="All stories"
            count={totalCount}
            onClick={() => onFilter("all")}
          />

          <FilterButton
            active={filter === "published"}
            label="Published"
            count={publishedCount}
            onClick={() => onFilter("published")}
          />

          <FilterButton
            active={filter === "drafts"}
            label="Drafts"
            count={draftCount}
            onClick={() => onFilter("drafts")}
          />
        </div>

        <div className="relative w-full lg:w-[290px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />

          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by title or category"
            className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-9 text-[11px] font-semibold text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition-all placeholder:font-medium placeholder:text-slate-400 hover:border-slate-400 focus:border-[#E05A47] focus:ring-4 focus:ring-[#E05A47]/10"
          />

          {search && (
            <button
              onClick={() => onSearch("")}
              className="absolute right-3 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Story list */}

      <div className="mt-4">
        {loading && <StoriesSkeleton />}

        {!loading && blogs.length === 0 && (
          <StoriesEmpty
            searching={Boolean(search)}
            search={search}
            filter={filter}
            onClear={() => onSearch("")}
          />
        )}

        {!loading && blogs.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

            {/* Desktop headings */}

            <div className="hidden grid-cols-[minmax(320px,1fr)_110px_80px_80px_90px_110px_104px] items-center gap-3 border-b border-slate-200 bg-[#FCFCFB] px-5 py-3 lg:grid">
              {[
                "Story",
                "Status",
                "Views",
                "Likes",
                "Comments",
                "Published",
                "",
              ].map((heading, index) => (
                <span
                  key={`${heading}-${index}`}
                  className={`text-[8px] font-black uppercase tracking-[0.13em] text-slate-400 ${index === 6 ? "text-right" : ""
                    }`}
                >
                  {heading}
                </span>
              ))}
            </div>

            <div className="divide-y divide-slate-100">
              {blogs.map((blog) => (
                <StoryRow
                  key={blog.id}
                  blog={blog}
                  onDelete={onDelete}
                  onOpenLikers={onOpenLikers}
                />
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-[#FCFCFB] px-5 py-3">
              <span className="text-[9px] font-semibold text-slate-400">
                Showing {blogs.length}{" "}
                {blogs.length === 1 ? "story" : "stories"}
              </span>

              <Link
                to="/blogs/create"
                className="group flex items-center gap-1.5 text-[9px] font-extrabold text-slate-600 transition hover:text-[#E05A47]"
              >
                Create story

                <ArrowUpRight className="size-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* =========================================================
   TOP STORY
========================================================= */

function TopStory({ blog }: { blog: Blog }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="absolute inset-y-0 left-0 w-[3px] bg-[#E05A47]" />

      <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

        <div className="flex min-w-0 items-center gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF3F0] text-[#E05A47]">
            <TrendingUp className="size-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black uppercase tracking-[0.15em] text-[#E05A47]">
                Top performing story
              </span>

              <span className="size-1 rounded-full bg-slate-300" />

              <span className="text-[8px] font-bold text-slate-400">
                {fmtDate(blog.created_at)}
              </span>
            </div>

            <Link
              to={`/blogs/${blog.slug}`}
              className="mt-1 block truncate text-[12px] font-black tracking-tight text-slate-900 transition-colors hover:text-[#E05A47] sm:text-[13px]"
            >
              {blog.title}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-5 pl-14 sm:pl-0">
          <SmallMetric
            icon={<Eye className="size-3" />}
            value={fmtNum(blog.views ?? 0)}
            label="Views"
          />

          <SmallMetric
            icon={<Heart className="size-3" />}
            value={fmtNum(blog.likes_count ?? 0)}
            label="Likes"
          />

          <Link
            to={`/blogs/${blog.slug}`}
            className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-[#E05A47]/30 hover:bg-[#FFF5F2] hover:text-[#E05A47]"
          >
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function SmallMetric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[11px] font-black text-slate-800">
        <span className="text-slate-400">{icon}</span>
        {value}
      </div>

      <p className="mt-0.5 text-[7px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  )
}

/* =========================================================
   FILTER
========================================================= */

function FilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-[9px] font-extrabold transition-all ${active
          ? "bg-slate-900 text-white shadow-sm"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        }`}
    >
      {label}

      <span
        className={`rounded-full px-1.5 py-0.5 text-[7px] ${active
            ? "bg-white/10 text-white/80"
            : "bg-slate-100 text-slate-400"
          }`}
      >
        {count}
      </span>
    </button>
  )
}

/* =========================================================
   STORY ROW
========================================================= */

function StoryRow({
  blog,
  onDelete,
  onOpenLikers,
}: {
  blog: Blog
  onDelete: (blog: Blog) => void
  onOpenLikers: (blog: Blog) => void
}) {
  const cover =
    (blog as any).cover_image_url ||
    blog.cover_image

  return (
    <article className="group relative px-4 py-4 transition-colors hover:bg-[#FCFCFB] sm:px-5 lg:grid lg:grid-cols-[minmax(320px,1fr)_110px_80px_80px_90px_110px_104px] lg:items-center lg:gap-3 lg:py-3">

      {/* Story */}

      <div className="flex min-w-0 items-center gap-3">
        <Link
          to={`/blogs/${blog.slug}`}
          className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:size-14"
        >
          {cover ? (
            <>
              <img
                src={cover}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              <div className="absolute inset-0 ring-1 ring-inset ring-black/[0.03]" />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#F7F7F5]">
              <FileText className="size-4 text-slate-300" />
            </div>
          )}
        </Link>

        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5">
            {blog.category?.name && (
              <>
                <span className="max-w-[120px] truncate text-[8px] font-black uppercase tracking-[0.08em] text-[#E05A47]">
                  {blog.category.name}
                </span>

                <span className="size-0.5 rounded-full bg-slate-300" />
              </>
            )}

            <span className="flex items-center gap-1 text-[8px] font-semibold text-slate-400">
              <Clock3 className="size-2.5" />
              {readTime(blog.content)} min
            </span>
          </div>

          <Link to={`/blogs/${blog.slug}`}>
            <h3 className="line-clamp-1 text-[12px] font-black tracking-[-0.01em] text-slate-900 transition-colors group-hover:text-[#E05A47] sm:text-[13px]">
              {blog.title}
            </h3>
          </Link>

          <p className="mt-0.5 hidden max-w-xl truncate text-[9px] font-medium text-slate-400 sm:block">
            {excerpt(blog.content)}
          </p>
        </div>
      </div>

      {/* Desktop */}

      <div className="hidden lg:block">
        <StatusBadge published={blog.is_published} />
      </div>

      <MetricCell
        icon={<Eye className="size-3" />}
        value={fmtNum(blog.views ?? 0)}
      />

      <button
        onClick={() => onOpenLikers(blog)}
        className="hidden items-center gap-1.5 text-[10px] font-extrabold text-slate-600 transition-colors hover:text-[#E05A47] lg:flex"
      >
        <Heart className="size-3 text-slate-300" />
        {fmtNum(blog.likes_count ?? 0)}
      </button>

      <MetricCell
        icon={<MessageSquare className="size-3" />}
        value={fmtNum(blog.comments_count ?? 0)}
      />

      <div className="hidden text-[9px] font-semibold text-slate-400 lg:block">
        {fmtDate(blog.created_at)}
      </div>

      {/* Mobile metadata */}

      <div className="mt-3 flex flex-wrap items-center gap-3 pl-[60px] text-[9px] font-semibold text-slate-400 sm:pl-[68px] lg:hidden">
        <StatusBadge published={blog.is_published} />

        <span className="flex items-center gap-1">
          <Eye className="size-3" />
          {fmtNum(blog.views ?? 0)}
        </span>

        <button
          onClick={() => onOpenLikers(blog)}
          className="flex items-center gap-1 transition hover:text-[#E05A47]"
        >
          <Heart className="size-3" />
          {fmtNum(blog.likes_count ?? 0)}
        </button>

        <span className="flex items-center gap-1">
          <MessageSquare className="size-3" />
          {fmtNum(blog.comments_count ?? 0)}
        </span>

        <span className="flex items-center gap-1">
          <CalendarDays className="size-3" />
          {fmtShortDate(blog.created_at)}
        </span>
      </div>

      {/* Actions */}

      <div className="mt-3 flex items-center gap-1 pl-[60px] sm:pl-[68px] lg:mt-0 lg:justify-end lg:pl-0">
        <Link
          to={`/blogs/edit/${blog.id}`}
          className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[8px] font-extrabold text-slate-500 transition hover:bg-[#FFF3F0] hover:text-[#E05A47]"
        >
          <Edit3 className="size-3" />
          Edit
        </Link>

        <Link
          to={`/blogs/${blog.slug}`}
          title="Open story"
          className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <ArrowUpRight className="size-3.5" />
        </Link>

        <button
          onClick={() => onDelete(blog)}
          title="Delete story"
          className="flex size-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </article>
  )
}

function MetricCell({
  icon,
  value,
}: {
  icon: React.ReactNode
  value: string
}) {
  return (
    <div className="hidden items-center gap-1.5 text-[10px] font-extrabold text-slate-600 lg:flex">
      <span className="text-slate-300">
        {icon}
      </span>

      {value}
    </div>
  )
}

/* =========================================================
   STATUS
========================================================= */

function StatusBadge({
  published,
}: {
  published: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[8px] font-extrabold ${published
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
        }`}
    >
      {published ? (
        <Check className="size-2.5" />
      ) : (
        <span className="size-1.5 rounded-full bg-amber-500" />
      )}

      {published ? "Published" : "Draft"}
    </span>
  )
}

/* =========================================================
   ANALYTICS
========================================================= */

function AnalyticsTab({
  published,
  drafts,
  totalViews,
  totalLikes,
  totalComments,
  avgViews,
  engagementRate,
}: {
  published: Blog[]
  drafts: Blog[]
  totalViews: number
  totalLikes: number
  totalComments: number
  avgViews: number
  engagementRate: number
}) {
  // Recent 8 stories performance
  const recentStories = useMemo(() => {
    return [...published]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8)
      .reverse() // chronological order for chart left-to-right
      .map((blog) => ({
        name: blog.title.length > 20 ? `${blog.title.slice(0, 20)}…` : blog.title,
        views: blog.views ?? 0,
        engagement: (blog.likes_count ?? 0) + (blog.comments_count ?? 0),
      }))
  }, [published])

  const topStories = useMemo(
    () =>
      [...published]
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
        .slice(0, 5),
    [published]
  )

  const contentMix = [
    { name: "Published", value: published.length, color: BRAND },
    { name: "Drafts", value: drafts.length, color: "#CBD5E1" },
  ].filter((item) => item.value > 0)

  if (!published.length) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <BarChart3 className="mx-auto mb-3 size-8 text-slate-300" />
        <h3 className="text-[13px] font-black text-slate-700">No data yet</h3>
        <p className="mt-1 text-[10px] text-slate-400">Publish your first story to see analytics.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Heading */}
      <div className="mb-7">
        <h2 className="text-lg font-black tracking-[-0.025em] text-slate-950">
          Analytics
        </h2>
        <p className="mt-1 text-[11px] font-medium text-slate-500">
          Understand how your published stories are performing.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 border-y border-slate-200 sm:grid-cols-4">
        <AnalyticsMetric
          label="Total views"
          value={fmtNum(totalViews)}
          icon={<Eye className="size-3.5" />}
        />
        <AnalyticsMetric
          label="Total likes"
          value={fmtNum(totalLikes)}
          icon={<Heart className="size-3.5" />}
        />
        <AnalyticsMetric
          label="Comments"
          value={fmtNum(totalComments)}
          icon={<MessageSquare className="size-3.5" />}
        />
        <AnalyticsMetric
          label="Avg. views / story"
          value={fmtNum(avgViews)}
          icon={<TrendingUp className="size-3.5" />}
        />
      </div>

      {/* Main chart - Recent Stories Performance */}
      <section className="mt-8 border-b border-slate-200 pb-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
              Recent Performance
            </p>
            <h3 className="mt-1 text-[15px] font-black tracking-tight text-slate-900">
              Views & Engagement on recent stories
            </h3>
            <p className="mt-1 text-[10px] font-medium text-slate-400">
              Compare the performance of your last 8 published stories.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ChartLegend color={BRAND} label="Views" />
            <ChartLegend color="#94A3B8" label="Engagement (Likes + Comments)" />
          </div>
        </div>

        <div className="h-[280px] w-full sm:h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={recentStories}
              margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
            >
              <CartesianGrid stroke="#F1F5F9" vertical={false} strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "#94A3B8", fontSize: 9, fontWeight: 600 }}
                dy={8}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "#94A3B8", fontSize: 9, fontWeight: 600 }} 
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F8FAFC" }} />
              
              <Bar 
                dataKey="views" 
                name="Views" 
                fill={BRAND} 
                maxBarSize={32} 
                radius={[4, 4, 0, 0]} 
              />
              <Bar 
                dataKey="engagement" 
                name="Engagement" 
                fill="#94A3B8" 
                maxBarSize={32} 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Lower section */}
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        
        {/* Top Stories Leaderboard */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
                Leaderboard
              </p>
              <h3 className="mt-1 text-[14px] font-black text-slate-900">
                Top 5 performing stories
              </h3>
            </div>
          </div>

          <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {topStories.map((blog, index) => {
              const maxViews = topStories[0]?.views || 1
              const percentage = Math.max(2, ((blog.views ?? 0) / maxViews) * 100)

              return (
                <div key={blog.id} className="grid grid-cols-[30px_minmax(0,1fr)_100px] items-center gap-3 px-5 py-4 sm:grid-cols-[30px_minmax(0,1fr)_80px_80px]">
                  <span className="text-[10px] font-black text-slate-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  
                  <div className="min-w-0">
                    <Link to={`/blogs/${blog.slug}`} className="block truncate text-[11px] font-black text-slate-800 transition-colors hover:text-[#E05A47]">
                      {blog.title}
                    </Link>
                    <div className="mt-2 h-1 max-w-xs overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#E05A47]"
                        style={{ width: `${percentage}%`, opacity: index === 0 ? 1 : Math.max(0.3, 0.85 - index * 0.15) }}
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] font-black text-slate-800">{fmtNum(blog.views ?? 0)}</p>
                    <p className="text-[7px] font-bold uppercase text-slate-400">views</p>
                  </div>

                  <div className="hidden text-right sm:block">
                    <p className="text-[11px] font-black text-slate-800">{fmtNum((blog.likes_count ?? 0) + (blog.comments_count ?? 0))}</p>
                    <p className="text-[7px] font-bold uppercase text-slate-400">engagements</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Right side stats */}
        <aside className="space-y-8 lg:border-l lg:border-slate-200 lg:pl-10">
          {/* Engagement rate */}
          <div className="rounded-xl border border-slate-200 bg-[#FCFCFB] p-5">
            <p className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
              Overall Engagement Rate
            </p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-[32px] font-black leading-none tracking-tight text-slate-950">
                  {engagementRate}%
                </p>
                <p className="mt-1.5 text-[9px] font-semibold text-slate-400">
                  (Likes + Comments) ÷ Views
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200/50">
                <Activity className="size-4 text-[#E05A47]" />
              </div>
            </div>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-[#E05A47] transition-all duration-700" style={{ width: `${engagementRate}%` }} />
            </div>
          </div>

          {/* Content mix */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
              Content Mix
            </p>
            <div className="mt-4 flex items-center gap-5">
              <div className="h-[90px] w-[90px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={contentMix}
                      dataKey="value"
                      innerRadius={28}
                      outerRadius={42}
                      paddingAngle={4}
                      strokeWidth={0}
                    >
                      {contentMix.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {contentMix.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                      <span className="size-2 rounded-full" style={{ background: item.color }} />
                      {item.name}
                    </span>
                    <span className="text-[11px] font-black text-slate-800">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function AnalyticsMetric({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="border-b border-slate-200 px-2 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0">
      <div className="flex items-center gap-1.5 text-slate-400">
        {icon}

        <span className="text-[8px] font-black uppercase tracking-[0.1em]">
          {label}
        </span>
      </div>

      <p className="mt-2 text-[25px] font-black leading-none tracking-[-0.035em] text-slate-950">
        {value}
      </p>
    </div>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
}: any) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="min-w-[120px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-xl">
      <p className="mb-2 text-[9px] font-black text-slate-700">
        {label}
      </p>

      <div className="space-y-1">
        {payload.map((item: any) => (
          <div
            key={item.dataKey}
            className="flex items-center justify-between gap-4"
          >
            <span className="flex items-center gap-1.5 text-[8px] font-semibold text-slate-400">
              <span
                className="size-1.5 rounded-full"
                style={{
                  background: item.color,
                }}
              />

              {item.name}
            </span>

            <span className="text-[9px] font-black text-slate-800">
              {fmtNum(Number(item.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartLegend({
  color,
  label,
}: {
  color: string
  label: string
}) {
  return (
    <span className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400">
      <span
        className="size-2 rounded-full"
        style={{ background: color }}
      />

      {label}
    </span>
  )
}

/* =========================================================
   ACTIVITY
========================================================= */

function ActivityTab({
  blogs,
  onOpenLikers,
}: {
  blogs: Blog[]
  onOpenLikers: (blog: Blog) => void
}) {
  const sorted = useMemo(() => {
    return [...blogs].sort((a, b) => {
      const aScore =
        (a.views ?? 0) +
        (a.likes_count ?? 0) +
        (a.comments_count ?? 0)

      const bScore =
        (b.views ?? 0) +
        (b.likes_count ?? 0) +
        (b.comments_count ?? 0)

      return bScore - aScore
    })
  }, [blogs])

  if (!blogs.length) {
    return (
      <EmptyState
        icon={<Activity className="size-5" />}
        title="No activity yet"
        description="Publish a story and reader activity will appear here."
      />
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-black tracking-[-0.025em] text-slate-950">
            Reader activity
          </h2>

          <p className="mt-1 text-[11px] font-medium text-slate-500">
            See how readers are interacting with your published
            stories.
          </p>
        </div>

        <span className="text-[9px] font-bold text-slate-400">
          {blogs.length} published{" "}
          {blogs.length === 1 ? "story" : "stories"}
        </span>
      </div>

      {/* Summary */}

      <div className="mb-6 grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-200">
        <ActivitySummary
          icon={<Eye className="size-3.5" />}
          label="Views"
          value={fmtNum(
            blogs.reduce(
              (sum, blog) =>
                sum + (blog.views ?? 0),
              0
            )
          )}
        />

        <ActivitySummary
          icon={<Heart className="size-3.5" />}
          label="Likes"
          value={fmtNum(
            blogs.reduce(
              (sum, blog) =>
                sum + (blog.likes_count ?? 0),
              0
            )
          )}
        />

        <ActivitySummary
          icon={<MessageSquare className="size-3.5" />}
          label="Comments"
          value={fmtNum(
            blogs.reduce(
              (sum, blog) =>
                sum + (blog.comments_count ?? 0),
              0
            )
          )}
        />
      </div>

      {/* Activity list */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-[minmax(300px,1fr)_90px_90px_100px_120px] gap-4 border-b border-slate-200 bg-[#FCFCFB] px-5 py-3 md:grid">
          {[
            "Story",
            "Views",
            "Likes",
            "Comments",
            "Engagement",
          ].map((heading) => (
            <span
              key={heading}
              className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-400"
            >
              {heading}
            </span>
          ))}
        </div>

        <div className="divide-y divide-slate-100">
          {sorted.map((blog) => (
            <ActivityRow
              key={blog.id}
              blog={blog}
              onOpenLikers={onOpenLikers}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ActivitySummary({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="px-3 py-4 sm:px-5">
      <div className="flex items-center gap-1.5 text-slate-400">
        {icon}

        <span className="text-[8px] font-bold uppercase tracking-wide">
          {label}
        </span>
      </div>

      <p className="mt-1.5 text-[20px] font-black tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  )
}

function ActivityRow({
  blog,
  onOpenLikers,
}: {
  blog: Blog
  onOpenLikers: (blog: Blog) => void
}) {
  const cover =
    (blog as any).cover_image_url ||
    blog.cover_image

  const engagement =
    (blog.views ?? 0) > 0
      ? Math.min(
        100,
        Math.round(
          (((blog.likes_count ?? 0) +
            (blog.comments_count ?? 0)) /
            (blog.views ?? 1)) *
          100
        )
      )
      : 0

  return (
    <article className="group px-4 py-4 transition hover:bg-[#FCFCFB] sm:px-5 md:grid md:grid-cols-[minmax(300px,1fr)_90px_90px_100px_120px] md:items-center md:gap-4 md:py-3.5">

      {/* Story */}

      <div className="flex min-w-0 items-center gap-3">
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="size-11 shrink-0 rounded-lg border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
            <FileText className="size-4 text-slate-300" />
          </div>
        )}

        <div className="min-w-0">
          <Link
            to={`/blogs/${blog.slug}`}
            className="block truncate text-[11px] font-black text-slate-900 transition-colors group-hover:text-[#E05A47]"
          >
            {blog.title}
          </Link>

          <p className="mt-1 flex items-center gap-1.5 text-[8px] font-semibold text-slate-400">
            {fmtDate(blog.created_at)}

            <span className="size-0.5 rounded-full bg-slate-300" />

            {readTime(blog.content)} min read
          </p>
        </div>
      </div>

      {/* Desktop */}

      <div className="hidden items-center gap-1.5 text-[10px] font-black text-slate-600 md:flex">
        <Eye className="size-3 text-slate-300" />
        {fmtNum(blog.views ?? 0)}
      </div>

      <button
        onClick={() => onOpenLikers(blog)}
        className="hidden items-center gap-1.5 text-[10px] font-black text-slate-600 transition hover:text-[#E05A47] md:flex"
      >
        <Heart className="size-3 text-slate-300" />
        {fmtNum(blog.likes_count ?? 0)}
      </button>

      <div className="hidden items-center gap-1.5 text-[10px] font-black text-slate-600 md:flex">
        <MessageSquare className="size-3 text-slate-300" />
        {fmtNum(blog.comments_count ?? 0)}
      </div>

      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black text-slate-700">
            {engagement}%
          </span>

          <Link
            to={`/blogs/${blog.slug}`}
            className="text-slate-300 transition hover:text-[#E05A47]"
          >
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#E05A47]"
            style={{
              width: `${engagement}%`,
            }}
          />
        </div>
      </div>

      {/* Mobile */}

      <div className="mt-3 flex items-center gap-4 pl-14 md:hidden">
        <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
          <Eye className="size-3" />
          {fmtNum(blog.views ?? 0)}
        </span>

        <button
          onClick={() => onOpenLikers(blog)}
          className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-[#E05A47]"
        >
          <Heart className="size-3" />
          {fmtNum(blog.likes_count ?? 0)}
        </button>

        <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
          <MessageSquare className="size-3" />
          {fmtNum(blog.comments_count ?? 0)}
        </span>

        <span className="ml-auto text-[9px] font-black text-slate-600">
          {engagement}% eng.
        </span>
      </div>
    </article>
  )
}

/* =========================================================
   DELETE DIALOG
========================================================= */

function DeleteDialog({
  blog,
  loading,
  onCancel,
  onDelete,
}: {
  blog: Blog
  loading: boolean
  onCancel: () => void
  onDelete: () => void
}) {
  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-[3px]"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[390px] overflow-hidden rounded-2xl border border-white/50 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex size-10 items-center justify-center rounded-xl bg-red-50 text-red-500">
              <Trash2 className="size-4" />
            </div>

            <button
              onClick={onCancel}
              className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="size-4" />
            </button>
          </div>

          <h2 className="mt-5 text-[16px] font-black tracking-tight text-slate-950">
            Delete this story?
          </h2>

          <p className="mt-2 text-[11px] font-medium leading-5 text-slate-500">
            <span className="font-bold text-slate-700">
              “{blog.title}”
            </span>{" "}
            will be permanently removed from BareMind. This action
            cannot be undone.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <button
            onClick={onCancel}
            className="h-9 rounded-lg px-4 text-[10px] font-extrabold text-slate-600 transition hover:bg-slate-200/70"
          >
            Keep story
          </button>

          <button
            onClick={onDelete}
            disabled={loading}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-red-500 px-4 text-[10px] font-extrabold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && (
              <Loader2 className="size-3 animate-spin" />
            )}

            Delete story
          </button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   EMPTY STATES
========================================================= */

function StoriesEmpty({
  searching,
  search,
  filter,
  onClear,
}: {
  searching: boolean
  search: string
  filter: StoryFilter
  onClear: () => void
}) {
  let title = "Your first story starts here"
  let description =
    "Create a draft and start sharing what you know."

  if (searching) {
    title = "No stories found"
    description = `Nothing matches “${search}”.`
  } else if (filter === "drafts") {
    title = "No drafts"
    description =
      "Stories you save without publishing will appear here."
  } else if (filter === "published") {
    title = "Nothing published yet"
    description =
      "Publish your first story to start building your audience."
  }

  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12">
      <div className="max-w-xs text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
          {searching ? (
            <Search className="size-4" />
          ) : (
            <PenLine className="size-4 text-[#E05A47]" />
          )}
        </div>

        <h3 className="mt-4 text-[14px] font-black tracking-tight text-slate-900">
          {title}
        </h3>

        <p className="mt-1.5 text-[10px] font-medium leading-5 text-slate-500">
          {description}
        </p>

        {searching ? (
          <button
            onClick={onClear}
            className="mt-4 h-9 rounded-lg border border-slate-200 bg-white px-4 text-[9px] font-extrabold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Clear search
          </button>
        ) : (
          <Link
            to="/blogs/create"
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-950 px-4 text-[9px] font-extrabold text-white transition hover:bg-[#E05A47]"
          >
            Start writing
            <ArrowRight className="size-3" />
          </Link>
        )}
      </div>
    </div>
  )
}

function AnalyticsEmpty() {
  return (
    <EmptyState
      icon={<BarChart3 className="size-5" />}
      title="Analytics will appear here"
      description="Publish your first story and BareMind will start showing its performance."
      action
    />
  )
}

function EmptyState({
  icon,
  title,
  description,
  action = false,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: boolean
}) {
  return (
    <div className="flex min-h-[380px] items-center justify-center border-y border-slate-200">
      <div className="max-w-xs text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm">
          {icon}
        </div>

        <h3 className="mt-4 text-[14px] font-black tracking-tight text-slate-900">
          {title}
        </h3>

        <p className="mt-1.5 text-[10px] font-medium leading-5 text-slate-500">
          {description}
        </p>

        {action && (
          <Link
            to="/blogs/create"
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-950 px-4 text-[9px] font-extrabold text-white transition hover:bg-[#E05A47]"
          >
            Write a story
            <ArrowRight className="size-3" />
          </Link>
        )}
      </div>
    </div>
  )
}

/* =========================================================
   SKELETON
========================================================= */

function StoriesSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {[1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className="flex animate-pulse items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0"
        >
          <div className="size-12 shrink-0 rounded-lg bg-slate-100" />

          <div className="min-w-0 flex-1">
            <div className="h-2 w-16 rounded bg-slate-100" />

            <div className="mt-2 h-3 w-[55%] rounded bg-slate-100" />

            <div className="mt-2 h-2 w-[35%] rounded bg-slate-100" />
          </div>

          <div className="hidden h-6 w-20 rounded-full bg-slate-100 lg:block" />

          <div className="hidden h-3 w-10 rounded bg-slate-100 lg:block" />

          <div className="hidden h-8 w-20 rounded-lg bg-slate-100 lg:block" />
        </div>
      ))}
    </div>
  )
}