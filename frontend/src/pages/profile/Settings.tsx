import { useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Link } from "react-router-dom"
import {
  ArrowLeft,
  ArrowUpRight,
  AtSign,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  ExternalLink,
  Globe2,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  Activity as ActivityIcon,
  Heart,
  MessageSquare,
} from "lucide-react"

import type { RootState } from "@/store"
import { setCredentials } from "@/store/slices/authSlice"
import { userService } from "@/services/userService"
import { blogService } from "@/services/blogService"
import { getUserAvatar, PRESET_AVATARS } from "@/utils/avatar"

const BRAND = "#E05A47"

type Tab = "profile" | "account" | "security" | "activity"

/* =========================================================
   SETTINGS
========================================================= */

export default function Settings() {
  const dispatch = useDispatch()

  const { user, token } = useSelector(
    (state: RootState) => state.auth
  )

  const [activeTab, setActiveTab] =
    useState<Tab>("profile")

  /* =======================================================
     PROFILE STATE
  ======================================================= */

  const [username, setUsername] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [bio, setBio] = useState("")
  const [website, setWebsite] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")

  /* =======================================================
     UI STATE
  ======================================================= */

  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  /* =======================================================
     SYNC USER
  ======================================================= */

  useEffect(() => {
    if (!user) return

    setUsername(
      user.username ||
      (user.email
        ? user.email.split("@")[0]
        : "")
    )

    setFirstName(user.first_name || "")
    setLastName(user.last_name || "")
    setBio(user.bio || "")
    setWebsite(user.website || "")
    setAvatarUrl(user.avatar_url || "")
  }, [user])

  /* =======================================================
     ACTIVITY DATA
  ======================================================= */

  const [likedBlogs, setLikedBlogs] = useState<any[]>([])
  const [userComments, setUserComments] = useState<any[]>([])
  const [activityLoading, setActivityLoading] = useState(false)

  useEffect(() => {
    if (activeTab === "activity") {
      setActivityLoading(true)
      userService.getActivity()
        .then((data) => {
          setLikedBlogs(data.liked_blogs || [])
          setUserComments(data.comments || [])
        })
        .catch(console.error)
        .finally(() => setActivityLoading(false))
    }
  }, [activeTab])

  /* =======================================================
     AVATAR
  ======================================================= */

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError(
        "Please choose a PNG, JPG, or WebP image."
      )
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(
        "Profile image must be smaller than 10 MB."
      )
      return
    }

    try {
      setUploading(true)
      setError(null)

      const url =
        await blogService.uploadImage(file)

      setAvatarUrl(url)
    } catch {
      setError(
        "We couldn't upload your profile image. Please try again."
      )
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarUrl("")

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  /* =======================================================
     SAVE
  ======================================================= */

  const handleSave = async (
    event?: React.FormEvent
  ) => {
    event?.preventDefault()

    try {
      setSaving(true)
      setSuccess(false)
      setError(null)

      const updatedUser =
        await userService.updateProfile({
          username: username
            .trim()
            .toLowerCase(),

          first_name: firstName.trim(),
          last_name: lastName.trim(),
          bio: bio.trim(),
          website: website.trim(),
          avatar_url: avatarUrl,
        })

      if (token) {
        dispatch(
          setCredentials({
            user: updatedUser,
            token,
          })
        )
      }

      setSuccess(true)

      window.setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        "We couldn't save your changes."
      )
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) return

    if (newPassword === currentPassword) {
      setPwdError("New password must be different from current password.")
      return
    }

    if (newPassword !== confirmPassword) {
      setPwdError("New passwords do not match.")
      return
    }

    if (newPassword.length < 8) {
      setPwdError("New password must be at least 8 characters.")
      return
    }

    try {
      setChangingPassword(true)
      setPwdError(null)
      setPwdSuccess(false)

      await userService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      })

      setPwdSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      window.setTimeout(() => setPwdSuccess(false), 3000)
    } catch (err: any) {
      setPwdError(err?.response?.data?.detail || "Could not change password.")
    } finally {
      setChangingPassword(false)
    }
  }

  /* =======================================================
     COMPUTED
  ======================================================= */

  const avatar = getUserAvatar(
    avatarUrl,
    user?.first_name ||
    user?.username ||
    user?.email
  )

  const displayName =
    [firstName, lastName]
      .filter(Boolean)
      .join(" ") ||
    username ||
    "BareMind member"

  const profilePath = username
    ? `/u/${username}`
    : "/profile"

  const profileUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${profilePath}`
      : profilePath

  const tabs = [
    {
      id: "profile" as const,
      label: "Public profile",
      description: "Identity and author details",
      icon: UserRound,
    },
    {
      id: "account" as const,
      label: "Account",
      description: "Email and account information",
      icon: CircleUserRound,
    },
    {
      id: "security" as const,
      label: "Security",
      description: "Password and authentication",
      icon: LockKeyhole,
    },
    {
      id: "activity" as const,
      label: "Activity",
      description: "Likes and comments history",
      icon: ActivityIcon,
    },
  ]

  return (
    <main className="min-h-screen bg-[#FAFAF9] text-slate-950">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header
        className="
          sticky top-0 z-30

          border-b border-slate-200/70
          bg-white/90
          backdrop-blur-xl
        "
      >
        <div
          className="
            mx-auto flex h-16 max-w-[1180px]
            items-center justify-between
            gap-4 px-4
            sm:px-6 lg:px-8
          "
        >
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/dashboard"
              aria-label="Back to dashboard"
              className="
                flex size-9 shrink-0
                items-center justify-center
                rounded-full
                text-slate-500
                transition
                hover:bg-slate-100
                hover:text-slate-950
              "
            >
              <ArrowLeft className="size-4" />
            </Link>

            <div className="h-5 w-px bg-slate-200" />

            <div className="min-w-0">
              <h1
                className="
                  truncate text-[13px] font-black
                  tracking-[-0.02em] text-slate-950
                  sm:text-sm
                "
              >
                Settings
              </h1>

              <p
                className="
                  hidden text-[9px] font-medium
                  text-slate-400 sm:block
                "
              >
                Manage your BareMind identity and account
              </p>
            </div>
          </div>

          {activeTab === "profile" && (
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving || uploading}
              className="
                flex h-9 shrink-0
                items-center justify-center gap-1.5
                rounded-full bg-slate-950
                px-4 text-[10px] font-extrabold
                text-white shadow-sm
                transition-all
                hover:bg-[#E05A47]
                disabled:cursor-not-allowed
                disabled:opacity-50
                sm:px-5
              "
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving
                </>
              ) : success ? (
                <>
                  <Check className="size-3.5" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  <span className="hidden sm:inline">
                    Save changes
                  </span>
                  <span className="sm:hidden">
                    Save
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* =====================================================
          FEEDBACK
      ===================================================== */}

      <div className="fixed left-3 right-3 top-[76px] z-50 mx-auto max-w-lg">
        {error && (
          <div
            className="
              flex items-start justify-between gap-4
              rounded-xl border border-red-200
              bg-white px-4 py-3
              shadow-[0_16px_50px_rgba(15,23,42,0.12)]
            "
          >
            <p className="text-[10px] font-bold leading-5 text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() => setError(null)}
              className="
                shrink-0 rounded-md px-1.5 py-1
                text-[8px] font-black uppercase
                tracking-wider text-red-400
                hover:bg-red-50
              "
            >
              Close
            </button>
          </div>
        )}

        {success && (
          <div
            className="
              flex items-center gap-2
              rounded-xl border border-emerald-200
              bg-white px-4 py-3
              shadow-[0_16px_50px_rgba(15,23,42,0.12)]
            "
          >
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />

            <p className="text-[10px] font-bold text-emerald-700">
              Your profile has been updated.
            </p>
          </div>
        )}
      </div>

      {/* =====================================================
          MOBILE NAVIGATION
      ===================================================== */}

      <div
        className="
          border-b border-slate-200/70
          bg-white md:hidden
        "
      >
        <div
          className="
            overflow-x-auto px-4
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden
          "
        >
          <div className="flex min-w-max gap-1 py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex h-9 items-center gap-1.5
                    rounded-full px-3.5
                    text-[10px] font-bold
                    transition-all

                    ${active
                      ? "bg-slate-950 text-white"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    }
                  `}
                >
                  <Icon className="size-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* =====================================================
          LAYOUT
      ===================================================== */}

      <div
        className="
          mx-auto grid max-w-[1180px]
          grid-cols-1 gap-8
          px-4 py-6
          sm:px-6 sm:py-8
          md:grid-cols-[220px_minmax(0,1fr)]
          lg:grid-cols-[240px_minmax(0,760px)]
          lg:gap-12 lg:px-8 lg:py-10
        "
      >

        {/* =================================================
            DESKTOP SIDEBAR
        ================================================= */}

        <aside className="hidden md:block">
          <div className="sticky top-[96px]">

            <p
              className="
                mb-3 px-3
                text-[8px] font-black
                uppercase tracking-[0.16em]
                text-slate-400
              "
            >
              Preferences
            </p>

            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const active = activeTab === tab.id

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setActiveTab(tab.id)
                    }
                    className={`
                      group flex w-full
                      items-center gap-3
                      rounded-xl px-3 py-3
                      text-left transition-all

                      ${active
                        ? "bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80"
                        : "hover:bg-white/70"
                      }
                    `}
                  >
                    <span
                      className={`
                        flex size-8 shrink-0
                        items-center justify-center
                        rounded-lg transition-colors

                        ${active
                          ? "bg-[#fff1ee] text-[#E05A47]"
                          : "bg-transparent text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-700"
                        }
                      `}
                    >
                      <Icon className="size-3.5" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        className={`
                          block text-[10px] font-extrabold

                          ${active
                            ? "text-slate-900"
                            : "text-slate-600"
                          }
                        `}
                      >
                        {tab.label}
                      </span>

                      <span
                        className="
                          mt-0.5 block truncate
                          text-[8px] font-medium
                          text-slate-400
                        "
                      >
                        {tab.description}
                      </span>
                    </span>

                    {active && (
                      <ChevronRight className="size-3 text-slate-300" />
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* =================================================
            CONTENT
        ================================================= */}

        <section className="min-w-0">

          {/* =================================================
              PROFILE
          ================================================= */}

          {activeTab === "profile" && (
            <form
              onSubmit={handleSave}
              className="space-y-5"
            >
              {/* INTRO */}

              <div className="mb-7">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-[#E05A47]" />

                  <span
                    className="
                      text-[8px] font-black uppercase
                      tracking-[0.16em] text-slate-400
                    "
                  >
                    Public identity
                  </span>
                </div>

                <h2
                  className="
                    mt-3 text-2xl font-black
                    tracking-[-0.04em]
                    text-slate-950
                    sm:text-[28px]
                  "
                >
                  Your author profile
                </h2>

                <p
                  className="
                    mt-2 max-w-xl
                    text-[11px] font-medium
                    leading-5 text-slate-500
                  "
                >
                  This is how readers discover and recognize
                  you across BareMind.
                </p>
              </div>

              {/* =============================================
                  PROFILE PHOTO
              ============================================= */}

              <div
                className="
                  rounded-2xl border border-slate-200/80
                  bg-white
                  shadow-[0_1px_2px_rgba(15,23,42,0.02)]
                "
              >
                <div
                  className="
                    border-b border-slate-100
                    px-5 py-4 sm:px-6
                  "
                >
                  <h3 className="text-[11px] font-extrabold text-slate-900">
                    Profile photo
                  </h3>

                  <p className="mt-1 text-[9px] font-medium text-slate-400">
                    Appears beside your stories, comments, and profile.
                  </p>
                </div>

                <div
                  className="
                    flex flex-col gap-5
                    px-5 py-6
                    sm:flex-row sm:items-center
                    sm:px-6
                  "
                >
                  <div className="relative shrink-0">
                    <div
                      className="
                        size-24 overflow-hidden
                        rounded-full bg-[#fff1ee]
                        ring-1 ring-slate-200
                        ring-offset-4 ring-offset-white
                      "
                    >
                      <img
                        src={avatar}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />

                      {uploading && (
                        <div
                          className="
                            absolute inset-0
                            flex items-center justify-center
                            rounded-full bg-slate-950/45
                            backdrop-blur-[2px]
                          "
                        >
                          <Loader2 className="size-5 animate-spin text-white" />
                        </div>
                      )}
                    </div>

                    {!uploading && (
                      <button
                        type="button"
                        aria-label="Change profile photo"
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
                        className="
                          absolute bottom-0 right-0
                          flex size-8 items-center justify-center
                          rounded-full border-2 border-white
                          bg-slate-950 text-white
                          shadow-md transition
                          hover:bg-[#E05A47]
                        "
                      >
                        <Camera className="size-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-extrabold text-slate-800">
                      {displayName}
                    </p>

                    <p
                      className="
                        mt-1 max-w-sm
                        text-[9px] font-medium
                        leading-4 text-slate-400
                      "
                    >
                      Use a clear square image. JPG, PNG, and
                      WebP are supported up to 10 MB.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
                        className="
                          flex h-8 items-center gap-1.5
                          rounded-lg border border-slate-200
                          bg-white px-3
                          text-[9px] font-extrabold
                          text-slate-700
                          transition
                          hover:bg-slate-50
                          disabled:opacity-50
                        "
                      >
                        <Camera className="size-3" />

                        {avatarUrl
                          ? "Change photo"
                          : "Upload photo"}
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="
                            flex h-8 items-center gap-1.5
                            rounded-lg px-3
                            text-[9px] font-extrabold
                            text-slate-400
                            transition
                            hover:bg-red-50
                            hover:text-red-600
                          "
                        >
                          <Trash2 className="size-3" />
                          Remove
                        </button>
                      )}
                    </div>
                    
                    {/* Presets */}
                    <div className="mt-5">
                      <p className="mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Or choose a default
                      </p>
                      <div className="flex gap-3">
                        {PRESET_AVATARS.map((presetUrl) => (
                          <button
                            key={presetUrl}
                            type="button"
                            onClick={() => setAvatarUrl(presetUrl)}
                            className={`
                              size-10 overflow-hidden rounded-full ring-2 transition
                              ${avatarUrl === presetUrl 
                                ? "ring-[#E05A47] ring-offset-2 ring-offset-white opacity-100 scale-110" 
                                : "ring-transparent hover:ring-slate-200 opacity-60 hover:opacity-100"
                              }
                            `}
                          >
                            <img src={presetUrl} alt="preset" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* =============================================
                  BASIC INFORMATION
              ============================================= */}

              <div
                className="
                  rounded-2xl border border-slate-200/80
                  bg-white
                  shadow-[0_1px_2px_rgba(15,23,42,0.02)]
                "
              >
                <div
                  className="
                    border-b border-slate-100
                    px-5 py-4 sm:px-6
                  "
                >
                  <h3 className="text-[11px] font-extrabold text-slate-900">
                    Profile information
                  </h3>

                  <p className="mt-1 text-[9px] font-medium text-slate-400">
                    Your public identity on BareMind.
                  </p>
                </div>

                <div className="space-y-5 px-5 py-6 sm:px-6">

                  {/* USERNAME */}

                  <Field
                    label="Username"
                    hint="Your unique BareMind handle."
                  >
                    <div className="relative">
                      <AtSign
                        className="
                          absolute left-3.5 top-1/2
                          size-3.5 -translate-y-1/2
                          text-slate-400
                        "
                      />

                      <input
                        type="text"
                        value={username}
                        onChange={(event) =>
                          setUsername(
                            event.target.value
                              .toLowerCase()
                              .replace(/\s/g, "")
                          )
                        }
                        placeholder="yourname"
                        className={inputClass("pl-9")}
                      />
                    </div>

                    <div
                      className="
                        mt-2 flex min-w-0
                        items-center gap-1
                        text-[8px] font-medium
                        text-slate-400
                      "
                    >
                      <Globe2 className="size-3 shrink-0" />

                      <span className="truncate">
                        {profileUrl}
                      </span>
                    </div>
                  </Field>

                  {/* NAME */}

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field label="First name">
                      <input
                        type="text"
                        value={firstName}
                        onChange={(event) =>
                          setFirstName(event.target.value)
                        }
                        placeholder="First name"
                        className={inputClass()}
                      />
                    </Field>

                    <Field label="Last name">
                      <input
                        type="text"
                        value={lastName}
                        onChange={(event) =>
                          setLastName(event.target.value)
                        }
                        placeholder="Last name"
                        className={inputClass()}
                      />
                    </Field>
                  </div>

                  {/* BIO */}

                  <Field
                    label="Bio"
                    hint="A short introduction shown on your author profile."
                  >
                    <div className="relative">
                      <textarea
                        value={bio}
                        onChange={(event) =>
                          setBio(event.target.value)
                        }
                        maxLength={240}
                        rows={4}
                        placeholder="Developer, writer, builder..."
                        className="
                          block w-full resize-none
                          rounded-xl border border-slate-200
                          bg-white px-3.5 py-3
                          text-[11px] font-medium
                          leading-5 text-slate-800
                          outline-none transition-all
                          placeholder:text-slate-300
                          hover:border-slate-300
                          focus:border-[#E05A47]
                          focus:ring-4
                          focus:ring-[#E05A47]/10
                        "
                      />

                      <span
                        className="
                          absolute bottom-2.5 right-3
                          text-[8px] font-semibold
                          text-slate-300
                        "
                      >
                        {bio.length}/240
                      </span>
                    </div>
                  </Field>

                  {/* WEBSITE */}

                  <Field
                    label="Website"
                    hint="Add your portfolio, company, or personal site."
                  >
                    <div className="relative">
                      <Globe2
                        className="
                          absolute left-3.5 top-1/2
                          size-3.5 -translate-y-1/2
                          text-slate-400
                        "
                      />

                      <input
                        type="url"
                        value={website}
                        onChange={(event) =>
                          setWebsite(event.target.value)
                        }
                        placeholder="https://yourwebsite.com"
                        className={inputClass("pl-9")}
                      />
                    </div>
                  </Field>
                </div>
              </div>

              {/* =============================================
                  PROFILE PREVIEW
              ============================================= */}

              <div
                className="
                  rounded-2xl border border-slate-200/80
                  bg-white px-5 py-5
                  sm:px-6
                "
              >
                <div
                  className="
                    flex flex-col gap-5
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={avatar}
                      alt=""
                      className="
                        size-11 shrink-0 rounded-full
                        object-cover ring-1 ring-slate-200
                      "
                    />

                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-extrabold text-slate-900">
                        {displayName}
                      </p>

                      <p className="mt-0.5 truncate text-[9px] font-medium text-slate-400">
                        @{username || "username"}
                      </p>
                    </div>
                  </div>

                  <Link
                    to={profilePath}
                    className="
                      flex h-9 items-center
                      justify-center gap-1.5
                      rounded-lg border border-slate-200
                      px-3 text-[9px] font-extrabold
                      text-slate-600 transition
                      hover:bg-slate-50
                      hover:text-slate-950
                    "
                  >
                    View profile
                    <ArrowUpRight className="size-3" />
                  </Link>
                </div>
              </div>

              {/* MOBILE SAVE */}

              <button
                type="submit"
                disabled={saving || uploading}
                className="
                  flex h-11 w-full
                  items-center justify-center gap-2
                  rounded-xl bg-slate-950
                  text-[10px] font-extrabold
                  text-white transition
                  hover:bg-[#E05A47]
                  disabled:opacity-50
                  sm:hidden
                "
              >
                {saving ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : success ? (
                  <CheckCircle2 className="size-3.5" />
                ) : (
                  <Save className="size-3.5" />
                )}

                {saving
                  ? "Saving..."
                  : success
                    ? "Changes saved"
                    : "Save changes"}
              </button>
            </form>
          )}

          {/* =================================================
              ACCOUNT
          ================================================= */}

          {activeTab === "account" && (
            <div>
              <div className="mb-7">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-[#E05A47]" />

                  <span
                    className="
                      text-[8px] font-black uppercase
                      tracking-[0.16em] text-slate-400
                    "
                  >
                    Account
                  </span>
                </div>

                <h2
                  className="
                    mt-3 text-2xl font-black
                    tracking-[-0.04em]
                    text-slate-950
                    sm:text-[28px]
                  "
                >
                  Account information
                </h2>

                <p
                  className="
                    mt-2 max-w-xl
                    text-[11px] font-medium
                    leading-5 text-slate-500
                  "
                >
                  Review the credentials and identifiers
                  associated with your BareMind account.
                </p>
              </div>

              <div
                className="
                  overflow-hidden rounded-2xl
                  border border-slate-200/80
                  bg-white
                "
              >
                {/* EMAIL */}

                <SettingRow
                  icon={<Mail className="size-4" />}
                  title="Email address"
                  description={
                    user?.email ||
                    "No email available"
                  }
                >
                  <span
                    className="
                      inline-flex items-center gap-1.5
                      rounded-full bg-emerald-50
                      px-2.5 py-1
                      text-[8px] font-extrabold
                      text-emerald-700
                    "
                  >
                    <ShieldCheck className="size-3" />
                    Active
                  </span>
                </SettingRow>

                {/* ACCOUNT ID */}

                <SettingRow
                  icon={
                    <CircleUserRound className="size-4" />
                  }
                  title="Account ID"
                  description="Your internal BareMind account identifier."
                >
                  <code
                    className="
                      max-w-[160px] truncate
                      rounded-md bg-slate-100
                      px-2 py-1
                      text-[8px] font-bold
                      text-slate-500
                    "
                  >
                    {user?.id || "—"}
                  </code>
                </SettingRow>

                {/* PROFILE */}

                <SettingRow
                  icon={<UserRound className="size-4" />}
                  title="Public profile"
                  description={
                    username
                      ? `@${username}`
                      : "Profile not configured"
                  }
                  last
                >
                  <Link
                    to={profilePath}
                    className="
                      flex size-8 items-center
                      justify-center rounded-lg
                      text-slate-400 transition
                      hover:bg-slate-100
                      hover:text-slate-900
                    "
                  >
                    <ExternalLink className="size-3.5" />
                  </Link>
                </SettingRow>
              </div>

              <div
                className="
                  mt-5 rounded-xl
                  border border-slate-200/70
                  bg-white/60 px-4 py-3
                "
              >
                <p className="text-[9px] font-medium leading-4 text-slate-400">
                  Some account identifiers are managed by
                  BareMind and cannot be edited manually.
                </p>
              </div>
            </div>
          )}

          {/* =================================================
              SECURITY
          ================================================= */}

          {activeTab === "security" && (
            <div>
              <div className="mb-7">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-[#E05A47]" />

                  <span
                    className="
                      text-[8px] font-black uppercase
                      tracking-[0.16em] text-slate-400
                    "
                  >
                    Security
                  </span>
                </div>

                <h2
                  className="
                    mt-3 text-2xl font-black
                    tracking-[-0.04em]
                    text-slate-950
                    sm:text-[28px]
                  "
                >
                  Sign-in & security
                </h2>

                <p
                  className="
                    mt-2 max-w-xl
                    text-[11px] font-medium
                    leading-5 text-slate-500
                  "
                >
                  Authentication and credential controls for
                  your BareMind account.
                </p>
              </div>

              {/* SECURITY STATUS */}

              <div
                className="
                  overflow-hidden rounded-2xl
                  border border-slate-200/80
                  bg-white
                "
              >
                <div
                  className="
                    flex items-start gap-4
                    border-b border-slate-100
                    px-5 py-5 sm:px-6
                  "
                >
                  <div
                    className="
                      flex size-10 shrink-0
                      items-center justify-center
                      rounded-xl bg-emerald-50
                      text-emerald-600
                    "
                  >
                    <ShieldCheck className="size-4.5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[11px] font-extrabold text-slate-900">
                        Account protected
                      </h3>

                      <span
                        className="
                          rounded-full bg-emerald-50
                          px-2 py-0.5
                          text-[7px] font-black
                          uppercase tracking-wider
                          text-emerald-600
                        "
                      >
                        Active
                      </span>
                    </div>

                    <p
                      className="
                        mt-1 max-w-lg
                        text-[9px] font-medium
                        leading-4 text-slate-400
                      "
                    >
                      Your current authentication session is
                      secured using token-based authentication.
                    </p>
                  </div>
                </div>

                {/* PASSWORD */}

                <div className="px-5 py-6 sm:px-6">
                  <div className="flex items-start gap-3">
                    <div
                      className="
                        flex size-9 shrink-0
                        items-center justify-center
                        rounded-lg bg-slate-100
                        text-slate-500
                      "
                    >
                      <KeyRound className="size-3.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-[10px] font-extrabold text-slate-800">
                        Password
                      </h4>

                      <p
                        className="
                          mt-1 max-w-md
                          text-[9px] font-medium
                          leading-4 text-slate-400
                        "
                      >
                        Change the password used to access your BareMind account.
                      </p>

                      <form onSubmit={handleChangePassword} className="mt-4 flex flex-col gap-3 max-w-sm">
                        <input
                          type="password"
                          placeholder="Current password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className={inputClass()}
                          disabled={changingPassword}
                          required
                        />
                        <div>
                          <input
                            type="password"
                            placeholder="New password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={inputClass()}
                            disabled={changingPassword}
                            required
                          />
                          {newPassword && currentPassword && newPassword === currentPassword && (
                            <p className="mt-1 text-[10px] text-amber-500 font-bold">New password must be different.</p>
                          )}
                          {newPassword && newPassword.length > 0 && newPassword.length < 8 && (
                            <p className="mt-1 text-[10px] text-amber-500 font-bold">Must be at least 8 characters.</p>
                          )}
                        </div>
                        <div>
                          <input
                            type="password"
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onPaste={(e) => e.preventDefault()}
                            onCopy={(e) => e.preventDefault()}
                            className={inputClass()}
                            disabled={changingPassword}
                            required
                          />
                          {confirmPassword && newPassword && confirmPassword !== newPassword && (
                            <p className="mt-1 text-[10px] text-amber-500 font-bold">Passwords do not match.</p>
                          )}
                        </div>
                        
                        {pwdError && <p className="text-[10px] text-red-500 font-bold">{pwdError}</p>}
                        {pwdSuccess && <p className="text-[10px] text-emerald-500 font-bold">Password updated successfully!</p>}

                        <button
                          type="submit"
                          disabled={
                            changingPassword || 
                            !currentPassword || 
                            !newPassword || 
                            !confirmPassword || 
                            newPassword === currentPassword || 
                            newPassword !== confirmPassword || 
                            newPassword.length < 8
                          }
                          className="
                            mt-2 flex h-8 w-fit
                            items-center gap-1.5
                            rounded-lg
                            border border-slate-200
                            bg-white px-4
                            text-[10px] font-extrabold
                            text-slate-800
                            transition hover:bg-slate-50
                            disabled:opacity-50 disabled:cursor-not-allowed
                          "
                        >
                          {changingPassword ? <Loader2 className="size-3 animate-spin" /> : <LockKeyhole className="size-3" />}
                          Update Password
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECURITY NOTE */}

              <div
                className="
                  mt-5 flex gap-3
                  rounded-xl
                  border border-slate-200/70
                  bg-white/60
                  px-4 py-4
                "
              >
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-slate-400" />

                <p className="text-[9px] font-medium leading-4 text-slate-400">
                  Additional security controls such as
                  password management, active sessions and
                  two-factor authentication can be added here
                  when your backend supports them.
                </p>
              </div>
            </div>
          )}

          {/* =================================================
              ACTIVITY
          ================================================= */}

          {activeTab === "activity" && (
            <div className="space-y-8">
              {/* INTRO */}
              <div className="mb-7">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-[#E05A47]" />
                  <span className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Your Activity
                  </span>
                </div>
                <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-[28px]">
                  Likes & Comments
                </h2>
                <p className="mt-2 max-w-xl text-[11px] font-medium leading-5 text-slate-500">
                  Review the stories you've interacted with. This is private and only visible to you.
                </p>
              </div>

              {activityLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-slate-300" />
                </div>
              ) : (
                <div className="space-y-10">
                  
                  {/* LIKED BLOGS */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
                    <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                      <div className="flex items-center gap-2">
                        <Heart className="size-4 text-[#E05A47]" />
                        <h3 className="text-[11px] font-extrabold text-slate-900">Recently Liked</h3>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {likedBlogs.length === 0 ? (
                        <div className="px-5 py-6 sm:px-6">
                          <p className="text-[10px] font-medium text-slate-400">No liked stories yet.</p>
                        </div>
                      ) : (
                        likedBlogs.map(blog => (
                          <div key={blog.id} className="flex items-center justify-between px-5 py-4 sm:px-6 hover:bg-slate-50 transition-colors">
                            <div className="min-w-0">
                              <Link to={`/blogs/${blog.slug}`} className="truncate text-sm font-bold text-slate-900 hover:underline">
                                {blog.title}
                              </Link>
                              <p className="mt-1 text-[10px] font-medium text-slate-500">
                                Published on {new Date(blog.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Link to={`/blogs/${blog.slug}`} className="shrink-0 p-2 text-slate-400 hover:text-slate-900">
                              <ExternalLink className="size-4" />
                            </Link>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* RECENT COMMENTS */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
                    <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="size-4 text-blue-500" />
                        <h3 className="text-[11px] font-extrabold text-slate-900">Your Comments</h3>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {userComments.length === 0 ? (
                        <div className="px-5 py-6 sm:px-6">
                          <p className="text-[10px] font-medium text-slate-400">No comments posted yet.</p>
                        </div>
                      ) : (
                        userComments.map(comment => (
                          <div key={comment.id} className="px-5 py-4 sm:px-6">
                            <p className="text-[10px] font-medium text-slate-400 mb-2">
                              Commented on <strong className="text-slate-700">{comment.blog_title}</strong> • {new Date(comment.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs font-semibold text-slate-800 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100">
                              "{comment.content}"
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

        </section>
      </div>
    </main>
  )
}

/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2">
        <label
          className="
            block text-[9px] font-extrabold
            text-slate-700
          "
        >
          {label}
        </label>

        {hint && (
          <p
            className="
              mt-0.5 text-[8px]
              font-medium text-slate-400
            "
          >
            {hint}
          </p>
        )}
      </div>

      {children}
    </div>
  )
}

/* =========================================================
   SETTING ROW
========================================================= */

function SettingRow({
  icon,
  title,
  description,
  children,
  last = false,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div
      className={`
        flex flex-col gap-4
        px-5 py-5
        sm:flex-row
        sm:items-center
        sm:px-6

        ${!last ? "border-b border-slate-100" : ""}
      `}
    >
      <div
        className="
          flex min-w-0 flex-1
          items-center gap-3
        "
      >
        <div
          className="
            flex size-9 shrink-0
            items-center justify-center
            rounded-lg bg-slate-100
            text-slate-500
          "
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-extrabold text-slate-800">
            {title}
          </p>

          <p
            className="
              mt-0.5 truncate
              text-[9px] font-medium
              text-slate-400
            "
          >
            {description}
          </p>
        </div>
      </div>

      <div className="shrink-0 pl-12 sm:pl-0">
        {children}
      </div>
    </div>
  )
}

/* =========================================================
   INPUT STYLE
========================================================= */

function inputClass(extra = "") {
  return `
    block h-10 w-full

    rounded-xl

    border border-slate-200
    bg-white

    px-3.5

    text-[11px]
    font-semibold
    text-slate-800

    outline-none

    transition-all

    placeholder:text-slate-300

    hover:border-slate-300

    focus:border-[#E05A47]
    focus:ring-4
    focus:ring-[#E05A47]/10

    ${extra}
  `
}