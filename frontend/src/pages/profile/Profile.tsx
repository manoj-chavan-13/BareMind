import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useSelector } from "react-redux"

import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Edit3,
  Eye,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  PenLine,
  Settings,
  User as UserIcon,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react"

import type { RootState } from "@/store"
import { AuthModal } from "@/components/ui/AuthModal"
import { AnimatePresence } from "framer-motion"
import { userService } from "@/services/userService"
import { authService } from "@/services/authService"
import { blogService, type Blog } from "@/services/blogService"
import { getUserAvatar } from "@/utils/avatar"
import { UserListModal } from "@/components/UserListModal"

type ProfileTab = "published" | "drafts" | "about" | "saved"

const BRAND = "#E05A47"

/* =========================================================
   HELPERS
========================================================= */

function getExcerpt(content = "", maxLen = 165) {
  const stripped = content
    .replace(/[#*_`\[\]()>!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!stripped) return "No preview available."

  return stripped.length > maxLen
    ? `${stripped.slice(0, maxLen)}…`
    : stripped
}

function getReadTime(content = "") {
  const words = content
    .trim()
    .split(/\s+/)
    .filter(Boolean).length

  return Math.max(1, Math.ceil(words / 200))
}

function formatNumber(value = 0) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value)
}

function formatDate(date?: string) {
  if (!date) return ""

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getAuthorName(author: any) {
  if (!author) return "BareMind Writer"

  const name = `${author.first_name || ""} ${author.last_name || ""}`.trim()

  return name || author.username || "BareMind Writer"
}

/* =========================================================
   PROFILE PAGE
========================================================= */

export default function Profile() {
  const { username: routeUsername } = useParams<{ username: string }>()

  const {
    user: currentUser,
    isLoading: authLoading,
    isAuthenticated,
  } = useSelector((state: RootState) => state.auth)

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  const [userBlogs, setUserBlogs] = useState<Blog[]>([])
  const [savedBlogs, setSavedBlogs] = useState<Blog[]>([])

  const [activeTab, setActiveTab] =
    useState<ProfileTab>("published")

  const [loading, setLoading] = useState(true)

  /* Follow state */

  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)

  /* Follow modals */

  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)

  const [followersList, setFollowersList] = useState<any[]>([])
  const [followingList, setFollowingList] = useState<any[]>([])

  const [loadingFollowers, setLoadingFollowers] = useState(false)
  const [loadingFollowing, setLoadingFollowing] = useState(false)

  /* Suggestions */

  const [suggestedAuthors, setSuggestedAuthors] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  const isOwnProfileRoute = !routeUsername

  /* =======================================================
     LOAD PROFILE
  ======================================================= */

  useEffect(() => {
    if (authLoading) return

    let mounted = true

    async function loadProfile() {
      setLoading(true)

      try {
        const userData = isOwnProfileRoute
          ? await authService.getMe()
          : await userService.getUserByIdentifier(routeUsername!)

        if (!mounted) return

        if (!userData) {
          setProfile(null)
          return
        }

        setProfile(userData)

        setFollowersCount(userData.followers_count ?? 0)
        setFollowingCount(userData.following_count ?? 0)

        setIsFollowing(
          typeof userData.is_following === "boolean"
            ? userData.is_following
            : false
        )

        /* Load blogs */

        const allBlogs = await blogService
          .getBlogs()
          .catch(() => [])

        if (!mounted) return

        const authored = (allBlogs as Blog[])
          .filter(
            (blog) =>
              String(blog.author_id) === String(userData.id)
          )
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )

        setUserBlogs(authored)

        /* Saved blogs only for own profile */

        const ownProfile =
          isOwnProfileRoute ||
          Boolean(
            currentUser &&
            String(currentUser.id) === String(userData.id)
          )

        if (ownProfile) {
          const bookmarks = await userService
            .getBookmarks()
            .catch(() => [])

          if (mounted) {
            setSavedBlogs(bookmarks)
          }
        } else {
          setSavedBlogs([])
        }
      } catch (error) {
        console.error("Failed to load profile:", error)

        if (mounted) {
          setProfile(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      mounted = false
    }
  }, [
    routeUsername,
    authLoading,
    isOwnProfileRoute,
    currentUser?.id,
  ])

  /* =======================================================
     SUGGESTED AUTHORS
  ======================================================= */

  useEffect(() => {
    let mounted = true

    async function loadSuggestions() {
      setLoadingSuggestions(true)

      try {
        const data = await userService.getSuggestedAuthors(6)

        if (!mounted) return

        setSuggestedAuthors(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("Failed to fetch suggested authors:", error)

        if (mounted) {
          setSuggestedAuthors([])
        }
      } finally {
        if (mounted) {
          setLoadingSuggestions(false)
        }
      }
    }

    loadSuggestions()

    return () => {
      mounted = false
    }
  }, [])

  /* =======================================================
     FOLLOWERS
  ======================================================= */

  const handleOpenFollowers = async () => {
    if (!profile) return

    setShowFollowers(true)
    setLoadingFollowers(true)

    try {
      const data = await userService.getFollowers(
        profile.username || profile.id
      )

      setFollowersList(data)
    } catch (error) {
      console.error("Failed to fetch followers:", error)
    } finally {
      setLoadingFollowers(false)
    }
  }

  /* =======================================================
     FOLLOWING
  ======================================================= */

  const handleOpenFollowing = async () => {
    if (!profile) return

    setShowFollowing(true)
    setLoadingFollowing(true)

    try {
      const data = await userService.getFollowing(
        profile.username || profile.id
      )

      setFollowingList(data)
    } catch (error) {
      console.error("Failed to fetch following:", error)
    } finally {
      setLoadingFollowing(false)
    }
  }

  /* =======================================================
     OWN PROFILE
  ======================================================= */

  const isOwnProfile =
    isOwnProfileRoute ||
    Boolean(
      currentUser &&
      profile &&
      String(currentUser.id) === String(profile.id)
    )

  /* =======================================================
     FOLLOW / UNFOLLOW PROFILE
  ======================================================= */

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true)
      return
    }

    if (!profile?.id || isOwnProfile || followLoading) return

    const previousFollowing = isFollowing
    const previousCount = followersCount

    /* Optimistic UI */

    setIsFollowing(!previousFollowing)

    setFollowersCount((count) =>
      previousFollowing
        ? Math.max(0, count - 1)
        : count + 1
    )

    try {
      setFollowLoading(true)

      const response = await userService.followUser(profile.id)

      const followed = response.status === "followed"

      setIsFollowing(followed)

      if (followed !== !previousFollowing) {
        setFollowersCount(
          followed
            ? previousCount + 1
            : Math.max(0, previousCount - 1)
        )
      }
    } catch (error) {
      setIsFollowing(previousFollowing)
      setFollowersCount(previousCount)

      console.error("Failed to follow/unfollow:", error)
    } finally {
      setFollowLoading(false)
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading || authLoading) {
    return <ProfileSkeleton />
  }

  /* =======================================================
     NOT FOUND
  ======================================================= */

  if (!profile) {
    return (
      <ProfileNotFound
        suggestedAuthors={suggestedAuthors}
        loadingSuggestions={loadingSuggestions}
      />
    )
  }

  /* =======================================================
     COMPUTED DATA
  ======================================================= */

  const publishedBlogs = userBlogs.filter(
    (blog) => blog.is_published
  )

  const draftBlogs = userBlogs.filter(
    (blog) => !blog.is_published
  )

  const displayedBlogs =
    activeTab === "drafts"
      ? draftBlogs
      : activeTab === "saved"
        ? savedBlogs
        : publishedBlogs

  const fullName = getAuthorName(profile)

  const avatar = getUserAvatar(
    profile.avatar_url,
    fullName
  )

  const totalViews = publishedBlogs.reduce(
    (total, blog) => total + (blog.views ?? 0),
    0
  )

  const joinedDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(
      "en-US",
      {
        month: "long",
        year: "numeric",
      }
    )
    : null

  const mostViewedStories = [...publishedBlogs]
    .sort(
      (a, b) =>
        (b.views ?? 0) - (a.views ?? 0)
    )
    .slice(0, 4)

  /*
   * Do not recommend the profile currently being viewed.
   * Also remove current logged-in user from own recommendations.
   */
  const filteredSuggestedAuthors = suggestedAuthors
    .filter(
      (author) =>
        String(author.id) !== String(profile.id)
    )
    .filter(
      (author) =>
        !isOwnProfile ||
        String(author.id) !== String(currentUser?.id)
    )
    .slice(0, 5)

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="min-h-screen bg-white">

      {/* =====================================================
          MAIN TWO COLUMN SHELL

          LEFT  = profile + stories
          RIGHT = recommended users + popular writing
      ===================================================== */}

      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">

          {/* =================================================
              LEFT COLUMN
          ================================================= */}

          <div className="min-w-0 lg:border-r lg:border-slate-200 lg:pr-8 xl:pr-12">

            {/* ===============================================
                PROFILE IDENTITY
            =============================================== */}

            <section className="border-b border-slate-200 py-7 sm:py-9">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">

                {/* Avatar */}

                <div className="shrink-0">

                  <div className="rounded-full border border-slate-200 bg-white p-[3px] shadow-[0_4px_18px_rgba(15,23,42,0.06)]">

                    <img
                      src={avatar}
                      alt={fullName}
                      className="size-[82px] rounded-full bg-slate-100 object-cover sm:size-[94px]"
                    />

                  </div>

                </div>

                {/* Profile content */}

                <div className="min-w-0 flex-1">

                  {/* Name + actions */}

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">

                        <h1 className="truncate text-[25px] font-black tracking-[-0.04em] text-slate-950 sm:text-[29px]">
                          {fullName}
                        </h1>

                        {publishedBlogs.length > 0 && (
                          <span
                            title="BareMind writer"
                            className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[#E05A47] text-white"
                          >
                            <Check className="size-2.5 stroke-[3]" />
                          </span>
                        )}

                      </div>

                      {profile.username && (
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                          @{profile.username}
                        </p>
                      )}

                    </div>

                    {/* Actions */}

                    <div className="flex shrink-0 flex-wrap items-center gap-2">

                      {isOwnProfile ? (
                        <>
                          <Link
                            to="/settings"
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[10px] font-extrabold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            <Settings className="size-3.5" />
                            Edit profile
                          </Link>

                          <Link
                            to="/blogs/create"
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-950 px-3.5 text-[10px] font-extrabold text-white transition hover:bg-[#E05A47]"
                          >
                            <PenLine className="size-3.5" />
                            Write
                          </Link>
                        </>
                      ) : (
                        <button
                          onClick={handleFollowToggle}
                          disabled={followLoading}
                          className={`inline-flex h-9 min-w-[105px] items-center justify-center gap-1.5 rounded-lg px-4 text-[10px] font-extrabold transition disabled:opacity-60 ${isFollowing
                              ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              : "bg-[#E05A47] text-white shadow-[0_5px_16px_rgba(224,90,71,0.18)] hover:bg-[#d95240]"
                            }`}
                        >

                          {followLoading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : isFollowing ? (
                            <>
                              <UserCheck className="size-3.5" />
                              Following
                            </>
                          ) : (
                            <>
                              <UserPlus className="size-3.5" />
                              Follow
                            </>
                          )}

                        </button>
                      )}

                    </div>

                  </div>

                  {/* Bio */}

                  <p className="mt-4 max-w-[650px] whitespace-pre-line text-[12px] font-medium leading-[1.75] text-slate-600">
                    {profile.bio ||
                      (isOwnProfile
                        ? "Add a short bio to tell readers what you write about and what you're working on."
                        : "Writing and sharing ideas with the BareMind community.")}
                  </p>

                  {/* Meta */}

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] font-semibold text-slate-400">

                    {profile.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-3" />
                        {profile.location}
                      </span>
                    )}

                    {joinedDate && (
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="size-3" />
                        Joined {joinedDate}
                      </span>
                    )}

                    {profile.website && (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-w-0 items-center gap-1.5 font-bold text-slate-500 transition hover:text-[#E05A47]"
                      >
                        <Globe2 className="size-3 shrink-0" />

                        <span className="max-w-[220px] truncate">
                          {profile.website
                            .replace(/^https?:\/\//, "")
                            .replace(/\/$/, "")}
                        </span>

                        <ArrowUpRight className="size-2.5 shrink-0" />
                      </a>
                    )}

                  </div>

                  {/* Stats */}

                  <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">

                    <button
                      onClick={handleOpenFollowers}
                      className="group flex items-baseline gap-1.5"
                    >
                      <strong className="text-[12px] font-black text-slate-950">
                        {formatNumber(followersCount)}
                      </strong>

                      <span className="text-[9px] font-semibold text-slate-500 transition group-hover:text-slate-900">
                        followers
                      </span>
                    </button>

                    <button
                      onClick={handleOpenFollowing}
                      className="group flex items-baseline gap-1.5"
                    >
                      <strong className="text-[12px] font-black text-slate-950">
                        {formatNumber(followingCount)}
                      </strong>

                      <span className="text-[9px] font-semibold text-slate-500 transition group-hover:text-slate-900">
                        following
                      </span>
                    </button>

                    <span className="flex items-baseline gap-1.5">
                      <strong className="text-[12px] font-black text-slate-950">
                        {formatNumber(publishedBlogs.length)}
                      </strong>

                      <span className="text-[9px] font-semibold text-slate-500">
                        stories
                      </span>
                    </span>

                  </div>

                </div>

              </div>

            </section>

            {/* ===============================================
                TABS
            =============================================== */}

            <nav className="flex overflow-x-auto border-b border-slate-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

              <ProfileTabButton
                active={activeTab === "published"}
                icon={<BookOpen className="size-3.5" />}
                label="Stories"
                count={publishedBlogs.length}
                onClick={() => setActiveTab("published")}
              />

              {isOwnProfile && (
                <ProfileTabButton
                  active={activeTab === "drafts"}
                  icon={<Edit3 className="size-3.5" />}
                  label="Drafts"
                  count={draftBlogs.length}
                  onClick={() => setActiveTab("drafts")}
                />
              )}

              <ProfileTabButton
                active={activeTab === "about"}
                icon={<UserIcon className="size-3.5" />}
                label="About"
                onClick={() => setActiveTab("about")}
              />

              {isOwnProfile && (
                <ProfileTabButton
                  active={activeTab === "saved"}
                  icon={<Bookmark className="size-3.5" />}
                  label="Saved"
                  count={savedBlogs.length}
                  onClick={() => setActiveTab("saved")}
                />
              )}

            </nav>

            {/* ===============================================
                TAB CONTENT
            =============================================== */}

            <div className="pb-16 pt-7">

              {activeTab === "about" ? (
                <AboutTab
                  profile={profile}
                  fullName={fullName}
                  joinedDate={joinedDate}
                  publishedCount={publishedBlogs.length}
                  totalViews={totalViews}
                />
              ) : (
                <StoriesSection
                  activeTab={activeTab}
                  blogs={displayedBlogs}
                  publishedCount={publishedBlogs.length}
                  isOwnProfile={isOwnProfile}
                  fullName={fullName}
                />
              )}

            </div>

          </div>

          {/* =================================================
              RIGHT COLUMN
          ================================================= */}

          <aside className="border-t border-slate-200 py-8 lg:border-l-0 lg:border-t-0 lg:py-9 lg:pl-8 xl:pl-10">

            <div className="space-y-10 lg:sticky lg:top-24">

              {/* =============================================
                  RECOMMENDED AUTHORS
              ============================================= */}

              <RecommendedAuthors
                authors={filteredSuggestedAuthors}
                loading={loadingSuggestions}
              />

              {/* =============================================
                  MOST VIEWED
              ============================================= */}

              {mostViewedStories.length > 0 && (
                <MostViewedStories
                  stories={mostViewedStories}
                />
              )}

              {/* =============================================
                  FOOTER
              ============================================= */}

              <div className="border-t border-slate-100 pt-5">

                <div className="flex flex-wrap gap-x-3 gap-y-2 text-[8px] font-semibold text-slate-400">

                  <Link
                    to="/blogs"
                    className="transition hover:text-slate-700"
                  >
                    Explore
                  </Link>

                  <Link
                    to="/about"
                    className="transition hover:text-slate-700"
                  >
                    About
                  </Link>

                  <Link
                    to="/privacy"
                    className="transition hover:text-slate-700"
                  >
                    Privacy
                  </Link>

                  <Link
                    to="/terms"
                    className="transition hover:text-slate-700"
                  >
                    Terms
                  </Link>

                </div>

                <p className="mt-3 text-[8px] font-medium text-slate-300">
                  © {new Date().getFullYear()} BareMind
                </p>

              </div>

            </div>

          </aside>

        </div>

      </div>

      {/* =====================================================
          FOLLOWERS MODAL
      ===================================================== */}

      {showFollowers && (
        <UserListModal
          title="Followers"
          users={followersList}
          loading={loadingFollowers}
          currentUser={currentUser}
          onClose={() => setShowFollowers(false)}
          emptyMessage="No followers yet."
        />
      )}

      {/* =====================================================
          FOLLOWING MODAL
      ===================================================== */}

      {showFollowing && (
        <UserListModal
          title="Following"
          users={followingList}
          loading={loadingFollowing}
          currentUser={currentUser}
          onClose={() => setShowFollowing(false)}
          emptyMessage="Not following anyone yet."
        />
      )}

      <AnimatePresence>
        {showAuthModal && (
          <AuthModal onClose={() => setShowAuthModal(false)} />
        )}
      </AnimatePresence>
    </main>
  )
}

/* =========================================================
   STORIES SECTION
========================================================= */

function StoriesSection({
  activeTab,
  blogs,
  publishedCount,
  isOwnProfile,
  fullName,
}: {
  activeTab: ProfileTab
  blogs: Blog[]
  publishedCount: number
  isOwnProfile: boolean
  fullName: string
}) {
  return (
    <section>

      {/* Header */}

      <div className="flex items-end justify-between gap-4 pb-4">

        <div>

          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#E05A47]">
            {activeTab === "drafts"
              ? "Workspace"
              : activeTab === "saved"
                ? "Library"
                : "Writing"}
          </p>

          <h2 className="mt-1 text-[18px] font-black tracking-[-0.025em] text-slate-950">
            {activeTab === "drafts"
              ? "Drafts"
              : activeTab === "saved"
                ? "Saved stories"
                : "Latest stories"}
          </h2>

          <p className="mt-1 text-[9px] font-medium text-slate-400">
            {activeTab === "published"
              ? `${publishedCount} published ${publishedCount === 1
                ? "story"
                : "stories"
              }`
              : activeTab === "drafts"
                ? "Private · visible only to you"
                : "Your private reading collection"}
          </p>

        </div>

        {isOwnProfile && activeTab !== "saved" && (
          <Link
            to="/blogs/create"
            className="hidden items-center gap-1.5 text-[9px] font-extrabold text-slate-500 transition hover:text-[#E05A47] sm:flex"
          >
            New story
            <ArrowUpRight className="size-3" />
          </Link>
        )}

      </div>

      {/* Content */}

      {blogs.length === 0 ? (
        <ProfileEmptyState
          activeTab={activeTab}
          isOwnProfile={isOwnProfile}
          fullName={fullName}
        />
      ) : (
        <div className="divide-y divide-slate-200 border-t border-slate-200">

          {blogs.map((blog) => (
            <StoryItem
              key={blog.id}
              blog={blog}
              draft={activeTab === "drafts"}
            />
          ))}

        </div>
      )}

    </section>
  )
}

/* =========================================================
   RECOMMENDED AUTHORS
========================================================= */

function RecommendedAuthors({
  authors,
  loading,
}: {
  authors: any[]
  loading: boolean
}) {
  return (
    <section>

      {/* Header */}

      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-[12px] font-black tracking-[-0.01em] text-slate-950">
            Recommended writers
          </h2>

          <p className="mt-0.5 text-[8px] font-medium text-slate-400">
            People worth following on BareMind
          </p>
        </div>

        <Users className="size-4 text-slate-300" />

      </div>

      {/* Divider */}

      <div className="mt-4 h-px bg-slate-200" />

      {/* Loading */}

      {loading ? (
        <div className="space-y-5 py-5">

          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="flex animate-pulse items-center gap-3"
            >

              <div className="size-10 rounded-full bg-slate-100" />

              <div className="min-w-0 flex-1">
                <div className="h-2.5 w-24 rounded bg-slate-100" />
                <div className="mt-2 h-2 w-16 rounded bg-slate-100" />
              </div>

              <div className="h-7 w-16 rounded-full bg-slate-100" />

            </div>
          ))}

        </div>
      ) : authors.length === 0 ? (
        <div className="py-8">

          <div className="flex size-9 items-center justify-center rounded-full bg-slate-50 text-slate-300">
            <Users className="size-4" />
          </div>

          <p className="mt-3 text-[10px] font-bold text-slate-700">
            No suggestions right now
          </p>

          <p className="mt-1 text-[8px] font-medium leading-4 text-slate-400">
            Explore stories to discover more writers.
          </p>

        </div>
      ) : (
        <div className="divide-y divide-slate-100">

          {authors.map((author) => (
            <RecommendedAuthorRow
              key={author.id}
              author={author}
            />
          ))}

        </div>
      )}

      {/* Explore */}

      <Link
        to="/blogs"
        className="group mt-3 inline-flex items-center gap-1.5 text-[9px] font-extrabold text-[#E05A47] transition hover:text-[#cf4e3d]"
      >
        Discover more writers

        <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
      </Link>

    </section>
  )
}

/* =========================================================
   RECOMMENDED AUTHOR ROW
========================================================= */

function RecommendedAuthorRow({
  author,
}: {
  author: any
}) {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const [following, setFollowing] = useState(
    Boolean(author.is_following)
  )

  const [loading, setLoading] = useState(false)

  const name = getAuthorName(author)

  const avatar = getUserAvatar(
    author.avatar_url,
    name
  )

  const handleFollow = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault()
    event.stopPropagation()

    if (!isAuthenticated) {
      setShowAuthModal(true)
      return
    }

    if (!author.id || loading) return

    const previous = following

    setFollowing(!previous)

    try {
      setLoading(true)

      const response =
        await userService.followUser(author.id)

      setFollowing(response.status === "followed")
    } catch (error) {
      setFollowing(previous)

      console.error(
        "Failed to follow suggested author:",
        error
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="group flex items-start gap-3 py-4">

      {/* Avatar */}

      <Link
        to={`/u/${author.username || author.id}`}
        className="shrink-0"
      >
        <img
          src={avatar}
          alt={name}
          className="size-10 rounded-full bg-slate-100 object-cover ring-1 ring-slate-200 transition group-hover:ring-slate-300"
        />
      </Link>

      {/* Info */}

      <div className="min-w-0 flex-1">

        <Link
          to={`/u/${author.username || author.id}`}
          className="block"
        >

          <div className="flex items-center gap-1.5">

            <h3 className="truncate text-[10px] font-black text-slate-900 transition group-hover:text-[#E05A47]">
              {name}
            </h3>

            {author.is_verified && (
              <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-[#E05A47] text-white">
                <Check className="size-2 stroke-[3]" />
              </span>
            )}

          </div>

          {author.username && (
            <p className="mt-0.5 truncate text-[8px] font-semibold text-slate-400">
              @{author.username}
            </p>
          )}

        </Link>

        {author.bio && (
          <p className="mt-1.5 line-clamp-2 pr-1 text-[8px] font-medium leading-[1.55] text-slate-500">
            {author.bio}
          </p>
        )}

      </div>

      {/* Follow */}

      <button
        onClick={handleFollow}
        disabled={loading}
        className={`mt-0.5 inline-flex h-7 shrink-0 items-center justify-center rounded-full px-3 text-[8px] font-black transition disabled:opacity-60 ${following
            ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            : "bg-slate-950 text-white hover:bg-[#E05A47]"
          }`}
      >

        {loading ? (
          <Loader2 className="size-3 animate-spin" />
        ) : following ? (
          "Following"
        ) : (
          "Follow"
        )}

      </button>

      <AnimatePresence>
        {showAuthModal && (
          <AuthModal onClose={() => setShowAuthModal(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

/* =========================================================
   MOST VIEWED
========================================================= */

function MostViewedStories({
  stories,
}: {
  stories: Blog[]
}) {
  return (
    <section>

      {/* Header */}

      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-[12px] font-black tracking-[-0.01em] text-slate-950">
            Most viewed
          </h2>

          <p className="mt-0.5 text-[8px] font-medium text-slate-400">
            Popular stories from this writer
          </p>
        </div>

        <Eye className="size-4 text-slate-300" />

      </div>

      <div className="mt-4 h-px bg-slate-200" />

      {/* Stories */}

      <div className="divide-y divide-slate-100">

        {stories.map((story, index) => (
          <Link
            key={story.id}
            to={`/blogs/${story.slug}`}
            className="group flex gap-3 py-4"
          >

            {/* Ranking */}

            <div className="w-6 shrink-0">

              <span className="text-[14px] font-black tracking-[-0.04em] text-slate-200 transition group-hover:text-[#E05A47]/40">
                {String(index + 1).padStart(2, "0")}
              </span>

            </div>

            {/* Story */}

            <div className="min-w-0 flex-1">

              {story.category?.name && (
                <p className="mb-1 text-[7px] font-black uppercase tracking-[0.09em] text-[#E05A47]">
                  {story.category.name}
                </p>
              )}

              <h3 className="line-clamp-2 text-[10px] font-black leading-[1.5] text-slate-800 transition group-hover:text-[#E05A47]">
                {story.title}
              </h3>

              <div className="mt-2 flex items-center gap-3 text-[8px] font-semibold text-slate-400">

                <span className="flex items-center gap-1">
                  <Eye className="size-2.5" />
                  {formatNumber(story.views ?? 0)}
                </span>

                <span className="flex items-center gap-1">
                  <Clock3 className="size-2.5" />
                  {getReadTime(story.content)}m
                </span>

              </div>

            </div>

          </Link>
        ))}

      </div>

    </section>
  )
}

/* =========================================================
   PROFILE TAB BUTTON
========================================================= */

function ProfileTabButton({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  count?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex h-[48px] shrink-0 items-center gap-1.5 px-4 text-[10px] font-extrabold transition-colors sm:px-5 ${active
          ? "text-slate-950"
          : "text-slate-400 hover:text-slate-700"
        }`}
    >

      {icon}

      {label}

      {typeof count === "number" && (
        <span
          className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[7px] ${active
              ? "bg-slate-100 text-slate-600"
              : "bg-slate-50 text-slate-400"
            }`}
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
   STORY ITEM
========================================================= */

function StoryItem({
  blog,
  draft,
}: {
  blog: Blog
  draft: boolean
}) {
  return (
    <article className="group py-6">

      <div className="min-w-0">

        {/* Meta */}

        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">

          {draft && (
            <>
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wide text-amber-600">
                Draft
              </span>

              <span className="text-[8px] text-slate-300">
                •
              </span>
            </>
          )}

          {blog.category?.name && (
            <>
              <span className="text-[8px] font-black uppercase tracking-[0.08em] text-[#E05A47]">
                {blog.category.name}
              </span>

              <span className="text-[8px] text-slate-300">
                •
              </span>
            </>
          )}

          <span className="text-[8px] font-semibold text-slate-400">
            {formatDate(blog.created_at)}
          </span>

        </div>

        {/* Title */}

        <Link to={`/blogs/${blog.slug}`}>

          <h2 className="max-w-[720px] text-[17px] font-black leading-[1.35] tracking-[-0.025em] text-slate-950 transition group-hover:text-[#E05A47] sm:text-[19px]">
            {blog.title}
          </h2>

        </Link>

        {/* Excerpt */}

        <p className="mt-2.5 line-clamp-2 max-w-[720px] text-[10px] font-medium leading-[1.75] text-slate-500 sm:text-[11px]">
          {getExcerpt(blog.content)}
        </p>

        {/* Footer */}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[8px] font-semibold text-slate-400">

          <span className="flex items-center gap-1">
            <Clock3 className="size-2.5" />
            {getReadTime(blog.content)} min read
          </span>

          {blog.is_published && (
            <span className="flex items-center gap-1">
              <Eye className="size-2.5" />
              {formatNumber(blog.views ?? 0)} views
            </span>
          )}

        </div>

      </div>

    </article>
  )
}

/* =========================================================
   ABOUT TAB
========================================================= */

function AboutTab({
  profile,
  fullName,
  joinedDate,
  publishedCount,
  totalViews,
}: {
  profile: any
  fullName: string
  joinedDate: string | null
  publishedCount: number
  totalViews: number
}) {
  return (
    <section className="max-w-[720px]">

      {/* Intro */}

      <div className="border-b border-slate-200 pb-7">

        <span className="text-[8px] font-black uppercase tracking-[0.16em] text-[#E05A47]">
          About
        </span>

        <h2 className="mt-2 text-[22px] font-black tracking-[-0.03em] text-slate-950">
          {fullName}
        </h2>

        <p className="mt-5 whitespace-pre-line text-[12px] font-medium leading-7 text-slate-600">
          {profile.bio ||
            "This writer hasn't added a biography yet."}
        </p>

      </div>

      {/* Stats */}

      <div className="grid grid-cols-2 border-b border-slate-200">

        <div className="border-r border-slate-200 py-5 pr-5">

          <p className="text-[8px] font-bold text-slate-400">
            Published stories
          </p>

          <p className="mt-1 text-[18px] font-black tracking-tight text-slate-950">
            {formatNumber(publishedCount)}
          </p>

        </div>

        <div className="py-5 pl-5">

          <p className="text-[8px] font-bold text-slate-400">
            Total views
          </p>

          <p className="mt-1 text-[18px] font-black tracking-tight text-slate-950">
            {formatNumber(totalViews)}
          </p>

        </div>

      </div>

      {/* Information */}

      <div className="py-7">

        <h3 className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
          Profile information
        </h3>

        <div className="mt-4 divide-y divide-slate-100">

          {profile.username && (
            <DetailRow
              icon={<UserIcon className="size-3.5" />}
              label="Username"
              value={`@${profile.username}`}
            />
          )}

          {profile.email && (
            <DetailRow
              icon={<Mail className="size-3.5" />}
              label="Email"
              value={profile.email}
            />
          )}

          {profile.location && (
            <DetailRow
              icon={<MapPin className="size-3.5" />}
              label="Location"
              value={profile.location}
            />
          )}

          {joinedDate && (
            <DetailRow
              icon={<CalendarDays className="size-3.5" />}
              label="Member since"
              value={joinedDate}
            />
          )}

          {profile.website && (
            <DetailRow
              icon={<Globe2 className="size-3.5" />}
              label="Website"
              value={profile.website}
              href={profile.website}
            />
          )}

        </div>

      </div>

    </section>
  )
}

/* =========================================================
   DETAIL ROW
========================================================= */

function DetailRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: string
  href?: string
}) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-4 py-4 sm:grid-cols-[140px_minmax(0,1fr)]">

      <div className="flex items-center gap-2 text-slate-400">

        {icon}

        <span className="text-[9px] font-bold">
          {label}
        </span>

      </div>

      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="truncate text-[10px] font-bold text-[#E05A47] hover:underline"
        >
          {value}
        </a>
      ) : (
        <p className="truncate text-[10px] font-semibold text-slate-700">
          {value}
        </p>
      )}

    </div>
  )
}

/* =========================================================
   EMPTY STATE
========================================================= */

function ProfileEmptyState({
  activeTab,
  isOwnProfile,
  fullName,
}: {
  activeTab: ProfileTab
  isOwnProfile: boolean
  fullName: string
}) {
  const isDraft = activeTab === "drafts"
  const isSaved = activeTab === "saved"

  return (
    <div className="flex min-h-[300px] items-center justify-center border-y border-slate-200">

      <div className="max-w-[300px] px-5 text-center">

        <div className="mx-auto flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm">

          {isDraft ? (
            <Edit3 className="size-4" />
          ) : isSaved ? (
            <Bookmark className="size-4" />
          ) : (
            <BookOpen className="size-4" />
          )}

        </div>

        <h3 className="mt-4 text-[13px] font-black text-slate-900">
          {isDraft
            ? "No drafts"
            : isSaved
              ? "Nothing saved yet"
              : "No stories yet"}
        </h3>

        <p className="mt-1.5 text-[9px] font-medium leading-5 text-slate-500">

          {isOwnProfile
            ? isDraft
              ? "Stories you're still working on will appear here."
              : isSaved
                ? "Stories you bookmark will be kept here privately."
                : "Publish your first story and start building your BareMind profile."
            : `${fullName} hasn't published anything yet.`}

        </p>

        {isOwnProfile && !isSaved && (
          <Link
            to="/blogs/create"
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-950 px-4 text-[9px] font-extrabold text-white transition hover:bg-[#E05A47]"
          >
            <PenLine className="size-3" />
            Start writing
          </Link>
        )}

      </div>

    </div>
  )
}

/* =========================================================
   SKELETON
========================================================= */

function ProfileSkeleton() {
  return (
    <main className="min-h-screen bg-white">

      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">

          {/* Left */}

          <div className="lg:border-r lg:border-slate-200 lg:pr-8 xl:pr-12">

            <div className="flex animate-pulse gap-5 border-b border-slate-200 py-9">

              <div className="size-[92px] shrink-0 rounded-full bg-slate-100" />

              <div className="flex-1">

                <div className="h-6 w-48 rounded bg-slate-100" />

                <div className="mt-2 h-3 w-24 rounded bg-slate-100" />

                <div className="mt-5 h-3 w-full max-w-xl rounded bg-slate-100" />

                <div className="mt-2 h-3 w-[65%] max-w-md rounded bg-slate-100" />

                <div className="mt-5 flex gap-4">

                  <div className="h-3 w-20 rounded bg-slate-100" />

                  <div className="h-3 w-20 rounded bg-slate-100" />

                  <div className="h-3 w-20 rounded bg-slate-100" />

                </div>

              </div>

            </div>

            <div className="animate-pulse divide-y divide-slate-200">

              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="py-7"
                >

                  <div className="h-2 w-20 rounded bg-slate-100" />

                  <div className="mt-3 h-5 w-[70%] rounded bg-slate-100" />

                  <div className="mt-3 h-3 w-full rounded bg-slate-100" />

                  <div className="mt-2 h-3 w-[60%] rounded bg-slate-100" />

                </div>
              ))}

            </div>

          </div>

          {/* Right */}

          <div className="hidden animate-pulse py-9 lg:block lg:pl-8 xl:pl-10">

            <div className="h-3 w-36 rounded bg-slate-100" />

            <div className="mt-5 space-y-5">

              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3"
                >

                  <div className="size-10 rounded-full bg-slate-100" />

                  <div className="flex-1">

                    <div className="h-2.5 w-24 rounded bg-slate-100" />

                    <div className="mt-2 h-2 w-16 rounded bg-slate-100" />

                  </div>

                </div>
              ))}

            </div>

          </div>

        </div>

      </div>

    </main>
  )
}

/* =========================================================
   PROFILE NOT FOUND
========================================================= */

function ProfileNotFound({
  suggestedAuthors = [],
  loadingSuggestions = false,
}: {
  suggestedAuthors?: any[]
  loadingSuggestions?: boolean
}) {
  return (
    <main className="flex min-h-[75vh] flex-col items-center justify-center bg-white px-5 py-12">

      <div className="max-w-sm text-center">

        <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm">
          <UserIcon className="size-5" />
        </div>

        <h1 className="mt-4 text-[18px] font-black tracking-tight text-slate-950">
          Profile not found
        </h1>

        <p className="mt-2 text-[10px] font-medium leading-5 text-slate-500">
          This account may no longer exist, or the username
          may have changed.
        </p>

        <Link
          to="/blogs"
          className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-950 px-4 text-[9px] font-extrabold text-white transition hover:bg-[#E05A47]"
        >
          Explore BareMind

          <ArrowUpRight className="size-3" />
        </Link>

      </div>

      {(loadingSuggestions || suggestedAuthors.length > 0) && (
        <div className="mt-16 w-full max-w-sm">
          <RecommendedAuthors
            authors={suggestedAuthors}
            loading={loadingSuggestions}
          />
        </div>
      )}

    </main>
  )
}