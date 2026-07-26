import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Globe, Loader2, MessageCircle, Users, Zap } from "lucide-react"
import { userService } from "@/services/userService"
import { blogService, type Blog } from "@/services/blogService"
import { taxonomyService, type Tag } from "@/services/taxonomyService"
import { getUserAvatar } from "@/utils/avatar"

export default function Community() {
  const [topWriters, setTopWriters] = useState<any[]>([])
  const [recentBlogs, setRecentBlogs] = useState<Blog[]>([])
  const [popularTags, setPopularTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCommunityData() {
      try {
        const [writersData, blogsData, tagsData] = await Promise.all([
          userService.getSuggestedAuthors(4),
          blogService.getBlogs(0, 4),
          taxonomyService.getPopularTags()
        ])
        setTopWriters(Array.isArray(writersData) ? writersData : [])
        setRecentBlogs(Array.isArray(blogsData) ? blogsData : [])
        setPopularTags(Array.isArray(tagsData) ? tagsData : [])
      } catch (error) {
        console.error("Failed to load community data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchCommunityData()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 pt-24 pb-16">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-[#E05A47]" />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white pt-24 pb-20">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        
        {/* =========================================================
            HERO SECTION
        ========================================================= */}
        <section className="mb-16 rounded-3xl bg-slate-950 px-6 py-16 text-center sm:px-12 sm:py-24 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute -top-24 -right-24 size-96 rounded-full bg-[#E05A47] opacity-20 blur-[100px]" />
          <div className="absolute -bottom-24 -left-24 size-96 rounded-full bg-blue-500 opacity-20 blur-[100px]" />
          
          <div className="relative z-10 mx-auto max-w-3xl">
            <div className="mx-auto mb-6 inline-flex h-8 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-[10px] font-bold text-slate-300 backdrop-blur-md">
              <Globe className="size-3.5 text-[#E05A47]" />
              The Network
            </div>
            <h1 className="text-[32px] font-black tracking-[-0.04em] text-white sm:text-[42px] lg:text-[56px] leading-[1.1]">
              Join the <span className="text-[#E05A47]">Conversation</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[14px] font-medium leading-relaxed text-slate-400 sm:text-[16px]">
              BareMind is where diverse voices come together. Read, write, and engage with a growing community of thinkers and creators.
            </p>
            
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link 
                to="/blogs/create" 
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[#E05A47] px-6 text-[13px] font-bold text-white shadow-[0_0_20px_rgba(224,90,71,0.3)] transition-all hover:bg-[#c94b3a] hover:shadow-[0_0_25px_rgba(224,90,71,0.5)]"
              >
                Start Writing
              </Link>
              <Link 
                to="/writers" 
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 text-[13px] font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10"
              >
                Find Writers
              </Link>
            </div>
          </div>
        </section>

        {/* =========================================================
            STATS ROW
        ========================================================= */}
        <section className="mb-20 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-6">
            <div className="flex size-12 items-center justify-center rounded-xl bg-white shadow-sm">
              <Users className="size-5 text-slate-900" />
            </div>
            <div>
              <p className="text-[24px] font-black tracking-[-0.02em] text-slate-950">10k+</p>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Members</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-6">
            <div className="flex size-12 items-center justify-center rounded-xl bg-white shadow-sm">
              <MessageCircle className="size-5 text-slate-900" />
            </div>
            <div>
              <p className="text-[24px] font-black tracking-[-0.02em] text-slate-950">50k+</p>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Discussions</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-6">
            <div className="flex size-12 items-center justify-center rounded-xl bg-white shadow-sm">
              <Zap className="size-5 text-[#E05A47]" />
            </div>
            <div>
              <p className="text-[24px] font-black tracking-[-0.02em] text-slate-950">Trending</p>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Community Vibe</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_360px]">
          {/* =========================================================
              RECENT STORIES
          ========================================================= */}
          <div>
            <div className="mb-8 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-[18px] font-black tracking-[-0.02em] text-slate-900">
                Recent Community Stories
              </h2>
              <Link to="/blogs" className="text-[12px] font-bold text-[#E05A47] hover:underline">
                View all
              </Link>
            </div>
            
            <div className="flex flex-col gap-6">
              {recentBlogs.map((blog) => (
                <Link 
                  key={blog.id} 
                  to={`/blogs/${blog.slug}`}
                  className="group flex flex-col sm:flex-row gap-6 rounded-2xl border border-slate-100 p-4 transition-all hover:border-slate-200 hover:bg-slate-50 hover:shadow-sm"
                >
                  {blog.cover_image && (
                    <div className="h-40 sm:h-32 w-full sm:w-48 shrink-0 overflow-hidden rounded-xl">
                      <img src={blog.cover_image} alt={blog.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  )}
                  <div className="flex flex-col justify-center">
                    {blog.category && (
                      <span className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#E05A47]">
                        {blog.category.name}
                      </span>
                    )}
                    <h3 className="text-[18px] font-bold leading-tight tracking-[-0.01em] text-slate-900 group-hover:text-[#E05A47]">
                      {blog.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-[13px] text-slate-500">
                      {blog.content.replace(/<[^>]+>/g, '')}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-[11px] font-medium text-slate-500">
                      <span>{blog.author?.first_name || 'Anonymous'} {blog.author?.last_name || ''}</span>
                      <span>·</span>
                      <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* =========================================================
              SIDEBAR: WRITERS & TAGS
          ========================================================= */}
          <aside className="space-y-8">
            {/* Top Writers */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-[15px] font-black tracking-[-0.01em] text-slate-900">
                  Top Voices
                </h3>
                <Link to="/writers" className="text-[11px] font-bold text-[#E05A47] hover:underline">
                  See all
                </Link>
              </div>
              
              <div className="flex flex-col gap-4">
                {topWriters.map(writer => {
                  const name = `${writer.first_name || ""} ${writer.last_name || ""}`.trim() || writer.username || "Writer"
                  const avatar = getUserAvatar(writer.avatar_url, name)
                  return (
                    <Link key={writer.id} to={`/u/${writer.username || writer.id}`} className="group flex items-center gap-3">
                      <img src={avatar} alt={name} className="size-10 rounded-full border border-slate-200" />
                      <div>
                        <p className="text-[13px] font-bold text-slate-900 group-hover:text-[#E05A47]">{name}</p>
                        {writer.username && <p className="text-[11px] font-medium text-slate-500">@{writer.username}</p>}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Trending Topics */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-[15px] font-black tracking-[-0.01em] text-slate-900">
                  Trending Topics
                </h3>
                <Link to="/topics" className="text-[11px] font-bold text-[#E05A47] hover:underline">
                  Explore
                </Link>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {popularTags.slice(0, 10).map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/blogs?tag=${tag.slug}`}
                    className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3.5 text-[10px] font-bold text-slate-600 transition-all hover:border-[#E05A47] hover:bg-[#E05A47] hover:text-white"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>

      </div>
    </main>
  )
}
