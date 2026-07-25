import { Link } from "react-router-dom"
import { X } from "lucide-react"
import { useState, useEffect } from "react"
import { userService } from "@/services/userService"

export interface UserListModalProps {
  title: string
  users: any[]
  loading: boolean
  onClose: () => void
  currentUser: any
  emptyMessage?: string
}

export function UserListModal({ title, users, loading, onClose, currentUser, emptyMessage = "No users found." }: UserListModalProps) {
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({})
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Sync prop changes when users array loads/changes
  useEffect(() => {
    if (Array.isArray(users)) {
      setFollowingMap(
        users.reduce((acc, user) => ({ ...acc, [user.id]: Boolean(user.is_following) }), {})
      )
    }
  }, [users])

  const handleToggleFollow = async (e: React.MouseEvent, targetUserId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!currentUser || processingId) return
    
    setProcessingId(targetUserId)
    const previousState = Boolean(followingMap[targetUserId])
    
    // Optimistic update
    setFollowingMap((prev) => ({
      ...prev,
      [targetUserId]: !previousState,
    }))
    
    try {
      await userService.followUser(targetUserId)
    } catch (error) {
      // Revert on error
      setFollowingMap((prev) => ({
        ...prev,
        [targetUserId]: previousState,
      }))
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/5">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h3 className="text-lg font-black text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#E05A47]" />
            </div>
          ) : !users || users.length === 0 ? (
            <div className="py-10 text-center text-sm font-medium text-slate-500">
              {emptyMessage}
            </div>
          ) : (
            <div className="flex flex-col">
              {users.map((user) => (
                <Link
                  key={user.id}
                  to={`/u/${user.username || user.id}`}
                  className="flex items-center justify-between rounded-xl p-3 transition hover:bg-slate-50"
                  onClick={onClose}
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 overflow-hidden rounded-full bg-slate-100">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#fff0ed] text-[#E05A47] font-bold">
                          {user.username?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">
                        {user.first_name && user.last_name 
                          ? `${user.first_name} ${user.last_name}` 
                          : (user.username || "User")}
                      </span>
                      {user.username && (
                        <span className="text-xs font-medium text-slate-500">@{user.username}</span>
                      )}
                    </div>
                  </div>
                  
                  {currentUser && String(currentUser.id) !== String(user.id) && (
                    <button
                      onClick={(e) => handleToggleFollow(e, String(user.id))}
                      disabled={processingId === String(user.id)}
                      className={`
                        h-8 rounded-full px-4 text-[10px] font-extrabold transition-all
                        ${followingMap[user.id]
                          ? "border border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          : "bg-slate-950 text-white hover:bg-[#E05A47]"
                        }
                        ${processingId === String(user.id) ? "opacity-50 cursor-not-allowed" : ""}
                      `}
                    >
                      {followingMap[user.id] 
                        ? (processingId === String(user.id) ? "..." : "Following") 
                        : "Follow"
                      }
                    </button>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
