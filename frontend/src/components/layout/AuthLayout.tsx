import { Outlet, Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  ArrowUpRight,
  BookOpenText,
  Feather,
  Sparkles,
} from "lucide-react"

const BRAND = "#E05A47"

const NETWORK_AUTH_BG =
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1600&q=85"

const features = [
  "Write without distractions",
  "Publish beautifully",
  "Build your audience",
]

export default function AuthLayout() {
  return (
    <main className="min-h-screen bg-[#FAFAF9] lg:grid lg:grid-cols-[minmax(420px,0.92fr)_minmax(520px,1.08fr)]">

      {/* =====================================================
          LEFT — BRAND EXPERIENCE
      ===================================================== */}

      <aside
        className="
          relative hidden
          min-h-screen
          overflow-hidden
          bg-slate-950
          lg:flex
          lg:flex-col
          lg:justify-between
        "
      >
        {/* =================================================
            BACKGROUND
        ================================================= */}

        <div className="absolute inset-0">
          <img
            src={NETWORK_AUTH_BG}
            alt=""
            className="
              h-full w-full
              object-cover
              object-center
              opacity-55
            "
          />

          {/* Dark editorial overlay */}

          <div
            className="
              absolute inset-0
              bg-gradient-to-b
              from-slate-950/45
              via-slate-950/55
              to-slate-950/95
            "
          />

          {/* BareMind coral atmosphere */}

          <div
            className="
              absolute inset-0
              bg-gradient-to-br
              from-[#E05A47]/30
              via-transparent
              to-slate-950/20
            "
          />

          <div
            className="
              absolute -left-40 top-[25%]
              size-[420px]
              rounded-full
              bg-[#f07060]/20
              blur-[120px]
            "
          />

          <div
            className="
              absolute -bottom-40 right-[-100px]
              size-[420px]
              rounded-full
              bg-orange-300/10
              blur-[120px]
            "
          />

          {/* subtle texture */}

          <div
            className="
              absolute inset-0
              opacity-[0.035]
              [background-image:radial-gradient(white_1px,transparent_1px)]
              [background-size:22px_22px]
            "
          />
        </div>

        {/* =================================================
            TOP
        ================================================= */}

        <div
          className="
            relative z-10
            flex items-center
            justify-between
            px-8 pt-8
            xl:px-10 xl:pt-9
          "
        >
          <Link
            to="/"
            className="
              group
              inline-flex
              items-center
              gap-2.5
            "
          >
            <div
              className="
                flex size-9
                items-center justify-center
                rounded-xl
                border border-white/15
                bg-white/95
                p-1.5
                shadow-lg
                shadow-black/10
                transition-transform
                group-hover:-rotate-3
              "
            >
              <img
                src="/BareMind.png"
                alt="BareMind"
                className="h-full w-full object-contain"
              />
            </div>

            <img
              src="/baremind-text.png"
              alt="BareMind"
              className="
                h-[22px]
                w-auto
                brightness-0 invert
              "
            />
          </Link>

          <Link
            to="/blogs"
            className="
              group
              flex items-center
              gap-1.5
              text-[9px]
              font-bold
              text-white/60
              transition
              hover:text-white
            "
          >
            Explore stories

            <ArrowUpRight
              className="
                size-3
                transition-transform
                group-hover:-translate-y-0.5
                group-hover:translate-x-0.5
              "
            />
          </Link>
        </div>

        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <div
          className="
            relative z-10
            px-8
            pb-8
            xl:px-10
            xl:pb-10
          "
        >
          <motion.div
            initial={{
              opacity: 0,
              y: 16,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
              ease: "easeOut",
            }}
            className="max-w-[500px]"
          >
            {/* eyebrow */}

            <div
              className="
                mb-5
                inline-flex
                items-center
                gap-2
                rounded-full
                border border-white/15
                bg-white/[0.08]
                px-3 py-1.5
                backdrop-blur-md
              "
            >
              <Sparkles className="size-3 text-[#ffb1a6]" />

              <span
                className="
                  text-[8px]
                  font-black
                  uppercase
                  tracking-[0.16em]
                  text-white/75
                "
              >
                Ideas worth sharing
              </span>
            </div>

            {/* heading */}

            <h1
              className="
                max-w-[470px]
                text-[36px]
                font-black
                leading-[1.04]
                tracking-[-0.05em]
                text-white
                xl:text-[44px]
              "
            >
              A better place
              <br />

              <span className="text-white/55">
                for thoughtful writing.
              </span>
            </h1>

            <p
              className="
                mt-5
                max-w-[440px]
                text-[12px]
                font-medium
                leading-6
                text-white/65
                xl:text-[13px]
              "
            >
              BareMind gives developers, builders and curious
              minds a focused place to write clearly, publish
              beautifully, and share ideas that matter.
            </p>

            {/* =============================================
                FEATURE STRIP
            ============================================= */}

            <div
              className="
                mt-8
                flex
                flex-wrap
                items-center
                gap-x-5 gap-y-3
              "
            >
              {features.map((feature, index) => (
                <div
                  key={feature}
                  className="flex items-center gap-2"
                >
                  <span
                    className="
                      flex size-5
                      items-center justify-center
                      rounded-full
                      border border-white/15
                      bg-white/10
                    "
                  >
                    {index === 0 ? (
                      <Feather className="size-2.5 text-white/80" />
                    ) : index === 1 ? (
                      <BookOpenText className="size-2.5 text-white/80" />
                    ) : (
                      <Sparkles className="size-2.5 text-white/80" />
                    )}
                  </span>

                  <span
                    className="
                      text-[9px]
                      font-bold
                      text-white/65
                    "
                  >
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            {/* =============================================
                EDITORIAL CARD
            ============================================= */}

            <div
              className="
                mt-9
                max-w-[450px]
                rounded-2xl
                border border-white/[0.13]
                bg-white/[0.075]
                p-4
                shadow-[0_20px_60px_rgba(0,0,0,0.12)]
                backdrop-blur-xl
              "
            >
              <div className="flex items-start gap-3">
                <div
                  className="
                    mt-0.5
                    flex size-8
                    shrink-0
                    items-center justify-center
                    rounded-xl
                    bg-white/10
                  "
                >
                  <Feather className="size-3.5 text-[#ffc0b7]" />
                </div>

                <div>
                  <p
                    className="
                      text-[8px]
                      font-black
                      uppercase
                      tracking-[0.15em]
                      text-white/40
                    "
                  >
                    Built for writers
                  </p>

                  <p
                    className="
                      mt-1.5
                      text-[11px]
                      font-bold
                      leading-5
                      text-white/85
                    "
                  >
                    Your ideas deserve more than a text box.
                  </p>

                  <p
                    className="
                      mt-1
                      text-[9px]
                      font-medium
                      leading-4
                      text-white/50
                    "
                  >
                    Draft, refine and publish from a writing
                    experience designed to stay out of your way.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div
          className="
            relative z-10
            flex items-center
            justify-between
            border-t border-white/[0.08]
            px-8 py-5
            xl:px-10
          "
        >
          <p
            className="
              text-[8px]
              font-semibold
              text-white/35
            "
          >
            © {new Date().getFullYear()} BareMind
          </p>

          <div
            className="
              flex items-center
              gap-4
              text-[8px]
              font-semibold
              text-white/35
            "
          >
            <span>Write</span>
            <span className="size-0.5 rounded-full bg-white/30" />
            <span>Publish</span>
            <span className="size-0.5 rounded-full bg-white/30" />
            <span>Connect</span>
          </div>
        </div>
      </aside>

      {/* =====================================================
          RIGHT — AUTHENTICATION
      ===================================================== */}

      <section
        className="
          relative
          flex min-h-screen
          min-w-0
          flex-col
          bg-[#FCFCFB]
        "
      >
        {/* subtle background */}

        <div
          className="
            pointer-events-none
            absolute right-0 top-0
            size-[360px]
            rounded-full
            bg-[#f07060]/[0.035]
            blur-[100px]
          "
        />

        {/* =================================================
            MOBILE HEADER
        ================================================= */}

        <header
          className="
            relative z-10
            flex h-16
            items-center
            justify-between
            border-b border-slate-200/70
            bg-white/80
            px-4
            backdrop-blur-xl
            sm:px-6
            lg:hidden
          "
        >
          <Link
            to="/"
            className="flex items-center gap-2"
          >
            <img
              src="/BareMind.png"
              alt="BareMind"
              className="size-8 object-contain"
            />

            <img
              src="/baremind-text.png"
              alt="BareMind"
              className="h-5 w-auto object-contain"
            />
          </Link>

          <Link
            to="/blogs"
            className="
              flex items-center
              gap-1
              text-[9px]
              font-extrabold
              text-slate-500
              transition
              hover:text-[#E05A47]
            "
          >
            Explore

            <ArrowUpRight className="size-3" />
          </Link>
        </header>

        {/* =================================================
            FORM AREA
        ================================================= */}

        <div
          className="
            relative z-10
            flex flex-1
            items-center
            justify-center
            px-4
            py-10
            sm:px-8
            sm:py-14
            lg:px-12
            xl:px-20
          "
        >
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.4,
              ease: "easeOut",
            }}
            className="
              w-full
              max-w-[400px]
            "
          >
            <Outlet />
          </motion.div>
        </div>

        {/* =================================================
            RIGHT FOOTER
        ================================================= */}

        <footer
          className="
            relative z-10
            flex
            items-center
            justify-center
            gap-3
            px-6
            pb-5
            text-[8px]
            font-semibold
            text-slate-400
            sm:pb-6
          "
        >
          <Link
            to="/"
            className="transition hover:text-slate-700"
          >
            BareMind
          </Link>

          <span className="size-0.5 rounded-full bg-slate-300" />

          <span>Thoughts deserve space.</span>
        </footer>
      </section>
    </main>
  )
}