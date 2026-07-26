import { useEffect, useMemo, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useSelector } from "react-redux"
import { AnimatePresence } from "framer-motion"

import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Eye,
  Heart,
  Loader2,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
  Search,
} from "lucide-react"

import {
  taxonomyService,
  type Category,
} from "@/services/taxonomyService"

import {
  blogService,
  type Blog,
} from "@/services/blogService"
import { searchService } from "@/services/searchService"

import { getUserAvatar } from "@/utils/avatar"
import type { RootState } from "@/store"
import { AuthModal } from "@/components/ui/AuthModal"

const BRAND = "#E05A47"

/* =========================================================
   HELPERS
========================================================= */

function formatNumber(value = 0) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value)
}

function stripHtml(content = "") {
  return content
    .replace(/<[^>]*>?/gm, " ")
    .replace(/[#*_`[\]()>!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function getExcerpt(content = "", maxLength = 170) {
  const clean = stripHtml(content)

  if (clean.length <= maxLength) {
    return clean
  }

  return `${clean.slice(0, maxLength).trim()}…`
}

function getAuthorName(blog: Blog) {
  const author = blog.author

  if (!author) return "BareMind Member"

  const fullName = `${author.first_name || ""} ${author.last_name || ""
    }`.trim()

  return (
    fullName ||
    (author as any).username ||
    "BareMind Member"
  )
}

function getAuthorUsername(blog: Blog) {
  return (
    (blog.author as any)?.username ||
    (blog.author as any)?.id
  )
}

function getBlogImage(blog: Blog) {
  return (
    (blog as any).cover_image ||
    (blog as any).cover_image_url ||
    (blog as any).thumbnail ||
    null
  )
}

function getReadingTime(blog: Blog) {
  if (blog.reading_time) {
    return blog.reading_time
  }

  const words = stripHtml(blog.content || "")
    .split(/\s+/)
    .filter(Boolean).length

  return Math.max(1, Math.ceil(words / 200))
}

function formatDate(value?: string) {
  if (!value) return ""

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

/* =========================================================
   TOPIC DETAIL
========================================================= */

export default function TopicDetail() {
  const { slug } = useParams<{ slug: string }>()

  const { isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  )

  /* =======================================================
     DATA
  ======================================================= */

  const [topic, setTopic] =
    useState<Category | null>(null)

  const [topWriters, setTopWriters] =
    useState<any[]>([])

  const [feed, setFeed] =
    useState<Blog[]>([])

  const [searchQuery, setSearchQuery] =
    useState("")
    
  const [debouncedQuery, setDebouncedQuery] =
    useState("")

  const [showSuggestions, setShowSuggestions] =
    useState(false)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  /* =======================================================
     UI
  ======================================================= */

  const [activeTab, setActiveTab] = useState<
    "overview" | "trending" | "latest"
  >("overview")

  const [topicLoading, setTopicLoading] =
    useState(true)

  const [feedLoading, setFeedLoading] =
    useState(true)

  const [followLoading, setFollowLoading] =
    useState(false)

  const [showAuthModal, setShowAuthModal] =
    useState(false)

  /* =======================================================
     FETCH TOPIC
  ======================================================= */

  useEffect(() => {
    if (!slug) return

    let mounted = true

    async function fetchTopicData() {
      try {
        setTopicLoading(true)

        const [categories, writers] =
          await Promise.all([
            taxonomyService.getCategories(),
            taxonomyService
              .getCategoryWriters(slug!, 4)
              .catch(() => []),
          ])

        if (!mounted) return

        const found =
          categories.find(
            (category) =>
              category.slug === slug
          ) || null

        setTopic(found)
        setTopWriters(
          Array.isArray(writers)
            ? writers
            : []
        )
      } catch (error) {
        console.error(
          "Failed to fetch topic:",
          error
        )
      } finally {
        if (mounted) {
          setTopicLoading(false)
        }
      }
    }

    fetchTopicData()

    return () => {
      mounted = false
    }
  }, [slug])

  /* =======================================================
     FETCH STORIES
  ======================================================= */

  useEffect(() => {
    if (!slug) return

    let mounted = true

    async function fetchFeed() {
      try {
        setFeedLoading(true)

        let blogs: Blog[] = []
        
        const q = debouncedQuery || undefined

        if (activeTab === "overview") {
          const [trending, latest] =
            await Promise.all([
              blogService.getBlogs(
                0,
                4,
                undefined,
                slug,
                "trending",
                q
              ),

              blogService.getBlogs(
                0,
                8,
                undefined,
                slug,
                "latest",
                q
              ),
            ])

          const seen =
            new Set<number>()

          blogs = [
            ...trending,
            ...latest,
          ].filter((blog) => {
            if (seen.has(blog.id)) {
              return false
            }

            seen.add(blog.id)
            return true
          })
        }

        if (activeTab === "trending") {
          blogs =
            await blogService.getBlogs(
              0,
              20,
              undefined,
              slug,
              "trending",
              q
            )
        }

        if (activeTab === "latest") {
          blogs =
            await blogService.getBlogs(
              0,
              20,
              undefined,
              slug,
              "latest",
              q
            )
        }

        if (mounted) {
          setFeed(blogs)
        }
      } catch (error) {
        console.error(
          "Failed to fetch topic feed:",
          error
        )

        if (mounted) {
          setFeed([])
        }
      } finally {
        if (mounted) {
          setFeedLoading(false)
        }
      }
    }

    fetchFeed()

    return () => {
      mounted = false
    }
  }, [slug, activeTab, debouncedQuery])

  /* =======================================================
     FOLLOW
  ======================================================= */

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true)
      return
    }

    if (!topic || followLoading) return

    const previousFollowing =
      Boolean(topic.is_following)

    const previousCount =
      topic.followers_count || 0

    const nextFollowing =
      !previousFollowing

    setTopic({
      ...topic,
      is_following: nextFollowing,
      followers_count: Math.max(
        0,
        previousCount +
        (nextFollowing ? 1 : -1)
      ),
    })

    try {
      setFollowLoading(true)

      const response =
        await taxonomyService.followCategory(
          topic.id
        )

      setTopic((current) =>
        current
          ? {
            ...current,
            is_following:
              response.status ===
              "followed",
          }
          : current
      )
    } catch (error) {
      console.error(
        "Failed to follow topic:",
        error
      )

      setTopic((current) =>
        current
          ? {
            ...current,
            is_following:
              previousFollowing,
            followers_count:
              previousCount,
          }
          : current
      )
    } finally {
      setFollowLoading(false)
    }
  }

  /* =======================================================
     COMPUTED
  ======================================================= */

  const featuredStory =
    feed.length > 0 ? feed[0] : null

  const remainingStories =
    useMemo(
      () => feed.slice(1),
      [feed]
    )

  const storyCount =
    (topic as any)?.blogs_count ??
    (topic as any)?.stories_count ??
    null

  /* =======================================================
     LOADING
  ======================================================= */

  if (topicLoading) {
    return <TopicDetailSkeleton />
  }

  /* =======================================================
     NOT FOUND
  ======================================================= */

  if (!topic) {
    return (
      <main className="min-h-screen bg-[#FCFCFB] pt-24">
        <div
          className="
            mx-auto flex min-h-[520px]
            max-w-[1100px]
            items-center justify-center
            px-6
          "
        >
          <div className="text-center">
            <div
              className="
                mx-auto flex size-12
                items-center justify-center
                rounded-2xl
                border border-slate-200
                bg-white
                text-slate-400
              "
            >
              <BookOpen className="size-5" />
            </div>

            <h1
              className="
                mt-5 text-[22px]
                font-black
                tracking-[-0.03em]
                text-slate-950
              "
            >
              Topic not found
            </h1>

            <p
              className="
                mt-2 text-[11px]
                font-medium
                text-slate-500
              "
            >
              This topic may have been removed
              or renamed.
            </p>

            <Link
              to="/topics"
              className="
                mt-6 inline-flex h-10
                items-center gap-2
                rounded-full
                bg-slate-950
                px-5
                text-[10px]
                font-extrabold
                text-white
                transition
                hover:bg-[#E05A47]
              "
            >
              <ArrowLeft className="size-3.5" />
              Browse topics
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <>
      <main className="min-h-screen bg-[#FCFCFB]">

        {/* =================================================
            TOPIC HEADER
        ================================================= */}

        <header
          className="
            border-b border-slate-200/80
            bg-white
            pt-20
          "
        >
          <div
            className="
              mx-auto
              max-w-[1180px]
              px-4
              sm:px-6
              lg:px-8
            "
          >
            {/* breadcrumb */}

            <div className="pt-6">
              <Link
                to="/topics"
                className="
                  group
                  inline-flex items-center
                  gap-1.5
                  text-[9px]
                  font-bold
                  text-slate-400
                  transition
                  hover:text-slate-800
                "
              >
                <ArrowLeft
                  className="
                    size-3
                    transition-transform
                    group-hover:-translate-x-0.5
                  "
                />

                All topics
              </Link>
            </div>

            {/* heading */}

            <div
              className="
                flex flex-col
                gap-7
                py-8
                lg:flex-row
                lg:items-end
                lg:justify-between
                lg:py-10
              "
            >
              <div className="max-w-[690px]">
                <div className="flex items-center gap-2">
                  <span
                    className="
                      flex size-7
                      items-center justify-center
                      rounded-lg
                      bg-[#FFF1EE]
                      text-[#E05A47]
                    "
                  >
                    <BookOpen className="size-3.5" />
                  </span>

                  <span
                    className="
                      text-[8px]
                      font-black
                      uppercase
                      tracking-[0.16em]
                      text-[#E05A47]
                    "
                  >
                    BareMind Topic
                  </span>
                </div>

                <h1
                  className="
                    mt-4
                    text-[34px]
                    font-black
                    leading-[1.02]
                    tracking-[-0.05em]
                    text-slate-950
                    sm:text-[42px]
                    lg:text-[48px]
                  "
                >
                  {topic.name}
                </h1>

                <p
                  className="
                    mt-4
                    max-w-[610px]
                    text-[12px]
                    font-medium
                    leading-6
                    text-slate-500
                    sm:text-[13px]
                  "
                >
                  {topic.description ||
                    `Explore thoughtful stories, practical guides and conversations around ${topic.name}.`}
                </p>

                {/* metadata */}

                <div
                  className="
                    mt-5
                    flex flex-wrap
                    items-center
                    gap-x-5
                    gap-y-2
                  "
                >
                  <div className="flex items-center gap-1.5">
                    <Users className="size-3 text-slate-400" />

                    <span
                      className="
                        text-[9px]
                        font-bold
                        text-slate-500
                      "
                    >
                      {formatNumber(
                        topic.followers_count || 0
                      )}{" "}
                      followers
                    </span>
                  </div>

                  {storyCount !== null && (
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="size-3 text-slate-400" />

                      <span
                        className="
                          text-[9px]
                          font-bold
                          text-slate-500
                        "
                      >
                        {formatNumber(
                          storyCount
                        )}{" "}
                        stories
                      </span>
                    </div>
                  )}

                  {topWriters.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {topWriters
                          .slice(0, 3)
                          .map((writer) => {
                            const name =
                              `${writer.first_name || ""} ${writer.last_name || ""}`.trim() ||
                              writer.username

                            return (
                              <img
                                key={writer.id}
                                src={getUserAvatar(
                                  writer.avatar_url,
                                  name
                                )}
                                alt={name}
                                className="
                                  size-5
                                  rounded-full
                                  border-2
                                  border-white
                                  object-cover
                                "
                              />
                            )
                          })}
                      </div>

                      <span
                        className="
                          text-[9px]
                          font-bold
                          text-slate-400
                        "
                      >
                        Active contributors
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* follow */}

              <div className="shrink-0">
                <button
                  type="button"
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={`
                    inline-flex h-10
                    min-w-[110px]
                    items-center justify-center
                    gap-2
                    rounded-full
                    px-5
                    text-[10px]
                    font-extrabold
                    transition-all
                    disabled:opacity-60

                    ${topic.is_following
                      ? `
                          border
                          border-slate-200
                          bg-white
                          text-slate-700
                          hover:border-slate-300
                          hover:bg-slate-50
                        `
                      : `
                          bg-slate-950
                          text-white
                          shadow-sm
                          hover:bg-[#E05A47]
                          hover:shadow-lg
                          hover:shadow-[#E05A47]/10
                        `
                    }
                  `}
                >
                  {followLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : topic.is_following ? (
                    <>
                      <Check className="size-3.5" />
                      Following
                    </>
                  ) : (
                    <>
                      <Plus className="size-3.5" />
                      Follow topic
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ===============================================
                NAVIGATION
            =============================================== */}

            <nav
              className="
                flex items-center
                gap-7
                overflow-x-auto
                [scrollbar-width:none]
                [&::-webkit-scrollbar]:hidden
              "
            >
              <TopicTab
                label="Overview"
                active={
                  activeTab === "overview"
                }
                onClick={() =>
                  setActiveTab("overview")
                }
              />

              <TopicTab
                label="Trending"
                active={
                  activeTab === "trending"
                }
                onClick={() =>
                  setActiveTab("trending")
                }
              />

              <TopicTab
                label="Latest"
                active={
                  activeTab === "latest"
                }
                onClick={() =>
                  setActiveTab("latest")
                }
              />
            </nav>
          </div>
        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <div
          className="
            mx-auto
            max-w-[1180px]
            px-4
            py-9
            sm:px-6
            lg:px-8
            lg:py-11
          "
        >
          <div
            className="
              grid grid-cols-1
              gap-12
              lg:grid-cols-[minmax(0,1fr)_300px]
            "
          >
            {/* =============================================
                MAIN EDITORIAL COLUMN
            ============================================= */}
            <div className="flex flex-col gap-8">
              {/* SEARCH BLOCK */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value)
                    setShowSuggestions(true)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      setDebouncedQuery(searchQuery)
                      setShowSuggestions(false)
                    }
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder={`Search in ${topic?.name}...`}
                  className="
                    h-11 w-full rounded-xl
                    border border-slate-200
                    bg-[#FCFCFB]
                    pl-11 pr-11
                    text-[11px] font-semibold text-slate-900
                    outline-none transition-all
                    placeholder:text-slate-400
                    hover:border-slate-300 hover:bg-white
                    focus:border-[#E05A47] focus:bg-white focus:ring-4 focus:ring-[#E05A47]/[0.07]
                  "
                />
              </div>

            <div className="min-w-0">
              {feedLoading ? (
                <FeedSkeleton />
              ) : feed.length === 0 ? (
                <EmptyStories
                  topicName={topic.name}
                />
              ) : (
                <>
                  {/* =========================================
                      FEATURED STORY
                  ========================================= */}

                  {featuredStory && (
                    <section>
                      <SectionHeader
                        icon={
                          activeTab ===
                            "trending" ? (
                            <TrendingUp className="size-3.5" />
                          ) : (
                            <Sparkles className="size-3.5" />
                          )
                        }
                        eyebrow={
                          activeTab ===
                            "trending"
                            ? "Trending now"
                            : activeTab ===
                              "latest"
                              ? "Latest"
                              : "Featured"
                        }
                        title={
                          activeTab ===
                            "trending"
                            ? `Popular in ${topic.name}`
                            : activeTab ===
                              "latest"
                              ? `New in ${topic.name}`
                              : `Featured in ${topic.name}`
                        }
                      />

                      <FeaturedStory
                        blog={featuredStory}
                        rank={
                          activeTab ===
                            "trending"
                            ? 1
                            : undefined
                        }
                      />
                    </section>
                  )}

                  {/* =========================================
                      MORE STORIES
                  ========================================= */}

                  {remainingStories.length >
                    0 && (
                      <section
                        className="
                        mt-11
                        border-t
                        border-slate-200
                        pt-9
                      "
                      >
                        <div
                          className="
                          mb-1
                          flex items-end
                          justify-between
                          gap-4
                        "
                        >
                          <div>
                            <p
                              className="
                              text-[8px]
                              font-black
                              uppercase
                              tracking-[0.14em]
                              text-[#E05A47]
                            "
                            >
                              {activeTab ===
                                "trending"
                                ? "Ranking"
                                : activeTab ===
                                  "latest"
                                  ? "Recently published"
                                  : "Keep reading"}
                            </p>

                            <h2
                              className="
                              mt-1.5
                              text-[18px]
                              font-black
                              tracking-[-0.025em]
                              text-slate-950
                            "
                            >
                              {activeTab ===
                                "trending"
                                ? "More trending stories"
                                : activeTab ===
                                  "latest"
                                  ? "Latest stories"
                                  : "More from this topic"}
                            </h2>
                          </div>

                          <span
                            className="
                            hidden
                            text-[8px]
                            font-bold
                            text-slate-400
                            sm:block
                          "
                          >
                            {remainingStories.length}{" "}
                            stories
                          </span>
                        </div>

                        <div className="mt-4">
                          {remainingStories.map(
                            (
                              blog,
                              index
                            ) => (
                              <StoryRow
                                key={blog.id}
                                blog={blog}
                                rank={
                                  activeTab ===
                                    "trending"
                                    ? index + 2
                                    : undefined
                                }
                              />
                            )
                          )}
                        </div>
                      </section>
                    )}
                </>
              )}
            </div>

            </div>

            {/* =============================================
                SIDEBAR
            ============================================= */}

            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-9">

                {/* =========================================
                    CONTRIBUTORS
                ========================================= */}

                {topWriters.length > 0 && (
                  <section>
                    <SidebarHeader
                      title="People to know"
                      subtitle={`Publishing about ${topic.name}`}
                    />

                    <div className="mt-1">
                      {topWriters.map(
                        (writer) => (
                          <WriterRow
                            key={writer.id}
                            writer={writer}
                            topicName={
                              topic.name
                            }
                          />
                        )
                      )}
                    </div>

                    <Link
                      to="/connections"
                      className="
                        group
                        mt-3
                        inline-flex
                        items-center
                        gap-1
                        text-[9px]
                        font-extrabold
                        text-[#E05A47]
                      "
                    >
                      Discover more people

                      <ChevronRight
                        className="
                          size-3
                          transition-transform
                          group-hover:translate-x-0.5
                        "
                      />
                    </Link>
                  </section>
                )}

                {/* =========================================
                    RELATED TOPICS
                ========================================= */}

                <section>
                  <SidebarHeader
                    title="Related topics"
                    subtitle="Continue exploring"
                  />

                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      "Kubernetes",
                      "Docker",
                      "CI/CD",
                      "Linux",
                      "AWS",
                      "Cloud",
                      "Terraform",
                      "Platform Engineering",
                    ]
                      .filter(
                        (item) =>
                          item.toLowerCase() !==
                          topic.name.toLowerCase()
                      )
                      .slice(0, 7)
                      .map((item) => (
                        <Link
                          key={item}
                          to={`/topics/${item
                            .toLowerCase()
                            .replace(
                              /\s+/g,
                              "-"
                            )
                            .replace(
                              /[^a-z0-9-]/g,
                              ""
                            )}`}
                          className="
                            rounded-lg
                            border
                            border-slate-200
                            bg-white
                            px-3 py-2
                            text-[8px]
                            font-bold
                            text-slate-600
                            transition-all
                            hover:border-slate-300
                            hover:bg-slate-50
                            hover:text-slate-950
                          "
                        >
                          {item}
                        </Link>
                      ))}
                  </div>
                </section>

                {/* =========================================
                    TOPIC INFO
                ========================================= */}

                <section
                  className="
                    rounded-2xl
                    border
                    border-[#E05A47]/10
                    bg-[#FFF8F6]
                    p-5
                  "
                >
                  <div
                    className="
                      flex size-8
                      items-center
                      justify-center
                      rounded-lg
                      bg-white
                      text-[#E05A47]
                      shadow-sm
                      ring-1
                      ring-[#E05A47]/10
                    "
                  >
                    <Sparkles className="size-3.5" />
                  </div>

                  <h3
                    className="
                      mt-4
                      text-[11px]
                      font-black
                      text-slate-900
                    "
                  >
                    Interested in {topic.name}?
                  </h3>

                  <p
                    className="
                      mt-1.5
                      text-[9px]
                      font-medium
                      leading-[1.75]
                      text-slate-500
                    "
                  >
                    Follow this topic and
                    BareMind will use it to
                    improve the stories shown
                    in your personalized feed.
                  </p>

                  {!topic.is_following && (
                    <button
                      type="button"
                      onClick={
                        handleFollowToggle
                      }
                      className="
                        mt-4
                        inline-flex h-9
                        items-center
                        gap-1.5
                        rounded-full
                        bg-slate-950
                        px-4
                        text-[8px]
                        font-extrabold
                        text-white
                        transition
                        hover:bg-[#E05A47]
                      "
                    >
                      <Plus className="size-3" />

                      Follow {topic.name}
                    </button>
                  )}
                </section>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showAuthModal && (
          <AuthModal
            onClose={() =>
              setShowAuthModal(false)
            }
          />
        )}
      </AnimatePresence>
    </>
  )
}

/* =========================================================
   FEATURED STORY
========================================================= */

function FeaturedStory({
  blog,
  rank,
}: {
  blog: Blog
  rank?: number
}) {
  const image =
    getBlogImage(blog)

  const authorName =
    getAuthorName(blog)

  const username =
    getAuthorUsername(blog)

  const avatar = getUserAvatar(
    (blog.author as any)?.avatar_url,
    authorName
  )

  return (
    <article
      className="
        group
        mt-5
        overflow-hidden
        rounded-[20px]
        border
        border-slate-200/90
        bg-white
        shadow-[0_1px_3px_rgba(15,23,42,0.025)]
      "
    >
      {/* image */}

      {image && (
        <Link
          to={`/blog/${blog.slug}`}
          className="
            block
            aspect-[16/7]
            overflow-hidden
            bg-slate-100
          "
        >
          <img
            src={image}
            alt={blog.title}
            className="
              h-full w-full
              object-cover
              transition-transform
              duration-700
              group-hover:scale-[1.025]
            "
          />
        </Link>
      )}

      <div
        className="
          p-5
          sm:p-6
        "
      >
        {/* trending rank */}

        {rank && (
          <div
            className="
              mb-3
              inline-flex
              items-center
              gap-1.5
              rounded-full
              bg-[#FFF1EE]
              px-2.5 py-1
              text-[7px]
              font-black
              uppercase
              tracking-[0.1em]
              text-[#E05A47]
            "
          >
            <TrendingUp className="size-2.5" />
            #{rank} trending
          </div>
        )}

        <Link
          to={`/blog/${blog.slug}`}
          className="block"
        >
          <h2
            className="
              max-w-[660px]
              text-[22px]
              font-black
              leading-[1.2]
              tracking-[-0.035em]
              text-slate-950
              transition-colors
              group-hover:text-[#E05A47]
              sm:text-[25px]
            "
          >
            {blog.title}
          </h2>
        </Link>

        <p
          className="
            mt-3
            max-w-[680px]
            text-[11px]
            font-medium
            leading-[1.8]
            text-slate-500
            sm:text-[12px]
          "
        >
          {getExcerpt(
            blog.content,
            210
          )}
        </p>

        {/* footer */}

        <div
          className="
            mt-5
            flex flex-wrap
            items-center
            justify-between
            gap-4
            border-t
            border-slate-100
            pt-4
          "
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src={avatar}
              alt={authorName}
              className="
                size-7
                rounded-full
                border border-slate-200
                object-cover
              "
            />

            <div className="min-w-0">
              <Link
                to={
                  username
                    ? `/u/${username}`
                    : "#"
                }
                className="
                  block truncate
                  text-[9px]
                  font-extrabold
                  text-slate-800
                  transition
                  hover:text-[#E05A47]
                "
              >
                {authorName}
              </Link>

              <div
                className="
                  mt-0.5
                  flex items-center
                  gap-1.5
                  text-[7px]
                  font-semibold
                  text-slate-400
                "
              >
                <span>
                  {formatDate(
                    blog.created_at
                  )}
                </span>

                <span>·</span>

                <span>
                  {getReadingTime(blog)} min
                </span>
              </div>
            </div>
          </div>

          <div
            className="
              flex items-center
              gap-4
              text-[8px]
              font-bold
              text-slate-400
            "
          >
            {(blog as any).views_count !==
              undefined && (
                <span className="flex items-center gap-1">
                  <Eye className="size-3" />
                  {formatNumber(
                    (blog as any)
                      .views_count || 0
                  )}
                </span>
              )}

            <span className="flex items-center gap-1">
              <Heart className="size-3" />

              {formatNumber(
                blog.likes_count || 0
              )}
            </span>

            <Link
              to={`/blog/${blog.slug}`}
              aria-label={`Read ${blog.title}`}
              className="
                flex size-8
                items-center
                justify-center
                rounded-full
                bg-slate-950
                text-white
                transition-all
                hover:bg-[#E05A47]
              "
            >
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

/* =========================================================
   STORY ROW
========================================================= */

function StoryRow({
  blog,
  rank,
}: {
  blog: Blog
  rank?: number
}) {
  const image =
    getBlogImage(blog)

  const authorName =
    getAuthorName(blog)

  const username =
    getAuthorUsername(blog)

  return (
    <article
      className="
        group
        border-b
        border-slate-100
        py-5
        first:pt-3
        last:border-b-0
      "
    >
      <div className="flex gap-4 sm:gap-5">

        {/* rank */}

        {rank && (
          <div
            className="
              hidden w-8
              shrink-0
              pt-0.5
              text-[15px]
              font-black
              tracking-[-0.03em]
              text-slate-200
              sm:block
            "
          >
            {String(rank).padStart(
              2,
              "0"
            )}
          </div>
        )}

        {/* content */}

        <div className="min-w-0 flex-1">
          <Link
            to={`/blog/${blog.slug}`}
            className="block"
            onClick={() => {
              if (debouncedQuery) {
                searchService.trackSearch(debouncedQuery, blog.id)
              }
            }}
          >
            <h3
              className="
                text-[15px]
                font-black
                leading-[1.35]
                tracking-[-0.015em]
                text-slate-900
                transition-colors
                group-hover:text-[#E05A47]
                sm:text-[16px]
              "
            >
              {blog.title}
            </h3>
          </Link>

          <p
            className="
              mt-1.5
              line-clamp-2
              max-w-[560px]
              text-[9px]
              font-medium
              leading-[1.7]
              text-slate-500
            "
          >
            {getExcerpt(
              blog.content,
              140
            )}
          </p>

          <div
            className="
              mt-3
              flex flex-wrap
              items-center
              gap-x-2
              gap-y-1
              text-[7px]
              font-semibold
              text-slate-400
            "
          >
            <Link
              to={
                username
                  ? `/u/${username}`
                  : "#"
              }
              className="
                font-extrabold
                text-slate-600
                transition
                hover:text-[#E05A47]
              "
            >
              {authorName}
            </Link>

            <span>·</span>

            <span>
              {getReadingTime(blog)} min read
            </span>

            <span>·</span>

            <span>
              {formatDate(
                blog.created_at
              )}
            </span>

            {(blog.likes_count || 0) >
              0 && (
                <>
                  <span>·</span>

                  <span className="flex items-center gap-1">
                    <Heart className="size-2.5" />

                    {formatNumber(
                      blog.likes_count
                    )}
                  </span>
                </>
              )}
          </div>
        </div>

        {/* thumbnail */}

        {image && (
          <Link
            to={`/blog/${blog.slug}`}
            className="
              hidden
              h-[88px]
              w-[128px]
              shrink-0
              overflow-hidden
              rounded-xl
              bg-slate-100
              sm:block
            "
          >
            <img
              src={image}
              alt={blog.title}
              className="
                h-full w-full
                object-cover
                transition-transform
                duration-500
                group-hover:scale-105
              "
            />
          </Link>
        )}
      </div>
    </article>
  )
}

/* =========================================================
   WRITER
========================================================= */

function WriterRow({
  writer,
  topicName,
}: {
  writer: any
  topicName: string
}) {
  const name =
    `${writer.first_name || ""} ${writer.last_name || ""
      }`.trim() ||
    writer.username ||
    "BareMind Member"

  return (
    <div
      className="
        group
        flex items-center
        gap-3
        border-b
        border-slate-100
        py-3.5
        last:border-b-0
      "
    >
      <Link
        to={`/u/${writer.username ||
          writer.id
          }`}
        className="shrink-0"
      >
        <img
          src={getUserAvatar(
            writer.avatar_url,
            name
          )}
          alt={name}
          className="
            size-9
            rounded-full
            border border-slate-200
            object-cover
          "
        />
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          to={`/u/${writer.username ||
            writer.id
            }`}
          className="
            block truncate
            text-[9px]
            font-extrabold
            text-slate-800
            transition-colors
            group-hover:text-[#E05A47]
          "
        >
          {name}
        </Link>

        <p
          className="
            mt-0.5
            truncate
            text-[7px]
            font-semibold
            text-slate-400
          "
        >
          @{writer.username || "member"} ·{" "}
          {topicName}
        </p>
      </div>

      <Link
        to={`/u/${writer.username ||
          writer.id
          }`}
        className="
          flex size-7
          shrink-0
          items-center
          justify-center
          rounded-full
          border border-slate-200
          text-slate-400
          transition-all
          hover:border-slate-300
          hover:bg-slate-50
          hover:text-slate-900
        "
      >
        <ChevronRight className="size-3" />
      </Link>
    </div>
  )
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function TopicTab({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative
        h-12
        shrink-0
        text-[9px]
        font-extrabold
        transition-colors

        ${active
          ? "text-slate-950"
          : "text-slate-400 hover:text-slate-700"
        }
      `}
    >
      {label}

      {active && (
        <span
          className="
            absolute
            inset-x-0
            bottom-0
            h-[2px]
            rounded-full
            bg-[#E05A47]
          "
        />
      )}
    </button>
  )
}

function SectionHeader({
  icon,
  eyebrow,
  title,
}: {
  icon: React.ReactNode
  eyebrow: string
  title: string
}) {
  return (
    <div>
      <div
        className="
          flex items-center
          gap-1.5
          text-[#E05A47]
        "
      >
        {icon}

        <p
          className="
            text-[8px]
            font-black
            uppercase
            tracking-[0.14em]
          "
        >
          {eyebrow}
        </p>
      </div>

      <h2
        className="
          mt-1.5
          text-[18px]
          font-black
          tracking-[-0.025em]
          text-slate-950
        "
      >
        {title}
      </h2>
    </div>
  )
}

function SidebarHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <div
      className="
        border-b
        border-slate-200
        pb-3
      "
    >
      <h3
        className="
          text-[10px]
          font-black
          text-slate-900
        "
      >
        {title}
      </h3>

      <p
        className="
          mt-0.5
          text-[7px]
          font-medium
          text-slate-400
        "
      >
        {subtitle}
      </p>
    </div>
  )
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyStories({
  topicName,
}: {
  topicName: string
}) {
  return (
    <div
      className="
        flex min-h-[400px]
        items-center
        justify-center
        rounded-2xl
        border
        border-dashed
        border-slate-200
        bg-white
      "
    >
      <div
        className="
          max-w-[320px]
          px-6
          text-center
        "
      >
        <div
          className="
            mx-auto
            flex size-10
            items-center
            justify-center
            rounded-xl
            bg-slate-50
            text-slate-400
            ring-1
            ring-slate-200
          "
        >
          <BookOpen className="size-4" />
        </div>

        <h3
          className="
            mt-4
            text-[12px]
            font-black
            text-slate-900
          "
        >
          No stories yet
        </h3>

        <p
          className="
            mt-1.5
            text-[9px]
            font-medium
            leading-5
            text-slate-500
          "
        >
          No stories have been published
          under {topicName} yet.
        </p>

        <Link
          to="/create-blog"
          className="
            mt-5
            inline-flex h-9
            items-center
            gap-1.5
            rounded-full
            bg-slate-950
            px-4
            text-[8px]
            font-extrabold
            text-white
            transition
            hover:bg-[#E05A47]
          "
        >
          Write a story

          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </div>
  )
}

/* =========================================================
   FEED SKELETON
========================================================= */

function FeedSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-2.5 w-20 rounded bg-slate-100" />
      <div className="mt-2 h-5 w-52 rounded bg-slate-100" />

      <div
        className="
          mt-5
          rounded-[20px]
          border border-slate-200
          bg-white
          p-6
        "
      >
        <div className="h-6 w-[80%] rounded bg-slate-100" />
        <div className="mt-3 h-3 w-full rounded bg-slate-100" />
        <div className="mt-2 h-3 w-[70%] rounded bg-slate-100" />

        <div className="mt-6 flex items-center gap-3">
          <div className="size-7 rounded-full bg-slate-100" />
          <div>
            <div className="h-2.5 w-24 rounded bg-slate-100" />
            <div className="mt-1.5 h-2 w-32 rounded bg-slate-100" />
          </div>
        </div>
      </div>

      <div
        className="
          mt-10
          border-t
          border-slate-200
          pt-8
        "
      >
        <div className="h-4 w-40 rounded bg-slate-100" />

        <div className="mt-5">
          {[1, 2, 3, 4].map(
            (item) => (
              <div
                key={item}
                className="
                  border-b
                  border-slate-100
                  py-5
                "
              >
                <div className="h-3.5 w-[65%] rounded bg-slate-100" />
                <div className="mt-2.5 h-2.5 w-[85%] rounded bg-slate-100" />
                <div className="mt-2 h-2.5 w-[50%] rounded bg-slate-100" />
                <div className="mt-3 h-2 w-40 rounded bg-slate-100" />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   PAGE SKELETON
========================================================= */

function TopicDetailSkeleton() {
  return (
    <main className="min-h-screen bg-[#FCFCFB]">
      <div
        className="
          border-b
          border-slate-200
          bg-white
          pt-20
        "
      >
        <div
          className="
            mx-auto
            max-w-[1180px]
            animate-pulse
            px-4 py-10
            sm:px-6
            lg:px-8
          "
        >
          <div className="h-2.5 w-20 rounded bg-slate-100" />

          <div className="mt-8 h-8 w-64 rounded bg-slate-100" />

          <div className="mt-4 h-3 w-[500px] max-w-full rounded bg-slate-100" />

          <div className="mt-2 h-3 w-[380px] max-w-full rounded bg-slate-100" />

          <div className="mt-5 h-2.5 w-52 rounded bg-slate-100" />

          <div className="mt-9 flex gap-7">
            {[1, 2, 3].map(
              (item) => (
                <div
                  key={item}
                  className="h-3 w-16 rounded bg-slate-100"
                />
              )
            )}
          </div>
        </div>
      </div>

      <div
        className="
          mx-auto
          max-w-[1180px]
          px-4 py-11
          sm:px-6
          lg:px-8
        "
      >
        <div
          className="
            grid grid-cols-1
            gap-12
            lg:grid-cols-[minmax(0,1fr)_300px]
          "
        >
          <FeedSkeleton />

          <div className="hidden animate-pulse lg:block">
            <div className="h-3 w-28 rounded bg-slate-100" />

            <div className="mt-5 space-y-4">
              {[1, 2, 3].map(
                (item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3"
                  >
                    <div className="size-9 rounded-full bg-slate-100" />

                    <div className="flex-1">
                      <div className="h-2.5 w-24 rounded bg-slate-100" />
                      <div className="mt-2 h-2 w-28 rounded bg-slate-100" />
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="mt-10 h-3 w-28 rounded bg-slate-100" />
            <div className="mt-4 h-24 rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    </main>
  )
}