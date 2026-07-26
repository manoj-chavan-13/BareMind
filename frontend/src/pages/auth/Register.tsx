import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { AnimatePresence, motion } from "framer-motion"

import {
  AlertCircle,
  ArrowRight,
  AtSign,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Loader2,
  Mail,
  User,
} from "lucide-react"

import { authService } from "@/services/authService"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

/* =========================================================
   VALIDATION
========================================================= */

const registerSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(2, "First name is required"),

  last_name: z
    .string()
    .trim()
    .min(2, "Last name is required"),

  username: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Only letters, numbers and underscores"
    ),

  email: z
    .string()
    .trim()
    .email("Enter a valid email address"),

  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .regex(/[A-Z]/, "Include an uppercase letter")
    .regex(/[0-9]/, "Include a number"),
})

type RegisterValues = z.infer<typeof registerSchema>

/* =========================================================
   COMPONENT
========================================================= */

export default function Register() {
  const navigate = useNavigate()

  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle")

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),

    defaultValues: {
      first_name: "",
      last_name: "",
      username: "",
      email: "",
      password: "",
    },
  })

  const password = form.watch("password") || ""

  const passwordRules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  }

  const passedRules = Object.values(passwordRules).filter(Boolean).length

  /* =======================================================
     USERNAME AVAILABILITY CHECK
  ======================================================= */
  const watchUsername = form.watch("username")

  useEffect(() => {
    if (!watchUsername || watchUsername.length < 3 || !/^[a-zA-Z0-9_]+$/.test(watchUsername)) {
      setUsernameStatus("idle")
      return
    }

    setUsernameStatus("checking")
    const timer = setTimeout(async () => {
      try {
        const { available } = await authService.checkUsername(watchUsername)
        setUsernameStatus(available ? "available" : "taken")
      } catch (e) {
        setUsernameStatus("idle")
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [watchUsername])

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function onSubmit(values: RegisterValues) {
    try {
      setIsLoading(true)
      setError(null)

      const data = await authService.register({
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        username: values.username.trim(),
        email: values.email.trim(),
        password: values.password,
      })

      // Redirect to OTP verification — pass user_id and email via router state
      navigate("/verify-email", {
        state: { user_id: data.user_id, email: data.email },
      })
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        "We couldn't create your account. Please try again."
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        ease: "easeOut",
      }}
      className="w-full"
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-7">
        <p
          className="
            mb-2
            text-xs
            font-bold
            uppercase
            tracking-[0.14em]
            text-[#E05A47]
          "
        >
          Join BareMind
        </p>

        <h1
          className="
            text-3xl
            font-black
            tracking-[-0.04em]
            text-slate-950
            sm:text-[32px]
          "
        >
          Create your account
        </h1>

        <p
          className="
            mt-2
            text-sm
            leading-6
            text-slate-500
          "
        >
          Start writing, publishing, and connecting with
          people who care about great ideas.
        </p>
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{
              opacity: 0,
              y: -5,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
            }}
            className="
              mb-5
              flex
              items-start
              gap-3
              rounded-xl
              border border-red-200
              bg-red-50
              px-4 py-3
            "
          >
            <AlertCircle
              className="
                mt-0.5
                size-4
                shrink-0
                text-red-500
              "
            />

            <div>
              <p className="text-xs font-bold text-red-700">
                Account creation failed
              </p>

              <p
                className="
                  mt-0.5
                  text-xs
                  leading-5
                  text-red-600
                "
              >
                {error}
              </p>
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
          noValidate
          className="space-y-4"
        >
          {/* =================================================
              NAME ROW
          ================================================= */}

          <div
            className="
              grid
              grid-cols-1
              gap-4
              sm:grid-cols-2
            "
          >
            <FormField
              control={form.control}
              name="first_name"
              render={({ field, fieldState }) => (
                <FormItem className="space-y-0">
                  <FormLabel className={labelClass}>
                    First name
                  </FormLabel>

                  <FormControl>
                    <div className="group relative">
                      <User
                        className={iconClass(
                          !!fieldState.error
                        )}
                      />

                      <input
                        {...field}
                        type="text"
                        autoComplete="given-name"
                        placeholder="John"
                        disabled={isLoading}
                        className={inputClass(
                          !!fieldState.error
                        )}
                      />
                    </div>
                  </FormControl>

                  <FormMessage className={messageClass} />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="last_name"
              render={({ field, fieldState }) => (
                <FormItem className="space-y-0">
                  <FormLabel className={labelClass}>
                    Last name
                  </FormLabel>

                  <FormControl>
                    <div className="group relative">
                      <User
                        className={iconClass(
                          !!fieldState.error
                        )}
                      />

                      <input
                        {...field}
                        type="text"
                        autoComplete="family-name"
                        placeholder="Doe"
                        disabled={isLoading}
                        className={inputClass(
                          !!fieldState.error
                        )}
                      />
                    </div>
                  </FormControl>

                  <FormMessage className={messageClass} />
                </FormItem>
              )}
            />
          </div>

          {/* =================================================
              USERNAME
          ================================================= */}

          <FormField
            control={form.control}
            name="username"
            render={({ field, fieldState }) => (
              <FormItem className="space-y-0">
                <div
                  className="
                    mb-2
                    flex
                    items-center
                    justify-between
                  "
                >
                  <FormLabel className="text-xs font-bold text-slate-700">
                    Username
                  </FormLabel>

                  <span
                    className="
                      hidden
                      text-[11px]
                      font-medium
                      text-slate-400
                      sm:block
                    "
                  >
                    Your public handle
                  </span>
                </div>

                <FormControl>
                  <div className="group relative">
                    <AtSign
                      className={iconClass(
                        !!fieldState.error
                      )}
                    />

                    <input
                      {...field}
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="john_doe"
                      disabled={isLoading}
                      className={inputClass(
                        !!fieldState.error || usernameStatus === "taken"
                      )}
                    />

                    {/* Feedback Indicator */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                      {usernameStatus === "checking" && <Loader2 className="size-4 animate-spin text-slate-400" />}
                      {usernameStatus === "available" && <Check className="size-4 text-emerald-500" />}
                    </div>
                  </div>
                </FormControl>

                <FormMessage className={messageClass} />
                {usernameStatus === "taken" && !fieldState.error && (
                  <p className="mt-1.5 text-[13px] font-medium text-red-500">
                    This username is already taken.
                  </p>
                )}
                {usernameStatus === "available" && !fieldState.error && (
                  <p className="mt-1.5 text-[13px] font-medium text-emerald-600">
                    Username is available!
                  </p>
                )}
              </FormItem>
            )}
          />

          {/* =================================================
              EMAIL
          ================================================= */}

          <FormField
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <FormItem className="space-y-0">
                <FormLabel className={labelClass}>
                  Email address
                </FormLabel>

                <FormControl>
                  <div className="group relative">
                    <Mail
                      className={iconClass(
                        !!fieldState.error
                      )}
                    />

                    <input
                      {...field}
                      type="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="john@example.com"
                      disabled={isLoading}
                      className={inputClass(
                        !!fieldState.error
                      )}
                    />
                  </div>
                </FormControl>

                <FormMessage className={messageClass} />
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
                <FormLabel className={labelClass}>
                  Password
                </FormLabel>

                <FormControl>
                  <div className="group relative">
                    <LockKeyhole
                      className={iconClass(
                        !!fieldState.error
                      )}
                    />

                    <input
                      {...field}
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="new-password"
                      placeholder="Create a secure password"
                      disabled={isLoading}
                      className={`
                        ${inputClass(
                        !!fieldState.error
                      )}
                        pr-12
                      `}
                    />

                    <button
                      type="button"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      onClick={() =>
                        setShowPassword(
                          (current) => !current
                        )
                      }
                      className="
                        absolute
                        right-2.5
                        top-1/2

                        flex size-8
                        -translate-y-1/2
                        items-center
                        justify-center

                        rounded-lg

                        text-slate-400

                        transition

                        hover:bg-slate-100
                        hover:text-slate-700

                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-[#E05A47]/20
                      "
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </FormControl>

                <FormMessage className={messageClass} />

                {/* ===========================================
                    PASSWORD REQUIREMENTS
                =========================================== */}

                {password.length > 0 && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -3,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    className="
                      mt-3
                      rounded-xl
                      border border-slate-200
                      bg-slate-50/70
                      p-3
                    "
                  >
                    {/* Strength bar */}

                    <div className="flex gap-1.5">
                      {[1, 2, 3].map((item) => (
                        <div
                          key={item}
                          className={`
                            h-1
                            flex-1
                            rounded-full
                            transition-colors
                            duration-300

                            ${item <= passedRules
                              ? passedRules === 3
                                ? "bg-emerald-500"
                                : "bg-[#E05A47]"
                              : "bg-slate-200"
                            }
                          `}
                        />
                      ))}
                    </div>

                    {/* Rules */}

                    <div
                      className="
                        mt-3
                        flex
                        flex-wrap
                        gap-x-4
                        gap-y-2
                      "
                    >
                      <PasswordRule
                        valid={passwordRules.length}
                      >
                        8+ characters
                      </PasswordRule>

                      <PasswordRule
                        valid={passwordRules.uppercase}
                      >
                        Uppercase letter
                      </PasswordRule>

                      <PasswordRule
                        valid={passwordRules.number}
                      >
                        Number
                      </PasswordRule>
                    </div>
                  </motion.div>
                )}
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
                : { scale: 0.99 }
            }
            className="
              group

              mt-2

              flex h-11
              w-full
              items-center
              justify-center
              gap-2

              rounded-xl

              bg-slate-950

              px-5

              text-sm
              font-bold
              text-white

              shadow-[0_6px_20px_rgba(15,23,42,0.12)]

              transition-all
              duration-200

              hover:bg-[#E05A47]
              hover:shadow-[0_8px_24px_rgba(224,90,71,0.18)]

              focus-visible:outline-none
              focus-visible:ring-4
              focus-visible:ring-[#E05A47]/15

              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                Create account

                <ArrowRight
                  className="
                    size-4
                    transition-transform
                    group-hover:translate-x-0.5
                  "
                />
              </>
            )}
          </motion.button>
        </form>
      </Form>

      {/* =====================================================
          TERMS
      ===================================================== */}

      <p
        className="
          mt-4
          text-center
          text-[11px]
          leading-5
          text-slate-400
        "
      >
        By creating an account, you agree to our{" "}

        <Link
          to="/terms"
          className="
            font-semibold
            text-slate-600
            transition
            hover:text-[#E05A47]
          "
        >
          Terms
        </Link>

        {" "}and{" "}

        <Link
          to="/privacy"
          className="
            font-semibold
            text-slate-600
            transition
            hover:text-[#E05A47]
          "
        >
          Privacy Policy
        </Link>
        .
      </p>

      {/* =====================================================
          LOGIN SWITCH
      ===================================================== */}

      <div
        className="
          mt-6
          border-t border-slate-200
          pt-5
          text-center
        "
      >
        <p className="text-sm text-slate-500">
          Already have an account?{" "}

          <Link
            to="/login"
            className="
              font-bold
              text-slate-900
              transition-colors
              hover:text-[#E05A47]
            "
          >
            Sign in
          </Link>
        </p>
      </div>
    </motion.div>
  )
}

/* =========================================================
   SHARED FIELD STYLES
========================================================= */

const labelClass =
  "mb-2 block text-xs font-bold text-slate-700"

const messageClass =
  "mt-1.5 text-[11px] font-medium text-red-500"

function inputClass(hasError: boolean) {
  return `
    h-11
    w-full

    rounded-xl
    border

    bg-white

    pl-10
    pr-4

    text-sm
    font-medium
    text-slate-900

    outline-none

    transition-all
    duration-200

    placeholder:text-slate-400
    placeholder:font-normal

    disabled:cursor-not-allowed
    disabled:bg-slate-50
    disabled:text-slate-500

    ${hasError
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
  `
}

function iconClass(hasError: boolean) {
  return `
    pointer-events-none

    absolute
    left-3.5
    top-1/2

    size-4
    -translate-y-1/2

    transition-colors

    ${hasError
      ? "text-red-400"
      : `
          text-slate-400
          group-focus-within:text-[#E05A47]
        `
    }
  `
}

/* =========================================================
   PASSWORD RULE
========================================================= */

function PasswordRule({
  valid,
  children,
}: {
  valid: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={`
        flex
        items-center
        gap-1.5

        text-[11px]
        font-medium

        transition-colors

        ${valid
          ? "text-emerald-600"
          : "text-slate-400"
        }
      `}
    >
      <span
        className={`
          flex size-4
          items-center
          justify-center

          rounded-full

          ${valid
            ? "bg-emerald-100"
            : "bg-slate-200"
          }
        `}
      >
        <Check
          className={`
            size-2.5

            ${valid
              ? "text-emerald-600"
              : "text-slate-400"
            }
          `}
        />
      </span>

      {children}
    </span>
  )
}