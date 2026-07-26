import { useState, useRef, useEffect } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle, CheckCircle2, Loader2, Mail, RefreshCw } from "lucide-react"
import { authService } from "@/services/authService"

const BRAND = "#E05A47"
const OTP_LENGTH = 6

export default function VerifyEmail() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { user_id?: string; email?: string } | null

  const userId = state?.user_id || ""
  const email = state?.email || ""

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""))
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  if (!userId) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="text-sm text-slate-500">No verification session found.</p>
        <Link to="/register" className="text-[#E05A47] text-sm font-bold hover:underline">
          Go back to Register
        </Link>
      </div>
    )
  }

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newDigits = [...digits]
    newDigits[index] = value.slice(-1) // only last char
    setDigits(newDigits)
    setError(null)

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH)
    const newDigits = [...digits]
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i]
    }
    setDigits(newDigits)
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
  }

  const otp = digits.join("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length < OTP_LENGTH) {
      setError("Please enter all 6 digits.")
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      await authService.verifyEmail(userId, otp)
      setSuccess(true)
      setTimeout(() => navigate("/login"), 2000)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Invalid or expired code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || isResending) return
    try {
      setIsResending(true)
      setError(null)
      setDigits(Array(OTP_LENGTH).fill(""))
      await authService.resendOtp(userId)
      setResendCooldown(60) // 60 second cooldown
      inputRefs.current[0]?.focus()
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to resend. Please try again.")
    } finally {
      setIsResending(false)
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
            <Mail className="size-2.5 text-[#E05A47]" />
          </span>
          <span className="text-[8px] font-black uppercase tracking-[0.17em] text-slate-400">
            Email verification
          </span>
        </div>
        <h1 className="text-[28px] font-black leading-tight tracking-[-0.045em] text-slate-950 sm:text-[32px]">
          Check your inbox.
        </h1>
        <p className="mt-2 max-w-sm text-[11px] font-medium leading-5 text-slate-500">
          We sent a 6-digit code to{" "}
          <span className="font-bold text-slate-700">{email || "your email"}</span>.
          Enter it below to verify your account.
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
              Email verified! Redirecting to login…
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

      {/* OTP Input */}
      <form onSubmit={handleSubmit} className="space-y-6">
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
              className={`
                h-13 w-full
                rounded-xl
                border
                bg-white
                text-center
                text-[22px]
                font-black
                text-slate-950
                outline-none
                transition-all duration-150
                disabled:opacity-60
                ${digit
                  ? "border-[#E05A47] ring-4 ring-[#E05A47]/10"
                  : "border-slate-200 hover:border-slate-300 focus:border-[#E05A47] focus:ring-4 focus:ring-[#E05A47]/10"
                }
              `}
              style={{ height: "52px" }}
            />
          ))}
        </div>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={isLoading || success || otp.length < OTP_LENGTH}
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
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Verifying…
            </>
          ) : success ? (
            <>
              <CheckCircle2 className="size-3.5" />
              Verified!
            </>
          ) : (
            "Verify my account"
          )}
        </motion.button>
      </form>

      {/* Resend */}
      <div className="mt-6 flex items-center justify-center gap-1.5">
        <span className="text-[9px] font-medium text-slate-400">Didn't receive it?</span>
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0 || isResending}
          className="
            flex items-center gap-1
            text-[9px] font-extrabold text-[#E05A47]
            disabled:cursor-not-allowed disabled:opacity-50
            hover:underline
          "
        >
          {isResending ? (
            <Loader2 className="size-2.5 animate-spin" />
          ) : (
            <RefreshCw className="size-2.5" />
          )}
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
        </button>
      </div>
    </motion.div>
  )
}
