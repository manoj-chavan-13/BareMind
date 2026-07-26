import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle, ArrowRight, KeyRound, Loader2, Mail } from "lucide-react"
import { authService } from "@/services/authService"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const BRAND = "#E05A47"

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
})
type Values = z.infer<typeof schema>

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  })

  async function onSubmit(values: Values) {
    try {
      setIsLoading(true)
      setError(null)
      const data = await authService.forgotPassword(values.email.trim())
      // Navigate to reset-password page with user_id + email
      navigate("/reset-password", {
        state: { user_id: data.user_id, email: values.email.trim() },
      })
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-md bg-[#fff0ed]">
            <KeyRound className="size-2.5 text-[#E05A47]" />
          </span>
          <span className="text-[8px] font-black uppercase tracking-[0.17em] text-slate-400">
            Password recovery
          </span>
        </div>
        <h1 className="text-[28px] font-black leading-tight tracking-[-0.045em] text-slate-950 sm:text-[32px]">
          Forgot your password?
        </h1>
        <p className="mt-2 max-w-sm text-[11px] font-medium leading-5 text-slate-500">
          Enter your email and we'll send a 6-digit reset code. It expires in 10 minutes.
        </p>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <div className="flex items-start gap-3 rounded-xl border border-red-200/80 bg-red-50/70 px-3.5 py-3">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-red-400" />
              <p className="text-[9px] font-semibold text-red-500">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <FormItem className="space-y-0">
                <FormLabel className="mb-2 block text-[9px] font-extrabold text-slate-700">
                  Email address
                </FormLabel>
                <FormControl>
                  <div className="group relative">
                    <Mail
                      className={`pointer-events-none absolute left-3.5 top-1/2 z-10 size-3.5 -translate-y-1/2 transition-colors
                        ${fieldState.error ? "text-red-400" : "text-slate-400 group-focus-within:text-[#E05A47]"}`}
                    />
                    <input
                      {...field}
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      disabled={isLoading}
                      className={`h-11 w-full rounded-xl border bg-white pl-10 pr-3.5 text-[11px] font-semibold text-slate-800
                        outline-none transition-all duration-200 placeholder:font-medium placeholder:text-slate-300
                        disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70
                        ${fieldState.error
                          ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/5"
                          : "border-slate-200 hover:border-slate-300 focus:border-[#E05A47] focus:ring-4 focus:ring-[#E05A47]/10"
                        }`}
                    />
                  </div>
                </FormControl>
                <FormMessage className="mt-1.5 text-[8px] font-semibold text-red-500" />
              </FormItem>
            )}
          />

          <motion.button
            type="submit"
            disabled={isLoading}
            whileTap={isLoading ? undefined : { scale: 0.985 }}
            className="
              group relative mt-1 flex h-11 w-full items-center justify-center gap-2
              overflow-hidden rounded-xl bg-slate-950 px-4
              text-[10px] font-extrabold text-white
              shadow-[0_5px_18px_rgba(15,23,42,0.12)]
              outline-none transition-all duration-200
              hover:bg-[#E05A47] hover:shadow-[0_8px_24px_rgba(224,90,71,0.20)]
              disabled:cursor-not-allowed disabled:opacity-65
            "
          >
            {isLoading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Sending reset code…
              </>
            ) : (
              <>
                Send reset code
                <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </>
            )}
          </motion.button>
        </form>
      </Form>

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="text-[9px] font-bold text-slate-400 hover:text-[#E05A47] transition-colors"
        >
          ← Back to sign in
        </Link>
      </div>
    </motion.div>
  )
}
