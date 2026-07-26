import { useEffect, useState, useCallback } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useSelector } from "react-redux"
import { AnimatePresence, motion } from "framer-motion"
import MDEditor from "@uiw/react-md-editor"

import { blogService } from "@/services/blogService"
import { interactionService } from "@/services/interactionService"
import { userService } from "@/services/userService"
import type { Blog } from "@/services/blogService"
import type { RootState } from "@/store"
import { getUserAvatar } from "@/utils/avatar"
import { UserListModal } from "@/components/UserListModal"
import { AuthModal } from "@/components/ui/AuthModal"
import {
  ArrowLeft,
  Bookmark,
  Check,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Tag,
  Sparkles,
  Send,
  ArrowUpRight,
  MoreHorizontal,
  UserPlus,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

/* =========================================================
   CONSTANTS
========================================================= */

const BRAND = "#f07060"

/* =========================================================
   HELPERS
========================================================= */

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

function formatCommentDate(date?: string) {
  if (!date) return "Recently"

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return "Recently"
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

/* =========================================================
   RECOMMENDATION ITEM
========================================================= */

function RecommendationItem({
  blog,
  index,
}: {
  blog: Blog
  index: number
}) {
  const authorName = blog.author?.first_name
    ? `${blog.author.first_name} ${blog.author.last_name ?? ""
      }`.trim()
    : blog.author?.username || "BareMind"

  const avatar = getUserAvatar(
    (blog.author as any)?.avatar_url,
    authorName
  )

  return (
    <Link
      to={`/blogs/${blog.slug}`}
      className="
        group
        block
        py-4
        first:pt-0
        border-b border-slate-100
        last:border-b-0
      "
    >
      <div className="flex gap-3.5">

        {/* RANK */}

        <span
          className="
            pt-[1px]
            text-[11px]
            font-black
            tabular-nums
            text-slate-300
            transition-colors
            group-hover:text-[#f07060]
          "
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* CONTENT */}

        <div className="min-w-0 flex-1">

          {blog.category && (
            <div
              className="
                mb-1.5
                text-[8px]
                font-extrabold
                uppercase
                tracking-[0.12em]
                text-[#f07060]
              "
            >
              {blog.category.name}
            </div>
          )}

          <h4
            className="
              line-clamp-2
              text-[12px]
              font-extrabold
              leading-[1.45]
              tracking-[-0.015em]
              text-slate-900
              transition-colors
              group-hover:text-[#f07060]
            "
          >
            {blog.title}
          </h4>

          <div
            className="
              mt-2.5
              flex
              min-w-0
              items-center
              gap-2
            "
          >
            <img
              src={avatar}
              alt={authorName}
              className="
                size-[18px]
                shrink-0
                rounded-full
                object-cover
                ring-1 ring-slate-200
              "
            />

            <span
              className="
                min-w-0
                truncate
                text-[9px]
                font-semibold
                text-slate-500
              "
            >
              {authorName}
            </span>

            <span className="text-slate-300">
              ·
            </span>

            <span
              className="
                flex
                shrink-0
                items-center
                gap-1
                text-[9px]
                font-medium
                text-slate-400
              "
            >
              {blog.reading_time ||
                getReadTime(blog.content)}
              m
            </span>
          </div>

        </div>

        {/* SMALL THUMBNAIL */}

        {blog.cover_image && (
          <div
            className="
              size-[58px]
              shrink-0
              overflow-hidden
              rounded-xl
              bg-slate-100
            "
          >
            <img
              src={blog.cover_image}
              alt=""
              className="
                h-full w-full
                object-cover
                transition-transform
                duration-500
                group-hover:scale-105
              "
            />
          </div>
        )}

      </div>
    </Link>
  )
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function BlogView() {
  const { slug } =
    useParams<{ slug: string }>()

  const navigate = useNavigate()

  const { isAuthenticated, user } =
    useSelector(
      (state: RootState) => state.auth
    )

  const [blog, setBlog] =
    useState<Blog | null>(null)

  const [
    recommendedBlogs,
    setRecommendedBlogs,
  ] = useState<Blog[]>([])

  const [loading, setLoading] =
    useState(true)

  const [liked, setLiked] =
    useState(false)

  const [likeCount, setLikeCount] =
    useState(0)

  const [bookmarked, setBookmarked] =
    useState(false)

  const [comments, setComments] =
    useState<any[]>([])

  const [commentText, setCommentText] =
    useState("")

  const [submitting, setSubmitting] =
    useState(false)

  const [showAuth, setShowAuth] =
    useState(false)

  const [copied, setCopied] =
    useState(false)

  const [showLikers, setShowLikers] =
    useState(false)

  const [likersData, setLikersData] =
    useState<any[]>([])

  const [loadingLikers, setLoadingLikers] =
    useState(false)

  const [isLiking, setIsLiking] =
    useState(false)

  const [
    isBookmarking,
    setIsBookmarking,
  ] = useState(false)

  const [following, setFollowing] =
    useState(false)

  const [
    isFollowingLoading,
    setIsFollowingLoading,
  ] = useState(false)

  /* =======================================================
     LIKERS
  ======================================================= */

  const handleOpenLikers = async () => {
    if (!blog) return

    setShowLikers(true)
    setLoadingLikers(true)

    try {
      const data =
        await blogService.getLikers(blog.id)

      setLikersData(data)
    } catch (error) {
      console.error(
        "Failed to fetch likers",
        error
      )
    } finally {
      setLoadingLikers(false)
    }
  }

  /* =======================================================
     FETCH
  ======================================================= */

  useEffect(() => {
    if (!slug) return

    setLoading(true)

    blogService
      .getBlogBySlug(slug)
      .then((data) => {
        setBlog(data)

        setLikeCount(
          data.likes_count || 0
        )

        setLiked(
          data.is_liked_by_user || false
        )

        setBookmarked(
          data.is_bookmarked_by_user ||
          false
        )

        // Initialise follow state from author object
        setFollowing(
          (data.author as any)?.is_following ||
          false
        )

        interactionService
          .recordView(data.id)
          .catch(() => { })

        interactionService
          .getComments(data.id)
          .then(setComments)
          .catch(() => { })

        blogService
          .getBlogs(0, 10)
          .then((res) => {
            setRecommendedBlogs(
              res
                .filter(
                  (item) =>
                    item.id !== data.id
                )
                .slice(0, 5)
            )
          })
          .catch(() => { })
      })
      .catch(() => {
        navigate("/blogs")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [slug, navigate])

  /* =======================================================
     AUTH GUARD
  ======================================================= */

  const guard = useCallback((
    callback: () => void | Promise<void>
  ) => {
    if (!isAuthenticated) {
      setShowAuth(true)
      return
    }
    // Deliberately not awaiting — callers that need async use handleXxx directly
    void callback()
  }, [isAuthenticated])

  /* =======================================================
     LIKE
  ======================================================= */

  const handleLike = () =>
    guard(async () => {
      if (!blog || isLiking) return

      setIsLiking(true)

      const previous = liked

      setLiked(!previous)

      setLikeCount((current) =>
        current + (previous ? -1 : 1)
      )

      try {
        await interactionService.toggleLike(
          blog.id
        )
      } catch {
        setLiked(previous)

        setLikeCount((current) =>
          current + (previous ? 1 : -1)
        )
      } finally {
        setIsLiking(false)
      }
    })

  /* =======================================================
     BOOKMARK
  ======================================================= */

  const handleBookmark = () =>
    guard(async () => {
      if (!blog || isBookmarking) return

      setIsBookmarking(true)

      const previous = bookmarked

      setBookmarked(!previous)

      try {
        await interactionService.toggleBookmark(
          blog.id
        )
      } catch {
        setBookmarked(previous)
      } finally {
        setIsBookmarking(false)
      }
    })

  /* =======================================================
     FOLLOW
  ======================================================= */

  const handleFollow = async () => {
    // Auth gate
    if (!isAuthenticated) {
      setShowAuth(true)
      return
    }

    if (!blog || isFollowingLoading) return

    const authorIdentifier =
      (blog.author as any)?.username ||
      blog.author_id

    if (!authorIdentifier) return

    setIsFollowingLoading(true)

    const previous = following

    // Optimistic update
    setFollowing(!previous)

    try {
      await userService.followUser(String(authorIdentifier))
    } catch (err) {
      console.error('[BlogView] follow/unfollow failed:', err)
      // Revert on error
      setFollowing(previous)
    } finally {
      setIsFollowingLoading(false)
    }
  }

  /* =======================================================
     SHARE
  ======================================================= */

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(
        window.location.href
      )

      setCopied(true)

      setTimeout(
        () => setCopied(false),
        1800
      )
    } catch {
      console.error(
        "Unable to copy article URL"
      )
    }
  }

  /* =======================================================
     COMMENT
  ======================================================= */

  const handleComment = async () => {
    if (!isAuthenticated) {
      setShowAuth(true)
      return
    }

    if (
      !blog ||
      !commentText.trim()
    ) {
      return
    }

    try {
      setSubmitting(true)

      const newComment =
        await interactionService.createComment(
          blog.id,
          commentText.trim()
        )

      setComments((current) => [
        ...current,
        newComment,
      ])

      setCommentText("")
    } catch (error) {
      console.error(
        "Failed to create comment",
        error
      )
    } finally {
      setSubmitting(false)
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <div
          className="
            mx-auto
            max-w-[1500px]
            px-4
            py-10
            sm:px-6
            lg:px-8
          "
        >
          <div
            className="
              grid grid-cols-1
              gap-10
              lg:grid-cols-[270px_minmax(0,1fr)_340px]
            "
          >
            <div
              className="
                hidden h-80
                animate-pulse
                rounded-2xl
                bg-slate-100
                lg:block
              "
            />

            <div
              className="
                h-[650px]
                animate-pulse
                rounded-2xl
                bg-slate-100
              "
            />

            <div
              className="
                hidden h-[500px]
                animate-pulse
                rounded-2xl
                bg-slate-100
                lg:block
              "
            />
          </div>
        </div>
      </main>
    )
  }

  if (!blog) return null

  /* =======================================================
     BLOG DATA
  ======================================================= */

  const authorName =
    blog.author?.first_name
      ? `${blog.author.first_name} ${blog.author.last_name ?? ""
        }`.trim()
      : blog.author?.username ||
      "BareMind Author"

  const username =
    (blog.author as any)?.username

  const authorAvatar = getUserAvatar(
    (blog.author as any)?.avatar_url,
    authorName
  )

  // Don't show Follow button on own blogs
  const isOwnBlog =
    isAuthenticated &&
    user &&
    (String(user.id) === String(blog.author_id) ||
      (username && user.username === username))

  const readTime =
    blog.reading_time ||
    getReadTime(blog.content)

  const publishDate = new Date(
    blog.created_at
  ).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main
      className="
        min-h-screen
        bg-white
        pb-20
        font-sans
        antialiased
        text-slate-900
      "
    >
      {/* ===================================================
          ARTICLE TYPOGRAPHY
      =================================================== */}

      <style>{`
        .article-body {
          color: #292524;
          font-size: 1.1rem;
          line-height: 1.95;
          letter-spacing: -0.003em;
        }

        .article-body .wmde-markdown {
          background: transparent !important;
          color: inherit !important;
          font-family: inherit !important;
        }

        .article-body h1,
        .article-body h2,
        .article-body h3,
        .article-body h4 {
          color: #0f172a;
          line-height: 1.22;
          font-weight: 850;
          margin-top: 2.3em;
          margin-bottom: 0.7em;
          letter-spacing: -0.03em;
        }

        .article-body h1 {
          font-size: 2.1rem;
        }

        .article-body h2 {
          font-size: 1.6rem;
        }

        .article-body h3 {
          font-size: 1.28rem;
        }

        .article-body p {
          margin-bottom: 1.55em;
        }

        .article-body blockquote {
          border-left: 3px solid ${BRAND};
          padding: 0.2em 0 0.2em 1.4em;
          margin: 2.2em 0;
          color: #57534e;
          font-style: italic;
          font-size: 1.08em;
        }

        .article-body pre {
          background: #18181b !important;
          border-radius: 14px;
          padding: 1.4em;
          color: #f4f4f5;
          overflow-x: auto;
          margin: 2.2em 0;
          border: 1px solid #27272a;
        }

        .article-body code {
          background: #f8fafc;
          color: #be123c;
          padding: 0.2em 0.4em;
          border-radius: 6px;
          font-size: 0.86em;
          border: 1px solid #e7e5e4;
        }

        .article-body img {
          border-radius: 14px;
          max-width: 100%;
          margin: 2.3em auto;
        }

        .responses-scroll::-webkit-scrollbar {
          width: 4px;
        }

        .responses-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .responses-scroll::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 999px;
        }
      `}</style>

      <AnimatePresence>
        {showAuth && (
          <AuthModal
            onClose={() =>
              setShowAuth(false)
            }
          />
        )}
      </AnimatePresence>

      {/* ===================================================
          3 COLUMN LAYOUT
      =================================================== */}

      <div
        className="
          mx-auto
          max-w-[1500px]
          px-4
          py-8
          sm:px-6
          lg:px-8
          lg:py-10
        "
      >
        <div
          className="
            grid
            grid-cols-1
            items-start
            gap-10

            lg:grid-cols-[270px_minmax(0,1fr)_340px]
          "
        >

          {/* =================================================
              LEFT SIDEBAR
          ================================================= */}

          <aside
            className="
              sticky top-6
              hidden
              border-r
              border-slate-100
              pr-6
              lg:block
            "
          >

            {/* BACK */}

            <Link
              to="/blogs"
              className="
                group
                mb-8
                inline-flex
                items-center
                gap-2
                text-[10px]
                font-bold
                text-slate-500
                transition
                hover:text-slate-950
              "
            >
              <ArrowLeft
                className="
                  size-3.5
                  transition-transform
                  group-hover:-translate-x-1
                "
              />

              Back to stories
            </Link>

            {/* HEADER */}

            <div className="mb-2">

              <div
                className="
                  mb-2
                  flex
                  items-center
                  gap-1.5
                  text-[8px]
                  font-extrabold
                  uppercase
                  tracking-[0.16em]
                  text-[#f07060]
                "
              >
                <Sparkles className="size-3" />
                Curated for you
              </div>

              <div
                className="
                  flex
                  items-end
                  justify-between
                  gap-3
                "
              >
                <h3
                  className="
                    text-[15px]
                    font-black
                    tracking-[-0.03em]
                    text-slate-950
                  "
                >
                  Keep reading
                </h3>

                <Link
                  to="/blogs"
                  className="
                    mb-[1px]
                    text-[8px]
                    font-bold
                    text-slate-400
                    transition
                    hover:text-[#f07060]
                  "
                >
                  Explore
                </Link>
              </div>

            </div>

            {/* RECOMMENDATIONS */}

            <div
              className="
                mt-5
                border-t
                border-slate-100
                pt-4
              "
            >
              {recommendedBlogs.length === 0 ? (
                <div className="py-8 text-center">

                  <Sparkles
                    className="
                      mx-auto
                      size-5
                      text-slate-200
                    "
                  />

                  <p
                    className="
                      mt-2
                      text-[10px]
                      font-medium
                      text-slate-400
                    "
                  >
                    More stories will appear here.
                  </p>

                </div>
              ) : (
                recommendedBlogs.map(
                  (recommended, index) => (
                    <RecommendationItem
                      key={recommended.id}
                      blog={recommended}
                      index={index}
                    />
                  )
                )
              )}
            </div>

            {/* DISCOVERY FOOTER */}

            <Link
              to="/blogs"
              className="
                group
                mt-5
                flex
                items-center
                justify-between
                rounded-xl
                bg-slate-50
                px-3.5
                py-3
                transition
                hover:bg-slate-100
              "
            >
              <div>

                <p
                  className="
                    text-[9px]
                    font-extrabold
                    text-slate-800
                  "
                >
                  Discover more
                </p>

                <p
                  className="
                    mt-0.5
                    text-[8px]
                    font-medium
                    text-slate-400
                  "
                >
                  Explore the community feed
                </p>

              </div>

              <ArrowUpRight
                className="
                  size-3.5
                  text-slate-400
                  transition
                  group-hover:-translate-y-0.5
                  group-hover:translate-x-0.5
                  group-hover:text-[#f07060]
                "
              />
            </Link>

          </aside>

          {/* =================================================
              CENTER ARTICLE
          ================================================= */}

          <main className="min-w-0 bg-white">

            {/* MOBILE BACK */}

            <div className="mb-5 lg:hidden">
              <Link
                to="/blogs"
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  text-xs
                  font-bold
                  text-slate-600
                  hover:text-slate-900
                "
              >
                <ArrowLeft className="size-3.5" />
                Back to Stories
              </Link>
            </div>

            {/* META */}

            <div
              className="
                mb-4
                flex
                flex-wrap
                items-center
                justify-between
                gap-3
              "
            >
              {blog.category && (
                <span
                  className="
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[0.14em]
                    text-[#f07060]
                  "
                >
                  {blog.category.name}
                </span>
              )}

              <div
                className="
                  flex
                  items-center
                  gap-3
                  text-[10px]
                  font-medium
                  text-slate-400
                "
              >
                <span
                  className="
                    flex
                    items-center
                    gap-1
                  "
                >
                  <Clock className="size-3" />
                  {readTime} min read
                </span>

                <span className="text-slate-300">
                  ·
                </span>

                <span
                  className="
                    flex
                    items-center
                    gap-1
                  "
                >
                  <Eye className="size-3" />
                  {formatNumber(
                    blog.views || 0
                  )}
                </span>
              </div>
            </div>

            {/* TITLE */}

            <h1
              className="
                text-3xl
                font-black
                leading-[1.1]
                tracking-[-0.04em]
                text-slate-950

                sm:text-4xl
                lg:text-[42px]
              "
            >
              {blog.title}
            </h1>

            {/* AUTHOR */}

            <div
              className="
                my-7
                flex
                items-center
                justify-between
                gap-4
                border-y
                border-slate-100
                py-4
              "
            >
              <Link
                to={`/u/${username ||
                  blog.author_id
                  }`}
                className="
                  group
                  flex
                  min-w-0
                  items-center
                  gap-3
                "
              >
                <img
                  src={authorAvatar}
                  alt={authorName}
                  className="
                    size-10
                    shrink-0
                    rounded-full
                    object-cover
                    ring-1
                    ring-slate-200
                  "
                />

                <div className="min-w-0">

                  <h4
                    className="
                      truncate
                      text-[11px]
                      font-extrabold
                      text-slate-900
                      transition
                      group-hover:text-[#f07060]
                    "
                  >
                    {authorName}
                  </h4>

                  <p
                    className="
                      mt-0.5
                      text-[9px]
                      font-medium
                      text-slate-400
                    "
                  >
                    {publishDate}
                  </p>

                </div>
              </Link>

              {!isOwnBlog && (
                <motion.button
                  onClick={handleFollow}
                  disabled={isFollowingLoading}
                  whileTap={{ scale: 0.94 }}
                  className={`
                    group
                    relative
                    flex
                    items-center
                    gap-1.5
                    overflow-hidden
                    rounded-full
                    border
                    px-4
                    py-1.5
                    text-[10px]
                    font-extrabold
                    transition-all
                    duration-200
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    ${
                      following
                        ? "border-[#f07060] bg-[#fff2ef] text-[#f07060] hover:border-red-300 hover:bg-red-50 hover:text-red-500"
                        : "border-slate-900 bg-slate-900 text-white hover:bg-[#f07060] hover:border-[#f07060]"
                    }
                  `}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {following ? (
                      <motion.span
                        key="following"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-1.5"
                      >
                        <UserCheck className="size-3" />
                        <span className="group-hover:hidden">
                          Following
                        </span>
                        <span className="hidden group-hover:inline">
                          Unfollow
                        </span>
                      </motion.span>
                    ) : (
                      <motion.span
                        key="follow"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-1.5"
                      >
                        <UserPlus className="size-3" />
                        Follow
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              )}
            </div>

            {/* COVER */}

            {blog.cover_image && (
              <img
                src={blog.cover_image}
                alt={blog.title}
                className="
                  mb-8
                  max-h-[460px]
                  w-full
                  rounded-2xl
                  object-cover
                "
              />
            )}

            {/* CONTENT */}

            <article
              className="
                article-body
                min-w-0
                mt-12
                [&_.wmde-markdown_code]:!text-slate-700
                [&_.wmde-markdown_code]:!bg-slate-100
                [&_.wmde-markdown_pre_code]:!text-slate-200
                [&_.wmde-markdown_pre_code]:!bg-transparent
                [&_.wmde-markdown_pre]:!bg-slate-900
              "
              data-color-mode="light"
            >
              <MDEditor.Markdown
                source={blog.content}
              />
            </article>

            {/* TAGS */}

            {blog.tags &&
              blog.tags.length > 0 && (
                <div
                  className="
                    mt-10
                    flex
                    flex-wrap
                    items-center
                    gap-2
                    border-t
                    border-slate-100
                    pt-6
                  "
                >
                  <Tag
                    className="
                      mr-1
                      size-3.5
                      text-slate-400
                    "
                  />

                  {blog.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="
                        cursor-pointer
                        rounded-lg
                        bg-slate-50
                        px-2.5
                        py-1
                        text-[9px]
                        font-bold
                        text-slate-500
                        transition
                        hover:bg-[#fff1ee]
                        hover:text-[#f07060]
                      "
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
              )}

          </main>

          {/* =================================================
              RIGHT SIDEBAR
          ================================================= */}

          <aside
            className="
              sticky top-6
              hidden
              border-l
              border-slate-100
              pl-6
              lg:block
            "
          >

            {/* =================================================
                INTERACTION HEADER
            ================================================= */}

            <section>

              <div
                className="
                  flex
                  items-start
                  justify-between
                  gap-3
                "
              >
                <div>

                  <p
                    className="
                      text-[8px]
                      font-extrabold
                      uppercase
                      tracking-[0.15em]
                      text-slate-400
                    "
                  >
                    Reader activity
                  </p>

                  <h3
                    className="
                      mt-1
                      text-[15px]
                      font-black
                      tracking-[-0.03em]
                      text-slate-950
                    "
                  >
                    Engage with this story
                  </h3>

                </div>

                <div
                  className="
                    flex
                    items-center
                    gap-1
                    rounded-full
                    bg-slate-50
                    px-2.5
                    py-1
                    text-[8px]
                    font-bold
                    text-slate-500
                  "
                >
                  <Eye className="size-2.5" />

                  {formatNumber(
                    blog.views || 0
                  )}
                </div>

              </div>

              {/* ===============================================
                  ACTION BAR
              =============================================== */}

              <div
                className="
                  mt-5
                  grid
                  grid-cols-3
                  overflow-hidden
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                "
              >

                {/* LIKE */}

                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleLike}
                  disabled={isLiking}
                  className={`
                    relative
                    flex
                    min-h-[70px]
                    flex-col
                    items-center
                    justify-center
                    gap-1.5

                    border-r
                    border-slate-100

                    transition-colors

                    ${liked
                      ? "bg-rose-50/70 text-rose-500"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }
                  `}
                >
                  <Heart
                    className={`
                      size-[17px]
                      ${liked
                        ? "fill-current"
                        : ""
                      }
                    `}
                  />

                  <span
                    className="
                      text-[9px]
                      font-extrabold
                    "
                  >
                    {likeCount > 0
                      ? formatNumber(
                        likeCount
                      )
                      : "Like"}
                  </span>

                </motion.button>

                {/* SAVE */}

                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleBookmark}
                  disabled={isBookmarking}
                  className={`
                    flex
                    min-h-[70px]
                    flex-col
                    items-center
                    justify-center
                    gap-1.5

                    border-r
                    border-slate-100

                    transition-colors

                    ${bookmarked
                      ? "bg-[#fff3f0] text-[#f07060]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }
                  `}
                >
                  <Bookmark
                    className={`
                      size-[17px]
                      ${bookmarked
                        ? "fill-current"
                        : ""
                      }
                    `}
                  />

                  <span
                    className="
                      text-[9px]
                      font-extrabold
                    "
                  >
                    {bookmarked
                      ? "Saved"
                      : "Save"}
                  </span>

                </motion.button>

                {/* SHARE */}

                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleShare}
                  className="
                    flex
                    min-h-[70px]
                    flex-col
                    items-center
                    justify-center
                    gap-1.5

                    text-slate-500

                    transition-colors

                    hover:bg-slate-50
                    hover:text-slate-900
                  "
                >
                  {copied ? (
                    <Check
                      className="
                        size-[17px]
                        text-emerald-600
                      "
                    />
                  ) : (
                    <Share2 className="size-[17px]" />
                  )}

                  <span
                    className="
                      text-[9px]
                      font-extrabold
                    "
                  >
                    {copied
                      ? "Copied"
                      : "Share"}
                  </span>

                </motion.button>

              </div>

              {/* LIKE DETAILS */}

              {likeCount > 0 && (
                <button
                  onClick={handleOpenLikers}
                  className="
                    mt-3
                    flex
                    items-center
                    gap-1
                    text-[8px]
                    font-bold
                    text-slate-400
                    transition
                    hover:text-slate-900
                  "
                >
                  {formatNumber(likeCount)}{" "}
                  {likeCount === 1
                    ? "reader likes"
                    : "readers like"}{" "}
                  this story

                  <ArrowUpRight className="size-2.5" />
                </button>
              )}

            </section>

            {/* =================================================
                RESPONSES
            ================================================= */}

            <section
              className="
                mt-8
                border-t
                border-slate-100
                pt-6
              "
            >

              {/* HEADER */}

              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <MessageCircle
                    className="
                      size-3.5
                      text-slate-500
                    "
                  />

                  <h3
                    className="
                      text-[11px]
                      font-black
                      tracking-[-0.015em]
                      text-slate-900
                    "
                  >
                    Responses
                  </h3>

                  <span
                    className="
                      text-[9px]
                      font-bold
                      text-slate-400
                    "
                  >
                    {comments.length}
                  </span>

                </div>

                <MoreHorizontal
                  className="
                    size-4
                    text-slate-300
                  "
                />

              </div>

              {/* ===============================================
                  COMPOSER
              =============================================== */}

              {isAuthenticated ? (
                <div
                  className="
                    mt-4
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    transition
                    focus-within:border-slate-300
                    focus-within:shadow-[0_8px_30px_rgba(15,23,42,0.06)]
                  "
                >
                  <div
                    className="
                      flex
                      items-start
                      gap-2.5
                      p-3
                    "
                  >
                    <img
                      src={getUserAvatar(
                        user?.avatar_url,
                        user?.username ||
                        user?.first_name ||
                        user?.email
                      )}
                      alt=""
                      className="
                        mt-0.5
                        size-7
                        shrink-0
                        rounded-full
                        object-cover
                        ring-1
                        ring-slate-200
                      "
                    />

                    <textarea
                      value={commentText}
                      onChange={(e) =>
                        setCommentText(
                          e.target.value
                        )
                      }
                      placeholder="Share your perspective..."
                      rows={3}
                      className="
                        min-h-[72px]
                        w-full
                        resize-none
                        border-none
                        bg-transparent
                        p-0
                        text-[11px]
                        font-medium
                        leading-5
                        text-slate-800
                        outline-none
                        placeholder:text-slate-400
                        focus:ring-0
                      "
                    />
                  </div>

                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      border-t
                      border-slate-100
                      px-3
                      py-2
                    "
                  >
                    <span
                      className="
                        text-[8px]
                        font-medium
                        text-slate-400
                      "
                    >
                      Be thoughtful and constructive.
                    </span>

                    <button
                      onClick={handleComment}
                      disabled={
                        submitting ||
                        !commentText.trim()
                      }
                      className="
                        flex
                        h-7
                        items-center
                        gap-1.5
                        rounded-lg
                        bg-slate-950
                        px-3
                        text-[8px]
                        font-extrabold
                        text-white
                        transition
                        hover:bg-[#f07060]
                        disabled:cursor-not-allowed
                        disabled:opacity-30
                      "
                    >
                      <Send className="size-2.5" />

                      {submitting
                        ? "Posting..."
                        : "Respond"}
                    </button>
                  </div>
                </div>
              ) : (
                /* =============================================
                   SIGN-IN PROMPT
                ============================================= */

                <button
                  type="button"
                  onClick={() =>
                    setShowAuth(true)
                  }
                  className="
                    group
                    mt-4
                    w-full
                    rounded-2xl
                    border
                    border-slate-200
                    bg-slate-50/60
                    p-4
                    text-left
                    transition
                    hover:border-slate-300
                    hover:bg-white
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-3
                    "
                  >
                    <div>

                      <p
                        className="
                          text-[10px]
                          font-extrabold
                          text-slate-800
                        "
                      >
                        Join the discussion
                      </p>

                      <p
                        className="
                          mt-1
                          text-[9px]
                          font-medium
                          text-slate-400
                        "
                      >
                        Sign in to share your perspective.
                      </p>

                    </div>

                    <ArrowUpRight
                      className="
                        size-3.5
                        shrink-0
                        text-slate-400
                        transition
                        group-hover:-translate-y-0.5
                        group-hover:translate-x-0.5
                        group-hover:text-[#f07060]
                      "
                    />

                  </div>
                </button>
              )}

              {/* ===============================================
                  COMMENT LIST
              =============================================== */}

              <div
                className="
                  responses-scroll
                  mt-5
                  max-h-[460px]
                  overflow-y-auto
                  pr-1
                "
              >
                {comments.length === 0 ? (
                  <div
                    className="
                      py-10
                      text-center
                    "
                  >
                    <div
                      className="
                        mx-auto
                        flex
                        size-9
                        items-center
                        justify-center
                        rounded-full
                        bg-slate-50
                        text-slate-300
                      "
                    >
                      <MessageCircle className="size-4" />
                    </div>

                    <p
                      className="
                        mt-3
                        text-[10px]
                        font-bold
                        text-slate-600
                      "
                    >
                      No responses yet
                    </p>

                    <p
                      className="
                        mx-auto
                        mt-1
                        max-w-[180px]
                        text-[8px]
                        font-medium
                        leading-4
                        text-slate-400
                      "
                    >
                      Start a thoughtful conversation about this story.
                    </p>
                  </div>
                ) : (
                  <div>

                    {comments.map(
                      (comment, index) => {
                        const author =
                          comment.user ||
                          comment.author

                        const commentAuthor =
                          author?.first_name
                            ? `${author.first_name} ${author.last_name ||
                              ""
                              }`.trim()
                            : author?.username ||
                            "Reader"

                        const commentAvatar =
                          getUserAvatar(
                            author?.avatar_url,
                            commentAuthor
                          )

                        return (
                          <div
                            key={
                              comment.id ??
                              index
                            }
                            className="
                              group
                              border-b
                              border-slate-100
                              py-4
                              first:pt-0
                              last:border-b-0
                            "
                          >
                            {/* AUTHOR */}

                            <div
                              className="
                                flex
                                items-center
                                justify-between
                                gap-3
                              "
                            >
                              <div
                                className="
                                  flex
                                  min-w-0
                                  items-center
                                  gap-2.5
                                "
                              >
                                <img
                                  src={
                                    commentAvatar
                                  }
                                  alt=""
                                  className="
                                    size-7
                                    shrink-0
                                    rounded-full
                                    object-cover
                                    ring-1
                                    ring-slate-200
                                  "
                                />

                                <div className="min-w-0">

                                  <p
                                    className="
                                      truncate
                                      text-[9px]
                                      font-extrabold
                                      text-slate-900
                                    "
                                  >
                                    {commentAuthor}
                                  </p>

                                  <p
                                    className="
                                      mt-0.5
                                      text-[8px]
                                      font-medium
                                      text-slate-400
                                    "
                                  >
                                    {formatCommentDate(
                                      comment.created_at
                                    )}
                                  </p>

                                </div>
                              </div>

                              <button
                                type="button"
                                className="
                                  flex
                                  size-6
                                  items-center
                                  justify-center
                                  rounded-full
                                  text-slate-300
                                  opacity-0
                                  transition
                                  hover:bg-slate-100
                                  hover:text-slate-600
                                  group-hover:opacity-100
                                "
                              >
                                <MoreHorizontal className="size-3" />
                              </button>
                            </div>

                            {/* COMMENT */}

                            <p
                              className="
                                mt-2.5
                                break-words
                                text-[10px]
                                font-medium
                                leading-[1.65]
                                text-slate-600
                              "
                            >
                              {comment.content}
                            </p>

                          </div>
                        )
                      }
                    )}

                  </div>
                )}
              </div>

            </section>

          </aside>

        </div>
      </div>

      {/* ===================================================
          LIKERS
      =================================================== */}

      {showLikers && (
        <UserListModal
          title="Likes"
          users={likersData}
          loading={loadingLikers}
          currentUser={user}
          onClose={() =>
            setShowLikers(false)
          }
          emptyMessage="No likes yet."
        />
      )}

    </main>
  )
}