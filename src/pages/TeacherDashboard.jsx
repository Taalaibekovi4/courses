// src/pages/TeacherDashboard.jsx
import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle,
  Clock,
  XCircle,
  Archive,
  ChevronDown,
  Pencil,
  Undo2,
  Paperclip,
  Plus,
  X,
  Video,
  Search,
  FolderPen,
  Trash2,
  Image as ImageIcon,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext.jsx";
import { useData } from "../contexts/DataContext.jsx";

import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Button } from "../components/ui/button.jsx";
import { Textarea } from "../components/ui/textarea.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.jsx";
import { Input } from "../components/ui/input.jsx";

const norm = (s) => String(s ?? "").trim();
const normLow = (s) => norm(s).toLowerCase();

const LS_TEACHER_HW_ARCHIVE = "teacher_hw_archive_v1";

/* =========================
   ✅ ABS URL helper (как в CoursePage)
   чтобы /media/... работал на сервере
   ========================= */
const API_BASE_RAW =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) || "";

const API_ORIGIN = norm(API_BASE_RAW).replace(/\/api\/?$/i, "").replace(/\/$/, "");

function toAbsUrl(url) {
  const u = norm(url);
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/")) {
    if (API_ORIGIN) return `${API_ORIGIN}${u}`;
    return u;
  }
  if (API_ORIGIN) return `${API_ORIGIN}/${u}`;
  return u;
}

function safeJsonParse(s, fallback) {
  try {
    const v = JSON.parse(s);
    return v ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function getTeacherArchivedSet(teacherId) {
  const raw = localStorage.getItem(LS_TEACHER_HW_ARCHIVE) || "{}";
  const obj = safeJsonParse(raw, {});
  const key = String(teacherId || "0");
  const arr = Array.isArray(obj[key]) ? obj[key] : [];
  return new Set(arr.map(String));
}

function setTeacherArchivedSet(teacherId, set) {
  const raw = localStorage.getItem(LS_TEACHER_HW_ARCHIVE) || "{}";
  const obj = safeJsonParse(raw, {});
  const key = String(teacherId || "0");
  obj[key] = Array.from(set);
  localStorage.setItem(LS_TEACHER_HW_ARCHIVE, JSON.stringify(obj));
}

function StatusBadge({ status }) {
  const s = normLow(status);

  if (s === "accepted")
    return <Badge className="bg-green-600 text-white border-transparent">Принято</Badge>;
  if (s === "rework")
    return <Badge className="bg-orange-600 text-white border-transparent">На доработку</Badge>;
  if (s === "declined") return <Badge variant="destructive">Отклонено</Badge>;

  // ✅ API присылает "examination" как "на проверке"
  if (s === "examination" || !s) return <Badge variant="secondary">На проверке</Badge>;

  return <Badge variant="outline">—</Badge>;
}

/* =========================
   YouTube status badge
   ========================= */
function YouTubeStatusBadge({ status, error }) {
  const s = normLow(status);

  if (!s) return <Badge variant="outline">—</Badge>;
  if (s === "ready" || s === "completed" || s === "success")
    return <Badge className="bg-green-600 text-white border-transparent"> готово</Badge>;
  if (s === "processing" || s === "pending")
    return <Badge className="bg-orange-600 text-white border-transparent"> обработка</Badge>;
  if (s === "uploading")
    return <Badge className="bg-blue-600 text-white border-transparent"> загрузка</Badge>;
  if (s === "error" || s === "failed")
    return (
      <Badge variant="destructive" title={norm(error) || ""}>
        ошибка
      </Badge>
    );

  return <Badge variant="secondary"> {status}</Badge>;
}

/* =========================
   Scrollbar hide helper
   ========================= */
function GlobalNoScrollbarStyle() {
  return (
    <style>{`
      .sb-no-scrollbar::-webkit-scrollbar{ width:0px; height:0px; }
      .sb-no-scrollbar{ scrollbar-width:none; -ms-overflow-style:none; }
    `}</style>
  );
}

/* =========================
   Body scroll lock (FIX!)
   ========================= */
let __sbLockCount = 0;
let __sbPrevOverflow = "";
let __sbPrevPadRight = "";

function lockBodyScroll() {
  try {
    const body = document.body;
    if (!body) return;

    if (__sbLockCount === 0) {
      __sbPrevOverflow = body.style.overflow || "";
      __sbPrevPadRight = body.style.paddingRight || "";

      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollBarWidth > 0) body.style.paddingRight = `${scrollBarWidth}px`;

      body.style.overflow = "hidden";
    }
    __sbLockCount += 1;
  } catch (_) {}
}

function unlockBodyScroll() {
  try {
    const body = document.body;
    if (!body) return;

    __sbLockCount = Math.max(0, __sbLockCount - 1);
    if (__sbLockCount === 0) {
      body.style.overflow = __sbPrevOverflow;
      body.style.paddingRight = __sbPrevPadRight;
    }
  } catch (_) {}
}

/* =========================
   Video preview (teacher)
   - mp4/webm/ogg/blob -> <video>
   - youtube url/id -> <iframe>
   ========================= */
function extractYouTubeId(input) {
  const v = norm(input);
  if (!v) return "";

  if (/^[a-zA-Z0-9_-]{6,}$/.test(v) && !v.includes("/") && !v.includes(".")) {
    return v;
  }

  try {
    const u = new URL(v);
    const host = (u.hostname || "").toLowerCase();

    if (host.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id || "";
    }

    if (host.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return id;

      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "embed");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];

      const sidx = parts.findIndex((p) => p === "shorts");
      if (sidx >= 0 && parts[sidx + 1]) return parts[sidx + 1];
    }
  } catch (_) {}

  return "";
}

function isDirectVideoUrl(input) {
  const v = normLow(input);
  if (!v) return false;
  if (v.startsWith("blob:")) return true;

  // ✅ серверные /media/... тоже считаем видео
  if (v.startsWith("/media/") || v.includes("/media/")) return true;

  return (
    v.endsWith(".mp4") ||
    v.endsWith(".webm") ||
    v.endsWith(".ogg") ||
    v.includes(".mp4?") ||
    v.includes(".webm?") ||
    v.includes(".ogg?")
  );
}

function VideoPreview({ source, className = "", heightClass = "h-[160px]" }) {
  const raw = norm(source);
  if (!raw) {
    return (
      <div
        className={`rounded-lg bg-gray-100 border flex items-center justify-center text-sm text-gray-600 ${heightClass} ${className}`}
      >
        Видео не выбрано
      </div>
    );
  }

  // ✅ делаем абсолютный урл как на CoursePage
  const src = toAbsUrl(raw);
  const ytId = extractYouTubeId(src) || extractYouTubeId(raw);

  if (ytId) {
    const embed = `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1`;
    return (
      <div className={`rounded-lg overflow-hidden bg-black border ${heightClass} ${className}`}>
        <iframe
          title="YouTube preview"
          src={embed}
          className={`w-full ${heightClass}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  if (
    isDirectVideoUrl(src) ||
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("blob:")
  ) {
    return (
      <div className={`rounded-lg overflow-hidden bg-black border ${className}`}>
        <video
          src={src}
          controls
          className={`w-full ${heightClass} object-cover bg-black`}
          preload="metadata"
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg bg-gray-100 border flex items-center justify-center text-sm text-gray-600 ${heightClass} ${className}`}
    >
      Видео недоступно для предпросмотра
    </div>
  );
}

/* =========================
   SearchableSelectSingle — НЕ portal
   ========================= */
function SearchableSelectSingle({
  value,
  onChange,
  options,
  placeholder = "Выберите...",
  searchPlaceholder = "Поиск...",
  disabled = false,
  getLabel = (o) => o?.label ?? "",
  getValue = (o) => o?.value ?? "",
  className = "",
}) {
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(() => {
    const v = String(value ?? "");
    return (Array.isArray(options) ? options : []).find((o) => String(getValue(o)) === v) || null;
  }, [value, options, getValue]);

  const filtered = useMemo(() => {
    const q = normLow(query);
    const list = Array.isArray(options) ? options : [];
    if (!q) return list;
    return list.filter((o) => normLow(getLabel(o)).includes(q));
  }, [options, query, getLabel]);

  useEffect(() => {
    const onDown = (e) => {
      if (!open) return;
      const w = wrapRef.current;
      if (w && w.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const pick = (val) => {
    onChange?.(val);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={`w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((p) => !p);
        }}
        className={[
          "w-full border rounded-md px-3 py-2 bg-white flex items-center justify-between gap-2",
          "hover:bg-gray-50 transition",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        ].join(" ")}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`text-sm ${selected ? "text-gray-900" : "text-gray-500"}`}>
          {selected ? getLabel(selected) : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-2 rounded-xl border bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b">
            <div className="flex items-center gap-2 rounded-lg border px-2 py-1.5">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full text-sm outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-1 rounded-md hover:bg-gray-100 transition"
                  aria-label="Очистить"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="max-h-64 overflow-auto sb-no-scrollbar">
            <button
              type="button"
              onClick={() => pick("")}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            >
              {placeholder}
            </button>

            {filtered.map((o) => {
              const v = String(getValue(o));
              const label = getLabel(o);
              const isActive = String(value ?? "") === v;

              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => pick(v)}
                  className={[
                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-50",
                    isActive ? "bg-blue-50" : "",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="px-3 py-3 text-sm text-gray-500">Ничего не найдено</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   Attachments view
   ========================= */
function AttachmentsView({ attachments }) {
  const list = Array.isArray(attachments) ? attachments : [];
  if (!list.length) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-gray-600">Прикрепления:</p>
      <div className="space-y-1">
        {list.map((a, idx) => {
          const key = `${a?.type || "x"}_${idx}`;
          const url = a?.url || a?.file || a?.link || "";
          const name = a?.name || a?.filename || "Файл";
          const isLink = a?.type === "link";

          return (
            <div key={key} className="text-sm">
              {url ? (
                <a
                  href={toAbsUrl(url)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {isLink ? "🔗 " : "📎 "}
                  {name}
                </a>
              ) : (
                <span className="text-gray-700">📎 {name}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================
   Homework materials single file
   ========================= */
function LessonHomeworkMaterialsSingle({ file, existingUrl, onPick, onClear }) {
  const fileRef = useRef(null);

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">Материалы к ДЗ</div>

      {existingUrl ? (
        <div className="text-sm">
          Текущий файл:{" "}
          <a
            href={toAbsUrl(existingUrl)}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline break-all"
          >
            Открыть
          </a>
        </div>
      ) : null}

      {file ? (
        <div className="border rounded-lg p-3 bg-white flex items-start justify-between gap-3">
          <div className="text-sm break-all">📎 {file.name}</div>
          <Button variant="outline" size="sm" onClick={onClear}>
            Удалить файл
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          <label className="text-xs text-gray-600">Файл (кликни чтобы выбрать)</label>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full text-left border rounded-md px-3 py-2 bg-white hover:bg-gray-50 transition flex items-center gap-2
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Paperclip className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-700">Выбрать файл</span>
          </button>

          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              if (f) onPick?.(f);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}

/* =========================
   Modal (FIX scroll lock)
   ========================= */
function Modal({ title, isOpen, onClose, children, closeOnOverlay = true }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={closeOnOverlay ? onClose : undefined} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-xl border">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-[85vh] overflow-auto sb-no-scrollbar">{children}</div>
      </div>
    </div>
  );
}

/* =========================
   Confirm modal (no window.confirm)
   ========================= */
function ConfirmModal({ isOpen, title, description, onCancel, onConfirm, confirmText = "Удалить" }) {
  return (
    <Modal title={title} isOpen={isOpen} onClose={onCancel} closeOnOverlay={false}>
      <div className="space-y-4">
        <div className="text-sm text-gray-700 whitespace-pre-wrap">{description}</div>
        <div className="flex gap-3">
          <Button variant="destructive" className="w-full" onClick={onConfirm}>
            <Trash2 className="w-4 h-4 mr-2" />
            {confirmText}
          </Button>
          <Button variant="outline" className="w-full" onClick={onCancel}>
            Отмена
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* =========================
   Normalizers
   ========================= */
function normalizeCourseId(c) {
  const id = c?.id ?? c?.course_id ?? c?.pk ?? "";
  return String(id || "");
}
function normalizeCategoryName(c) {
  return c?.categoryName ?? c?.category_name ?? c?.category?.name ?? c?.category?.title ?? "";
}
function normalizeCourseTitle(c) {
  return c?.title ?? c?.name ?? c?.course_title ?? "";
}
function normalizeLessonId(l) {
  const id = l?.id ?? l?.pk ?? "";
  return String(id || "");
}
function normalizeLessonTitle(l) {
  return l?.title ?? l?.lesson_title ?? "";
}
function normalizeLessonCourseId(l) {
  const c = l?.course;
  const cid =
    l?.courseId ??
    l?.course_id ??
    (c && typeof c === "object" ? c.id : c) ??
    "";
  return String(cid || "");
}

function normalizeHomework(hw) {
  const id = hw?.id ?? "";
  const courseId = hw?.course_id ?? hw?.courseId ?? hw?.course ?? "";
  const courseTitle = hw?.course_title ?? hw?.courseTitle ?? "";
  const lessonId = hw?.lesson ?? hw?.lesson_id ?? hw?.lessonId ?? hw?.lesson?.id ?? "";
  const lessonTitle = hw?.lesson_title ?? hw?.lessonTitle ?? hw?.lesson?.title ?? "";
  const userId = hw?.user ?? hw?.userId ?? hw?.student ?? hw?.student_id ?? "";
  const studentUsername =
    hw?.student_username ?? hw?.studentUsername ?? hw?.username ?? hw?.student?.username ?? "";
  const content = hw?.content ?? "";
  const status = hw?.status ?? "examination";
  const teacherComment = hw?.comment ?? hw?.teacherComment ?? "";
  const createdAt = hw?.created_at ?? hw?.createdAt ?? "";
  const reviewedAt = hw?.updated_at ?? hw?.reviewedAt ?? hw?.updatedAt ?? "";

  return {
    id: String(id),
    courseId: String(courseId),
    courseTitle: String(courseTitle),
    lessonId: String(lessonId),
    lessonTitle: String(lessonTitle),
    userId: String(userId),
    studentUsername: String(studentUsername),
    content: String(content),
    status: String(status || "examination"),
    teacherComment: String(teacherComment || ""),
    createdAt: String(createdAt || ""),
    reviewedAt: String(reviewedAt || ""),
    attachments: hw?.attachments ?? [],
  };
}

function isTeacherCanReview(status) {
  const s = normLow(status);
  // ✅ API: examination / rework можно проверять
  return s === "examination" || s === "rework" || !s;
}

/* =========================
   Teacher Dashboard
   ========================= */
export function TeacherDashboard() {
  const { user } = useAuth();
  const data = useData();

  const {
    categories,
    courses,

    teacherLessons,
    teacherHomeworks,

    loadPublic,
    loadTeacherLessons,
    loadTeacherHomeworks,

    reviewHomework,

    addLesson,
    updateLesson,
    deleteLesson,

    addCourse,
    updateCourse,
    deleteCourse,

    youtubeProjectStatus,
    youtubeProjectOauthStart,
    youtubeRefreshLessonStatus,
    youtubeRefreshStatusBatch,

    loading,
    error,
  } = data || {};

  const [tab, setTab] = useState("homework");
  const [homeworkFilter, setHomeworkFilter] = useState("all");

  const [comments, setComments] = useState({});
  const [expandedStudents, setExpandedStudents] = useState({});
  const [expandedArchiveStudents, setExpandedArchiveStudents] = useState({});
  const [expandedCourse, setExpandedCourse] = useState(null);

  const [archivedIds, setArchivedIds] = useState(() => new Set());

  // YouTube project info
  const [ytProject, setYtProject] = useState({ loading: false, data: null });

  // NEW COURSE modal
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseCategoryId, setNewCourseCategoryId] = useState("");
  const [newCourseDescription, setNewCourseDescription] = useState("");
  const [newCoursePhoto, setNewCoursePhoto] = useState(null);

  // EDIT COURSE modal
  const [isEditCourseOpen, setIsEditCourseOpen] = useState(false);
  const [editCourseId, setEditCourseId] = useState("");
  const [editCourseForm, setEditCourseForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    photoFile: null,
    photoUrl: "",
  });

  // EDIT LESSON modal
  const [isEditLessonOpen, setIsEditLessonOpen] = useState(false);
  const [editLessonId, setEditLessonId] = useState("");
  const [editLessonForm, setEditLessonForm] = useState({
    title: "",
    description: "",
    order: "",
    videoFile: null,
    videoPreviewUrl: "",
    backendVideo: "",
    youtube_status: "",
    youtube_error: "",
    homeworkDescription: "",
    homeworkFile: null,
    homeworkExistingFileUrl: "",
  });

  // ADD LESSON form
  const [addForm, setAddForm] = useState({
    courseId: "",
    title: "",
    description: "",
    order: "",
    videoFile: null,
    videoPreviewUrl: "",
    homeworkDescription: "",
    homeworkFile: null,
  });

  const [isAddingLesson, setIsAddingLesson] = useState(false);

  // confirms
  const [confirmDeleteLesson, setConfirmDeleteLesson] = useState({
    open: false,
    lessonId: "",
    lessonTitle: "",
  });
  const [confirmDeleteCourse, setConfirmDeleteCourse] = useState({
    open: false,
    courseId: "",
    courseTitle: "",
  });

  useEffect(() => {
    if (!user?.id) return;

    const set0 = getTeacherArchivedSet(user.id);
    setArchivedIds(set0);

    (async () => {
      try {
        await loadPublic?.();
        await loadTeacherLessons?.();
        await loadTeacherHomeworks?.();
      } catch (e) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    // чистим blob urls на размонтаже
    return () => {
      if (addForm.videoPreviewUrl?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(addForm.videoPreviewUrl);
        } catch (_) {}
      }
      if (editLessonForm.videoPreviewUrl?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(editLessonForm.videoPreviewUrl);
        } catch (_) {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔥 ВАЖНО: пока идет загрузка видео — лочим body (и потом отпускаем)
  useEffect(() => {
    if (!isAddingLesson) return undefined;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isAddingLesson]);

  if (!user) return null;

  const normalizedCourses = useMemo(() => (Array.isArray(courses) ? courses : []), [courses]);
  const normalizedLessons = useMemo(
    () => (Array.isArray(teacherLessons) ? teacherLessons : []),
    [teacherLessons]
  );
  const normalizedHomeworks = useMemo(
    () => (Array.isArray(teacherHomeworks) ? teacherHomeworks : []).map(normalizeHomework),
    [teacherHomeworks]
  );

  /* =========================================================
     ✅ ЖЁСТКО: показываем ТОЛЬКО свои курсы
     1) если есть teacher поля в курсах — фильтруем по ним
     2) если teacher поля нет/пусто — фильтруем по teacherLessons.course
     3) если и там пусто — показываем 0 курсов (НЕ все!)
     ========================================================= */
  const teacherCourses = useMemo(() => {
    const uid = String(user.id);
    const list = normalizedCourses;

    // 1) пробуем по teacher полям
    const byTeacherField = list.filter((c) => {
      const t =
        c?.teacherId ??
        c?.teacher_id ??
        (typeof c?.teacher === "number" || typeof c?.teacher === "string" ? c.teacher : null) ??
        c?.teacher?.id ??
        c?.owner_id ??
        c?.instructor ??
        null;
      return t != null && String(t) === uid;
    });

    if (byTeacherField.length > 0) return byTeacherField;

    // 2) фоллбек по teacherLessons (course id)
    const myCourseIds = new Set(
      (Array.isArray(normalizedLessons) ? normalizedLessons : [])
        .map((l) => normalizeLessonCourseId(l))
        .filter(Boolean)
        .map(String)
    );

    if (myCourseIds.size === 0) return []; // ✅ важно: не показывать чужие курсы

    return list.filter((c) => myCourseIds.has(String(normalizeCourseId(c))));
  }, [normalizedCourses, normalizedLessons, user.id]);

  const teacherCourseIds = useMemo(
    () => new Set(teacherCourses.map((c) => normalizeCourseId(c))),
    [teacherCourses]
  );

  const homeworksSafe = useMemo(() => {
    if (teacherCourseIds.size === 0) return [];
    return normalizedHomeworks.filter((hw) => teacherCourseIds.has(String(hw.courseId)));
  }, [normalizedHomeworks, teacherCourseIds]);

  const teacherHomeworksActive = useMemo(() => {
    return homeworksSafe.filter((hw) => !archivedIds.has(String(hw.id)));
  }, [homeworksSafe, archivedIds]);

  const teacherHomeworksArchived = useMemo(() => {
    return homeworksSafe.filter((hw) => archivedIds.has(String(hw.id)));
  }, [homeworksSafe, archivedIds]);

  const pendingCount = teacherHomeworksActive.filter((hw) => {
    const s = normLow(hw.status);
    return s === "examination" || !s;
  }).length;

  const acceptedCount = teacherHomeworksActive.filter((hw) => normLow(hw.status) === "accepted").length;

  const filteredActive = useMemo(() => {
    if (homeworkFilter === "submitted")
      return teacherHomeworksActive.filter((hw) => {
        const s = normLow(hw.status);
        return s === "examination" || !s;
      });
    if (homeworkFilter === "accepted")
      return teacherHomeworksActive.filter((hw) => normLow(hw.status) === "accepted");
    return teacherHomeworksActive;
  }, [teacherHomeworksActive, homeworkFilter]);

  const groupedByStudent = useMemo(() => {
    const map = new Map();
    for (const hw of filteredActive) {
      const sid = hw.userId || "unknown";
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid).push(hw);
    }
    for (const [sid, arr] of map.entries()) {
      arr.sort((a, b) => {
        const pa = normLow(a.status) === "examination" || !normLow(a.status) ? 0 : 1;
        const pb = normLow(b.status) === "examination" || !normLow(b.status) ? 0 : 1;
        return pa - pb;
      });
      map.set(sid, arr);
    }
    return map;
  }, [filteredActive]);

  const groupedArchiveByStudent = useMemo(() => {
    const map = new Map();
    for (const hw of teacherHomeworksArchived) {
      const sid = hw.userId || "unknown";
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid).push(hw);
    }
    for (const [sid, arr] of map.entries()) {
      arr.sort((a, b) => new Date(b.reviewedAt || 0) - new Date(a.reviewedAt || 0));
      map.set(sid, arr);
    }
    return map;
  }, [teacherHomeworksArchived]);

  const applyHomeworkFilter = useCallback(
    (filter) => {
      setTab("homework");
      setHomeworkFilter(filter);
      const open = {};
      Array.from(groupedByStudent.keys()).forEach((sid) => (open[sid] = true));
      setExpandedStudents(open);
    },
    [groupedByStudent]
  );

  const setCommentFor = (id, text) => setComments((prev) => ({ ...prev, [id]: text }));

  async function handleReview(homeworkId, status) {
    const comment = norm(comments[homeworkId]);
    if (!comment) {
      toast.error("Комментарий обязателен (для студента это будет объяснение)");
      return;
    }
    if (!reviewHomework) {
      toast.error("reviewHomework не подключён в DataContext");
      return;
    }

    try {
      const res = await reviewHomework(homeworkId, status, comment);
      if (res?.ok === false) {
        toast.error(res?.error || "Не удалось сохранить проверку");
        return;
      }
      toast.success("Проверка сохранена");
      setComments((prev) => ({ ...prev, [homeworkId]: "" }));
      await loadTeacherHomeworks?.();
    } catch (e) {
      console.error(e);
      toast.error("Ошибка при проверке");
    }
  }

  function archiveLocal(hwId) {
    const id = String(hwId);
    const next = new Set(archivedIds);
    next.add(id);
    setArchivedIds(next);
    setTeacherArchivedSet(user.id, next);
  }

  function unarchiveLocal(hwId) {
    const id = String(hwId);
    const next = new Set(archivedIds);
    next.delete(id);
    setArchivedIds(next);
    setTeacherArchivedSet(user.id, next);
  }

  async function handleArchive(hw) {
    if (normLow(hw.status) !== "accepted") {
      toast.error("В архив можно отправить только «Принято»");
      return;
    }
    archiveLocal(hw.id);
    toast.success("Отправлено в архив");
  }

  async function handleUnarchive(hwId) {
    unarchiveLocal(hwId);
    toast.success("Разархивировано");
  }

  const toggleStudent = (studentId) =>
    setExpandedStudents((prev) => ({ ...prev, [studentId]: !prev[studentId] }));

  const toggleArchiveStudent = (studentId) =>
    setExpandedArchiveStudents((prev) => ({ ...prev, [studentId]: !prev[studentId] }));

  /* =========================
     YouTube helpers
     ========================= */
  const fetchYouTubeProjectStatus = useCallback(async () => {
    if (!youtubeProjectStatus) return;
    setYtProject((p) => ({ ...p, loading: true }));
    try {
      const res = await youtubeProjectStatus();
      if (res?.ok === false) {
        toast.error(res?.error || "Не удалось получить статус YouTube");
        setYtProject({ loading: false, data: null });
        return;
      }
      setYtProject({ loading: false, data: res?.data ?? res ?? null });
    } catch (e) {
      console.error(e);
      setYtProject({ loading: false, data: null });
      toast.error("Ошибка статуса YouTube");
    }
  }, [youtubeProjectStatus]);

  const startYouTubeOAuth = useCallback(async () => {
    if (!youtubeProjectOauthStart) {
      toast.error("youtubeProjectOauthStart не подключён");
      return;
    }
    try {
      const res = await youtubeProjectOauthStart();
      if (res?.ok === false) {
        toast.error(res?.error || "Не удалось начать OAuth");
        return;
      }

      const url =
        res?.data?.auth_url ||
        res?.data?.url ||
        res?.auth_url ||
        res?.url ||
        res?.data?.authorization_url ||
        "";

      if (!url) {
        toast.error("OAuth URL не вернулся с сервера");
        return;
      }

      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Открыл окно авторизации YouTube");
    } catch (e) {
      console.error(e);
      toast.error("Ошибка OAuth");
    }
  }, [youtubeProjectOauthStart]);

  const refreshAllLessonStatuses = useCallback(async () => {
    if (!youtubeRefreshStatusBatch) {
      toast.error("youtubeRefreshStatusBatch не подключён");
      return;
    }
    try {
      const ids = (Array.isArray(normalizedLessons) ? normalizedLessons : [])
        .map((l) => normalizeLessonId(l))
        .filter(Boolean);

      const res = await youtubeRefreshStatusBatch(ids);
      if (res?.ok === false) {
        toast.error(res?.error || "Не удалось обновить статусы");
        return;
      }
      toast.success("Статусы обновлены");
      await loadTeacherLessons?.();
    } catch (e) {
      console.error(e);
      toast.error("Ошибка обновления статусов");
    }
  }, [youtubeRefreshStatusBatch, normalizedLessons, loadTeacherLessons]);

  const refreshOneLessonStatus = useCallback(
    async (lessonId) => {
      if (!youtubeRefreshLessonStatus) {
        toast.error("youtubeRefreshLessonStatus не подключён");
        return;
      }
      try {
        const res = await youtubeRefreshLessonStatus(lessonId);
        if (res?.ok === false) {
          toast.error(res?.error || "Не удалось обновить статус");
          return;
        }
        toast.success("Статус обновлён");
        await loadTeacherLessons?.();
      } catch (e) {
        console.error(e);
        toast.error("Ошибка обновления статуса");
      }
    },
    [youtubeRefreshLessonStatus, loadTeacherLessons]
  );

  /* =========================
     Courses
     ========================= */
  function openAddCourse() {
    setNewCourseTitle("");
    setNewCourseCategoryId("");
    setNewCourseDescription("");
    setNewCoursePhoto(null);
    setIsAddCourseOpen(true);
  }

  async function createNewCourse() {
    const title = norm(newCourseTitle);
    if (!title) {
      toast.error("Введите название курса");
      return;
    }
    if (!addCourse) {
      toast.error("addCourse не подключён в DataContext");
      return;
    }

    try {
      const payload = {
        title,
        description: norm(newCourseDescription),
        category: newCourseCategoryId || undefined,
        photo: newCoursePhoto || undefined,
      };

      const res = await addCourse(payload);

      const cid =
        typeof res === "number" || typeof res === "string"
          ? res
          : res?.id ?? res?.data?.id ?? res?.course_id ?? null;

      if (!cid) {
        toast.error(res?.error || "Не удалось добавить курс");
        return;
      }

      await loadPublic?.();
      toast.success("Курс добавлен");
      setAddForm((p) => ({ ...p, courseId: String(cid) }));
      setExpandedCourse(String(cid));
      setIsAddCourseOpen(false);
      setTab("courses");
    } catch (e) {
      console.error(e);
      toast.error("Ошибка создания курса");
    }
  }

  function openEditCourse(course) {
    const id = normalizeCourseId(course);
    setEditCourseId(id);

    setEditCourseForm({
      title: normalizeCourseTitle(course),
      description: course?.description ?? "",
      categoryId: String(course?.categoryId ?? course?.category_id ?? course?.category ?? ""),
      photoFile: null,
      photoUrl: course?.photo || "",
    });

    setIsEditCourseOpen(true);
  }

  async function saveEditCourse() {
    if (!editCourseId) return;
    if (!updateCourse) {
      toast.error("updateCourse не подключён в DataContext");
      return;
    }

    const title = norm(editCourseForm.title);
    if (!title) {
      toast.error("Название курса не может быть пустым");
      return;
    }

    try {
      const payload = {
        title,
        description: norm(editCourseForm.description),
        category: editCourseForm.categoryId || undefined,
        photo: editCourseForm.photoFile || undefined,
      };

      const res = await updateCourse(editCourseId, payload);
      if (res?.ok === false) {
        toast.error(res?.error || "Не удалось обновить курс");
        return;
      }

      await loadPublic?.();
      toast.success("Курс обновлён");
      setIsEditCourseOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Ошибка обновления курса");
    }
  }

  function askDeleteCourse(course) {
    const cid = normalizeCourseId(course);
    setConfirmDeleteCourse({
      open: true,
      courseId: cid,
      courseTitle: normalizeCourseTitle(course) || "Курс",
    });
  }

  async function confirmDeleteCourseNow() {
    const { courseId } = confirmDeleteCourse;
    if (!courseId) return;

    if (!deleteCourse) {
      toast.error("deleteCourse не подключён в DataContext");
      return;
    }

    try {
      const res = await deleteCourse(courseId);
      if (res?.ok === false) {
        toast.error(res?.error || "Не удалось удалить курс");
        return;
      }
      toast.success("Курс удалён");
      setConfirmDeleteCourse({ open: false, courseId: "", courseTitle: "" });
      setIsEditCourseOpen(false);
      await loadPublic?.();

      setExpandedCourse((prev) => (String(prev) === String(courseId) ? null : prev));
    } catch (e) {
      console.error(e);
      toast.error("Ошибка удаления курса");
    }
  }

  /* =========================
     Lessons
     ========================= */
  function openEditLessonModal(lesson) {
    const id = normalizeLessonId(lesson);
    const backendVideo = norm(lesson?.video_url || lesson?.youtube_video_id || "");
    const backendHomeworkFileUrl = norm(lesson?.homework_file || "");

    if (editLessonForm.videoPreviewUrl?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(editLessonForm.videoPreviewUrl);
      } catch (_) {}
    }

    setEditLessonId(id);
    setEditLessonForm({
      title: normalizeLessonTitle(lesson),
      description: lesson?.description ?? "",
      order: String(lesson?.order ?? ""),
      videoFile: null,
      videoPreviewUrl: "",
      backendVideo,
      youtube_status: lesson?.youtube_status ?? lesson?.youtubeStatus ?? "",
      youtube_error: lesson?.youtube_error ?? lesson?.youtubeError ?? "",
      homeworkDescription: lesson?.homework_description ?? "",
      homeworkFile: null,
      homeworkExistingFileUrl: backendHomeworkFileUrl,
    });
    setIsEditLessonOpen(true);
  }

  function closeEditLessonModal() {
    if (editLessonForm.videoPreviewUrl?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(editLessonForm.videoPreviewUrl);
      } catch (_) {}
    }
    setIsEditLessonOpen(false);
    setEditLessonId("");
    setEditLessonForm({
      title: "",
      description: "",
      order: "",
      videoFile: null,
      videoPreviewUrl: "",
      backendVideo: "",
      youtube_status: "",
      youtube_error: "",
      homeworkDescription: "",
      homeworkFile: null,
      homeworkExistingFileUrl: "",
    });
  }

  function onPickEditVideo(file) {
    if (!file) return;

    if (editLessonForm.videoPreviewUrl?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(editLessonForm.videoPreviewUrl);
      } catch (_) {}
    }

    const url = URL.createObjectURL(file);
    setEditLessonForm((p) => ({
      ...p,
      videoFile: file,
      videoPreviewUrl: url,
      youtube_status: "uploading",
      youtube_error: "",
    }));
    toast.success("Видео выбрано");
  }

  function onPickAddVideo(file) {
    if (!file) return;

    if (addForm.videoPreviewUrl?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(addForm.videoPreviewUrl);
      } catch (_) {}
    }

    const url = URL.createObjectURL(file);
    setAddForm((p) => ({ ...p, videoFile: file, videoPreviewUrl: url }));
    toast.success("Видео выбрано");
  }

  async function saveEditLesson() {
    if (!editLessonId) return;
    if (!updateLesson) {
      toast.error("updateLesson не подключён в DataContext");
      return;
    }

    const hasVideo = !!editLessonForm.videoFile || !!editLessonForm.backendVideo;
    if (!hasVideo) {
      toast.error("Урок без видео нельзя сохранить");
      return;
    }

    const orderNum = Number(editLessonForm.order);
    const orderValue =
      String(editLessonForm.order).trim() === "" || !Number.isFinite(orderNum) ? undefined : orderNum;

    try {
      const payload = {
        title: norm(editLessonForm.title),
        description: norm(editLessonForm.description),
        order: orderValue,
        homework_description: norm(editLessonForm.homeworkDescription),
        ...(editLessonForm.videoFile ? { video_file: editLessonForm.videoFile } : {}),
        ...(editLessonForm.homeworkFile ? { homework_file: editLessonForm.homeworkFile } : {}),
      };

      const res = await updateLesson(editLessonId, payload);
      if (res?.ok === false) {
        toast.error(res?.error || "Не удалось обновить урок");
        return;
      }

      toast.success("Урок обновлён");
      closeEditLessonModal();
      await loadTeacherLessons?.();

      if (youtubeRefreshLessonStatus) {
        await youtubeRefreshLessonStatus(editLessonId);
        await loadTeacherLessons?.();
      }
    } catch (e) {
      console.error(e);
      toast.error("Ошибка обновления урока");
    }
  }

  function askDeleteLesson(lessonId, lessonTitle) {
    setConfirmDeleteLesson({
      open: true,
      lessonId: String(lessonId || ""),
      lessonTitle: String(lessonTitle || "Урок"),
    });
  }

  async function confirmDeleteLessonNow() {
    const { lessonId } = confirmDeleteLesson;
    if (!lessonId) return;

    if (!deleteLesson) {
      toast.error("deleteLesson не подключён в DataContext");
      return;
    }

    try {
      const res = await deleteLesson(lessonId);
      if (res?.ok === false) {
        toast.error(res?.error || "Не удалось удалить урок");
        return;
      }
      toast.success("Урок удалён");
      setConfirmDeleteLesson({ open: false, lessonId: "", lessonTitle: "" });
      closeEditLessonModal();
      await loadTeacherLessons?.();
    } catch (e) {
      console.error(e);
      toast.error("Ошибка удаления урока");
    }
  }

  async function handleAddLesson() {
    if (isAddingLesson) return;

    const cid = norm(addForm.courseId);
    if (!cid) {
      toast.error("Выберите курс");
      return;
    }
    if (!addLesson) {
      toast.error("addLesson не подключён в DataContext");
      return;
    }

    if (!addForm.videoFile) {
      toast.error("Выберите видео файл");
      return;
    }

    const title = norm(addForm.title);
    if (!title) {
      toast.error("Введите название урока");
      return;
    }

    const orderNum = Number(addForm.order);
    const orderValue =
      String(addForm.order).trim() === "" || !Number.isFinite(orderNum) ? undefined : orderNum;

    setIsAddingLesson(true);
    try {
      const payload = {
        course: Number(cid),
        title,
        description: norm(addForm.description),
        order: orderValue,
        video_file: addForm.videoFile,
        homework_description: norm(addForm.homeworkDescription),
        ...(addForm.homeworkFile ? { homework_file: addForm.homeworkFile } : {}),
      };

      const res = await addLesson(payload, { timeout: 0 });
      if (res?.ok === false) {
        toast.error(res?.error || "Не удалось добавить урок");
        return;
      }

      toast.success("Урок добавлен");

      setAddForm({
        courseId: cid,
        title: "",
        description: "",
        order: "",
        videoFile: null,
        videoPreviewUrl: "",
        homeworkDescription: "",
        homeworkFile: null,
      });

      setExpandedCourse(cid);
      setTab("courses");
      await loadTeacherLessons?.();

      if (youtubeRefreshStatusBatch) {
        const ids = (Array.isArray(normalizedLessons) ? normalizedLessons : [])
          .map((l) => normalizeLessonId(l))
          .filter(Boolean);
        await youtubeRefreshStatusBatch(ids);
        await loadTeacherLessons?.();
      }
    } catch (e) {
      console.error(e);
      toast.error("Ошибка добавления урока");
    } finally {
      setIsAddingLesson(false);
    }
  }

  const categoriesOptions = useMemo(() => {
    const base = Array.isArray(categories) ? categories : [];
    return base
      .map((c) => ({
        value: String(c?.id ?? c?.pk ?? ""),
        label: String(c?.name ?? c?.title ?? ""),
      }))
      .filter((x) => x.value && x.label);
  }, [categories]);

  const teacherCoursesOptions = useMemo(() => {
    return teacherCourses
      .map((c) => ({
        value: normalizeCourseId(c),
        label: normalizeCourseTitle(c),
      }))
      .filter((x) => x.value && x.label);
  }, [teacherCourses]);

  const isAnyLoading =
    !!loading?.public || !!loading?.teacherLessons || !!loading?.teacherHomeworks || false;

  const anyError = error?.public || error?.teacherLessons || error?.teacherHomeworks || "";

  const lessonsByCourse = useCallback(
    (courseId) => {
      const cid = String(courseId);
      const arr = normalizedLessons.filter((l) => normalizeLessonCourseId(l) === cid);
      return [...arr].sort((a, b) => {
        const ao = Number(a?.order);
        const bo = Number(b?.order);
        const aHas = Number.isFinite(ao);
        const bHas = Number.isFinite(bo);
        if (aHas && bHas) return ao - bo;
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        return normalizeLessonId(a).localeCompare(normalizeLessonId(b));
      });
    },
    [normalizedLessons]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalNoScrollbarStyle />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <h1 className="text-3xl">Кабинет преподавателя</h1>
        </div>

        {ytProject.data ? (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">YouTube project</Badge>
                <span className="text-gray-700">
                  {typeof ytProject.data === "string" ? ytProject.data : JSON.stringify(ytProject.data)}
                </span>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {isAnyLoading ? (
          <Card className="mb-6">
            <CardContent className="py-8 text-center">
              <div className="inline-flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                <span className="text-gray-700">Загрузка данных…</span>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {anyError ? (
          <Card className="mb-6">
            <CardContent className="py-6">
              <div className="text-sm text-red-600">Ошибка: {anyError}</div>
            </CardContent>
          </Card>
        ) : null}

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <BookOpen className="w-10 h-10 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{teacherCourses.length}</div>
                  <div className="text-sm text-gray-600">Мои курсы</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <button
                className="w-full p-6 flex items-center gap-3 text-left hover:bg-gray-50 transition"
                onClick={() => applyHomeworkFilter("submitted")}
                type="button"
              >
                <Clock className="w-10 h-10 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold">{pendingCount}</div>
                  <div className="text-sm text-gray-600">На проверке</div>
                </div>
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <button
                className="w-full p-6 flex items-center gap-3 text-left hover:bg-gray-50 transition"
                onClick={() => applyHomeworkFilter("accepted")}
                type="button"
              >
                <CheckCircle className="w-10 h-10 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">{acceptedCount}</div>
                  <div className="text-sm text-gray-600">Принято</div>
                </div>
              </button>
            </CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="homework" onClick={() => setHomeworkFilter("all")}>
              Домашние задания
            </TabsTrigger>
            <TabsTrigger value="courses">Мои курсы</TabsTrigger>
            <TabsTrigger value="add">Добавить урок</TabsTrigger>
            <TabsTrigger value="archive">Архив</TabsTrigger>
          </TabsList>

          {/* Домашки */}
          <TabsContent value="homework" className="space-y-4">
            {filteredActive.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">
                    {homeworkFilter === "submitted"
                      ? "Нет домашних заданий на проверке"
                      : homeworkFilter === "accepted"
                      ? "Нет принятых домашних заданий"
                      : "Пока нет домашних заданий"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              Array.from(groupedByStudent.entries()).map(([studentId, list]) => {
                const isOpen = !!expandedStudents[studentId];
                const submitted = list.filter((x) => {
                  const s = normLow(x.status);
                  return s === "examination" || !s;
                }).length;

                return (
                  <Card key={studentId}>
                    <CardContent className="p-6">
                      <button
                        onClick={() => toggleStudent(studentId)}
                        className="w-full flex items-center justify-between"
                        type="button"
                      >
                        <div className="text-left">
                          <div className="font-semibold">
                            {list?.[0]?.studentUsername || "Студент"}{" "}
                            <span className="text-gray-500 font-normal">({studentId})</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Всего: {list.length} • На проверке: {submitted}
                          </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 transition ${isOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isOpen && (
                        <div className="mt-5 space-y-4">
                          {list.map((hw) => {
                            const lesson = normalizedLessons.find(
                              (l) => normalizeLessonId(l) === String(hw.lessonId)
                            );
                            const comment = comments[hw.id] || "";
                            const canReview = isTeacherCanReview(hw.status);

                            return (
                              <div key={hw.id} className="border rounded-lg p-4 bg-white">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="font-semibold">
                                      {hw.courseTitle || "Курс"} •{" "}
                                      {normalizeLessonTitle(lesson) ||
                                        hw.lessonTitle ||
                                        `Урок ${hw.lessonId}`}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Отправлено:{" "}
                                      {hw.createdAt ? new Date(hw.createdAt).toLocaleDateString() : "—"}
                                    </div>
                                  </div>
                                  <StatusBadge status={hw.status} />
                                </div>

                                <div className="mt-3 p-3 bg-gray-50 rounded">
                                  <div className="text-sm font-medium mb-1">Ответ студента:</div>
                                  <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                                    {hw.content || "—"}
                                  </div>
                                  <AttachmentsView attachments={hw.attachments} />
                                </div>

                                {hw.teacherComment ? (
                                  <div className="mt-4 p-3 bg-blue-50 rounded">
                                    <div className="text-sm font-medium mb-1">
                                      Комментарий преподавателя:
                                    </div>
                                    <div className="text-sm whitespace-pre-wrap">{hw.teacherComment}</div>
                                  </div>
                                ) : null}

                                {canReview ? (
                                  <div className="mt-4 space-y-3">
                                    <Textarea
                                      rows={3}
                                      placeholder="Комментарий (обязательно)"
                                      value={comment}
                                      onChange={(e) => setCommentFor(hw.id, e.target.value)}
                                    />
                                    <div className="flex flex-wrap gap-3">
                                      <Button
                                        onClick={() => handleReview(hw.id, "accepted")}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Принять
                                      </Button>

                                      <Button
                                        onClick={() => handleReview(hw.id, "rework")}
                                        className="bg-orange-600 hover:bg-orange-700"
                                      >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        На доработку
                                      </Button>

                                      <Button
                                        onClick={() => handleReview(hw.id, "declined")}
                                        variant="destructive"
                                      >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Отклонить
                                      </Button>
                                    </div>
                                  </div>
                                ) : null}

                                {normLow(hw.status) === "accepted" ? (
                                  <div className="mt-4">
                                    <Button variant="outline" onClick={() => handleArchive(hw)}>
                                      <Archive className="w-4 h-4 mr-2" />
                                      В архив
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Мои курсы */}
          <TabsContent value="courses" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={refreshAllLessonStatuses}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Обновить статусы
              </Button>

              <Button type="button" variant="outline" onClick={openAddCourse}>
                <Plus className="w-4 h-4 mr-2" />
                Новый курс
              </Button>
            </div>

            {teacherCourses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">Пока нет курсов</p>
                </CardContent>
              </Card>
            ) : (
              teacherCourses.map((course) => {
                const courseId = normalizeCourseId(course);
                const courseLessons = lessonsByCourse(courseId) || [];
                const isOpen = String(expandedCourse ?? "") === String(courseId);

                return (
                  <Card key={courseId}>
                    <CardHeader className="py-6">
                      <div className="flex items-start justify-between gap-4">
                        <button
                          onClick={() => setExpandedCourse(isOpen ? null : courseId)}
                          className="flex-1 text-left"
                          type="button"
                        >
                          <CardTitle className="text-xl">
                            {normalizeCourseTitle(course) || "Курс"}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-2">
                            {(normalizeCategoryName(course) || "Без категории") +
                              " • " +
                              courseLessons.length +
                              " уроков"}
                          </p>
                          {course?.description ? (
                            <p className="text-sm text-gray-700 mt-2 line-clamp-2">{course.description}</p>
                          ) : null}
                        </button>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditCourse(course)}
                          >
                            <FolderPen className="w-4 h-4 mr-2" />
                            Курс
                          </Button>

                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => askDeleteCourse(course)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Удалить
                          </Button>

                          <button
                            onClick={() => setExpandedCourse(isOpen ? null : courseId)}
                            className="p-2 rounded-xl hover:bg-gray-100 transition"
                            type="button"
                            aria-label="Открыть/закрыть"
                          >
                            <ChevronDown className={`w-5 h-5 transition ${isOpen ? "rotate-180" : ""}`} />
                          </button>
                        </div>
                      </div>
                    </CardHeader>

                    {isOpen && (
                      <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          {courseLessons.map((l, idx) => {
                            const lid = normalizeLessonId(l);
                            const backendVideo = norm(l?.video_url || l?.youtube_video_id || "");
                            const orderLabel = Number.isFinite(Number(l?.order)) ? l.order : idx + 1;

                            return (
                              <div key={lid} className="border rounded-lg p-4 bg-white">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-2">
                                    <div className="font-semibold flex items-center gap-2 flex-wrap">
                                      <span>
                                        {orderLabel}. {normalizeLessonTitle(l) || "Урок"}
                                      </span>
                                      <YouTubeStatusBadge
                                        status={l?.youtube_status ?? l?.youtubeStatus}
                                        error={l?.youtube_error ?? l?.youtubeError}
                                      />
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => refreshOneLessonStatus(lid)}
                                      >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Статус
                                      </Button>

                                      <Button variant="outline" size="sm" onClick={() => openEditLessonModal(l)}>
                                        <Pencil className="w-4 h-4 mr-2" />
                                        Редактировать
                                      </Button>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-3">
                                  <VideoPreview source={backendVideo} heightClass="h-[140px]" />
                                </div>

                                {l?.description ? (
                                  <p className="text-sm text-gray-700 mt-3">{l.description}</p>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Добавить урок */}
          <TabsContent value="add">
            <Card>
              <CardHeader>
                <CardTitle>Добавить урок</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm">Курс</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <SearchableSelectSingle
                          value={addForm.courseId}
                          onChange={(v) => setAddForm((p) => ({ ...p, courseId: v }))}
                          options={teacherCoursesOptions}
                          placeholder="Выберите курс"
                          searchPlaceholder="Найти курс..."
                          disabled={isAddingLesson}
                        />
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={openAddCourse}
                        className="shrink-0"
                        disabled={isAddingLesson}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Новый курс
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm">Видео файл</label>
                    <label className="block">
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        disabled={isAddingLesson}
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          if (f) onPickAddVideo(f);
                          e.target.value = "";
                        }}
                      />
                      <div className="w-full border rounded-md px-3 py-2 bg-white hover:bg-gray-50 transition flex items-center gap-2 cursor-pointer">
                        <Video className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-700">
                          {addForm.videoFile ? addForm.videoFile.name : "Выбрать видео"}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {addForm.videoPreviewUrl ? (
                  <div className="max-w-md">
                    <VideoPreview source={addForm.videoPreviewUrl} heightClass="h-[180px]" />
                  </div>
                ) : null}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm">Название урока</label>
                    <Input
                      value={addForm.title}
                      onChange={(e) => setAddForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="Например: Компоненты и props"
                      disabled={isAddingLesson}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm">Порядок</label>
                    <Input
                      type="number"
                      value={addForm.order}
                      onChange={(e) => setAddForm((p) => ({ ...p, order: e.target.value }))}
                      placeholder="1"
                      disabled={isAddingLesson}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm">Описание</label>
                  <Textarea
                    rows={3}
                    value={addForm.description}
                    onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Коротко о чем урок"
                    disabled={isAddingLesson}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm">Домашнее задание (опционально)</label>
                  <Textarea
                    rows={2}
                    value={addForm.homeworkDescription}
                    onChange={(e) => setAddForm((p) => ({ ...p, homeworkDescription: e.target.value }))}
                    placeholder="Что студент должен сделать"
                    disabled={isAddingLesson}
                  />
                </div>

                <LessonHomeworkMaterialsSingle
                  file={addForm.homeworkFile}
                  existingUrl=""
                  onPick={(f) => setAddForm((p) => ({ ...p, homeworkFile: f }))}
                  onClear={() => setAddForm((p) => ({ ...p, homeworkFile: null }))}
                />

                <Button onClick={handleAddLesson} disabled={isAddingLesson}>
                  Добавить
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Архив */}
          <TabsContent value="archive" className="space-y-4">
            {teacherHomeworksArchived.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">Архив пуст</p>
                </CardContent>
              </Card>
            ) : (
              Array.from(groupedArchiveByStudent.entries()).map(([studentId, list]) => {
                const isOpen = !!expandedArchiveStudents[studentId];

                return (
                  <Card key={studentId}>
                    <CardContent className="p-6">
                      <button
                        onClick={() => toggleArchiveStudent(studentId)}
                        className="w-full flex items-center justify-between"
                        type="button"
                      >
                        <div className="text-left">
                          <div className="font-semibold">
                            {list?.[0]?.studentUsername || "Студент"}{" "}
                            <span className="text-gray-500 font-normal">({studentId})</span>
                          </div>
                          <div className="text-sm text-gray-600">В архиве: {list.length}</div>
                        </div>
                        <ChevronDown className={`w-5 h-5 transition ${isOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isOpen && (
                        <div className="mt-5 space-y-3">
                          {list.map((hw) => {
                            const lesson = normalizedLessons.find(
                              (l) => normalizeLessonId(l) === String(hw.lessonId)
                            );

                            return (
                              <div key={hw.id} className="border rounded-lg p-4 bg-white">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="font-semibold">
                                      {hw.courseTitle || "Курс"} •{" "}
                                      {normalizeLessonTitle(lesson) || hw.lessonTitle || `Урок ${hw.lessonId}`}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Проверено:{" "}
                                      {hw.reviewedAt ? new Date(hw.reviewedAt).toLocaleDateString() : "—"}
                                    </div>
                                  </div>
                                  <StatusBadge status={hw.status} />
                                </div>

                                <div className="mt-3 p-3 bg-gray-50 rounded">
                                  <div className="text-sm font-medium mb-1">Ответ:</div>
                                  <div className="text-sm whitespace-pre-wrap break-words">{hw.content || "—"}</div>
                                  <AttachmentsView attachments={hw.attachments} />
                                </div>

                                {hw.teacherComment ? (
                                  <div className="mt-3 p-3 bg-blue-50 rounded">
                                    <div className="text-sm font-medium mb-1">Комментарий:</div>
                                    <div className="text-sm whitespace-pre-wrap">{hw.teacherComment}</div>
                                  </div>
                                ) : null}

                                <div className="mt-4">
                                  <Button variant="outline" onClick={() => handleUnarchive(hw.id)}>
                                    <Undo2 className="w-4 h-4 mr-2" />
                                    Разархивировать
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        {/* MODAL: добавить курс (+ фото) */}
        <Modal
          title="Новый курс"
          isOpen={isAddCourseOpen}
          onClose={() => setIsAddCourseOpen(false)}
          closeOnOverlay={false}
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm">Название курса</label>
              <Input value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value)} placeholder="React с нуля" />
            </div>

            <div className="space-y-1">
              <label className="text-sm">Описание (опционально)</label>
              <Textarea
                rows={3}
                value={newCourseDescription}
                onChange={(e) => setNewCourseDescription(e.target.value)}
                placeholder="Коротко о курсе"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm">Категория (опционально)</label>
              <SearchableSelectSingle
                value={newCourseCategoryId}
                onChange={(v) => setNewCourseCategoryId(v)}
                options={categoriesOptions}
                placeholder="Без категории"
                searchPlaceholder="Найти категорию..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm">Картинка курса (опционально)</label>
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setNewCoursePhoto(f);
                    e.target.value = "";
                  }}
                />
                <div className="w-full border rounded-md px-3 py-2 bg-white hover:bg-gray-50 transition flex items-center gap-2 cursor-pointer">
                  <ImageIcon className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">
                    {newCoursePhoto ? newCoursePhoto.name : "Выбрать картинку"}
                  </span>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <Button onClick={createNewCourse} className="w-full">
                Добавить
              </Button>
              <Button variant="outline" onClick={() => setIsAddCourseOpen(false)} className="w-full">
                Закрыть
              </Button>
            </div>
          </div>
        </Modal>

        {/* MODAL: редактировать курс (+ удалить) */}
        <Modal
          title="Редактировать курс"
          isOpen={isEditCourseOpen}
          onClose={() => setIsEditCourseOpen(false)}
          closeOnOverlay={false}
        >
          <div className="space-y-3">
            {editCourseForm.photoUrl ? (
              <div className="rounded-xl overflow-hidden border bg-black">
                <img src={toAbsUrl(editCourseForm.photoUrl)} alt="course" className="w-full h-[140px] object-cover" />
              </div>
            ) : null}

            <div className="space-y-1">
              <label className="text-sm">Название</label>
              <Input value={editCourseForm.title} onChange={(e) => setEditCourseForm((p) => ({ ...p, title: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <label className="text-sm">Описание</label>
              <Textarea
                rows={4}
                value={editCourseForm.description}
                onChange={(e) => setEditCourseForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Коротко о курсе"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm">Категория</label>
              <SearchableSelectSingle
                value={editCourseForm.categoryId}
                onChange={(v) => setEditCourseForm((p) => ({ ...p, categoryId: v }))}
                options={categoriesOptions}
                placeholder="Без категории"
                searchPlaceholder="Найти категорию..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm">Новая картинка (опционально)</label>
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setEditCourseForm((p) => ({ ...p, photoFile: f }));
                    e.target.value = "";
                  }}
                />
                <div className="w-full border rounded-md px-3 py-2 bg-white hover:bg-gray-50 transition flex items-center gap-2 cursor-pointer">
                  <ImageIcon className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">
                    {editCourseForm.photoFile ? editCourseForm.photoFile.name : "Выбрать картинку"}
                  </span>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <Button onClick={saveEditCourse} className="w-full">
                Сохранить
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() =>
                  setConfirmDeleteCourse({
                    open: true,
                    courseId: editCourseId,
                    courseTitle: editCourseForm.title || "Курс",
                  })
                }
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить курс
              </Button>
            </div>
          </div>
        </Modal>

        {/* MODAL: редактировать урок */}
        <Modal title="Редактировать урок" isOpen={isEditLessonOpen} onClose={closeEditLessonModal} closeOnOverlay={false}>
          <div className="space-y-4">
            <VideoPreview source={editLessonForm.videoPreviewUrl || editLessonForm.backendVideo} heightClass="h-[160px]" />

            <div className="flex items-center justify-between gap-2">
              <YouTubeStatusBadge status={editLessonForm.youtube_status} error={editLessonForm.youtube_error} />
              <Button variant="outline" size="sm" onClick={() => refreshOneLessonStatus(editLessonId)} disabled={!editLessonId}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Обновить
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm">Название</label>
                <Input value={editLessonForm.title} onChange={(e) => setEditLessonForm((p) => ({ ...p, title: e.target.value }))} />
              </div>

              <div className="space-y-1">
                <label className="text-sm">Порядок (order)</label>
                <Input
                  type="number"
                  value={editLessonForm.order}
                  onChange={(e) => setEditLessonForm((p) => ({ ...p, order: e.target.value }))}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm">Описание</label>
              <Textarea rows={3} value={editLessonForm.description} onChange={(e) => setEditLessonForm((p) => ({ ...p, description: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <label className="text-sm">Заменить видео (опционально)</label>
              <label className="block">
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    if (f) onPickEditVideo(f);
                    e.target.value = "";
                  }}
                />
                <div className="w-full border rounded-md px-3 py-2 bg-white hover:bg-gray-50 transition flex items-center gap-2 cursor-pointer">
                  <Video className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">
                    {editLessonForm.videoFile ? editLessonForm.videoFile.name : "Выбрать новое видео"}
                  </span>
                </div>
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-sm">Домашнее задание (опционально)</label>
              <Textarea rows={2} value={editLessonForm.homeworkDescription} onChange={(e) => setEditLessonForm((p) => ({ ...p, homeworkDescription: e.target.value }))} />
            </div>

            <LessonHomeworkMaterialsSingle
              file={editLessonForm.homeworkFile}
              existingUrl={editLessonForm.homeworkExistingFileUrl}
              onPick={(f) => setEditLessonForm((p) => ({ ...p, homeworkFile: f }))}
              onClear={() => setEditLessonForm((p) => ({ ...p, homeworkFile: null }))}
            />

            <div className="flex gap-3">
              <Button onClick={saveEditLesson} className="w-full">
                Сохранить
              </Button>

              <Button variant="destructive" onClick={() => askDeleteLesson(editLessonId, editLessonForm.title)} className="w-full">
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить урок
              </Button>
            </div>
          </div>
        </Modal>

        {/* Confirm: delete lesson */}
        <ConfirmModal
          isOpen={confirmDeleteLesson.open}
          title="Удалить урок?"
          description={`Урок: ${confirmDeleteLesson.lessonTitle}\nЭто действие необратимо.`}
          onCancel={() => setConfirmDeleteLesson({ open: false, lessonId: "", lessonTitle: "" })}
          onConfirm={confirmDeleteLessonNow}
          confirmText="Удалить урок"
        />

        {/* Confirm: delete course */}
        <ConfirmModal
          isOpen={confirmDeleteCourse.open}
          title="Удалить курс?"
          description={`Курс: ${confirmDeleteCourse.courseTitle}\nУдалятся и уроки курса. Это действие необратимо.`}
          onCancel={() => setConfirmDeleteCourse({ open: false, courseId: "", courseTitle: "" })}
          onConfirm={confirmDeleteCourseNow}
          confirmText="Удалить курс"
        />

        {/* Overlay: uploading */}
        {isAddingLesson ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" role="status" aria-live="polite">
            <div className="absolute inset-0 bg-black/70" />
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl border p-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600" />
                <div className="text-xl font-semibold">Видео загружается</div>
                <div className="text-sm text-gray-600">Пожалуйста, не выходите</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default TeacherDashboard;
