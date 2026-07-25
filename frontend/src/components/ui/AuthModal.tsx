import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import { Lock } from "lucide-react"

interface AuthModalProps {
  onClose: () => void
}

export function AuthModal({ onClose }: AuthModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="
        fixed inset-0 z-[100]
        flex items-center justify-center
        bg-slate-950/35
        p-4
        backdrop-blur-[3px]
      "
    >
      <motion.div
        initial={{
          opacity: 0,
          y: 12,
          scale: 0.985,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          y: 12,
          scale: 0.985,
        }}
        transition={{
          duration: 0.2,
          ease: "easeOut",
        }}
        onClick={(e) => e.stopPropagation()}
        className="
          relative
          w-full max-w-[390px]
          rounded-[24px]
          border border-slate-200
          bg-white
          p-7
          shadow-[0_24px_80px_rgba(15,23,42,0.16)]
        "
      >
        <button
          onClick={onClose}
          className="
            absolute right-4 top-4
            flex size-8 items-center justify-center
            rounded-full
            text-slate-400
            transition
            hover:bg-slate-100
            hover:text-slate-700
          "
        >
          ✕
        </button>

        <div
          className="
            mb-5
            flex size-11 items-center justify-center
            rounded-2xl
            bg-[#fff2ef]
            text-[#f07060]
          "
        >
          <Lock className="size-[18px]" />
        </div>

        <h3
          className="
            text-[21px]
            font-black
            tracking-[-0.035em]
            text-slate-950
          "
        >
          Join the conversation
        </h3>

        <p
          className="
            mt-2
            text-[13px]
            font-medium
            leading-6
            text-slate-500
          "
        >
          Create your BareMind account to respond,
          save stories and support writers.
        </p>

        <div className="mt-7 space-y-2.5">
          <Link
            to="/register"
            onClick={onClose}
            className="block"
          >
            <button
              className="
                h-11 w-full
                rounded-xl
                bg-slate-950
                text-[12px]
                font-extrabold
                text-white
                transition-all
                hover:bg-[#f07060]
              "
            >
              Create free account
            </button>
          </Link>

          <Link
            to="/login"
            onClick={onClose}
            className="block"
          >
            <button
              className="
                h-11 w-full
                rounded-xl
                border border-slate-200
                bg-white
                text-[12px]
                font-extrabold
                text-slate-700
                transition
                hover:bg-slate-50
              "
            >
              Sign in
            </button>
          </Link>
        </div>
      </motion.div>
    </motion.div>
  )
}
