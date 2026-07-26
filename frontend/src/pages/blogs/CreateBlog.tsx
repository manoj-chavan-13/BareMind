import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react"

import { Link, useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Loader2,
  PanelRight,
  Send,
  Settings2,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react"

import WysiwygEditor from "@/components/editor/WysiwygEditor"
import { blogService } from "@/services/blogService"

import {
  taxonomyService,
  type Category,
  type Tag as TagType,
} from "@/services/taxonomyService"

const BRAND = "#f07060"

/* =========================================================
   HELPERS
========================================================= */

function getWordCount(content = "") {
  const clean = content
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_`>\[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return clean ? clean.split(" ").length : 0
}

function getReadTime(content = "") {
  return Math.max(1, Math.ceil(getWordCount(content) / 200))
}

/* =========================================================
   CREATE BLOG
========================================================= */

export default function CreateBlog() {
  const navigate = useNavigate()

  /* ---------------- STORY ---------------- */

  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [content, setContent] = useState("")

  const [categoryId, setCategoryId] =
    useState<number | undefined>()

  const [selectedTags, setSelectedTags] =
    useState<number[]>([])

  const [isPublished, setIsPublished] = useState(true)
  const [scheduledAt, setScheduledAt] = useState<string>("")

  /* ---------------- REVISION HISTORY & AUTOSAVE ---------------- */
  interface Revision {
    timestamp: number;
    title: string;
    content: string;
  }
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null)

  // Auto-Save Effect (Every 5 Seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (title.trim() || content.trim()) {
        const snapshot = { title, slug, content, categoryId, selectedTags, scheduledAt, timestamp: Date.now() };
        localStorage.setItem("baremind_draft_new", JSON.stringify(snapshot));
        setLastAutoSave(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

        // Append to revisions history
        const existingRevStr = localStorage.getItem("baremind_revisions_new");
        let revs: Revision[] = existingRevStr ? JSON.parse(existingRevStr) : [];
        // Only push if content changed from last revision
        if (revs.length === 0 || revs[0].content !== content) {
          revs.unshift({ timestamp: Date.now(), title, content });
          revs = revs.slice(0, 10); // Keep last 10
          localStorage.setItem("baremind_revisions_new", JSON.stringify(revs));
          setRevisions(revs);
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [title, slug, content, categoryId, selectedTags, scheduledAt]);

  // Load initial revisions
  useEffect(() => {
    const saved = localStorage.getItem("baremind_revisions_new");
    if (saved) {
      try { setRevisions(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  /* ---------------- COVER ---------------- */

  const [coverPreview, setCoverPreview] =
    useState<string | null>(null)

  const [uploadedCoverUrl, setUploadedCoverUrl] =
    useState<string | null>(null)

  const [uploadingCover, setUploadingCover] =
    useState(false)

  const coverInputRef = useRef<HTMLInputElement>(null)

  /* ---------------- TAXONOMY ---------------- */

  const [categories, setCategories] =
    useState<Category[]>([])

  const [tags, setTags] =
    useState<TagType[]>([])

  /* ---------------- UI ---------------- */

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* =======================================================
     LOAD DATA
  ======================================================= */

  useEffect(() => {
    taxonomyService
      .getCategories()
      .then(setCategories)
      .catch(console.error)

    taxonomyService
      .getTags()
      .then(setTags)
      .catch(console.error)
  }, [])

  useEffect(() => {
    return () => {
      if (coverPreview) {
        URL.revokeObjectURL(coverPreview)
      }
    }
  }, [coverPreview])

  /* =======================================================
     STATS
  ======================================================= */

  const words = useMemo(
    () => getWordCount(content),
    [content]
  )

  const readTime = useMemo(
    () => getReadTime(content),
    [content]
  )

  /* =======================================================
     TITLE
  ======================================================= */

  function handleTitleChange(value: string) {
    setTitle(value)

    setSlug(
      value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    )
  }

  /* =======================================================
     TAG
  ======================================================= */

  function toggleTag(id: number) {
    setSelectedTags((current) =>
      current.includes(id)
        ? current.filter((tagId) => tagId !== id)
        : [...current, id]
    )
  }

  const [isAutoTagging, setIsAutoTagging] = useState(false)

  async function handleAutoTag() {
    if (!title.trim() && !content.trim()) return
    try {
      setIsAutoTagging(true)
      const suggested = await blogService.autoTag(title, content)
      if (suggested && suggested.length > 0) {
        setTags((prev) => {
          const existingIds = new Set(prev.map((t) => t.id))
          const newTags = suggested.filter((st) => !existingIds.has(st.id))
          return [...prev, ...newTags]
        })
        const suggestedIds = suggested.map((t) => t.id)
        setSelectedTags((prev) => Array.from(new Set([...prev, ...suggestedIds])))
      }
    } catch (err) {
      console.error("Auto-tagging failed", err)
    } finally {
      setIsAutoTagging(false)
    }
  }

  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false)

  async function handleAutoCategory() {
    if (!title.trim() && !content.trim()) return
    try {
      setIsAutoCategorizing(true)
      const suggested = await blogService.autoCategory(title, content)
      if (suggested) {
        setCategories((prev) => {
          if (!prev.some((c) => c.id === suggested.id)) {
            return [...prev, suggested]
          }
          return prev
        })
        setCategoryId(suggested.id)
      }
    } catch (err) {
      console.error("Auto-categorization failed", err)
    } finally {
      setIsAutoCategorizing(false)
    }
  }

  /* =======================================================
     COVER
  ======================================================= */

  async function handleCoverChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Cover image must be smaller than 10 MB.")
      return
    }

    if (coverPreview) {
      URL.revokeObjectURL(coverPreview)
    }

    const preview = URL.createObjectURL(file)

    setCoverPreview(preview)
    setUploadedCoverUrl(null)
    setError(null)

    try {
      setUploadingCover(true)

      const uploadedUrl =
        await blogService.uploadImage(file)

      setUploadedCoverUrl(uploadedUrl)
    } catch (err) {
      console.error(err)

      URL.revokeObjectURL(preview)

      setCoverPreview(null)
      setUploadedCoverUrl(null)

      setError(
        "We couldn't upload the cover image. Please try again."
      )
    } finally {
      setUploadingCover(false)
    }
  }

  function removeCover() {
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview)
    }

    setCoverPreview(null)
    setUploadedCoverUrl(null)

    if (coverInputRef.current) {
      coverInputRef.current.value = ""
    }
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function handleSubmit() {
    setError(null)

    if (!title.trim()) {
      setError("Give your story a title before publishing.")
      return
    }

    if (!slug.trim()) {
      setError("A valid story URL could not be generated.")
      return
    }

    if (content.trim().length < 10) {
      setError("Write a little more before publishing.")
      return
    }

    if (uploadingCover) {
      setError("Your cover image is still uploading.")
      return
    }

    try {
      setSubmitting(true)

      const blog = await blogService.createBlog({
        title: title.trim(),
        slug: slug.trim(),
        content,

        is_published: isPublished,

        category_id: categoryId,

        tags:
          selectedTags.length > 0
            ? selectedTags
            : undefined,

        cover_image:
          uploadedCoverUrl || undefined,
        scheduled_at:
          scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      })

      setSuccess(true)

      setTimeout(() => {
        navigate(`/blogs/${blog.slug}`)
      }, 600)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        "Something went wrong while saving your story."
      )
    } finally {
      setSubmitting(false)
    }
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div
      className="
        flex
        h-[100dvh]
        w-full
        flex-col
        overflow-hidden
        bg-white
        text-slate-950
      "
    >
      <EditorStyles />

      {/* ===================================================
          TOP APPLICATION BAR
      =================================================== */}

      <header
        className="
          z-40
          flex
          h-14
          shrink-0
          items-center
          justify-between
          border-b
          border-slate-200
          bg-white
          px-3
          sm:px-5
        "
      >
        {/* LEFT */}

        <div className="flex min-w-0 items-center gap-2">

          <Link
            to="/dashboard"
            className="
              flex
              size-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-900
            "
          >
            <ArrowLeft className="size-4" />
          </Link>

          <div className="hidden h-5 w-px bg-slate-200 sm:block" />

          <Link
            to="/blogs"
            className="
              hidden
              shrink-0
              items-center
              gap-2
              sm:flex
            "
          >
            <img
              src="/BareMind.png"
              alt="BareMind"
              className="size-7 object-contain"
            />

            <span
              className="
                text-sm
                font-black
                tracking-[-0.04em]
              "
            >
              BareMind
            </span>
          </Link>

          <div className="hidden h-5 w-px bg-slate-200 md:block" />

          <div className="hidden min-w-0 md:block">

            <p
              className="
                max-w-[250px]
                truncate
                text-[10px]
                font-bold
                text-slate-600
              "
            >
              {title || "Untitled story"}
            </p>

            <p
              className="
                mt-0.5
                text-[8px]
                font-medium
                text-slate-400
              "
            >
              {success
                ? "Saved"
                : lastAutoSave
                  ? `Auto-saved at ${lastAutoSave}`
                  : words > 0
                    ? `${words.toLocaleString()} words`
                    : "New story"}
            </p>

          </div>

        </div>

        {/* RIGHT */}

        <div className="flex items-center gap-1.5">

          <button
            type="button"
            onClick={() => setIsPublished(!isPublished)}
            className="
              hidden
              h-8
              items-center
              gap-1.5
              rounded-lg
              px-2.5
              text-[9px]
              font-bold
              text-slate-500
              transition
              hover:bg-slate-100
              sm:flex
            "
          >
            {isPublished ? (
              <Eye className="size-3.5" />
            ) : (
              <EyeOff className="size-3.5" />
            )}

            {isPublished ? "Public" : "Draft"}
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="
              flex
              size-8
              items-center
              justify-center
              rounded-lg
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-900
              sm:w-auto
              sm:px-2.5
            "
          >
            <Settings2 className="size-4" />

            <span className="ml-1.5 hidden text-[9px] font-bold sm:block">
              Settings
            </span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              submitting ||
              success ||
              uploadingCover
            }
            className="
              flex
              h-8
              items-center
              justify-center
              gap-1.5
              rounded-lg
              bg-slate-950
              px-3.5
              text-[9px]
              font-extrabold
              text-white
              transition-all
              hover:bg-[#f07060]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {submitting ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                <span className="hidden sm:inline">
                  Publishing
                </span>
              </>
            ) : success ? (
              <>
                <Check className="size-3" />
                Saved
              </>
            ) : isPublished ? (
              <>
                <Send className="size-3" />
                Publish
              </>
            ) : (
              <>
                <FileText className="size-3" />
                Save draft
              </>
            )}
          </button>

        </div>

      </header>

      {/* ===================================================
          TITLE + COVER BAR
      =================================================== */}

      <section
        className="
          z-30
          shrink-0
          border-b
          border-slate-200
          bg-white
          px-3
          py-2.5
          sm:px-5
        "
      >

        <div
          className="
            mx-auto
            flex
            w-full
            max-w-[1600px]
            items-center
            gap-2
            sm:gap-3
          "
        >

          {/* TITLE */}

          <div className="min-w-0 flex-1">

            <input
              value={title}
              onChange={(event) =>
                handleTitleChange(event.target.value)
              }
              maxLength={180}
              autoFocus
              placeholder="Enter story title..."
              className="
                h-10
                w-full
                border-0
                bg-transparent
                px-1

                text-[16px]
                font-bold
                tracking-[-0.02em]
                text-slate-900

                outline-none

                placeholder:text-slate-300

                sm:text-[17px]
              "
            />

          </div>

          {/* URL */}

          {slug && (
            <span
              className="
                hidden
                max-w-[250px]
                truncate
                text-[8px]
                font-medium
                text-slate-300
                lg:block
              "
            >
              /blogs/{slug}
            </span>
          )}

          <div className="h-6 w-px shrink-0 bg-slate-200" />

          {/* COVER */}

          {!coverPreview ? (
            <button
              type="button"
              onClick={() =>
                coverInputRef.current?.click()
              }
              className="
                flex
                h-9
                shrink-0
                items-center
                gap-1.5
                rounded-lg
                border
                border-slate-200
                bg-white
                px-2.5
                text-[9px]
                font-bold
                text-slate-500
                transition-all
                hover:border-[#f07060]/40
                hover:bg-[#fff8f6]
                hover:text-[#f07060]
                sm:px-3
              "
            >
              <ImageIcon className="size-3.5" />

              <span className="hidden xs:inline sm:inline">
                Cover image
              </span>
            </button>
          ) : (
            <div
              className="
                flex
                shrink-0
                items-center
                gap-2
                rounded-lg
                border
                border-slate-200
                bg-slate-50
                p-1
                pr-1.5
              "
            >

              <img
                src={coverPreview}
                alt=""
                className="
                  size-8
                  rounded-md
                  object-cover
                "
              />

              <div className="hidden min-w-0 sm:block">

                <p
                  className="
                    text-[8px]
                    font-bold
                    text-slate-600
                  "
                >
                  Cover image
                </p>

                <p
                  className={`
                    mt-0.5
                    text-[7px]
                    font-semibold

                    ${uploadingCover
                      ? "text-slate-400"
                      : "text-emerald-600"
                    }
                  `}
                >
                  {uploadingCover
                    ? "Uploading..."
                    : uploadedCoverUrl
                      ? "Ready"
                      : "Selected"}
                </p>

              </div>

              {uploadingCover ? (
                <Loader2 className="mx-1 size-3 animate-spin text-slate-400" />
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    coverInputRef.current?.click()
                  }
                  className="
                    hidden
                    rounded-md
                    px-1.5
                    py-1
                    text-[8px]
                    font-bold
                    text-slate-400
                    transition
                    hover:bg-white
                    hover:text-slate-700
                    sm:block
                  "
                >
                  Change
                </button>
              )}

              <button
                type="button"
                onClick={removeCover}
                className="
                  flex
                  size-7
                  items-center
                  justify-center
                  rounded-md
                  text-slate-300
                  transition
                  hover:bg-red-50
                  hover:text-red-500
                "
              >
                <Trash2 className="size-3" />
              </button>

            </div>
          )}

          <input
            ref={coverInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleCoverChange}
            className="hidden"
          />

        </div>

      </section>

      {/* ===================================================
          MASSIVE EDITOR

          NO CARD
          NO DOCUMENT CANVAS
          NO SECOND CONTAINER

          THE EDITOR IS THE PAGE.
      =================================================== */}

      <main
        className="
          relative
          min-h-0
          flex-1
          overflow-hidden
          bg-white
        "
      >

        <div
          data-color-mode="light"
          className="
            baremind-full-editor
            h-full
            w-full
          "
        >
          <WysiwygEditor
            value={content}
            onChange={setContent}
          />
        </div>

      </main>

      {/* ===================================================
          STATUS BAR
      =================================================== */}

      <footer
        className="
          z-40
          flex
          h-7
          shrink-0
          items-center
          justify-between
          border-t
          border-slate-200
          bg-[#fafafa]
          px-3
          text-[8px]
          font-semibold
          text-slate-400
          sm:px-5
        "
      >

        <div className="flex items-center gap-3">

          <span>
            {words.toLocaleString()} words
          </span>

          <span className="hidden sm:inline">
            {readTime} min read
          </span>

          {uploadedCoverUrl && (
            <span
              className="
                hidden
                items-center
                gap-1
                text-emerald-600
                md:flex
              "
            >
              <CheckCircle2 className="size-2.5" />
              Cover ready
            </span>
          )}

        </div>

        <div className="flex items-center gap-3">

          <span className="flex items-center gap-1.5">

            <span
              className={`
                size-1.5
                rounded-full

                ${isPublished
                  ? "bg-emerald-500"
                  : "bg-amber-500"
                }
              `}
            />

            {isPublished ? "Public" : "Draft"}

          </span>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="
              flex
              items-center
              gap-1
              transition
              hover:text-slate-700
            "
          >
            <PanelRight className="size-3" />

            <span className="hidden sm:inline">
              Publishing
            </span>
          </button>

        </div>

      </footer>

      {/* ===================================================
          ERROR
      =================================================== */}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{
              opacity: 0,
              y: -8,
              x: "-50%",
            }}
            animate={{
              opacity: 1,
              y: 0,
              x: "-50%",
            }}
            exit={{
              opacity: 0,
              y: -8,
              x: "-50%",
            }}
            className="
              fixed
              left-1/2
              top-[68px]
              z-[100]
              flex
              w-[calc(100%-32px)]
              max-w-md
              items-center
              justify-between
              gap-4
              rounded-xl
              border
              border-red-200
              bg-white
              px-4
              py-3
              shadow-2xl
            "
          >
            <p className="text-[10px] font-semibold text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() => setError(null)}
              className="
                flex
                size-7
                shrink-0
                items-center
                justify-center
                rounded-lg
                text-red-400
                hover:bg-red-50
              "
            >
              <X className="size-3.5" />
            </button>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================
          SETTINGS PANEL
      =================================================== */}

      <AnimatePresence>
        {settingsOpen && (
          <>

            {/* OVERLAY */}

            <motion.button
              type="button"
              aria-label="Close settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettingsOpen(false)}
              className="
                fixed
                inset-0
                z-[70]
                bg-slate-950/15
                backdrop-blur-[1px]
              "
            />

            {/* PANEL */}

            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{
                duration: 0.24,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="
                fixed
                bottom-0
                right-0
                top-0
                z-[80]
                flex
                w-full
                max-w-[390px]
                flex-col
                border-l
                border-slate-200
                bg-white
                shadow-[-15px_0_50px_rgba(15,23,42,0.08)]
              "
            >

              {/* HEADER */}

              <div
                className="
                  flex
                  h-16
                  shrink-0
                  items-center
                  justify-between
                  border-b
                  border-slate-200
                  px-5
                "
              >

                <div>
                  <h2 className="text-[13px] font-black text-slate-950">
                    Publishing settings
                  </h2>

                  <p className="mt-0.5 text-[8px] text-slate-400">
                    Configure your story before publishing
                  </p>
                </div>

                {/* SCHEDULED PUBLISHING INPUT & REVISIONS SECTION */}

                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="
                    flex
                    size-8
                    items-center
                    justify-center
                    rounded-lg
                    text-slate-400
                    transition
                    hover:bg-slate-100
                    hover:text-slate-700
                  "
                >
                  <X className="size-4" />
                </button>

              </div>

              {/* BODY */}

              <div className="flex-1 overflow-y-auto">

                {/* VISIBILITY */}

                <SettingSection
                  title="Visibility"
                  description="Choose how this story should be saved."
                >

                  <div
                    className="
                      grid
                      grid-cols-2
                      gap-1
                      rounded-xl
                      bg-slate-100
                      p-1
                    "
                  >

                    <button
                      type="button"
                      onClick={() => setIsPublished(true)}
                      className={`
                        flex
                        h-10
                        items-center
                        justify-center
                        gap-1.5
                        rounded-lg
                        text-[9px]
                        font-bold
                        transition

                        ${isPublished
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-400"
                        }
                      `}
                    >
                      <Eye className="size-3.5" />
                      Public
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPublished(false)}
                      className={`
                        flex
                        h-10
                        items-center
                        justify-center
                        gap-1.5
                        rounded-lg
                        text-[9px]
                        font-bold
                        transition

                        ${!isPublished
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-400"
                        }
                      `}
                    >
                      <EyeOff className="size-3.5" />
                      Draft
                    </button>

                  </div>

                </SettingSection>

                {/* SCHEDULED PUBLISHING */}
                <SettingSection
                  title="Scheduled Publishing"
                  description="Set a future date & time to release this story automatically."
                >
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-900 outline-none transition focus:border-[#f07060]"
                  />
                  {scheduledAt && (
                    <button
                      type="button"
                      onClick={() => setScheduledAt("")}
                      className="mt-1.5 text-[8px] font-bold text-red-500 hover:underline"
                    >
                      Clear schedule
                    </button>
                  )}
                </SettingSection>

                {/* REVISION HISTORY */}
                <SettingSection
                  title="Revision History"
                  description="Restore previously saved snapshots of this draft."
                >
                  {revisions.length === 0 ? (
                    <p className="text-[9px] text-slate-400 italic">No revisions saved yet. Keep typing!</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {revisions.map((rev, index) => (
                        <div
                          key={rev.timestamp}
                          className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2 text-[9px]"
                        >
                          <div>
                            <p className="font-bold text-slate-700">
                              {new Date(rev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                            <p className="text-[8px] text-slate-400">
                              {rev.content.length} chars
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("Restore this revision? Your current content will be replaced.")) {
                                setContent(rev.content);
                                if (rev.title) setTitle(rev.title);
                              }
                            }}
                            className="rounded bg-slate-900 px-2 py-1 font-bold text-white transition hover:bg-[#f07060]"
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </SettingSection>

                {/* CATEGORY */}

                <SettingSection
                  title="Category"
                  description="Choose the primary topic."
                >
                  <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <span className="text-[9px] font-medium text-slate-400">Select category or use AI Auto-Category</span>
                    <button
                      type="button"
                      onClick={handleAutoCategory}
                      disabled={isAutoCategorizing || (!title.trim() && !content.trim())}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#f07060]/30 bg-[#fff0ed] px-2.5 py-1 text-[9px] font-extrabold text-[#f07060] shadow-sm transition hover:bg-[#ffe3dd] disabled:opacity-50"
                    >
                      {isAutoCategorizing ? (
                        <Loader2 className="size-3 animate-spin text-[#f07060]" />
                      ) : (
                        <Sparkles className="size-3 text-[#f07060]" />
                      )}
                      <span>Magic Auto-Category</span>
                    </button>
                  </div>

                  <div className="relative">

                    <select
                      value={categoryId ?? ""}
                      onChange={(event) =>
                        setCategoryId(
                          event.target.value
                            ? Number(event.target.value)
                            : undefined
                        )
                      }
                      className="
                        h-11
                        w-full
                        appearance-none
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        pl-3.5
                        pr-10
                        text-[10px]
                        font-semibold
                        text-slate-700
                        outline-none
                        transition
                        focus:border-[#f07060]
                        focus:ring-4
                        focus:ring-[#f07060]/10
                      "
                    >
                      <option value="">
                        Select category
                      </option>

                      {categories.map((category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      ))}
                    </select>

                    <ChevronDown
                      className="
                        pointer-events-none
                        absolute
                        right-3.5
                        top-1/2
                        size-3.5
                        -translate-y-1/2
                        text-slate-400
                      "
                    />

                  </div>

                </SettingSection>

                {/* TAGS */}

                <SettingSection
                  title="Tags"
                  description="Add topics that describe your story."
                >
                  <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <span className="text-[9px] font-medium text-slate-400">Select topics or use AI Auto-Tag</span>
                    <button
                      type="button"
                      onClick={handleAutoTag}
                      disabled={isAutoTagging || (!title.trim() && !content.trim())}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#f07060]/30 bg-[#fff0ed] px-2.5 py-1 text-[9px] font-extrabold text-[#f07060] shadow-sm transition hover:bg-[#ffe3dd] disabled:opacity-50"
                    >
                      {isAutoTagging ? (
                        <Loader2 className="size-3 animate-spin text-[#f07060]" />
                      ) : (
                        <Sparkles className="size-3 text-[#f07060]" />
                      )}
                      <span>Magic Auto-Tag</span>
                    </button>
                  </div>

                  {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">

                      {tags.map((tag) => {
                        const selected =
                          selectedTags.includes(tag.id)

                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() =>
                              toggleTag(tag.id)
                            }
                            className={`
                              inline-flex
                              min-h-8
                              items-center
                              gap-1
                              rounded-full
                              border
                              px-3
                              text-[9px]
                              font-bold
                              transition

                              ${selected
                                ? "border-[#f07060]/20 bg-[#fff1ee] text-[#f07060]"
                                : "border-slate-200 text-slate-500 hover:border-slate-300"
                              }
                            `}
                          >
                            {selected && (
                              <Check className="size-2.5" />
                            )}

                            #{tag.name}
                          </button>
                        )
                      })}

                    </div>
                  ) : (
                    <p className="text-[9px] text-slate-400">
                      No tags available.
                    </p>
                  )}

                </SettingSection>

                {/* COVER */}

                <SettingSection
                  title="Cover image"
                  description="Used in BareMind feeds and story previews."
                >

                  {coverPreview ? (
                    <div>

                      <div
                        className="
                          overflow-hidden
                          rounded-xl
                          border
                          border-slate-200
                        "
                      >
                        <img
                          src={coverPreview}
                          alt=""
                          className="
                            aspect-[16/8]
                            w-full
                            object-cover
                          "
                        />
                      </div>

                      <div
                        className="
                          mt-2.5
                          flex
                          items-center
                          justify-between
                        "
                      >

                        <span
                          className={`
                            flex
                            items-center
                            gap-1
                            text-[8px]
                            font-semibold

                            ${uploadedCoverUrl
                              ? "text-emerald-600"
                              : "text-slate-400"
                            }
                          `}
                        >
                          {uploadingCover ? (
                            <>
                              <Loader2 className="size-3 animate-spin" />
                              Uploading
                            </>
                          ) : uploadedCoverUrl ? (
                            <>
                              <CheckCircle2 className="size-3" />
                              Ready
                            </>
                          ) : (
                            "Selected"
                          )}
                        </span>

                        <div className="flex items-center gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              coverInputRef.current?.click()
                            }
                            className="
                              text-[8px]
                              font-bold
                              text-slate-500
                              hover:text-slate-900
                            "
                          >
                            Replace
                          </button>

                          <button
                            type="button"
                            onClick={removeCover}
                            className="
                              text-[8px]
                              font-bold
                              text-red-500
                            "
                          >
                            Remove
                          </button>

                        </div>

                      </div>

                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        coverInputRef.current?.click()
                      }
                      className="
                        flex
                        w-full
                        items-center
                        gap-3
                        rounded-xl
                        border
                        border-dashed
                        border-slate-300
                        bg-slate-50
                        p-3
                        text-left
                        transition
                        hover:border-[#f07060]/40
                        hover:bg-[#fff8f6]
                      "
                    >

                      <span
                        className="
                          flex
                          size-9
                          items-center
                          justify-center
                          rounded-lg
                          bg-white
                          text-slate-400
                          shadow-sm
                        "
                      >
                        <UploadCloud className="size-4" />
                      </span>

                      <span>
                        <span className="block text-[9px] font-bold text-slate-700">
                          Upload cover image
                        </span>

                        <span className="mt-0.5 block text-[8px] text-slate-400">
                          PNG, JPG or WebP · max 10 MB
                        </span>
                      </span>

                    </button>
                  )}

                </SettingSection>

                {/* STATS */}

                <SettingSection
                  title="Story details"
                  description="Live information about this article."
                >

                  <div className="space-y-3">

                    <InfoRow
                      label="Words"
                      value={words.toLocaleString()}
                    />

                    <InfoRow
                      label="Reading time"
                      value={`${readTime} min`}
                    />

                    <InfoRow
                      label="Status"
                      value={
                        isPublished
                          ? "Public"
                          : "Draft"
                      }
                    />

                  </div>

                </SettingSection>

              </div>

              {/* FOOTER */}

              <div
                className="
                  shrink-0
                  border-t
                  border-slate-200
                  p-4
                "
              >

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    success ||
                    uploadingCover
                  }
                  className="
                    flex
                    h-11
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-slate-950
                    text-[10px]
                    font-extrabold
                    text-white
                    transition
                    hover:bg-[#f07060]
                    disabled:opacity-50
                  "
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : isPublished ? (
                    <>
                      <Send className="size-3.5" />
                      Publish story
                    </>
                  ) : (
                    <>
                      <FileText className="size-3.5" />
                      Save draft
                    </>
                  )}
                </button>

              </div>

            </motion.aside>

          </>
        )}
      </AnimatePresence>

    </div>
  )
}

/* =========================================================
   SETTING SECTION
========================================================= */

function SettingSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section
      className="
        border-b
        border-slate-100
        px-5
        py-5
      "
    >
      <div className="mb-3.5">

        <h3
          className="
            text-[10px]
            font-extrabold
            text-slate-800
          "
        >
          {title}
        </h3>

        {description && (
          <p
            className="
              mt-1
              text-[8px]
              font-medium
              leading-4
              text-slate-400
            "
          >
            {description}
          </p>
        )}

      </div>

      {children}
    </section>
  )
}

/* =========================================================
   INFO ROW
========================================================= */

function InfoRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between">

      <span className="text-[9px] text-slate-400">
        {label}
      </span>

      <span className="text-[9px] font-bold text-slate-700">
        {value}
      </span>

    </div>
  )
}

/* =========================================================
   EDITOR STYLES

   THIS IS THE IMPORTANT PART.

   WysiwygEditor becomes a full-screen writing application.
========================================================= */

function EditorStyles() {
  return (
    <style>{`

      /* ================================================
         EDITOR ROOT
      ================================================ */

      .baremind-full-editor {
        height: 100%;
        width: 100%;
        min-width: 0;
        overflow: hidden;
        background: #ffffff;
      }

      .baremind-full-editor .w-md-editor {
        display: flex !important;
        flex-direction: column !important;

        width: 100% !important;
        height: 100% !important;
        min-height: 100% !important;

        border: 0 !important;
        border-radius: 0 !important;

        background: #ffffff !important;

        box-shadow: none !important;
      }


      /* ================================================
         FORMATTING TOOLBAR
      ================================================ */

      .baremind-full-editor .w-md-editor-toolbar {
        position: relative !important;
        z-index: 20 !important;

        flex-shrink: 0 !important;

        min-height: 46px !important;

        padding:
          7px 18px !important;

        border: 0 !important;

        border-bottom:
          1px solid #e2e8f0 !important;

        border-radius:
          0 !important;

        background:
          #fafafa !important;

        box-shadow:
          none !important;
      }

      .baremind-full-editor
      .w-md-editor-toolbar
      ul {
        display: flex !important;

        align-items: center !important;

        flex-wrap: wrap !important;

        gap: 2px !important;

        max-width: 1600px !important;

        margin:
          0 auto !important;
      }

      .baremind-full-editor
      .w-md-editor-toolbar
      li {
        margin:
          0 !important;
      }

      .baremind-full-editor
      .w-md-editor-toolbar
      li > button {
        display:
          inline-flex !important;

        align-items:
          center !important;

        justify-content:
          center !important;

        width:
          30px !important;

        height:
          30px !important;

        border-radius:
          6px !important;

        color:
          #64748b !important;

        transition:
          all 0.15s ease !important;
      }

      .baremind-full-editor
      .w-md-editor-toolbar
      li > button:hover {
        background:
          #ffffff !important;

        color:
          #0f172a !important;

        box-shadow:
          0 1px 4px
          rgba(15,23,42,0.08)
          !important;
      }

      .baremind-full-editor
      .w-md-editor-toolbar-divider {
        margin:
          0 5px !important;

        background:
          #e2e8f0 !important;
      }


      /* ================================================
         CONTENT AREA
      ================================================ */

      .baremind-full-editor .w-md-editor-content {
        flex: 1 1 auto !important;

        min-height: 0 !important;

        height: auto !important;

        overflow: hidden !important;

        background:
          #ffffff !important;
      }

      .baremind-full-editor .w-md-editor-area {
        min-width: 0 !important;

        height: 100% !important;

        background:
          #ffffff !important;
      }

      .baremind-full-editor .w-md-editor-input {
        min-width: 0 !important;

        height: 100% !important;

        overflow-y:
          auto !important;

        background:
          #ffffff !important;
      }


      /* ================================================
         WRITING SURFACE

         This is NOT another card/canvas.

         We simply give the text comfortable margins
         while the editor remains full screen.
      ================================================ */

      .baremind-full-editor
      .w-md-editor-text-pre,

      .baremind-full-editor
      .w-md-editor-text-input {
        box-sizing:
          border-box !important;

        min-height:
          100% !important;

        padding:
          48px max(40px, calc((100vw - 1100px) / 2))
          180px !important;

        font-family:
          Inter,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif !important;

        font-size:
          16px !important;

        line-height:
          1.85 !important;

        letter-spacing:
          -0.005em !important;

        background:
          #ffffff !important;
      }

      .baremind-full-editor
      .w-md-editor-text-input {
        color:
          #334155 !important;

        caret-color:
          ${BRAND} !important;

        outline:
          none !important;
      }

      .baremind-full-editor
      .w-md-editor-text-pre
      > code {
        color:
          #334155 !important;
      }


      /* ================================================
         PREVIEW
      ================================================ */

      .baremind-full-editor
      .w-md-editor-preview {
        height:
          100% !important;

        min-width:
          0 !important;

        overflow-y:
          auto !important;

        background:
          #ffffff !important;
      }

      .baremind-full-editor
      .wmde-markdown {
        box-sizing:
          border-box !important;

        min-height:
          100% !important;

        padding:
          48px max(40px, calc((100vw - 1100px) / 2))
          180px !important;

        background:
          #ffffff !important;

        color:
          #334155 !important;

        font-family:
          Inter,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif !important;

        font-size:
          16px !important;

        line-height:
          1.85 !important;
      }


      /* ================================================
         PREVIEW TYPOGRAPHY
      ================================================ */

      .baremind-full-editor
      .wmde-markdown p {
        margin:
          0 0 1.35em !important;
      }

      .baremind-full-editor
      .wmde-markdown h1 {
        margin:
          1.7em 0 0.65em !important;

        color:
          #0f172a !important;

        font-size:
          32px !important;

        line-height:
          1.2 !important;

        font-weight:
          850 !important;

        letter-spacing:
          -0.04em !important;
      }

      .baremind-full-editor
      .wmde-markdown h2 {
        margin:
          1.7em 0 0.6em !important;

        color:
          #0f172a !important;

        font-size:
          25px !important;

        line-height:
          1.25 !important;

        font-weight:
          800 !important;

        letter-spacing:
          -0.03em !important;
      }

      .baremind-full-editor
      .wmde-markdown h3 {
        margin:
          1.5em 0 0.5em !important;

        color:
          #0f172a !important;

        font-size:
          20px !important;

        font-weight:
          800 !important;
      }

      .baremind-full-editor
      .wmde-markdown blockquote {
        margin:
          1.5em 0 !important;

        padding:
          4px 0 4px 18px !important;

        border-left:
          3px solid ${BRAND} !important;

        color:
          #64748b !important;
      }

      .baremind-full-editor
      .wmde-markdown img {
        max-width:
          100% !important;

        margin:
          1.5em auto !important;

        border-radius:
          8px !important;
      }

      .baremind-full-editor
      .wmde-markdown pre {
        margin:
          1.5em 0 !important;

        border:
          1px solid #e2e8f0 !important;

        border-radius:
          8px !important;
      }


      /* ================================================
         REMOVE RESIZE BAR
      ================================================ */

      .baremind-full-editor
      .w-md-editor-bar {
        display:
          none !important;
      }


      /* ================================================
         TABLET
      ================================================ */

      @media (max-width: 1024px) {

        .baremind-full-editor
        .w-md-editor-text-pre,

        .baremind-full-editor
        .w-md-editor-text-input,

        .baremind-full-editor
        .wmde-markdown {
          padding-left:
            48px !important;

          padding-right:
            48px !important;
        }

      }


      /* ================================================
         MOBILE
      ================================================ */

      @media (max-width: 640px) {

        .baremind-full-editor
        .w-md-editor-toolbar {
          padding:
            6px 10px !important;

          overflow-x:
            auto !important;

          overflow-y:
            hidden !important;

          scrollbar-width:
            none;
        }

        .baremind-full-editor
        .w-md-editor-toolbar::-webkit-scrollbar {
          display:
            none;
        }

        .baremind-full-editor
        .w-md-editor-toolbar
        ul {
          width:
            max-content !important;

          flex-wrap:
            nowrap !important;
        }

        .baremind-full-editor
        .w-md-editor-text-pre,

        .baremind-full-editor
        .w-md-editor-text-input {
          padding:
            28px 20px
            130px !important;

          font-size:
            15px !important;

          line-height:
            1.8 !important;
        }

        .baremind-full-editor
        .wmde-markdown {
          padding:
            28px 20px
            130px !important;

          font-size:
            15px !important;
        }

      }

    `}</style>
  )
}