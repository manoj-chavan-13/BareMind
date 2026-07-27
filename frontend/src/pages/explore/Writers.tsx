import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  Check,
  ChevronRight,
  Compass,
  Loader2,
  Search,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { useSelector } from "react-redux"
import type { RootState } from "@/store"
import { AuthModal } from "@/components/ui/AuthModal"
import { AnimatePresence, motion } from "framer-motion"

import { userService } from "@/services/userService"
import { searchService } from "@/services/searchService"
import { getUserAvatar } from "@/utils/avatar"

type ConnectionTab = "discover" | "following" | "followers"

const BRAND = "#E05A47"

/* =========================================================
   HELPERS
========================================================= */

function getName(user: any) {
  const fullName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim()

  return fullName || user?.username || "BareMind User"
}

function getProfilePath(user: any) {
  return `/u/${user?.username || user?.id}`
}

function getTopics(user: any): string[] {
  const source = Array.isArray(user?.topics)
    ? user.topics
    : Array.isArray(user?.interests)
      ? user.interests
      : []

  return source
    .map((item: any) =>
      typeof item === "string" ? item : item?.name
    )
    .filter(Boolean)
}

function formatNumber(value = 0) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value)
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function Writers() {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth)
  const [showAuthModal, setShowAuthModal] = useState(false)
  
  const [writers, setWriters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] =
    useState<ConnectionTab>("discover")

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [followLoading, setFollowLoading] =
    useState<Record<string, boolean>>({})

  /* =======================================================
     DEBOUNCE SEARCH
  ======================================================= */
  useEffect(() => {
    if (!search.trim()) {
      setDebouncedSearch("")
      setSuggestions([])
      return
    }

    const controller = new AbortController()
    const handler = setTimeout(() => {
      const query = search.trim()
      if (query.length >= 2) {
        searchService.getSuggestions(query, "users", controller.signal).then(res => {
          setSuggestions(res.suggestions || [])
        }).catch(err => {
          if (err.name !== 'CanceledError' && err.message !== 'canceled') {
            console.error("Failed to fetch suggestions", err)
            setSuggestions([])
          }
        })
      } else {
        setSuggestions([])
      }
    }, 200)

    return () => {
      clearTimeout(handler)
      controller.abort()
    }
  }, [search])

  /* =======================================================
     LOAD
  ======================================================= */

  useEffect(() => {
    let mounted = true

    async function loadConnections() {
      try {
        setLoading(true)
        let data: any[] = []

        if (activeTab === "discover") {
          data = await userService.getSuggestedAuthors(30, debouncedSearch || undefined)
        } else if (activeTab === "following") {
          data = await userService.getFollowing("me", debouncedSearch || undefined)
        } else if (activeTab === "followers") {
          data = await userService.getFollowers("me", debouncedSearch)
        }

        if (mounted) {
          setWriters(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        console.error("Failed to load connections:", error)
        if (mounted) {
          setWriters([])
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadConnections()

    return () => {
      mounted = false
    }
  }, [activeTab, debouncedSearch])

  /* =======================================================
     FOLLOW
  ======================================================= */

  const handleFollow = async (
    event: React.MouseEvent,
    writerId: string,
    currentState: boolean
  ) => {
    event.preventDefault()
    event.stopPropagation()

    if (!isAuthenticated) {
      setShowAuthModal(true)
      return
    }

    if (followLoading[writerId]) return

    setFollowLoading((current) => ({
      ...current,
      [writerId]: true,
    }))

    // Optimistic UI
    setWriters((current) =>
      current.map((writer) =>
        String(writer.id) === String(writerId)
          ? {
            ...writer,
            is_following: !currentState,
          }
          : writer
      )
    )

    try {
      const response =
        await userService.followUser(writerId)

      setWriters((current) =>
        current.map((writer) =>
          String(writer.id) === String(writerId)
            ? {
              ...writer,
              is_following:
                response.status === "followed",
            }
            : writer
        )
      )
    } catch (error) {
      console.error("Failed to follow user:", error)

      // Revert
      setWriters((current) =>
        current.map((writer) =>
          String(writer.id) === String(writerId)
            ? {
              ...writer,
              is_following: currentState,
            }
            : writer
        )
      )
    } finally {
      setFollowLoading((current) => ({
        ...current,
        [writerId]: false,
      }))
    }
  }

  const followingCount = (user as any)?.following_count || 0

  const recommended =
    activeTab === "discover" && !debouncedSearch
      ? writers.slice(0, 10)
      : writers

  const sidebarPeople = [...writers]
    .sort(
      (a, b) =>
        (b.followers_count ?? 0) -
        (a.followers_count ?? 0)
    )
    .slice(0, 5)

  if (loading && writers.length === 0) {
    return <ConnectionsSkeleton />
  }

  return (
    <main className="min-h-screen bg-[#FCFCFB] text-slate-950">

      {/* =====================================================
          COMPACT PAGE INTRO
      ===================================================== */}

      <section className="relative z-40 border-b border-slate-200/80 bg-white">

        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">

          <div className="flex flex-col gap-6 py-7 sm:py-9 lg:flex-row lg:items-end lg:justify-between">

            {/* Identity */}

            <div className="max-w-[600px]">

              <div className="flex items-center gap-2">

                <span className="flex size-7 items-center justify-center rounded-lg bg-[#E05A47]/10 text-[#E05A47]">
                  <Users className="size-3.5" />
                </span>

                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                  Connections
                </span>

              </div>

              <h1 className="mt-3 text-[28px] font-black tracking-[-0.045em] text-slate-950 sm:text-[34px]">
                People behind the ideas.
              </h1>

              <p className="mt-2 max-w-[520px] text-[12px] font-medium leading-6 text-slate-500">
                Discover people who write about the things
                you care about, then shape your BareMind
                network around their ideas.
              </p>

            </div>

            {/* Stats */}

            <div className="flex items-center gap-7">

              <Stat
                value={followingCount}
                label="Following"
              />

              <div className="h-8 w-px bg-slate-200" />

              <Stat
                value={writers.length}
                label="Suggested"
              />

            </div>

          </div>

          {/* =================================================
              SEARCH
          ================================================= */}

          <div className="pb-5">

            <div className="relative max-w-[660px]">

              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
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
                placeholder="Search people or interests"
                className="
                  h-12 w-full rounded-xl
                  border border-slate-200
                  bg-white
                  pl-11 pr-11
                  text-[12px] font-semibold text-slate-800
                  shadow-[0_1px_2px_rgba(15,23,42,0.02)]
                  outline-none
                  transition-all
                  placeholder:text-slate-400
                  hover:border-slate-300
                  focus:border-[#E05A47]
                  focus:ring-4
                  focus:ring-[#E05A47]/[0.07]
                "
              />

              {search && (
                <button
                  onClick={() => {
                    setSearch("")
                    setSuggestions([])
                  }}
                  aria-label="Clear search"
                  className="
                    absolute right-3 top-1/2
                    flex size-7 -translate-y-1/2
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
                          const val = suggestion.replace('@', '')
                          setSearch(val)
                          setDebouncedSearch(val)
                          setShowSuggestions(false)
                        }}
                        className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-3 text-sm font-medium text-slate-700 transition-colors"
                      >
                        <Search className="size-3.5 text-slate-400" />
                        {suggestion}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

          </div>

          {/* =================================================
              TABS
          ================================================= */}

          <nav
            aria-label="Connection sections"
            className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >

            <Tab
              active={activeTab === "discover"}
              label="Discover"
              onClick={() => setActiveTab("discover")}
            />

            <Tab
              active={activeTab === "following"}
              label="Following"
              count={followingCount}
              onClick={() => setActiveTab("following")}
            />

            <Tab
              active={activeTab === "followers"}
              label="Followers"
              onClick={() => setActiveTab("followers")}
            />

          </nav>

        </div>

      </section>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_290px]">

          {/* =================================================
              MAIN COLUMN
          ================================================= */}

          <section className="min-w-0">

            {/* Heading */}

            <div className="flex items-end justify-between gap-5">

              <div>

                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#E05A47]">
                  {search
                    ? "Search"
                    : activeTab === "discover"
                      ? "For you"
                      : "Your network"}
                </p>

                <h2 className="mt-1.5 text-[19px] font-black tracking-[-0.03em] text-slate-950">
                  {search
                    ? `Results for “${search}”`
                    : activeTab === "discover"
                      ? "Recommended people"
                      : activeTab === "following"
                        ? "People you follow"
                        : "People following you"}
                </h2>

                <p className="mt-1 text-[10px] font-medium leading-5 text-slate-400">
                  {search
                    ? `${recommended.length} ${recommended.length === 1
                      ? "person"
                      : "people"
                    } found`
                    : activeTab === "discover"
                      ? "Suggestions selected to help you discover more relevant ideas."
                      : activeTab === "following"
                        ? "People currently shaping your reading network."
                        : "People who want to keep up with what you publish."}
                </p>

              </div>

            </div>

            {/* People */}

            {recommended.length > 0 ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.025)]">

                <div className="divide-y divide-slate-100">

                  {recommended.map((writer, index) => (
                    <PersonRow
                      key={writer.id}
                      writer={writer}
                      index={index}
                      loading={
                        !!followLoading[writer.id]
                      }
                      onFollow={handleFollow}
                    />
                  ))}

                </div>

              </div>
            ) : (
              <EmptyState
                activeTab={activeTab}
                searching={Boolean(search)}
              />
            )}

          </section>

          {/* =================================================
              DISCOVERY SIDEBAR
          ================================================= */}

          <aside className="hidden lg:block">

            <div className="sticky top-24 space-y-8">

              {/* =============================================
                  POPULAR PEOPLE
              ============================================= */}

              <section>

                <div className="flex items-center justify-between">

                  <div>
                    <h2 className="text-[12px] font-black text-slate-900">
                      People to know
                    </h2>

                    <p className="mt-0.5 text-[8px] font-medium text-slate-400">
                      Active across BareMind
                    </p>
                  </div>

                  <Sparkles className="size-3.5 text-[#E05A47]" />

                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-white">

                  {sidebarPeople.map((writer, index) => (
                    <SidebarPerson
                      key={writer.id}
                      writer={writer}
                      index={index}
                      last={
                        index ===
                        sidebarPeople.length - 1
                      }
                    />
                  ))}

                </div>

              </section>

              {/* =============================================
                  HCI CONTEXT BLOCK
              ============================================= */}

              <section className="rounded-2xl border border-[#E05A47]/10 bg-[#FFF8F6] p-5">

                <div className="flex size-8 items-center justify-center rounded-lg bg-white text-[#E05A47] shadow-sm ring-1 ring-[#E05A47]/10">
                  <Compass className="size-3.5" />
                </div>

                <h3 className="mt-4 text-[11px] font-black text-slate-900">
                  Your network shapes discovery
                </h3>

                <p className="mt-1.5 text-[9px] font-medium leading-[1.75] text-slate-500">
                  Follow people whose ideas matter to you.
                  BareMind can use those connections to make
                  your reading experience more relevant.
                </p>

                <Link
                  to="/topics"
                  className="group mt-4 inline-flex items-center gap-1.5 text-[9px] font-black text-[#E05A47]"
                >
                  Explore topics

                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </Link>

              </section>

              {/* Footer */}

              <div className="flex flex-wrap gap-x-3 gap-y-2 border-t border-slate-200 pt-5 text-[8px] font-semibold text-slate-400">

                <Link
                  to="/blogs"
                  className="hover:text-slate-700"
                >
                  Explore
                </Link>

                <Link
                  to="/topics"
                  className="hover:text-slate-700"
                >
                  Topics
                </Link>

                <Link
                  to="/about"
                  className="hover:text-slate-700"
                >
                  About
                </Link>

                <Link
                  to="/privacy"
                  className="hover:text-slate-700"
                >
                  Privacy
                </Link>

              </div>

            </div>

          </aside>

        </div>

      </div>
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal onClose={() => setShowAuthModal(false)} />
        )}
      </AnimatePresence>
    </main>
  )
}

/* =========================================================
   PERSON ROW
========================================================= */

function PersonRow({
  writer,
  index,
  loading,
  onFollow,
}: {
  writer: any
  index: number
  loading: boolean
  onFollow: (
    event: React.MouseEvent,
    writerId: string,
    currentState: boolean
  ) => void
}) {
  const name = getName(writer)

  const avatar = getUserAvatar(
    writer.avatar_url,
    name
  )

  const topics = getTopics(writer)

  const reason =
    writer.recommendation_reason ||
    writer.reason ||
    (index % 3 === 0
      ? "Recommended for you"
      : index % 3 === 1
        ? "Publishing ideas you may enjoy"
        : "Active in the BareMind community")

  return (
    <article
      className="
        group
        relative
        px-4 py-5
        transition-colors
        hover:bg-[#FDFDFC]
        sm:px-5
      "
    >

      <div className="flex items-start gap-3.5 sm:gap-4">

        {/* Avatar */}

        <Link
          to={getProfilePath(writer)}
          className="shrink-0"
        >

          <div className="relative">

            <img
              src={avatar}
              alt={name}
              className="
                size-12 rounded-full
                bg-slate-100 object-cover
                ring-1 ring-slate-200
                transition-all duration-200
                group-hover:ring-slate-300
                sm:size-[52px]
              "
            />

            {writer.is_verified && (
              <span className="absolute -bottom-0.5 -right-0.5 flex size-[17px] items-center justify-center rounded-full border-2 border-white bg-[#E05A47] text-white">
                <Check className="size-2.5 stroke-[3]" />
              </span>
            )}

          </div>

        </Link>

        {/* Content */}

        <div className="min-w-0 flex-1">

          <div className="flex items-start justify-between gap-4">

            <div className="min-w-0">

              <Link
                to={getProfilePath(writer)}
                className="inline-block max-w-full"
              >

                <h3 className="truncate text-[13px] font-black tracking-[-0.015em] text-slate-950 transition-colors group-hover:text-[#E05A47]">
                  {name}
                </h3>

              </Link>

              {writer.username && (
                <p className="mt-0.5 truncate text-[9px] font-semibold text-slate-400">
                  @{writer.username}
                </p>
              )}

            </div>

            {/* Desktop Follow */}

            <div className="hidden sm:block">

              <FollowButton
                writer={writer}
                loading={loading}
                onFollow={onFollow}
              />

            </div>

          </div>

          {/* Bio */}

          <p className="mt-2.5 line-clamp-2 max-w-[600px] text-[10px] font-medium leading-[1.7] text-slate-500">
            {writer.bio ||
              "Sharing ideas, experiences and useful things learned along the way."}
          </p>

          {/* Topics */}

          {topics.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">

              {topics.slice(0, 3).map((topic) => (
                <span
                  key={topic}
                  className="
                    rounded-md
                    bg-slate-100
                    px-2 py-1
                    text-[7px] font-bold
                    text-slate-500
                  "
                >
                  {topic}
                </span>
              ))}

              {topics.length > 3 && (
                <span className="px-1 text-[7px] font-bold text-slate-400">
                  +{topics.length - 3}
                </span>
              )}

            </div>
          )}

          {/* Context */}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">

            <span className="inline-flex items-center gap-1.5 text-[8px] font-semibold text-slate-400">

              <Sparkles className="size-2.5 text-[#E05A47]" />

              {reason}

            </span>

            {typeof writer.followers_count === "number" && (
              <>
                <span className="size-[2px] rounded-full bg-slate-300" />

                <span className="text-[8px] font-semibold text-slate-400">
                  {formatNumber(writer.followers_count)} followers
                </span>
              </>
            )}

          </div>

          {/* Mobile follow */}

          <div className="mt-4 sm:hidden">

            <FollowButton
              writer={writer}
              loading={loading}
              onFollow={onFollow}
              mobile
            />

          </div>

        </div>

      </div>

    </article>
  )
}

/* =========================================================
   FOLLOW BUTTON
========================================================= */

function FollowButton({
  writer,
  loading,
  onFollow,
  mobile = false,
}: {
  writer: any
  loading: boolean
  onFollow: (
    event: React.MouseEvent,
    writerId: string,
    currentState: boolean
  ) => void
  mobile?: boolean
}) {
  const following =
    Boolean(writer.is_following)

  return (
    <button
      onClick={(event) =>
        onFollow(
          event,
          writer.id,
          following
        )
      }
      disabled={loading}
      aria-label={
        following
          ? `Unfollow ${getName(writer)}`
          : `Follow ${getName(writer)}`
      }
      className={`
        inline-flex h-9 items-center justify-center gap-1.5
        rounded-full
        px-4
        text-[9px] font-black
        outline-none
        transition-all duration-200
        focus-visible:ring-4
        focus-visible:ring-[#E05A47]/10
        disabled:cursor-not-allowed
        disabled:opacity-60
        ${mobile ? "w-full" : "min-w-[94px]"}
        ${following
          ? `
              border border-slate-200
              bg-white
              text-slate-600
              hover:border-slate-300
              hover:bg-slate-50
              hover:text-slate-900
            `
          : `
              bg-slate-950
              text-white
              shadow-[0_2px_6px_rgba(15,23,42,0.12)]
              hover:bg-[#E05A47]
              hover:shadow-[0_4px_14px_rgba(224,90,71,0.20)]
            `
        }
      `}
    >

      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : following ? (
        <>
          <Check className="size-3" />
          Following
        </>
      ) : writer.is_follower ? (
        <>
          <UserPlus className="size-3" />
          Follow back
        </>
      ) : (
        <>
          <UserPlus className="size-3" />
          Follow
        </>
      )}

    </button>
  )
}

/* =========================================================
   SIDEBAR PERSON
========================================================= */

function SidebarPerson({
  writer,
  index,
  last,
}: {
  writer: any
  index: number
  last: boolean
}) {
  const name = getName(writer)

  const avatar = getUserAvatar(
    writer.avatar_url,
    name
  )

  const topics = getTopics(writer)

  return (
    <Link
      to={getProfilePath(writer)}
      className={`
        group
        flex items-center gap-3
        px-4 py-3.5
        transition-colors
        hover:bg-slate-50/80
        ${!last ? "border-b border-slate-100" : ""}
      `}
    >

      <span className="w-4 shrink-0 text-[9px] font-black text-slate-300">
        {String(index + 1).padStart(2, "0")}
      </span>

      <img
        src={avatar}
        alt={name}
        className="size-9 shrink-0 rounded-full bg-slate-100 object-cover ring-1 ring-slate-200"
      />

      <div className="min-w-0 flex-1">

        <div className="flex items-center gap-1">

          <h3 className="truncate text-[9px] font-black text-slate-800 transition-colors group-hover:text-[#E05A47]">
            {name}
          </h3>

          {writer.is_verified && (
            <span className="flex size-3 items-center justify-center rounded-full bg-[#E05A47] text-white">
              <Check className="size-[7px] stroke-[3]" />
            </span>
          )}

        </div>

        <p className="mt-0.5 truncate text-[7px] font-semibold text-slate-400">
          {topics.length
            ? topics.slice(0, 2).join(" · ")
            : writer.username
              ? `@${writer.username}`
              : "BareMind"}
        </p>

      </div>

      <ChevronRight className="size-3 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-[#E05A47]" />

    </Link>
  )
}

/* =========================================================
   TAB
========================================================= */

function Tab({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative
        flex h-12 shrink-0
        items-center gap-2
        px-4 sm:px-5
        text-[10px] font-extrabold
        outline-none
        transition-colors
        focus-visible:bg-slate-50
        ${active
          ? "text-slate-950"
          : "text-slate-400 hover:text-slate-700"
        }
      `}
    >

      {label}

      {typeof count === "number" && count > 0 && (
        <span
          className={`
            rounded-full px-1.5 py-0.5
            text-[7px] font-black
            ${active
              ? "bg-slate-100 text-slate-600"
              : "bg-slate-50 text-slate-400"
            }
          `}
        >
          {count}
        </span>
      )}

      {active && (
        <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-[#E05A47]" />
      )}

    </button>
  )
}

/* =========================================================
   STAT
========================================================= */

function Stat({
  value,
  label,
}: {
  value: number
  label: string
}) {
  return (
    <div>

      <strong className="block text-[17px] font-black tracking-[-0.025em] text-slate-950">
        {formatNumber(value)}
      </strong>

      <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </span>

    </div>
  )
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  activeTab,
  searching,
}: {
  activeTab: ConnectionTab
  searching: boolean
}) {
  return (
    <div className="mt-5 flex min-h-[360px] items-center justify-center rounded-2xl border border-slate-200 bg-white">

      <div className="max-w-[300px] px-5 text-center">

        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-slate-50 text-slate-400 ring-1 ring-slate-200">
          {searching ? (
            <Search className="size-4" />
          ) : (
            <Users className="size-4" />
          )}
        </div>

        <h3 className="mt-4 text-[13px] font-black text-slate-900">
          {searching
            ? "No people found"
            : activeTab === "following"
              ? "Your network starts here"
              : activeTab === "followers"
                ? "No followers yet"
                : "No recommendations yet"}
        </h3>

        <p className="mt-1.5 text-[9px] font-medium leading-5 text-slate-500">
          {searching
            ? "Try another name, username or interest."
            : activeTab === "following"
              ? "Follow people whose ideas you enjoy and their work will become easier to discover."
              : activeTab === "followers"
                ? "Publish thoughtful stories and participate in the community to help people discover you."
                : "Explore topics and stories to help BareMind understand what interests you."}
        </p>

      </div>

    </div>
  )
}

/* =========================================================
   SKELETON
========================================================= */

function ConnectionsSkeleton() {
  return (
    <main className="min-h-screen bg-[#FCFCFB]">

      <section className="border-b border-slate-200 bg-white">

        <div className="mx-auto max-w-[1180px] animate-pulse px-4 py-9 sm:px-6 lg:px-8">

          <div className="h-3 w-24 rounded bg-slate-100" />

          <div className="mt-4 h-8 w-[320px] max-w-full rounded bg-slate-100" />

          <div className="mt-3 h-3 w-[500px] max-w-full rounded bg-slate-100" />

          <div className="mt-7 h-12 w-[660px] max-w-full rounded-xl bg-slate-100" />

        </div>

      </section>

      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_290px]">

          <div className="animate-pulse">

            <div className="h-4 w-44 rounded bg-slate-100" />

            <div className="mt-2 h-2.5 w-80 rounded bg-slate-100" />

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">

              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="flex gap-4 border-b border-slate-100 p-5 last:border-b-0"
                >

                  <div className="size-12 shrink-0 rounded-full bg-slate-100" />

                  <div className="flex-1">

                    <div className="h-3 w-32 rounded bg-slate-100" />

                    <div className="mt-2 h-2 w-20 rounded bg-slate-100" />

                    <div className="mt-4 h-2.5 w-[70%] rounded bg-slate-100" />

                    <div className="mt-2 h-2.5 w-[48%] rounded bg-slate-100" />

                  </div>

                  <div className="h-9 w-24 rounded-full bg-slate-100" />

                </div>
              ))}

            </div>

          </div>

          <div className="hidden animate-pulse lg:block">

            <div className="h-4 w-28 rounded bg-slate-100" />

            <div className="mt-4 h-[250px] rounded-2xl bg-slate-100" />

          </div>

        </div>

      </div>

    </main>
  )
}