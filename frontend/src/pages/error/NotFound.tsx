import { Link } from "react-router-dom"
import { Compass, Search, Home } from "lucide-react"

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#FCFCFB] p-6 text-slate-950">
      <div className="flex max-w-[500px] flex-col items-center text-center">
        
        {/* Error Code & Graphic */}
        <div className="relative flex items-center justify-center">
          <h1 className="text-[120px] font-black leading-none tracking-tighter text-slate-100 sm:text-[160px]">
            404
          </h1>
          <div className="absolute flex size-20 items-center justify-center rounded-full bg-white shadow-xl ring-1 ring-slate-900/5 sm:size-24">
            <Search className="size-8 text-[#E05A47] sm:size-10" />
          </div>
        </div>

        {/* Messaging */}
        <h2 className="mt-8 text-[24px] font-black tracking-[-0.03em] text-slate-950 sm:text-[32px]">
          Page not found
        </h2>
        <p className="mt-4 text-[13px] font-medium leading-relaxed text-slate-500 sm:text-[15px]">
          The route you are trying to reach is not here. The content you are searching for might be unavailable, moved, or deleted.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <Link
            to="/blogs"
            className="
              flex items-center gap-2 
              rounded-full bg-[#E05A47] 
              px-6 py-3.5 
              text-[13px] font-bold text-white 
              shadow-[0_2px_10px_rgba(224,90,71,0.25)] 
              transition-all 
              hover:-translate-y-0.5 hover:bg-[#c94938] hover:shadow-[0_4px_15px_rgba(224,90,71,0.35)]
              active:translate-y-0
            "
          >
            <Compass className="size-4" />
            Return to Feed
          </Link>

          <Link
            to="/"
            className="
              flex items-center gap-2 
              rounded-full bg-white 
              px-6 py-3.5 
              text-[13px] font-bold text-slate-700 
              shadow-sm ring-1 ring-slate-200 
              transition-all 
              hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md
              active:translate-y-0
            "
          >
            <Home className="size-4" />
            Go to Home
          </Link>
        </div>
        
      </div>
    </main>
  )
}
