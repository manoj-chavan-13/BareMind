import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { Link, Navigate } from "react-router-dom"
import {
  ArrowRight,
  Clock3,
  PenLine,
  Sparkles,
  TrendingUp,
} from "lucide-react"

import type { RootState } from "@/store"
import { blogService, type Blog } from "@/services/blogService"
import { getUserAvatar } from "@/utils/avatar"

const BRAND = "#f07060"

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=85"

function getExcerpt(content = "", max = 120) {
  const text = content
    .replace(/[#*_`\[\]()\n>!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return text.length > max
    ? `${text.slice(0, max).trim()}…`
    : text
}

function getReadTime(content = "") {
  const words = content.trim()
    ? content.trim().split(/\s+/).length
    : 0

  return Math.max(1, Math.ceil(words / 200))
}

export default function Home() {
  const { isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  )

  const [blogs, setBlogs] = useState<Blog[]>([])

  useEffect(() => {
    let mounted = true

    blogService
      .getBlogs()
      .then((data) => {
        if (mounted) {
          setBlogs(data.slice(0, 3))
        }
      })
      .catch(() => { })

    return () => {
      mounted = false
    }
  }, [])

  if (isAuthenticated) {
    return <Navigate to="/blogs" replace />
  }

  const featured = blogs[0]

  const featuredAuthor =
    featured?.author?.first_name ||
    featured?.author?.username ||
    "BareMind Author"

  return (
    <main className="relative overflow-hidden bg-[#fcfcfb]">

      {/* =====================================================
          SUBTLE BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div
          className="
            absolute
            left-[-160px]
            top-[-180px]
            h-[420px]
            w-[420px]
            rounded-full
            bg-[#f07060]/[0.07]
            blur-[90px]
          "
        />

        <div
          className="
            absolute
            right-[-140px]
            top-[40px]
            h-[360px]
            w-[360px]
            rounded-full
            bg-orange-200/[0.10]
            blur-[100px]
          "
        />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "radial-gradient(#0f172a 0.8px, transparent 0.8px)",
            backgroundSize: "22px 22px",
          }}
        />

      </div>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section
        className="
          relative
          mx-auto
          grid
          max-w-7xl
          grid-cols-1
          items-center
          gap-10

          px-5
          py-12

          sm:px-8
          sm:py-14

          lg:min-h-[540px]
          lg:grid-cols-[minmax(0,0.95fr)_minmax(440px,0.85fr)]
          lg:gap-16
          lg:px-10
          lg:py-14
        "
      >

        {/* ===================================================
            LEFT — MESSAGE
        =================================================== */}

        <div className="relative z-10 max-w-[650px]">

          {/* Eyebrow */}

          <div
            className="
              mb-5
              inline-flex
              items-center
              gap-2

              rounded-full
              border border-slate-200/80
              bg-white/80

              px-3
              py-1.5

              shadow-[0_2px_10px_rgba(15,23,42,0.04)]
              backdrop-blur
            "
          >
            <Sparkles className="size-3.5 text-[#f07060]" />

            <span
              className="
                text-[10px]
                font-extrabold
                uppercase
                tracking-[0.14em]
                text-slate-600
              "
            >
              Ideas deserve a place to grow
            </span>
          </div>

          {/* Heading */}

          <h1
            className="
              max-w-[620px]

              text-[40px]
              font-black
              leading-[1.03]
              tracking-[-0.05em]
              text-slate-950

              sm:text-[50px]

              lg:text-[58px]
            "
          >
            Write what you know.

            <span className="block">
              Discover what{" "}
              <span className="relative whitespace-nowrap text-[#f07060]">
                you don't.

                <svg
                  viewBox="0 0 260 12"
                  fill="none"
                  aria-hidden="true"
                  className="
                    absolute
                    -bottom-2
                    left-0
                    w-full
                  "
                >
                  <path
                    d="M3 8.5C72 3 173 2.5 257 7"
                    stroke="#f07060"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    opacity="0.22"
                  />
                </svg>

              </span>
            </span>
          </h1>

          {/* Description */}

          <p
            className="
              mt-6
              max-w-[550px]

              text-[14px]
              font-medium
              leading-6
              text-slate-500

              sm:text-[15px]
              sm:leading-7
            "
          >
            BareMind is an open publishing community for developers,
            builders, and curious people to share useful ideas,
            technical stories, and lessons worth remembering.
          </p>

          {/* CTAs */}

          <div
            className="
              mt-7
              flex
              flex-col
              gap-3

              min-[420px]:flex-row
              min-[420px]:items-center
            "
          >

            <Link
              to="/register"
              className="
                group

                inline-flex
                h-11
                items-center
                justify-center
                gap-2

                rounded-full
                bg-slate-950

                px-5

                text-xs
                font-extrabold
                text-white

                shadow-[0_8px_24px_rgba(15,23,42,0.12)]

                transition-all
                duration-200

                hover:-translate-y-0.5
                hover:bg-[#f07060]
                hover:shadow-[0_10px_28px_rgba(240,112,96,0.22)]
              "
            >
              <PenLine className="size-3.5" />

              Start writing

              <ArrowRight
                className="
                  size-3.5
                  transition-transform
                  group-hover:translate-x-0.5
                "
              />
            </Link>

            <Link
              to="/blogs"
              className="
                inline-flex
                h-11
                items-center
                justify-center
                gap-2

                rounded-full
                border border-slate-200
                bg-white

                px-5

                text-xs
                font-extrabold
                text-slate-700

                shadow-[0_2px_8px_rgba(15,23,42,0.03)]

                transition-all

                hover:border-slate-300
                hover:bg-slate-50
              "
            >
              Explore stories
            </Link>

          </div>

          {/* Small trust line */}

          <div
            className="
              mt-7
              flex
              flex-wrap
              items-center
              gap-3
            "
          >

            {blogs.length > 0 && (
              <div className="flex -space-x-2">
                {blogs.slice(0, 3).map((blog) => (
                  <img
                    key={blog.id}
                    src={getUserAvatar(
                      blog.author?.avatar_url,
                      blog.author?.username ||
                      blog.author?.first_name
                    )}
                    alt=""
                    className="
                      size-7
                      rounded-full
                      border-2 border-[#fcfcfb]
                      bg-slate-100
                      object-cover
                    "
                  />
                ))}
              </div>
            )}

            <p
              className="
                text-[11px]
                font-semibold
                text-slate-400
              "
            >
              Read thoughtfully · Write freely · Share knowledge
            </p>

          </div>

        </div>

        {/* ===================================================
            RIGHT — EDITORIAL PREVIEW
        =================================================== */}

        <div
          className="
            relative
            z-10

            mx-auto
            hidden
            w-full
            max-w-[500px]

            lg:block
          "
        >

          {/* Soft glow */}

          <div
            className="
              absolute
              inset-x-10
              bottom-[-20px]
              h-24
              rounded-full
              bg-[#f07060]/10
              blur-3xl
            "
          />

          {/* Small floating badge */}

          <div
            className="
              absolute
              -left-7
              top-9
              z-20

              flex
              items-center
              gap-2

              rounded-xl
              border border-slate-200/80
              bg-white/95

              px-3
              py-2

              shadow-[0_10px_35px_rgba(15,23,42,0.10)]
              backdrop-blur
            "
          >
            <div
              className="
                flex
                size-7
                items-center
                justify-center
                rounded-lg
                bg-[#fff1ee]
              "
            >
              <TrendingUp className="size-3.5 text-[#f07060]" />
            </div>

            <div>
              <p
                className="
                  text-[9px]
                  font-extrabold
                  uppercase
                  tracking-[0.12em]
                  text-slate-400
                "
              >
                Community
              </p>

              <p
                className="
                  text-[10px]
                  font-extrabold
                  text-slate-800
                "
              >
                Ideas worth reading
              </p>
            </div>

          </div>

          {/* Main story card */}

          <div
            className="
              relative
              overflow-hidden

              rounded-[26px]
              border border-slate-200/80
              bg-white

              shadow-[0_24px_70px_-25px_rgba(15,23,42,0.22)]
            "
          >

            {featured ? (
              <>

                {/* ===============================
                    IMAGE — SECONDARY ELEMENT
                =============================== */}

                <Link
                  to={`/blogs/${featured.id}`}
                  className="
                    group
                    relative
                    block
                    h-[180px]
                    overflow-hidden
                    bg-slate-100
                  "
                >
                  <img
                    src={
                      featured.cover_image ||
                      FALLBACK_COVER
                    }
                    alt={featured.title}
                    loading="eager"
                    onError={(event) => {
                      event.currentTarget.src =
                        FALLBACK_COVER
                    }}
                    className="
                      h-full
                      w-full
                      object-cover

                      transition-transform
                      duration-700

                      group-hover:scale-[1.025]
                    "
                  />

                  <div
                    className="
                      absolute
                      inset-0
                      bg-gradient-to-t
                      from-slate-950/20
                      via-transparent
                      to-transparent
                    "
                  />

                  <div
                    className="
                      absolute
                      left-4
                      top-4

                      rounded-full
                      border border-white/50
                      bg-white/90

                      px-2.5
                      py-1

                      text-[9px]
                      font-extrabold
                      uppercase
                      tracking-[0.12em]
                      text-slate-700

                      shadow-sm
                      backdrop-blur
                    "
                  >
                    Featured
                  </div>

                </Link>

                {/* ===============================
                    ARTICLE INFORMATION
                =============================== */}

                <div className="p-5">

                  {/* Author */}

                  <div
                    className="
                      mb-4
                      flex
                      items-center
                      justify-between
                      gap-4
                    "
                  >

                    <div className="flex min-w-0 items-center gap-2.5">

                      <img
                        src={getUserAvatar(
                          featured.author?.avatar_url,
                          featured.author?.username ||
                          featured.author?.first_name
                        )}
                        alt={featuredAuthor}
                        className="
                          size-8
                          shrink-0
                          rounded-full
                          bg-slate-100
                          object-cover
                        "
                      />

                      <div className="min-w-0">

                        <p
                          className="
                            truncate
                            text-[11px]
                            font-extrabold
                            text-slate-800
                          "
                        >
                          {featuredAuthor}
                        </p>

                        <p
                          className="
                            mt-0.5
                            text-[9px]
                            font-semibold
                            text-slate-400
                          "
                        >
                          BareMind writer
                        </p>

                      </div>
                    </div>

                    <span
                      className="
                        flex
                        shrink-0
                        items-center
                        gap-1.5

                        text-[10px]
                        font-semibold
                        text-slate-400
                      "
                    >
                      <Clock3 className="size-3" />

                      {getReadTime(
                        featured.content || ""
                      )}{" "}
                      min read
                    </span>

                  </div>

                  {/* Title */}

                  <Link
                    to={`/blogs/${featured.id}`}
                    className="group block"
                  >
                    <h2
                      className="
                        line-clamp-2

                        text-[19px]
                        font-black
                        leading-[1.25]
                        tracking-[-0.025em]
                        text-slate-950

                        transition-colors

                        group-hover:text-[#f07060]
                      "
                    >
                      {featured.title}
                    </h2>

                    <p
                      className="
                        mt-2
                        line-clamp-2

                        text-[12px]
                        font-medium
                        leading-5
                        text-slate-500
                      "
                    >
                      {getExcerpt(
                        featured.content || ""
                      )}
                    </p>
                  </Link>

                  {/* Footer */}

                  <div
                    className="
                      mt-4
                      flex
                      items-center
                      justify-between

                      border-t border-slate-100
                      pt-3
                    "
                  >

                    <span
                      className="
                        text-[9px]
                        font-extrabold
                        uppercase
                        tracking-[0.12em]
                        text-[#f07060]
                      "
                    >
                      Featured story
                    </span>

                    <Link
                      to={`/blogs/${featured.id}`}
                      className="
                        group
                        flex
                        items-center
                        gap-1

                        text-[10px]
                        font-extrabold
                        text-slate-600

                        transition-colors

                        hover:text-[#f07060]
                      "
                    >
                      Read story

                      <ArrowRight
                        className="
                          size-3
                          transition-transform
                          group-hover:translate-x-0.5
                        "
                      />
                    </Link>

                  </div>

                </div>

              </>
            ) : (
              /* =============================================
                 LOADING STATE
              ============================================= */

              <div className="animate-pulse">

                <div className="h-[180px] bg-slate-100" />

                <div className="p-5">

                  <div className="flex items-center gap-3">

                    <div className="size-8 rounded-full bg-slate-100" />

                    <div className="space-y-1.5">
                      <div className="h-2.5 w-24 rounded bg-slate-100" />
                      <div className="h-2 w-16 rounded bg-slate-100" />
                    </div>

                  </div>

                  <div className="mt-5 h-5 w-4/5 rounded bg-slate-100" />

                  <div className="mt-2 h-3 w-full rounded bg-slate-100" />

                  <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />

                </div>

              </div>
            )}

          </div>

          {/* Floating writing prompt */}

          <Link
            to="/register"
            className="
              absolute
              -bottom-5
              -right-5
              z-20

              flex
              items-center
              gap-2.5

              rounded-xl
              border border-slate-200/80
              bg-white

              px-3
              py-2.5

              shadow-[0_12px_35px_rgba(15,23,42,0.10)]

              transition-transform

              hover:-translate-y-0.5
            "
          >

            <div
              className="
                flex
                size-8
                items-center
                justify-center

                rounded-lg

                bg-slate-950
                text-white
              "
            >
              <PenLine className="size-3.5" />
            </div>

            <div>
              <p
                className="
                  text-[10px]
                  font-extrabold
                  text-slate-800
                "
              >
                Have something to say?
              </p>

              <p
                className="
                  mt-0.5
                  text-[9px]
                  font-semibold
                  text-slate-400
                "
              >
                Publish your first story
              </p>
            </div>

          </Link>

        </div>

      </section>

      {/* =====================================================
          VERY SMALL BOTTOM DIVIDER
      ===================================================== */}

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </div>

    </main>
  )
}