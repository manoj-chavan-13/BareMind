import { useEffect, useState, useRef, useCallback } from "react"
import { Link } from "react-router-dom"
import { useSelector } from "react-redux"
import { AnimatePresence, motion } from "framer-motion"
import { AuthModal } from "@/components/ui/AuthModal"

import { blogService, type Blog } from "@/services/blogService"
import { interactionService } from "@/services/interactionService"
import { userService } from "@/services/userService"
import { searchService } from "@/services/searchService"
import { taxonomyService, type Tag } from "@/services/taxonomyService"

import type { RootState } from "@/store"
import { getUserAvatar } from "@/utils/avatar"

import {
  Search,
  PenLine,
  Clock,
  Eye,
  Flame,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Check,
  Users,
  Sparkles,
  TrendingUp,
  BookOpen,
  ArrowUpRight,
  Tag as TagIcon,
} from "lucide-react"

function getReadTime(content = "") {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

function getExcerpt(content = "", maxLen = 180) {
  const stripped = content
    .replace(/[#*_`\[\]()>!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return stripped.length > maxLen
    ? `${stripped.slice(0, maxLen)}…`
    : stripped
}

function formatNumber(value = 0) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value)
}

export default function BlogList({
  defaultTab = "trending",
}: {
  defaultTab?: "trending" | "latest" | "following"
}) {


  const { isAuthenticated, user: currentUser } = useSelector(
    (state: RootState) => state.auth
  )

  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [skip, setSkip] = useState(0)
  const LIMIT = 10

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [activeTab, setActiveTab] = useState<"trending" | "latest" | "following">(defaultTab)

  // Debounce search input for autocomplete
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      if (search.length > 0) {
        searchService.getSuggestions(search, "blogs").then(res => {
          setSuggestions(res.suggestions || [])
        }).catch(err => {
          console.error("Failed to fetch suggestions", err)
          setSuggestions([])
        })
      } else {
        setSuggestions([])
      }
    }, 300)
    return () => clearTimeout(handler)
  }, [search])
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [popularTags, setPopularTags] = useState<Tag[]>([])

  useEffect(() => {
    taxonomyService.getPopularTags().then(setPopularTags).catch(console.error)
  }, [])

  const [likedPosts, setLikedPosts] = useState<Record<number, boolean>>({})
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({})
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Record<number, boolean>>({})
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [authors, setAuthors] = useState<any[]>([])

  // Follow/Unfollow UI state mapping
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({})

  const observer = useRef<IntersectionObserver | null>(null)

  const lastBlogElementRef = useCallback((node: HTMLDivElement) => {
    if (loading || loadingMore) return
    if (observer.current) observer.current.disconnect()

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setSkip(prev => prev + LIMIT)
      }
    })

    if (node) observer.current.observe(node)
  }, [loading, loadingMore, hasMore])

  // Reset pagination when tab, auth, or tag changes
  useEffect(() => {
    setBlogs([])
    setSkip(0)
    setHasMore(true)
    fetchData(0, true)
  }, [activeTab, isAuthenticated, selectedTag, selectedCategory, debouncedSearch])

  // Load more when skip changes
  useEffect(() => {
    if (skip > 0) {
      fetchData(skip, false)
    }
  }, [skip])

  const fetchData = async (currentSkip: number, isInitial: boolean) => {
    try {
      if (isInitial) setLoading(true)
      else setLoadingMore(true)

      let data: Blog[] = []

      const activeSearch = debouncedSearch.trim() || undefined
      const categoryFilter = selectedCategory === "All" ? undefined : selectedCategory

      if (activeSearch) {
        // Search across platform
        data = await blogService.getBlogs(currentSkip, LIMIT, selectedTag || undefined, categoryFilter, activeTab === "trending" ? 'trending' : 'latest', activeSearch)
      } else if (selectedTag) {
        data = await blogService.getBlogs(currentSkip, LIMIT, selectedTag, categoryFilter)
      } else if (activeTab === "following" && isAuthenticated) {
        data = await blogService.getFollowingFeed(currentSkip, LIMIT)
      } else if (activeTab === "trending") {
        // Keep getFeed for trending, or use getBlogs with trending sort. getFeed might use recommendation engine.
        data = await blogService.getFeed(currentSkip, LIMIT)
      } else {
        data = await blogService.getBlogs(currentSkip, LIMIT, undefined, categoryFilter)
      }

      if (data.length < LIMIT) {
        setHasMore(false)
      }

      setBlogs(prev => isInitial ? data : [...prev, ...data])

      // Initialize like counts and interaction states from real data
      const counts: Record<number, number> = {}
      const initialLiked: Record<number, boolean> = {}
      const initialBookmarked: Record<number, boolean> = {}
      const initialFollowing: Record<string, boolean> = {}

      data.forEach((blog) => {
        counts[blog.id] = blog.likes_count || 0
        initialLiked[blog.id] = blog.is_liked_by_user || false
        initialBookmarked[blog.id] = blog.is_bookmarked_by_user || false

        if (blog.author && typeof (blog.author as any).is_following === "boolean") {
          initialFollowing[blog.author_id] = (blog.author as any).is_following
        }
      })

      setLikeCounts(prev => ({ ...prev, ...counts }))
      setLikedPosts(prev => ({ ...prev, ...initialLiked }))
      setBookmarkedPosts(prev => ({ ...prev, ...initialBookmarked }))
      setFollowingMap(prev => ({ ...prev, ...initialFollowing }))

      if (isInitial) {
        // Extract unique authors for the "Who to follow" sidebar
        const authorMap = new Map<string, any>()
        data.forEach((blog) => {
          if (blog.author_id && blog.author) {
            authorMap.set(String(blog.author_id), {
              id: blog.author_id,
              first_name: blog.author.first_name,
              last_name: blog.author.last_name,
              username: (blog.author as any).username,
              avatar_url: (blog.author as any).avatar_url,
              is_following: (blog.author as any).is_following
            })
          }
        })
        setAuthors(Array.from(authorMap.values()).slice(0, 5))
      }
    } catch (error) {
      console.error("Failed to load feed", error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // ─────────────────────────────────────────────
  // LIKE
  // ─────────────────────────────────────────────

  const [isLiking, setIsLiking] = useState<Record<number, boolean>>({})

  const handleToggleLike = async (
    blogId: number,
    e: React.MouseEvent
  ) => {
    e.preventDefault()

    if (!isAuthenticated) {
      setShowAuthModal(true)
      return
    }

    if (isLiking[blogId]) return // Prevent rapid double-clicks

    setIsLiking(prev => ({ ...prev, [blogId]: true }))

    const wasLiked = likedPosts[blogId] || false

    setLikedPosts((prev) => ({
      ...prev,
      [blogId]: !wasLiked,
    }))

    setLikeCounts((prev) => ({
      ...prev,
      [blogId]: (prev[blogId] || 0) + (wasLiked ? -1 : 1),
    }))

    try {
      await interactionService.toggleLike(blogId)
    } catch (error) {
      // Revert!
      setLikedPosts((prev) => ({
        ...prev,
        [blogId]: wasLiked,
      }))
      setLikeCounts((prev) => ({
        ...prev,
        [blogId]: (prev[blogId] || 0) + (wasLiked ? 1 : -1),
      }))
    } finally {
      setIsLiking(prev => ({ ...prev, [blogId]: false }))
    }
  }

  // ─────────────────────────────────────────────
  // BOOKMARK
  // ─────────────────────────────────────────────

  const [isBookmarking, setIsBookmarking] = useState<Record<number, boolean>>({})

  const handleToggleBookmark = async (
    blogId: number,
    e: React.MouseEvent
  ) => {
    e.preventDefault()

    if (!isAuthenticated) {
      setShowAuthModal(true)
      return
    }

    if (isBookmarking[blogId]) return

    setIsBookmarking(prev => ({ ...prev, [blogId]: true }))
    const wasBookmarked = bookmarkedPosts[blogId] || false

    setBookmarkedPosts((prev) => ({
      ...prev,
      [blogId]: !wasBookmarked,
    }))

    try {
      await interactionService.toggleBookmark(blogId)
    } catch (error) {
      setBookmarkedPosts((prev) => ({
        ...prev,
        [blogId]: wasBookmarked,
      }))
    } finally {
      setIsBookmarking(prev => ({ ...prev, [blogId]: false }))
    }
  }

  // ─────────────────────────────────────────────
  // SHARE
  // ─────────────────────────────────────────────

  const handleShare = (
    slug: string,
    id: number,
    e: React.MouseEvent
  ) => {
    e.preventDefault()

    const url = `${window.location.origin}/blogs/${slug}`

    navigator.clipboard.writeText(url)

    setCopiedId(id)

    setTimeout(() => {
      setCopiedId(null)
    }, 1800)
  }

  const handleToggleFollow = async (
    authorId: string,
    e: React.MouseEvent
  ) => {
    e.preventDefault()

    if (!isAuthenticated) {
      setShowAuthModal(true)
      return
    }

    const previousState = followingMap[authorId]
    setFollowingMap(prev => ({ ...prev, [authorId]: !previousState }))

    try {
      await userService.followUser(authorId)
    } catch (error) {
      setFollowingMap(prev => ({ ...prev, [authorId]: previousState }))
    }
  }

  // ─────────────────────────────────────────────
  // FOLLOW AUTHOR
  // ─────────────────────────────────────────────



  // ─────────────────────────────────────────────
  // CATEGORIES
  // ─────────────────────────────────────────────

  const categories = [
    "All",
    ...Array.from(
      new Set(
        blogs
          .map((blog) => blog.category?.name)
          .filter(Boolean)
      )
    ),
  ] as string[]

  // ─────────────────────────────────────────────
  // FILTER + SORT
  // ─────────────────────────────────────────────

  // With backend searching, we no longer need complex local filtering.
  // We simply pass the blogs array.
  const filteredBlogs = blogs

  return (
    <main className="min-h-screen bg-[#fbfbfa]">

      {/* ═══════════════════════════════════════════════════════
          COMPACT FEED HEADER WITH MODERN GRADIENT HERO
      ═══════════════════════════════════════════════════════ */}

      <section className="relative z-40 border-b border-slate-200 bg-white">
        
        {/* Background Decorative Layer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Atmospheric glow orbs */}
          <div className="absolute -right-32 -top-32 size-[420px] rounded-full bg-[#E05A47]/10 blur-[80px]" />
          <div className="absolute -bottom-20 left-1/4 size-[320px] rounded-full bg-orange-500/10 blur-[80px]" />

          {/* Subtle grid texture */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent 40px),
                                repeating-linear-gradient(90deg, #000 0px, #000 1px, transparent 1px, transparent 40px)`,
            }}
          />
        </div>

        <div className="relative z-40 mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10 lg:px-10">

          {/* Top row */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

            <div className="min-w-0">

              {/* Label */}
              <div className="mb-3 flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-md bg-[#FFF0ED] ring-1 ring-[#E05A47]/20">
                  <Sparkles className="size-3.5 text-[#E05A47]" />
                </div>

                <span className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                  BareMind Community Hub
                </span>
              </div>

              {/* Heading */}
              <h1 className="text-[28px] font-black leading-[1.1] tracking-[-0.04em] text-slate-950 sm:text-[36px]">
                Discover Stories{" "}
                <span className="bg-gradient-to-r from-[#E05A47] to-[#f07060] bg-clip-text text-transparent">
                  & Ideas
                </span>
                .
              </h1>

              <p className="mt-2.5 max-w-md text-[11px] font-medium leading-5 text-slate-500">
                Explore curated perspectives, technical deep-dives, and community stories on BareMind.
              </p>
            </div>

            {isAuthenticated && (
              <div className="flex shrink-0">
                <Link
                  to="/blogs/create"
                  className="group inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#E05A47] px-4 text-[11px] font-extrabold text-white shadow-[0_8px_24px_rgba(224,90,71,0.35)] transition-all hover:-translate-y-px hover:bg-[#d04a37] hover:shadow-[0_12px_32px_rgba(224,90,71,0.45)]"
                >
                  <PenLine className="size-3.5" />
                  Write story
                  <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>
            )}

          </div>

          {/* Search + Categories */}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">

            {/* SEARCH */}

            <div className="relative w-full shrink-0 sm:w-[300px] lg:w-[340px]">

              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setShowSuggestions(true)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    setDebouncedSearch(search)
                    setShowSuggestions(false)
                  }
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search stories, topics..."
                className="
                  h-10
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  pl-10
                  pr-4
                  text-xs
                  font-semibold
                  text-slate-900
                  outline-none
                  transition-all
                  placeholder:font-medium
                  placeholder:text-slate-400
                  hover:border-slate-300
                  focus:border-[#E05A47]
                  focus:ring-4
                  focus:ring-[#E05A47]/10
                  shadow-sm
                "
              />
              
              {/* Suggestions Dropdown */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-slate-200 py-2 max-h-60 overflow-y-auto"
                  >
                    {suggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setSearch(suggestion)
                          setDebouncedSearch(suggestion)
                          setShowSuggestions(false)
                        }}
                        className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-3 text-sm font-medium text-slate-700 transition-colors"
                      >
                        <TrendingUp className="size-3.5 text-slate-400" />
                        {suggestion}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            <div className="hidden h-5 w-px shrink-0 bg-slate-200 sm:block" />

            {/* CATEGORIES */}

            <div className="p-2.5 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

              {categories.slice(0, 8).map((category) => (
                <button
                  key={category}
                  onClick={() =>
                    setSelectedCategory(category)
                  }
                  className={`
                    shrink-0
                    rounded-lg
                    px-3
                    py-2
                    text-[11px]
                    font-bold
                    transition-all
                    border

                    ${selectedCategory === category
                      ? "bg-white text-[#E05A47] border-[#E05A47] shadow-md"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
                    }
                  `}
                >
                  {category}
                </button>
              ))}

            </div>

          </div>

          {/* POPULAR TAGS BAR */}
          {popularTags.length > 0 && (
            <div className="mt-5 flex items-center gap-1.5 overflow-x-auto border-t border-slate-100 pt-4 px-2.5 pb-2.5 text-[10px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="flex shrink-0 items-center gap-1 font-extrabold uppercase tracking-widest text-slate-400 text-[8px] mr-1">
                <TagIcon className="size-2.5 text-[#E05A47]" />
                Popular Tags:
              </span>
              {popularTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTag(selectedTag === tag.slug ? null : tag.slug)}
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold transition-all border ${selectedTag === tag.slug
                    ? "bg-[#E05A47] text-white border-[#E05A47] shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
                    }`}
                >
                  #{tag.name}
                </button>
              ))}
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="ml-2 shrink-0 rounded-full bg-[#FFF0ED] px-2 py-0.5 text-[8px] font-extrabold text-[#E05A47] hover:bg-[#FFE4DF] transition-colors"
                >
                  Clear Tag Filter (x)
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          MAIN LAYOUT
      ═══════════════════════════════════════════════════════ */}

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-10">

        {/* ═══════════════════════════════════════════════════
            LEFT FEED
        ═══════════════════════════════════════════════════ */}

        <section className="min-w-0">

          {/* FEED TABS */}

          <div className="sticky top-0 z-30 -mx-1 mb-2 border-b border-slate-200 bg-[#fbfbfa]/95 px-1 pt-1 backdrop-blur-md">

            <div className="flex items-center gap-7">

              {/* Trending */}

              <button
                onClick={() => setActiveTab("trending")}
                className={`relative flex items-center gap-1.5 pb-3 text-xs font-extrabold transition-colors ${activeTab === "trending"
                  ? "text-slate-950"
                  : "text-slate-400 hover:text-slate-700"
                  }`}
              >
                <Flame className="size-3.5" />

                Trending

                {activeTab === "trending" && (
                  <span className="absolute bottom-[-1px] left-0 h-[2px] w-full rounded-full bg-[#f07060]" />
                )}
              </button>

              {/* Latest */}

              <button
                onClick={() => setActiveTab("latest")}
                className={`relative flex items-center gap-1.5 pb-3 text-xs font-extrabold transition-colors ${activeTab === "latest"
                  ? "text-slate-950"
                  : "text-slate-400 hover:text-slate-700"
                  }`}
              >
                <Clock className="size-3.5" />

                Latest

                {activeTab === "latest" && (
                  <span className="absolute bottom-[-1px] left-0 h-[2px] w-full rounded-full bg-[#f07060]" />
                )}
              </button>

              {/* Following */}

              {isAuthenticated && (
                <button
                  onClick={() => setActiveTab("following")}
                  className={`relative flex items-center gap-1.5 pb-3 text-xs font-extrabold transition-colors ${activeTab === "following"
                    ? "text-slate-950"
                    : "text-slate-400 hover:text-slate-700"
                    }`}
                >
                  <Users className="size-3.5" />

                  Following

                  {activeTab === "following" && (
                    <span className="absolute bottom-[-1px] left-0 h-[2px] w-full rounded-full bg-[#f07060]" />
                  )}
                </button>
              )}

            </div>
          </div>

          {/* ═══════════════════════════════════════════════
              LOADING
          ═══════════════════════════════════════════════ */}

          {loading && (
            <div className="divide-y divide-slate-200">

              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="animate-pulse py-7"
                >
                  <div className="flex gap-6">

                    <div className="min-w-0 flex-1 space-y-3">

                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-full bg-slate-200" />
                        <div className="h-3 w-28 rounded bg-slate-200" />
                      </div>

                      <div className="h-6 w-4/5 rounded bg-slate-200" />

                      <div className="h-4 w-full rounded bg-slate-100" />

                      <div className="h-4 w-2/3 rounded bg-slate-100" />

                      <div className="h-4 w-40 rounded bg-slate-100" />

                    </div>

                    <div className="hidden h-[130px] w-[185px] rounded-2xl bg-slate-200 sm:block" />

                  </div>
                </div>
              ))}

            </div>
          )}

          {/* ═══════════════════════════════════════════════
              EMPTY STATE
          ═══════════════════════════════════════════════ */}

          {!loading && filteredBlogs.length === 0 && (
            <div className="py-20 text-center">

              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100">
                <BookOpen className="size-6 text-slate-400" />
              </div>

              <h3 className="text-base font-black text-slate-900">
                No stories found
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-xs font-medium leading-5 text-slate-500">
                {activeTab === "following"
                  ? "Follow writers from the community and their latest stories will appear here."
                  : "Try another search or select a different topic."}
              </p>

              {(search || selectedCategory !== "All") && (
                <button
                  onClick={() => {
                    setSearch("")
                    setSelectedCategory("All")
                  }}
                  className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Clear filters
                </button>
              )}

            </div>
          )}

          {/* ═══════════════════════════════════════════════
              ARTICLES
          ═══════════════════════════════════════════════ */}

          {!loading && filteredBlogs.length > 0 && (
            <div className="divide-y divide-slate-100">

              {filteredBlogs.map((blog, index) => {
                const authorName = blog.author?.first_name
                  ? `${blog.author.first_name} ${blog.author.last_name || ""
                    }`.trim()
                  : blog.author?.username || "BareMind Author"

                const username = (blog.author as any)?.username

                const liked = likedPosts[blog.id] || false

                const bookmarked =
                  bookmarkedPosts[blog.id] || false

                const likes = likeCounts[blog.id] || 0

                const cover =
                  (blog as any).cover_image_url ||
                  (blog as any).cover_image

                return (
                  <article
                    ref={index === filteredBlogs.length - 1 ? lastBlogElementRef : null}
                    key={blog.id}
                    className="group py-6 border-b border-slate-100/90 first:pt-2 transition-colors hover:bg-slate-50/50 p-3.5 rounded-2xl"
                  >

                    <div className="flex gap-5 sm:gap-7">

                      {/* ARTICLE CONTENT */}

                      <div className="min-w-0 flex-1">

                        {/* AUTHOR */}

                        <div className="mb-3 flex items-center justify-between gap-4">

                          <Link
                            to={`/u/${username || blog.author_id
                              }`}
                            className="flex min-w-0 items-center gap-2.5"
                          >

                            <img
                              src={getUserAvatar(
                                (blog.author as any)?.avatar_url,
                                authorName
                              )}
                              alt={authorName}
                              className="size-7 shrink-0 rounded-full border border-slate-200 object-cover"
                            />

                            <div className="flex min-w-0 items-center gap-1.5 text-[11px]">

                              <span className="truncate font-extrabold text-slate-800 transition-colors hover:text-[#f07060]">
                                {authorName}
                              </span>

                              <span className="text-slate-300">
                                ·
                              </span>

                              <span className="shrink-0 font-medium text-slate-400">
                                {new Date(
                                  blog.created_at
                                ).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>

                            </div>

                          </Link>

                          {index < 3 &&
                            activeTab === "trending" && (
                              <span className="hidden items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[#f07060] md:flex">
                                <TrendingUp className="size-3" />
                                Trending
                              </span>
                            )}

                        </div>

                        {/* TITLE + EXCERPT */}

                        <Link
                          to={`/blogs/${blog.slug}`}
                          className="block"
                          onClick={() => {
                            if (debouncedSearch) {
                              searchService.trackSearch(debouncedSearch, blog.id)
                            }
                          }}
                        >

                          <h2 className="text-[18px] font-black leading-[1.3] tracking-[-0.018em] text-slate-950 transition-colors group-hover:text-[#f07060] sm:text-[21px]">
                            {blog.title}
                          </h2>

                          <p className="mt-2 line-clamp-2 max-w-2xl text-[13px] font-medium leading-5 text-slate-500">
                            {getExcerpt(blog.content, 190)}
                          </p>

                        </Link>

                        {/* META + ACTIONS */}

                        <div className="mt-4 flex items-center justify-between gap-3">

                          {/* LEFT META */}

                          <div className="flex min-w-0 items-center gap-2 sm:gap-3">

                            {blog.category && (
                              <button
                                onClick={() =>
                                  setSelectedCategory(
                                    blog.category!.name
                                  )
                                }
                                className="max-w-[110px] truncate rounded-full bg-[#fff1ee] px-2.5 py-1 text-[9px] font-extrabold text-[#f07060]"
                              >
                                {blog.category.name}
                              </button>
                            )}

                            <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-slate-400">
                              <Clock className="size-3" />

                              {getReadTime(blog.content)} min
                            </span>

                            <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-slate-400">
                              <Eye className="size-3 text-slate-400" />

                              {formatNumber(blog.views || 0)} views
                            </span>

                          </div>

                          {/* ACTIONS */}

                          <div className="flex shrink-0 items-center gap-0.5">

                            {/* LIKE */}

                            {isAuthenticated ? (
                              <button
                                onClick={(e) =>
                                  handleToggleLike(blog.id, e)
                                }
                                title="Like"
                                className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-all ${liked
                                  ? "bg-red-50 text-red-500"
                                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                  }`}
                              >
                                <Heart
                                  className={`size-3.5 ${liked ? "fill-current" : ""
                                    }`}
                                />
                                <span>{formatNumber(likes)}</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-400">
                                <Heart className="size-3.5" />
                                <span>{formatNumber(likes)}</span>
                              </div>
                            )}

                            {/* COMMENTS */}

                            {isAuthenticated ? (
                              <Link
                                to={`/blogs/${blog.slug}#comments`}
                                title="Comments"
                                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                              >
                                <MessageCircle className="size-3.5" />
                                {(blog.comments_count || 0) > 0 && <span>{formatNumber(blog.comments_count || 0)}</span>}
                              </Link>
                            ) : (
                              <div className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-400">
                                <MessageCircle className="size-3.5" />
                                {(blog.comments_count || 0) > 0 && <span>{formatNumber(blog.comments_count || 0)}</span>}
                              </div>
                            )}

                            {/* BOOKMARK */}

                            {isAuthenticated && (
                              <button
                                onClick={(e) =>
                                  handleToggleBookmark(blog.id, e)
                                }
                                title="Bookmark"
                                className={`rounded-lg p-1.5 transition-colors ${bookmarked
                                  ? "bg-[#fff0ee] text-[#f07060]"
                                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                  }`}
                              >
                                <Bookmark
                                  className={`size-3.5 ${bookmarked
                                    ? "fill-current"
                                    : ""
                                    }`}
                                />
                              </button>
                            )}

                            {/* SHARE */}

                            <button
                              onClick={(e) =>
                                handleShare(
                                  blog.slug,
                                  blog.id,
                                  e
                                )
                              }
                              title={
                                copiedId === blog.id
                                  ? "Copied"
                                  : "Share"
                              }
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            >
                              {copiedId === blog.id ? (
                                <Check className="size-3.5 text-emerald-500" />
                              ) : (
                                <Share2 className="size-3.5" />
                              )}
                            </button>

                          </div>

                        </div>
                      </div>

                      {/* DESKTOP COVER IMAGE */}

                      {cover && (
                        <Link
                          to={`/blogs/${blog.slug}`}
                          className="mt-1 hidden h-[130px] w-[185px] shrink-0 overflow-hidden rounded-2xl bg-slate-100 sm:block"
                        >
                          <img
                            src={cover}
                            alt={blog.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          />
                        </Link>
                      )}

                    </div>

                    {/* MOBILE COVER IMAGE */}

                    {cover && (
                      <Link
                        to={`/blogs/${blog.slug}`}
                        className="mt-4 block aspect-[16/8] overflow-hidden rounded-2xl bg-slate-100 sm:hidden"
                      >
                        <img
                          src={cover}
                          alt={blog.title}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </Link>
                    )}

                  </article>
                )
              })}

            </div>
          )}

          {/* INFINITE SCROLL LOADING INDICATOR */}
          {loadingMore && (
            <div className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#f07060]" />
            </div>
          )}

          {!loading && !loadingMore && !hasMore && filteredBlogs.length > 0 && (
            <div className="py-8 text-center">
              <p className="text-xs font-medium text-slate-400">You've reached the end of the feed.</p>
            </div>
          )}

        </section>

        {/* ═══════════════════════════════════════════════════
            RIGHT SIDEBAR
        ═══════════════════════════════════════════════════ */}

        <aside className="hidden lg:block">

          <div className="sticky top-20 space-y-7">

            {/* AUTHORS */}

            <section>

              <div className="mb-5 flex items-center justify-between">

                <h3 className="text-[11px] font-black uppercase tracking-[0.13em] text-slate-900">
                  Writers to follow
                </h3>

                <Users className="size-4 text-slate-300" />

              </div>

              {authors.length > 0 ? (
                <div className="space-y-5">

                  {authors.map((author) => {
                    const following = followingMap[author.id] || false

                    const name =
                      `${author.first_name || "Author"} ${author.last_name || ""
                        }`.trim()

                    return (
                      <div
                        key={author.id}
                        className="flex items-center gap-3"
                      >

                        <Link
                          to={`/u/${author.username || author.id
                            }`}
                          className="shrink-0"
                        >
                          <img
                            src={getUserAvatar(
                              author.avatar_url,
                              name
                            )}
                            alt={name}
                            className="size-10 rounded-full border border-slate-200 object-cover"
                          />
                        </Link>

                        <div className="min-w-0 flex-1">

                          <Link
                            to={`/u/${author.username || author.id
                              }`}
                          >
                            <p className="truncate text-xs font-extrabold text-slate-900 transition-colors hover:text-[#f07060]">
                              {name}
                            </p>
                          </Link>

                          <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
                            {author.username
                              ? `@${author.username}`
                              : "Writer on BareMind"}
                          </p>

                        </div>

                        {String(currentUser?.id) !==
                          String(author.id) && (
                            <button
                              onClick={(e) =>
                                handleToggleFollow(
                                  String(author.id),
                                  e
                                )
                              }
                              className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-extrabold transition-all ${following
                                ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                : "border border-slate-200 bg-white text-slate-800 hover:border-[#f07060] hover:text-[#f07060]"
                                }`}
                            >
                              {following
                                ? "Following"
                                : "Follow"}
                            </button>
                          )}

                      </div>
                    )
                  })}

                </div>
              ) : (
                <p className="text-xs font-medium text-slate-400">
                  Writers will appear here.
                </p>
              )}

            </section>

            {/* DIVIDER */}

            <div className="h-px bg-slate-200" />

            {/* COMMUNITY CTA */}

            <section className="relative overflow-hidden rounded-[24px] bg-slate-950 p-6 text-white">

              {/* Glow */}
              <div className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-[#f07060]/20 blur-3xl" />

              <div className="relative">

                {/* Logo */}

                <div className="mb-5 flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                  <img
                    src="/BareMind.png"
                    alt="BareMind"
                    className="size-6 object-contain"
                  />
                </div>

                <h3 className="text-base text-white leading-snug tracking-tight">
                  Have something
                  <br />
                  worth sharing?
                </h3>

                <p className="mt-2 text-[11px] font-medium leading-5 text-slate-200">
                  Turn your experience, ideas and knowledge
                  into stories people can learn from.
                </p>

                <Link
                  to={
                    isAuthenticated
                      ? "/blogs/create"
                      : "/register"
                  }
                  className="group mt-5 inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#ff9586]"
                >
                  {isAuthenticated
                    ? "Write your story"
                    : "Join BareMind"}

                  <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>

              </div>

            </section>

            {/* MINI FOOTER */}

            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-semibold text-slate-400">

              <Link
                to="/about"
                className="hover:text-slate-700"
              >
                About
              </Link>

              <span className="cursor-pointer hover:text-slate-700">
                Community
              </span>

              <span className="cursor-pointer hover:text-slate-700">
                Guidelines
              </span>

              <span className="cursor-pointer hover:text-slate-700">
                Privacy
              </span>

              <span className="cursor-pointer hover:text-slate-700">
                Terms
              </span>

              <span>
                © BareMind
              </span>

            </div>

          </div>
        </aside>

      </div>
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal onClose={() => setShowAuthModal(false)} />
        )}
      </AnimatePresence>
    </main>
  )
}