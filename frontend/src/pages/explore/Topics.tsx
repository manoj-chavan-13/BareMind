import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useSelector } from "react-redux"
import { AnimatePresence, motion } from "framer-motion"

import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  Hash,
  Loader2,
  Lock,
  Search,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react"

import type { RootState } from "@/store"
import {
  taxonomyService,
  type Category,
  type Tag,
} from "@/services/taxonomyService"

const BRAND = "#E05A47"

/* =========================================================
   DOMAIN ARCHITECTURE
========================================================= */

const DOMAIN_ORDER = [
  "Technology",
  "AI & Data",
  "Business",
  "Design",
  "Science",
  "Life & Ideas",
  "Other",
]

const DOMAIN_RULES: Record<string, string[]> = {
  Technology: [
    "programming",
    "software",
    "web",
    "development",
    "developer",
    "devops",
    "cloud",
    "kubernetes",
    "docker",
    "cybersecurity",
    "security",
    "system design",
    "backend",
    "frontend",
    "database",
    "open source",
    "linux",
    "networking",
    "mobile",
    "android",
    "ios",
  ],

  "AI & Data": [
    "artificial intelligence",
    "machine learning",
    "deep learning",
    "data science",
    "data engineering",
    "generative ai",
    "llm",
    "analytics",
    "computer vision",
    "nlp",
    "neural",
    "data",
  ],

  Business: [
    "business",
    "startup",
    "entrepreneurship",
    "marketing",
    "finance",
    "management",
    "leadership",
    "product",
    "career",
    "economics",
    "investing",
  ],

  Design: [
    "design",
    "ui",
    "ux",
    "user experience",
    "figma",
    "creativity",
    "product design",
    "graphic",
  ],

  Science: [
    "science",
    "space",
    "physics",
    "biology",
    "chemistry",
    "medicine",
    "research",
    "mathematics",
    "math",
  ],

  "Life & Ideas": [
    "life",
    "productivity",
    "psychology",
    "philosophy",
    "culture",
    "education",
    "learning",
    "writing",
    "books",
    "health",
    "personal growth",
    "society",
  ],
}

/* =========================================================
   HELPERS
========================================================= */

function formatNumber(value = 0) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value)
}

function getDomainForCategory(name = "") {
  const normalized = name.toLowerCase()

  for (const [domain, keywords] of Object.entries(DOMAIN_RULES)) {
    if (
      keywords.some(
        (keyword) =>
          normalized.includes(keyword) ||
          keyword.includes(normalized)
      )
    ) {
      return domain
    }
  }

  return "Other"
}

function getTopicDescription(category: Category) {
  const categoryAny = category as any

  if (categoryAny.description) {
    return categoryAny.description
  }

  const descriptions: Record<string, string> = {
    devops:
      "Infrastructure, automation, CI/CD, containers and modern operations.",

    programming:
      "Languages, engineering practices and the craft of building software.",

    "artificial-intelligence":
      "AI systems, models, research and the technologies reshaping software.",

    "machine-learning":
      "Models, training, experimentation and practical machine learning.",

    "web-development":
      "Modern frontend, backend, browsers, frameworks and the open web.",

    cybersecurity:
      "Application security, infrastructure defense and the evolving threat landscape.",

    "system-design":
      "Architecture, scalability, distributed systems and engineering trade-offs.",

    cloud:
      "Cloud infrastructure, platforms, architecture and production operations.",

    design:
      "Digital products, visual systems, interfaces and human-centered design.",

    productivity:
      "Better systems for focus, learning, work and sustainable progress.",

    startups:
      "Building products, finding markets and growing technology companies.",

    science:
      "Research, discovery and ideas shaping our understanding of the world.",
  }

  return (
    descriptions[category.slug] ||
    `Stories, perspectives and practical ideas from the BareMind community about ${category.name}.`
  )
}

function getStoryCount(category: Category) {
  const value =
    (category as any).blogs_count ??
    (category as any).posts_count ??
    (category as any).stories_count ??
    (category as any).article_count

  return typeof value === "number" ? value : null
}

/* =========================================================
   AUTH MODAL
========================================================= */

function AuthModal({
  onClose,
}: {
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={onClose}
      className="
        fixed inset-0 z-[120]
        flex items-center justify-center
        bg-slate-950/35 p-4
        backdrop-blur-[4px]
      "
    >
      <motion.div
        initial={{
          opacity: 0,
          y: 16,
          scale: 0.98,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          y: 10,
          scale: 0.98,
        }}
        transition={{
          duration: 0.2,
        }}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
        className="
          relative w-full max-w-[390px]
          rounded-[22px]
          border border-slate-200
          bg-white p-7
          shadow-[0_30px_80px_rgba(15,23,42,0.18)]
        "
      >
        <button
          type="button"
          onClick={onClose}
          className="
            absolute right-4 top-4
            flex size-8 items-center justify-center
            rounded-full
            text-slate-400
            transition
            hover:bg-slate-100
            hover:text-slate-700
          "
        >
          <X className="size-4" />
        </button>

        <div
          className="
            flex size-10 items-center justify-center
            rounded-xl
            bg-[#FFF1EE]
            text-[#E05A47]
          "
        >
          <Lock className="size-4" />
        </div>

        <h2 className="mt-5 text-[20px] font-black tracking-[-0.03em] text-slate-950">
          Personalize your BareMind
        </h2>

        <p className="mt-2 text-[12px] font-medium leading-6 text-slate-500">
          Sign in to follow topics and shape the
          stories BareMind recommends to you.
        </p>

        <div className="mt-6 space-y-2.5">
          <Link
            to="/login"
            className="
              flex h-11 w-full items-center justify-center
              rounded-xl
              bg-slate-950
              text-[11px] font-extrabold text-white
              transition
              hover:bg-[#E05A47]
            "
          >
            Sign in
          </Link>

          <Link
            to="/register"
            className="
              flex h-11 w-full items-center justify-center
              rounded-xl
              border border-slate-200
              bg-white
              text-[11px] font-extrabold text-slate-700
              transition
              hover:border-slate-300
              hover:bg-slate-50
            "
          >
            Create account
          </Link>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* =========================================================
   FOLLOW BUTTON
========================================================= */

function FollowButton({
  category,
  onToggle,
  compact = false,
}: {
  category: Category
  onToggle: (
    event: React.MouseEvent,
    id: number
  ) => void
  compact?: boolean
}) {
  const following = Boolean(category.is_following)

  return (
    <button
      type="button"
      onClick={(event) =>
        onToggle(event, category.id)
      }
      className={`
        inline-flex shrink-0 items-center justify-center
        gap-1.5 rounded-full
        font-extrabold
        outline-none
        transition-all duration-200
        focus-visible:ring-4
        focus-visible:ring-[#E05A47]/10

        ${compact
          ? "h-8 min-w-[76px] px-3 text-[8px]"
          : "h-9 min-w-[92px] px-4 text-[9px]"
        }

        ${following
          ? `
              border border-slate-200
              bg-white
              text-slate-600
              hover:border-slate-300
              hover:bg-slate-50
            `
          : `
              bg-slate-950
              text-white
              hover:bg-[#E05A47]
            `
        }
      `}
    >
      {following ? (
        <>
          <Check className="size-3" />
          Following
        </>
      ) : (
        "Follow"
      )}
    </button>
  )
}

/* =========================================================
   TOPIC ROW
========================================================= */

function TopicRow({
  category,
  index,
  onFollow,
}: {
  category: Category
  index: number
  onFollow: (
    event: React.MouseEvent,
    id: number
  ) => void
}) {
  const storyCount =
    getStoryCount(category)

  return (
    <article
      className="
        group
        border-b border-slate-100
        py-5
        last:border-b-0
      "
    >
      <div className="flex items-start gap-4">
        {/* index */}

        <div
          className="
            hidden w-7 shrink-0 pt-0.5
            text-[10px] font-black
            tabular-nums text-slate-300
            sm:block
          "
        >
          {String(index + 1).padStart(2, "0")}
        </div>

        {/* content */}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-5">
            <Link
              to={`/topics/${category.slug}`}
              className="min-w-0"
            >
              <div className="flex items-center gap-2">
                <h3
                  className="
                    truncate
                    text-[14px] font-black
                    tracking-[-0.015em]
                    text-slate-950
                    transition-colors
                    group-hover:text-[#E05A47]
                  "
                >
                  {category.name}
                </h3>

                {index < 2 && (
                  <span
                    className="
                      hidden rounded-full
                      bg-[#FFF1EE]
                      px-2 py-0.5
                      text-[7px] font-black
                      uppercase tracking-[0.08em]
                      text-[#E05A47]
                      sm:inline-flex
                    "
                  >
                    Popular
                  </span>
                )}
              </div>

              <p
                className="
                  mt-1.5
                  max-w-[620px]
                  text-[10px] font-medium
                  leading-[1.7]
                  text-slate-500
                "
              >
                {getTopicDescription(category)}
              </p>
            </Link>

            <FollowButton
              category={category}
              onToggle={onFollow}
            />
          </div>

          {/* metadata */}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-[8px] font-bold text-slate-400">
              {formatNumber(
                category.followers_count || 0
              )}{" "}
              followers
            </span>

            {storyCount !== null && (
              <>
                <span className="size-[2px] rounded-full bg-slate-300" />

                <span className="text-[8px] font-bold text-slate-400">
                  {formatNumber(storyCount)} stories
                </span>
              </>
            )}

            <span className="size-[2px] rounded-full bg-slate-300" />

            <span className="text-[8px] font-bold text-slate-400">
              {getDomainForCategory(
                category.name
              )}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

/* =========================================================
   SIDEBAR TOPIC
========================================================= */

function SidebarTopic({
  category,
  rank,
}: {
  category: Category
  rank: number
}) {
  return (
    <Link
      to={`/topics/${category.slug}`}
      className="
        group
        flex items-start gap-3
        border-b border-slate-100
        py-3.5
        last:border-b-0
      "
    >
      <span
        className="
          w-5 shrink-0
          text-[10px] font-black
          tabular-nums
          text-slate-300
        "
      >
        {String(rank).padStart(2, "0")}
      </span>

      <div className="min-w-0 flex-1">
        <p
          className="
            truncate
            text-[10px] font-extrabold
            text-slate-800
            transition-colors
            group-hover:text-[#E05A47]
          "
        >
          {category.name}
        </p>

        <p className="mt-0.5 text-[8px] font-semibold text-slate-400">
          {formatNumber(
            category.followers_count || 0
          )}{" "}
          followers
        </p>
      </div>

      <ChevronRight
        className="
          mt-0.5 size-3
          shrink-0 text-slate-300
          transition-all
          group-hover:translate-x-0.5
          group-hover:text-[#E05A47]
        "
      />
    </Link>
  )
}

/* =========================================================
   DOMAIN BLOCK
========================================================= */

function DomainBlock({
  domain,
  categories,
}: {
  domain: string
  categories: Category[]
}) {
  if (!categories.length) return null

  return (
    <section>
      <div
        className="
          flex items-center justify-between
          border-b border-slate-200
          pb-3
        "
      >
        <h3 className="text-[12px] font-black text-slate-900">
          {domain}
        </h3>

        <span className="text-[8px] font-bold text-slate-400">
          {categories.length}
        </span>
      </div>

      <div>
        {categories.slice(0, 7).map(
          (category) => (
            <Link
              key={category.id}
              to={`/topics/${category.slug}`}
              className="
                group
                flex items-center justify-between
                gap-4
                border-b border-slate-100
                py-3
                last:border-b-0
              "
            >
              <span
                className="
                  truncate
                  text-[10px] font-bold
                  text-slate-600
                  transition-colors
                  group-hover:text-slate-950
                "
              >
                {category.name}
              </span>

              <ArrowRight
                className="
                  size-3 shrink-0
                  text-slate-300
                  transition-all
                  group-hover:translate-x-0.5
                  group-hover:text-[#E05A47]
                "
              />
            </Link>
          )
        )}
      </div>
    </section>
  )
}

/* =========================================================
   TOPICS
========================================================= */

export default function Topics() {
  const { isAuthenticated } =
    useSelector(
      (state: RootState) => state.auth
    )

  const [categories, setCategories] =
    useState<Category[]>([])

  const [popularTags, setPopularTags] =
    useState<Tag[]>([])

  const [loading, setLoading] =
    useState(true)

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

  const [activeDomain, setActiveDomain] =
    useState("All")

  const [showAuthModal, setShowAuthModal] =
    useState(false)

  /* =======================================================
     LOAD
  ======================================================= */

  useEffect(() => {
    let mounted = true

    async function fetchData() {
      try {
        setLoading(true)

        const [categoryData, tagData] =
          await Promise.all([
            taxonomyService.getCategories(debouncedQuery),
            taxonomyService.getPopularTags(),
          ])

        if (!mounted) return

        setCategories(
          Array.isArray(categoryData)
            ? categoryData
            : []
        )

        setPopularTags(
          Array.isArray(tagData)
            ? tagData
            : []
        )
      } catch (error) {
        console.error(
          "Failed to load topics:",
          error
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      mounted = false
    }
  }, [debouncedQuery])

  /* =======================================================
     FOLLOW
  ======================================================= */

  const handleFollowToggle = async (
    event: React.MouseEvent,
    categoryId: number
  ) => {
    event.preventDefault()
    event.stopPropagation()

    if (!isAuthenticated) {
      setShowAuthModal(true)
      return
    }

    const category = categories.find(
      (item) => item.id === categoryId
    )

    if (!category) return

    const previousFollowing =
      Boolean(category.is_following)

    const previousFollowers =
      category.followers_count || 0

    const nextFollowing =
      !previousFollowing

    /* optimistic */

    setCategories((current) =>
      current.map((item) =>
        item.id === categoryId
          ? {
            ...item,
            is_following:
              nextFollowing,
            followers_count:
              Math.max(
                0,
                previousFollowers +
                (nextFollowing ? 1 : -1)
              ),
          }
          : item
      )
    )

    try {
      const response =
        await taxonomyService.followCategory(
          categoryId
        )

      setCategories((current) =>
        current.map((item) =>
          item.id === categoryId
            ? {
              ...item,
              is_following:
                response.status ===
                "followed",
            }
            : item
        )
      )
    } catch (error) {
      console.error(
        "Failed to follow topic:",
        error
      )

      /* rollback */

      setCategories((current) =>
        current.map((item) =>
          item.id === categoryId
            ? {
              ...item,
              is_following:
                previousFollowing,
              followers_count:
                previousFollowers,
            }
            : item
        )
      )
    }
  }

  /* =======================================================
     COMPUTED
  ======================================================= */

  const domains = useMemo(() => {
    const grouped: Record<
      string,
      Category[]
    > = {}

    DOMAIN_ORDER.forEach((domain) => {
      grouped[domain] = []
    })

    categories.forEach((category) => {
      const domain =
        getDomainForCategory(
          category.name
        )

      if (!grouped[domain]) {
        grouped[domain] = []
      }

      grouped[domain].push(category)
    })

    Object.keys(grouped).forEach(
      (domain) => {
        grouped[domain].sort(
          (a, b) =>
            (b.followers_count || 0) -
            (a.followers_count || 0)
        )
      }
    )

    return grouped
  }, [categories])

  const availableDomains =
    useMemo(
      () =>
        DOMAIN_ORDER.filter(
          (domain) =>
            domains[domain]?.length > 0
        ),
      [domains]
    )

  const followedCategories =
    useMemo(
      () =>
        categories.filter(
          (category) =>
            category.is_following
        ),
      [categories]
    )

  const trendingCategories =
    useMemo(
      () =>
        [...categories]
          .sort(
            (a, b) =>
              (b.followers_count || 0) -
              (a.followers_count || 0)
          )
          .slice(0, 7),
      [categories]
    )

  const primaryTopics =
    useMemo(() => {
      let result =
        [...categories].sort(
          (a, b) =>
            (b.followers_count || 0) -
            (a.followers_count || 0)
        )

      if (activeDomain !== "All") {
        result = result.filter(
          (category) =>
            getDomainForCategory(
              category.name
            ) === activeDomain
        )
      }

      return result.slice(0, 8)
    }, [categories, activeDomain])

  const searchResults =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase()

      if (!query) return []

      return categories.filter(
        (category) => {
          const searchable = [
            category.name,
            category.slug,
            getDomainForCategory(
              category.name
            ),
            getTopicDescription(
              category
            ),
          ]
            .join(" ")
            .toLowerCase()

          return searchable.includes(
            query
          )
        }
      )
    }, [categories, searchQuery])

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return <TopicsSkeleton />
  }

  return (
    <>
      <main className="min-h-screen bg-[#FCFCFB]">

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <header
          className="
            border-b border-slate-200/80
            bg-white
          "
        >
          <div
            className="
              mx-auto
              max-w-[1200px]
              px-4 sm:px-6 lg:px-8
            "
          >
            <div
              className="
                flex flex-col
                gap-6
                py-7 sm:py-9
                lg:flex-row
                lg:items-end
                lg:justify-between
              "
            >
              {/* title */}

              <div className="max-w-[610px]">
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
                    <Compass className="size-3.5" />
                  </span>

                  <span
                    className="
                      text-[9px] font-black
                      uppercase
                      tracking-[0.16em]
                      text-slate-400
                    "
                  >
                    Explore BareMind
                  </span>
                </div>

                <h1
                  className="
                    mt-3
                    text-[29px] font-black
                    tracking-[-0.045em]
                    text-slate-950
                    sm:text-[36px]
                  "
                >
                  Explore ideas by topic.
                </h1>

                <p
                  className="
                    mt-2
                    max-w-[540px]
                    text-[11px] font-medium
                    leading-6
                    text-slate-500
                    sm:text-[12px]
                  "
                >
                  Move through BareMind by subject,
                  discover what people are publishing,
                  and follow the ideas you want more of.
                </p>
              </div>

              {/* quick stats */}

              <div
                className="
                  flex items-center
                  gap-6
                  sm:gap-8
                "
              >
                <HeaderStat
                  value={categories.length}
                  label="Topics"
                />

                <div className="h-8 w-px bg-slate-200" />

                <HeaderStat
                  value={followedCategories.length}
                  label="Following"
                />
              </div>
            </div>

            {/* ===============================================
                SEARCH
            =============================================== */}

            <div className="pb-5">
              <div
                className="
                  relative
                  max-w-[680px]
                "
              >
                <Search
                  className="
                    pointer-events-none
                    absolute left-4 top-1/2
                    size-4
                    -translate-y-1/2
                    text-slate-400
                  "
                />

                <input
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(
                      event.target.value
                    )
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
                  placeholder="Search topics, subjects or interests..."
                  className="
                    h-11 w-full
                    rounded-xl
                    border border-slate-200
                    bg-[#FCFCFB]
                    pl-11 pr-11
                    text-[11px] font-semibold
                    text-slate-900
                    outline-none
                    transition-all
                    placeholder:text-slate-400
                    hover:border-slate-300
                    focus:border-[#E05A47]
                    focus:bg-white
                    focus:ring-4
                    focus:ring-[#E05A47]/5
                  "
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("")
                      setShowSuggestions(false)
                    }}
                    aria-label="Clear search"
                    className="
                      absolute right-3 top-1/2
                      flex size-7
                      -translate-y-1/2
                      items-center justify-center
                      rounded-full
                      text-slate-400
                      transition
                      hover:bg-slate-100
                      hover:text-slate-700
                    "
                  >
                    <X className="size-3.5" />
                  </button>
                )}

                {/* Suggestions Dropdown */}
                <AnimatePresence>
                  {showSuggestions && searchQuery && searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-slate-200 py-2 max-h-60 overflow-y-auto"
                    >
                      {searchResults.slice(0, 5).map((category, idx) => (
                        <div
                          key={idx}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setSearchQuery(category.name)
                            setShowSuggestions(false)
                          }}
                          className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-3 text-sm font-medium text-slate-700 transition-colors"
                        >
                          <Search className="size-3.5 text-slate-400" />
                          {category.name}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ===============================================
                DOMAIN NAVIGATION
            =============================================== */}

            {!searchQuery.trim() && (
              <nav
                className="
                  flex
                  overflow-x-auto
                  [scrollbar-width:none]
                  [&::-webkit-scrollbar]:hidden
                "
              >
                <DomainTab
                  label="For you"
                  active={
                    activeDomain === "All"
                  }
                  onClick={() =>
                    setActiveDomain("All")
                  }
                />

                {availableDomains.map(
                  (domain) => (
                    <DomainTab
                      key={domain}
                      label={domain}
                      active={
                        activeDomain === domain
                      }
                      onClick={() =>
                        setActiveDomain(domain)
                      }
                    />
                  )
                )}
              </nav>
            )}
          </div>
        </header>

        {/* =================================================
            BODY
        ================================================= */}

        <div
          className="
            mx-auto
            max-w-[1200px]
            px-4 py-8
            sm:px-6
            lg:px-8 lg:py-10
          "
        >
          {/* ===============================================
              SEARCH MODE
          =============================================== */}

          {searchQuery.trim() ? (
            <SearchMode
              query={searchQuery}
              results={searchResults}
              onFollow={
                handleFollowToggle
              }
            />
          ) : (
            <>
              {/* ===========================================
                  EDITORIAL DISCOVERY
              =========================================== */}

              <div
                className="
                  grid grid-cols-1
                  gap-12
                  lg:grid-cols-[minmax(0,1fr)_300px]
                "
              >
                {/* =========================================
                    PRIMARY TOPICS
                ========================================= */}

                <section className="min-w-0">
                  <SectionHeading
                    eyebrow={
                      activeDomain === "All"
                        ? "Discover"
                        : activeDomain
                    }
                    title={
                      activeDomain === "All"
                        ? "Topics worth exploring"
                        : `Explore ${activeDomain}`
                    }
                    description={
                      activeDomain === "All"
                        ? "Start with subjects attracting readers and new ideas across BareMind."
                        : `Stories, conversations and people publishing across ${activeDomain}.`
                    }
                  />

                  {primaryTopics.length >
                    0 ? (
                    <div
                      className="
                        mt-5
                        rounded-2xl
                        border border-slate-200/90
                        bg-white
                        px-4
                        shadow-[0_1px_3px_rgba(15,23,42,0.025)]
                        sm:px-5
                      "
                    >
                      {primaryTopics.map(
                        (
                          category,
                          index
                        ) => (
                          <TopicRow
                            key={
                              category.id
                            }
                            category={
                              category
                            }
                            index={index}
                            onFollow={
                              handleFollowToggle
                            }
                          />
                        )
                      )}
                    </div>
                  ) : (
                    <div
                      className="
                        mt-5
                        rounded-2xl
                        border border-dashed
                        border-slate-200
                        bg-white
                        px-6 py-16
                        text-center
                      "
                    >
                      <BookOpen
                        className="
                          mx-auto size-5
                          text-slate-300
                        "
                      />

                      <p
                        className="
                          mt-3
                          text-[12px]
                          font-black
                          text-slate-800
                        "
                      >
                        No topics here yet
                      </p>
                    </div>
                  )}
                </section>

                {/* =========================================
                    SIDEBAR
                ========================================= */}

                <aside className="hidden lg:block">
                  <div className="sticky top-24 space-y-8">

                    {/* =====================================
                        YOUR TOPICS
                    ===================================== */}

                    <section>
                      <div
                        className="
                          flex items-center
                          justify-between
                          border-b
                          border-slate-200
                          pb-3
                        "
                      >
                        <div>
                          <h2
                            className="
                              text-[11px]
                              font-black
                              text-slate-900
                            "
                          >
                            Your topics
                          </h2>

                          <p
                            className="
                              mt-0.5
                              text-[8px]
                              font-medium
                              text-slate-400
                            "
                          >
                            Shaping your feed
                          </p>
                        </div>

                        <Sparkles
                          className="
                            size-3.5
                            text-[#E05A47]
                          "
                        />
                      </div>

                      {followedCategories.length >
                        0 ? (
                        <div>
                          {followedCategories
                            .slice(0, 6)
                            .map(
                              (category) => (
                                <div
                                  key={
                                    category.id
                                  }
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
                                    to={`/topics/${category.slug}`}
                                    className="
                                      min-w-0
                                      flex-1
                                    "
                                  >
                                    <p
                                      className="
                                        truncate
                                        text-[10px]
                                        font-extrabold
                                        text-slate-700
                                        transition
                                        group-hover:text-[#E05A47]
                                      "
                                    >
                                      {
                                        category.name
                                      }
                                    </p>

                                    <p
                                      className="
                                        mt-0.5
                                        text-[8px]
                                        font-semibold
                                        text-slate-400
                                      "
                                    >
                                      {getDomainForCategory(
                                        category.name
                                      )}
                                    </p>
                                  </Link>

                                  <button
                                    type="button"
                                    onClick={(
                                      event
                                    ) =>
                                      handleFollowToggle(
                                        event,
                                        category.id
                                      )
                                    }
                                    title={`Unfollow ${category.name}`}
                                    className="
                                      flex size-7
                                      items-center
                                      justify-center
                                      rounded-full
                                      bg-[#FFF1EE]
                                      text-[#E05A47]
                                      transition
                                      hover:bg-[#E05A47]
                                      hover:text-white
                                    "
                                  >
                                    <Check className="size-3" />
                                  </button>
                                </div>
                              )
                            )}
                        </div>
                      ) : (
                        <div
                          className="
                            border-b
                            border-slate-200
                            py-5
                          "
                        >
                          <p
                            className="
                              text-[9px]
                              font-medium
                              leading-5
                              text-slate-500
                            "
                          >
                            Follow topics to
                            personalize what you
                            discover on BareMind.
                          </p>
                        </div>
                      )}
                    </section>

                    {/* =====================================
                        TRENDING
                    ===================================== */}

                    <section>
                      <div
                        className="
                          flex items-center
                          gap-2
                          border-b
                          border-slate-200
                          pb-3
                        "
                      >
                        <TrendingUp
                          className="
                            size-3.5
                            text-[#E05A47]
                          "
                        />

                        <div>
                          <h2
                            className="
                              text-[11px]
                              font-black
                              text-slate-900
                            "
                          >
                            Trending topics
                          </h2>

                          <p
                            className="
                              mt-0.5
                              text-[8px]
                              font-medium
                              text-slate-400
                            "
                          >
                            Popular across BareMind
                          </p>
                        </div>
                      </div>

                      <div>
                        {trendingCategories
                          .slice(0, 5)
                          .map(
                            (
                              category,
                              index
                            ) => (
                              <SidebarTopic
                                key={
                                  category.id
                                }
                                category={
                                  category
                                }
                                rank={
                                  index + 1
                                }
                              />
                            )
                          )}
                      </div>
                    </section>

                    {/* =====================================
                        EXPLAINER
                    ===================================== */}

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
                        <Compass className="size-3.5" />
                      </div>

                      <h3
                        className="
                          mt-4
                          text-[11px]
                          font-black
                          text-slate-900
                        "
                      >
                        Follow ideas, not noise.
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
                        Topics help BareMind
                        understand what you want
                        to read without turning
                        your feed into a generic
                        popularity ranking.
                      </p>
                    </section>
                  </div>
                </aside>
              </div>

              {/* ===========================================
                  DOMAIN DIRECTORY
              =========================================== */}

              <section
                className="
                  mt-14
                  border-t
                  border-slate-200
                  pt-10
                "
              >
                <SectionHeading
                  eyebrow="Directory"
                  title="Browse by domain"
                  description="Move from broad areas into specific subjects."
                />

                <div
                  className="
                    mt-7
                    grid grid-cols-1
                    gap-x-10 gap-y-9
                    sm:grid-cols-2
                    lg:grid-cols-3
                  "
                >
                  {availableDomains.map(
                    (domain) => (
                      <DomainBlock
                        key={domain}
                        domain={domain}
                        categories={
                          domains[domain] ||
                          []
                        }
                      />
                    )
                  )}
                </div>
              </section>

              {/* ===========================================
                  TAGS
              =========================================== */}

              {popularTags.length > 0 && (
                <section
                  className="
                    mt-14
                    border-t
                    border-slate-200
                    pt-10
                  "
                >
                  <div
                    className="
                      grid grid-cols-1
                      gap-8
                      lg:grid-cols-[260px_minmax(0,1fr)]
                    "
                  >
                    <div>
                      <p
                        className="
                          text-[8px]
                          font-black
                          uppercase
                          tracking-[0.15em]
                          text-[#E05A47]
                        "
                      >
                        Go deeper
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
                        Explore specific ideas
                      </h2>

                      <p
                        className="
                          mt-1.5
                          text-[10px]
                          font-medium
                          leading-5
                          text-slate-500
                        "
                      >
                        Tags narrow broad topics
                        into specific conversations.
                      </p>
                    </div>

                    <div
                      className="
                        flex flex-wrap
                        content-start
                        gap-2
                      "
                    >
                      {popularTags
                        .slice(0, 20)
                        .map((tag) => (
                          <Link
                            key={tag.id}
                            to={`/tags/${tag.slug}`}
                            className="
                              group
                              inline-flex
                              h-9
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
                              transition-all
                              hover:border-slate-300
                              hover:bg-slate-50
                              hover:text-slate-950
                            "
                          >
                            <Hash
                              className="
                                size-3
                                text-slate-300
                                transition
                                group-hover:text-[#E05A47]
                              "
                            />

                            {tag.name}
                          </Link>
                        ))}
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {/* ===================================================
          AUTH
      =================================================== */}

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
   SEARCH MODE
========================================================= */

function SearchMode({
  query,
  results,
  onFollow,
}: {
  query: string
  results: Category[]
  onFollow: (
    event: React.MouseEvent,
    id: number
  ) => void
}) {
  return (
    <div className="max-w-[860px]">
      <SectionHeading
        eyebrow="Search"
        title={
          results.length
            ? `${results.length} ${results.length === 1
              ? "topic"
              : "topics"
            } found`
            : "No topics found"
        }
        description={`Results for “${query.trim()}”`}
      />

      {results.length > 0 ? (
        <div
          className="
            mt-5
            rounded-2xl
            border border-slate-200
            bg-white
            px-4
            sm:px-5
          "
        >
          {results.map(
            (category, index) => (
              <TopicRow
                key={category.id}
                category={category}
                index={index}
                onFollow={onFollow}
              />
            )
          )}
        </div>
      ) : (
        <div
          className="
            mt-5
            flex min-h-[320px]
            items-center
            justify-center
            rounded-2xl
            border border-slate-200
            bg-white
          "
        >
          <div
            className="
              max-w-[300px]
              px-5
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
              <Search className="size-4" />
            </div>

            <h3
              className="
                mt-4
                text-[12px]
                font-black
                text-slate-900
              "
            >
              Nothing matched your search
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
              Try another topic, domain or
              subject name.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/* =========================================================
   SECTION HEADING
========================================================= */

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <div>
      {eyebrow && (
        <p
          className="
            text-[8px]
            font-black
            uppercase
            tracking-[0.15em]
            text-[#E05A47]
          "
        >
          {eyebrow}
        </p>
      )}

      <h2
        className="
          mt-1.5
          text-[19px]
          font-black
          tracking-[-0.03em]
          text-slate-950
        "
      >
        {title}
      </h2>

      {description && (
        <p
          className="
            mt-1
            max-w-[600px]
            text-[10px]
            font-medium
            leading-5
            text-slate-400
          "
        >
          {description}
        </p>
      )}
    </div>
  )
}

/* =========================================================
   DOMAIN TAB
========================================================= */

function DomainTab({
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
        flex h-12
        shrink-0
        items-center
        px-4
        text-[9px]
        font-extrabold
        transition-colors
        sm:px-5

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
            inset-x-3
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

/* =========================================================
   HEADER STAT
========================================================= */

function HeaderStat({
  value,
  label,
}: {
  value: number
  label: string
}) {
  return (
    <div>
      <p
        className="
          text-[16px]
          font-black
          tracking-[-0.025em]
          text-slate-950
        "
      >
        {formatNumber(value)}
      </p>

      <p
        className="
          mt-0.5
          text-[7px]
          font-bold
          uppercase
          tracking-[0.1em]
          text-slate-400
        "
      >
        {label}
      </p>
    </div>
  )
}

/* =========================================================
   LOADING SKELETON
========================================================= */

function TopicsSkeleton() {
  return (
    <main className="min-h-screen bg-[#FCFCFB]">
      {/* Header */}

      <div className="border-b border-slate-200 bg-white">
        <div
          className="
            mx-auto
            max-w-[1200px]
            animate-pulse
            px-4 py-9
            sm:px-6
            lg:px-8
          "
        >
          <div className="h-3 w-24 rounded bg-slate-100" />

          <div className="mt-4 h-8 w-[330px] max-w-full rounded bg-slate-100" />

          <div className="mt-3 h-3 w-[480px] max-w-full rounded bg-slate-100" />

          <div className="mt-7 h-11 w-[680px] max-w-full rounded-xl bg-slate-100" />

          <div className="mt-5 flex gap-5">
            {[1, 2, 3, 4, 5].map(
              (item) => (
                <div
                  key={item}
                  className="h-3 w-20 rounded bg-slate-100"
                />
              )
            )}
          </div>
        </div>
      </div>

      {/* Main */}

      <div
        className="
          mx-auto
          max-w-[1200px]
          px-4 py-10
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
          <div className="animate-pulse">
            <div className="h-3 w-20 rounded bg-slate-100" />

            <div className="mt-2 h-5 w-52 rounded bg-slate-100" />

            <div className="mt-2 h-2.5 w-80 rounded bg-slate-100" />

            <div
              className="
                mt-5
                overflow-hidden
                rounded-2xl
                border border-slate-200
                bg-white
                px-5
              "
            >
              {[1, 2, 3, 4, 5].map(
                (item) => (
                  <div
                    key={item}
                    className="
                      flex gap-4
                      border-b
                      border-slate-100
                      py-6
                      last:border-b-0
                    "
                  >
                    <div className="flex-1">
                      <div className="h-3 w-36 rounded bg-slate-100" />

                      <div className="mt-3 h-2.5 w-[78%] rounded bg-slate-100" />

                      <div className="mt-2 h-2.5 w-[55%] rounded bg-slate-100" />

                      <div className="mt-4 h-2 w-40 rounded bg-slate-100" />
                    </div>

                    <div className="h-9 w-24 rounded-full bg-slate-100" />
                  </div>
                )
              )}
            </div>
          </div>

          <div className="hidden animate-pulse lg:block">
            <div className="h-4 w-24 rounded bg-slate-100" />

            <div className="mt-5 space-y-4">
              {[1, 2, 3, 4].map(
                (item) => (
                  <div
                    key={item}
                    className="border-b border-slate-100 pb-4"
                  >
                    <div className="h-2.5 w-28 rounded bg-slate-100" />
                    <div className="mt-2 h-2 w-20 rounded bg-slate-100" />
                  </div>
                )
              )}
            </div>

            <div className="mt-10 h-4 w-28 rounded bg-slate-100" />

            <div className="mt-5 h-48 rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    </main>
  )
}