import { useState, useRef, useEffect } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react"
import { authService } from "@/services/authService"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const OTP_LENGTH = 6

const schema = z.object({
  new_password: z
    .string()
    .min(8, "Use at least 8 characters")
    .regex(/[A-Z]/, "Include an uppercase letter")
    .regex(/[0-9]/, "Include a number"),
})
type Values = z.infer<typeof schema>

export default function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { user_id?: string; email?: string } | null

  const userId = state?.user_id || ""
  const email = state?.email || ""

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""))
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => { inputRefs.current[0]?.focus() }, [])

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { new_password: "" },
  })

  if (!userId) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="text-sm text-slate-500">No reset session found.</p>
        <Link to="/forgot-password" className="text-[#E05A47] text-sm font-bold hover:underline">
          Request a new reset code
        </Link>
      </div>
    )
  }

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newDigits = [...digits]
    newDigits[index] = value.slice(-1)
    setDigits(newDigits)
    setError(null)
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH)
    const newDigits = [...digits]
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i]
    setDigits(newDigits)
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
  }

  const otp = digits.join("")

  async function onSubmit(values: Values) {
    if (otp.length < OTP_LENGTH) {
      setError("Please enter the 6-digit code from your email.")
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      await authService.resetPassword(userId, otp, values.new_password)
      setSuccess(true)
      setTimeout(() => navigate("/login"), 2500)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Reset failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const password = form.watch("new_password") || ""
  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
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
            Reset password
          </span>
        </div>
        <h1 className="text-[28px] font-black leading-tight tracking-[-0.045em] text-slate-950 sm:text-[32px]">
          Set a new password.
        </h1>
        <p className="mt-2 max-w-sm text-[11px] font-medium leading-5 text-slate-500">
          Enter the 6-digit code sent to{" "}
          <span className="font-bold text-slate-700">{email || "your email"}</span>{" "}
          and choose a new password.
        </p>
      </div>

      {/* Success */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-3.5 py-3"
          >
            <CheckCircle2 className="size-4 shrink-0 text-green-500" />
            <p className="text-[10px] font-bold text-green-700">
              Password reset! Redirecting to login…
            </p>
          </motion.div>
        )}
      </AnimatePresence>

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
          {/* OTP digits */}
          <div>
            <p className="mb-2 text-[9px] font-extrabold text-slate-700">Reset code</p>
            <div className="flex justify-between gap-2" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  disabled={isLoading || success}
                  style={{ height: "52px" }}
                  className={`
                    w-full rounded-xl border bg-white text-center text-[22px] font-black text-slate-950
                    outline-none transition-all duration-150 disabled:opacity-60
                    ${digit
                      ? "border-[#E05A47] ring-4 ring-[#E05A47]/10"
                      : "border-slate-200 hover:border-slate-300 focus:border-[#E05A47] focus:ring-4 focus:ring-[#E05A47]/10"
                    }
                  `}
                />
              ))}
            </div>
          </div>

          {/* New password */}
          <FormField
            control={form.control}
            name="new_password"
            render={({ field, fieldState }) => (
              <FormItem className="space-y-0">
                <FormLabel className="mb-2 block text-[9px] font-extrabold text-slate-700">
                  New password
                </FormLabel>
                <FormControl>
                  <div className="group relative">
                    <input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      disabled={isLoading || success}
                      className={`h-11 w-full rounded-xl border bg-white pl-3.5 pr-11 text-[11px] font-semibold text-slate-800
                        outline-none transition-all duration-200 placeholder:font-medium placeholder:text-slate-300
                        disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70
                        ${fieldState.error
                          ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/5"
                          : "border-slate-200 hover:border-slate-300 focus:border-[#E05A47] focus:ring-4 focus:ring-[#E05A47]/10"
                        }`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"
                    >
                      {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="mt-1.5 text-[8px] font-semibold text-red-500" />

                {/* Password rules */}
                {password.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {[
                      { label: "8+ chars", ok: rules.length },
                      { label: "Uppercase", ok: rules.uppercase },
                      { label: "Number", ok: rules.number },
                    ].map(({ label, ok }) => (
                      <span
                        key={label}
                        className={`text-[8px] font-bold transition-colors ${ok ? "text-green-500" : "text-slate-300"}`}
                      >
                        {ok ? "✓" : "·"} {label}
                      </span>
                    ))}
                  </div>
                )}
              </FormItem>
            )}
          />

          <motion.button
            type="submit"
            disabled={isLoading || success}
            whileTap={isLoading || success ? undefined : { scale: 0.985 }}
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
              <><Loader2 className="size-3.5 animate-spin" /> Resetting…</>
            ) : success ? (
              <><CheckCircle2 className="size-3.5" /> Done!</>
            ) : (
              "Reset password"
            )}
          </motion.button>
        </form>
      </Form>

      <div className="mt-6 text-center">
        <Link to="/forgot-password" className="text-[9px] font-bold text-slate-400 hover:text-[#E05A47] transition-colors">
          ← Request a new code
        </Link>
      </div>
    </motion.div>
  )
}
