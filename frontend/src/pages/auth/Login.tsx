import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useDispatch } from "react-redux"
import { motion, AnimatePresence } from "framer-motion"

import {
  AlertCircle,
  ArrowRight,
  AtSign,
  Eye,
  EyeOff,
  LockKeyhole,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react"

import { setCredentials } from "@/store/slices/authSlice"
import { authService } from "@/services/authService"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const BRAND = "#E05A47"

/* =========================================================
   VALIDATION
========================================================= */

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(3, {
      message: "Enter your email or username.",
    }),

  password: z
    .string()
    .min(6, {
      message: "Password must contain at least 6 characters.",
    }),
})

type LoginValues = z.infer<typeof loginSchema>

/* =========================================================
   LOGIN
========================================================= */

export default function Login() {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const [error, setError] = useState<string | null>(null)

  const [showPassword, setShowPassword] =
    useState(false)

  const [isLoading, setIsLoading] =
    useState(false)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),

    defaultValues: {
      email: "",
      password: "",
    },
  })

  const identityValue = form.watch("email")

  const looksLikeEmail =
    identityValue.includes("@") &&
    !identityValue.startsWith("@")

  /* =======================================================
     LOGIN
  ======================================================= */

  async function onSubmit(values: LoginValues) {
    try {
      setIsLoading(true)
      setError(null)

      const data = await authService.login({
        email: values.email.trim(),
        password: values.password,
      })

      // Pass the new access token to getMe since Redux store hasn't updated yet
      const user = await authService.getMe(data.access_token)

      dispatch(
        setCredentials({
          user,
          token: data.access_token,
        })
      )

      navigate("/dashboard")
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        "The email, username, or password you entered is incorrect."
      )
    } finally {
      setIsLoading(false)
    }
  }


  /* =======================================================
     UI
  ======================================================= */

  return (
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
      className="w-full"
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-8 sm:mb-9">

        {/* Eyebrow */}

        <div className="mb-4 flex items-center gap-2">
          <span
            className="
              flex size-5
              items-center justify-center
              rounded-md
              bg-[#fff0ed]
            "
          >
            <LockKeyhole
              className="
                size-2.5
                text-[#E05A47]
              "
            />
          </span>

          <span
            className="
              text-[8px]
              font-black
              uppercase
              tracking-[0.17em]
              text-slate-400
            "
          >
            Member access
          </span>
        </div>

        {/* Title */}

        <h1
          className="
            text-[28px]
            font-black
            leading-tight
            tracking-[-0.045em]
            text-slate-950

            sm:text-[32px]
          "
        >
          Welcome back.
        </h1>

        <p
          className="
            mt-2
            max-w-sm
            text-[11px]
            font-medium
            leading-5
            text-slate-500
          "
        >
          Sign in to continue writing, publishing, and
          exploring BareMind.
        </p>
      </div>

      {/* =====================================================
          SERVER ERROR
      ===================================================== */}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{
              opacity: 0,
              y: -5,
              height: 0,
            }}
            animate={{
              opacity: 1,
              y: 0,
              height: "auto",
            }}
            exit={{
              opacity: 0,
              height: 0,
            }}
            className="overflow-hidden"
          >
            <div
              className="
                mb-5
                flex items-start
                gap-3
                rounded-xl
                border border-red-200/80
                bg-red-50/70
                px-3.5 py-3
              "
            >
              <div
                className="
                  mt-0.5
                  flex size-6
                  shrink-0
                  items-center justify-center
                  rounded-full
                  bg-red-100
                "
              >
                <AlertCircle
                  className="
                    size-3
                    text-red-500
                  "
                />
              </div>

              <div className="min-w-0">
                <p
                  className="
                    text-[9px]
                    font-extrabold
                    text-red-700
                  "
                >
                  We couldn't sign you in
                </p>

                <p
                  className="
                    mt-0.5
                    text-[9px]
                    font-medium
                    leading-4
                    text-red-500
                  "
                >
                  {error}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================
          FORM
      ===================================================== */}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          {/* =================================================
              EMAIL / USERNAME
          ================================================= */}

          <FormField
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <FormItem className="space-y-0">
                <FormLabel
                  className="
                    mb-2
                    block
                    text-[9px]
                    font-extrabold
                    text-slate-700
                  "
                >
                  Email or username
                </FormLabel>

                <FormControl>
                  <div className="group relative">

                    {/* Icon */}

                    <div
                      className="
                        pointer-events-none
                        absolute
                        left-3.5
                        top-1/2
                        z-10
                        -translate-y-1/2
                      "
                    >
                      {looksLikeEmail ? (
                        <Mail
                          className={`
                            size-3.5
                            transition-colors

                            ${fieldState.error
                              ? "text-red-400"
                              : "text-slate-400 group-focus-within:text-[#E05A47]"
                            }
                          `}
                        />
                      ) : (
                        <AtSign
                          className={`
                            size-3.5
                            transition-colors

                            ${fieldState.error
                              ? "text-red-400"
                              : "text-slate-400 group-focus-within:text-[#E05A47]"
                            }
                          `}
                        />
                      )}
                    </div>

                    <input
                      {...field}
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="you@example.com or username"
                      disabled={isLoading}
                      className={`
                        h-11
                        w-full

                        rounded-xl

                        border

                        bg-white

                        pl-10
                        pr-3.5

                        text-[11px]
                        font-semibold
                        text-slate-800

                        outline-none

                        transition-all
                        duration-200

                        placeholder:font-medium
                        placeholder:text-slate-300

                        disabled:cursor-not-allowed
                        disabled:bg-slate-50
                        disabled:opacity-70

                        ${fieldState.error
                          ? `
                              border-red-300
                              focus:border-red-400
                              focus:ring-4
                              focus:ring-red-500/5
                            `
                          : `
                              border-slate-200
                              hover:border-slate-300
                              focus:border-[#E05A47]
                              focus:ring-4
                              focus:ring-[#E05A47]/10
                            `
                        }
                      `}
                    />
                  </div>
                </FormControl>

                <FormMessage
                  className="
                    mt-1.5
                    text-[8px]
                    font-semibold
                    text-red-500
                  "
                />
              </FormItem>
            )}
          />

          {/* =================================================
              PASSWORD
          ================================================= */}

          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <FormItem className="space-y-0">

                {/* Label */}

                <div
                  className="
                    mb-2
                    flex
                    items-center
                    justify-between
                    gap-3
                  "
                >
                  <FormLabel
                    className="
                      text-[9px]
                      font-extrabold
                      text-slate-700
                    "
                  >
                    Password
                  </FormLabel>

                  {/*
                    Change this to:
                    <Link to="/forgot-password">...
                    once the route exists.
                  */}

                  <Link
                    to="/forgot-password"
                    className="
                      text-[8px]
                      font-extrabold
                      text-slate-400
                      transition-colors
                      hover:text-[#E05A47]
                    "
                  >
                    Forgot password?
                  </Link>
                </div>

                <FormControl>
                  <div className="group relative">
                    <LockKeyhole
                      className={`
                        pointer-events-none
                        absolute
                        left-3.5
                        top-1/2
                        z-10
                        size-3.5
                        -translate-y-1/2
                        transition-colors

                        ${fieldState.error
                          ? "text-red-400"
                          : "text-slate-400 group-focus-within:text-[#E05A47]"
                        }
                      `}
                    />

                    <input
                      {...field}
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      disabled={isLoading}
                      className={`
                        h-11
                        w-full

                        rounded-xl

                        border

                        bg-white

                        pl-10
                        pr-11

                        text-[11px]
                        font-semibold
                        text-slate-800

                        outline-none

                        transition-all
                        duration-200

                        placeholder:font-medium
                        placeholder:text-slate-300

                        disabled:cursor-not-allowed
                        disabled:bg-slate-50
                        disabled:opacity-70

                        ${fieldState.error
                          ? `
                              border-red-300
                              focus:border-red-400
                              focus:ring-4
                              focus:ring-red-500/5
                            `
                          : `
                              border-slate-200
                              hover:border-slate-300
                              focus:border-[#E05A47]
                              focus:ring-4
                              focus:ring-[#E05A47]/10
                            `
                        }
                      `}
                    />

                    {/* Show password */}

                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      onClick={() =>
                        setShowPassword(
                          (previous) => !previous
                        )
                      }
                      className="
                        absolute
                        right-2
                        top-1/2

                        flex size-7
                        -translate-y-1/2
                        items-center
                        justify-center

                        rounded-lg

                        text-slate-400

                        transition-all

                        hover:bg-slate-100
                        hover:text-slate-700
                      "
                    >
                      {showPassword ? (
                        <EyeOff className="size-3.5" />
                      ) : (
                        <Eye className="size-3.5" />
                      )}
                    </button>
                  </div>
                </FormControl>

                <FormMessage
                  className="
                    mt-1.5
                    text-[8px]
                    font-semibold
                    text-red-500
                  "
                />
              </FormItem>
            )}
          />

          {/* =================================================
              SUBMIT
          ================================================= */}

          <motion.button
            type="submit"
            disabled={isLoading}
            whileTap={
              isLoading
                ? undefined
                : { scale: 0.985 }
            }
            className="
              group

              relative

              mt-1
              flex h-11
              w-full
              items-center
              justify-center

              gap-2

              overflow-hidden

              rounded-xl

              bg-slate-950

              px-4

              text-[10px]
              font-extrabold
              text-white

              shadow-[0_5px_18px_rgba(15,23,42,0.12)]

              outline-none

              transition-all
              duration-200

              hover:bg-[#E05A47]
              hover:shadow-[0_8px_24px_rgba(224,90,71,0.20)]

              focus-visible:ring-4
              focus-visible:ring-[#E05A47]/15

              disabled:cursor-not-allowed
              disabled:opacity-65
            "
          >
            {isLoading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />

                Signing in...
              </>
            ) : (
              <>
                Sign in to BareMind

                <ArrowRight
                  className="
                    size-3.5
                    transition-transform
                    duration-200
                    group-hover:translate-x-0.5
                  "
                />
              </>
            )}
          </motion.button>
        </form>
      </Form>

      {/* =====================================================
          SECURITY NOTE
      ===================================================== */}

      <div
        className="
          mt-4
          flex
          items-center
          justify-center
          gap-1.5
        "
      >
        <ShieldCheck className="size-3 text-slate-300" />

        <span
          className="
            text-[8px]
            font-medium
            text-slate-400
          "
        >
          Secure sign-in to your BareMind account
        </span>
      </div>

      {/* =====================================================
          REGISTER
      ===================================================== */}

      <div
        className="
          my-7
          flex
          items-center
          gap-3
        "
      >
        <div className="h-px flex-1 bg-slate-200/80" />

        <span
          className="
            text-[7px]
            font-black
            uppercase
            tracking-[0.14em]
            text-slate-300
          "
        >
          New to BareMind?
        </span>

        <div className="h-px flex-1 bg-slate-200/80" />
      </div>

      <Link
        to="/register"
        className="
          group

          flex h-11
          w-full
          items-center
          justify-center

          gap-1.5

          rounded-xl

          border border-slate-200

          bg-white

          text-[10px]
          font-extrabold
          text-slate-600

          shadow-[0_1px_2px_rgba(15,23,42,0.02)]

          transition-all
          duration-200

          hover:border-slate-300
          hover:bg-slate-50
          hover:text-slate-950
        "
      >
        Create a free account

        <ArrowRight
          className="
            size-3
            text-slate-300

            transition-all

            group-hover:translate-x-0.5
            group-hover:text-[#E05A47]
          "
        />
      </Link>

      {/* =====================================================
          LEGAL
      ===================================================== */}

      <p
        className="
          mx-auto
          mt-6
          max-w-[320px]
          text-center
          text-[8px]
          font-medium
          leading-4
          text-slate-400
        "
      >
        By continuing, you agree to BareMind's{" "}

        <Link
          to="/terms"
          className="
            font-bold
            text-slate-500
            underline
            decoration-slate-200
            underline-offset-2
            transition
            hover:text-slate-900
          "
        >
          Terms
        </Link>

        {" "}and{" "}

        <Link
          to="/privacy"
          className="
            font-bold
            text-slate-500
            underline
            decoration-slate-200
            underline-offset-2
            transition
            hover:text-slate-900
          "
        >
          Privacy Policy
        </Link>
        .
      </p>
    </motion.div>
  )
}