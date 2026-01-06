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
  Link as LinkIcon,
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
   ABS URL helper
   + FIX DEV: /media/... оставляем относительным, чтобы vite proxy работал и CORS не было
   ========================= */
const API_BASE_RAW =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) || "";

const API_ORIGIN = norm(API_BASE_RAW).replace(/\/api\/?$/i, "").replace(/\/$/, "");
const IS_DEV = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV;

const toAbsUrl = (url) => {
  const u = norm(url);
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("//")) return `https:${u}`;

  if (IS_DEV && u.startsWith("/media/")) return u;

  if (u.startsWith("/")) {
    if (API_ORIGIN) return `${API_ORIGIN}${u}`;
    return u;
  }
  if (API_ORIGIN) return `${API_ORIGIN}/${u}`;
  return u;
};

const safeJsonParse = (s, fallback) => {
  try {
    const v = JSON.parse(s);
    return v ?? fallback;
  } catch (_) {
    return fallback;
  }
};

const getTeacherArchivedSet = (teacherId) => {
  const raw = localStorage.getItem(LS_TEACHER_HW_ARCHIVE) || "{}";
  const obj = safeJsonParse(raw, {});
  const key = String(teacherId || "0");
  const arr = Array.isArray(obj[key]) ? obj[key] : [];
  return new Set(arr.map(String));
};

const setTeacherArchivedSet = (teacherId, set) => {
  const raw = localStorage.getItem(LS_TEACHER_HW_ARCHIVE) || "{}";
  const obj = safeJsonParse(raw, {});
  const key = String(teacherId || "0");
  obj[key] = Array.from(set);
  localStorage.setItem(LS_TEACHER_HW_ARCHIVE, JSON.stringify(obj));
};

const StatusBadge = ({ status }) => {
  const s = normLow(status);

  if (s === "accepted")
    return <Badge className="bg-green-600 text-white border-transparent">Принято</Badge>;
  if (s === "rework")
    return <Badge className="bg-orange-600 text-white border-transparent">На доработку</Badge>;
  if (s === "declined") return <Badge variant="destructive">Отклонено</Badge>;

  if (s === "examination" || !s) return <Badge variant="secondary">На проверке</Badge>;

  return <Badge variant="outline">—</Badge>;
};

/* =========================
   YouTube status badge
   ========================= */
const YouTubeStatusBadge = ({ status, error }) => {
  const s = normLow(status);

  if (!s) return <Badge variant="outline">—</Badge>;
  if (s === "ready" || s === "completed" || s === "success")
    return <Badge className="bg-green-600 text-white border-transparent">готово</Badge>;
  if (s === "processing" || s === "pending")
    return <Badge className="bg-orange-600 text-white border-transparent">обработка</Badge>;
  if (s === "uploading")
    return <Badge className="bg-blue-600 text-white border-transparent">загрузка</Badge>;
  if (s === "error" || s === "failed")
    return (
      <Badge variant="destructive" title={norm(error) || ""}>
        ошибка
      </Badge>
    );

  return <Badge variant="secondary">{status}</Badge>;
};

/* =========================
   Scrollbar hide helper
   ========================= */
const GlobalNoScrollbarStyle = () => {
  return (
    <style>{`
      .sb-no-scrollbar::-webkit-scrollbar{ width:0px; height:0px; }
      .sb-no-scrollbar{ scrollbar-width:none; -ms-overflow-style:none; }
    `}</style>
  );
};

/* =========================
   Body scroll lock
   ========================= */
let __sbLockCount = 0;
let __sbPrevOverflow = "";
let __sbPrevPadRight = "";

const lockBodyScroll = () => {
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
};

const unlockBodyScroll = () => {
  try {
    const body = document.body;
    if (!body) return;

    __sbLockCount = Math.max(0, __sbLockCount - 1);
    if (__sbLockCount === 0) {
      body.style.overflow = __sbPrevOverflow;
      body.style.paddingRight = __sbPrevPadRight;
    }
  } catch (_) {}
};

/* =========================
   Video preview (teacher)
   - youtube url/id -> <iframe>
   - mp4/webm/ogg/blob or /media/... -> <video>
   ========================= */


const extractYouTubeSi = (input) => {
  const s = norm(input);
  if (!s) return "";
  const m = s.match(/[?&]si=([^&]+)/i);
  return m?.[1] ? String(m[1]) : "";
};


const extractYouTubeId = (input) => {
  const s = norm(input);
  if (!s) return "";

  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;

  const short = s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (short?.[1]) return short[1];

  const v = s.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (v?.[1]) return v[1];

  const emb = s.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (emb?.[1]) return emb[1];

  const shorts = s.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shorts?.[1]) return shorts[1];

  const live = s.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
  if (live?.[1]) return live[1];

  return "";
};

const isDirectVideoUrl = (input) => {
  const v = normLow(input);
  if (!v) return false;
  if (v.startsWith("blob:")) return true;
  if (v.startsWith("/media/") || v.includes("/media/")) return true;

  return (
    v.endsWith(".mp4") ||
    v.endsWith(".webm") ||
    v.endsWith(".ogg") ||
    v.includes(".mp4?") ||
    v.includes(".webm?") ||
    v.includes(".ogg?")
  );
};

const VideoPreview = ({ source, className = "", heightClass = "h-[160px]" }) => {
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

  const ytId = extractYouTubeId(raw);
  const src = toAbsUrl(raw);

  if (ytId) {
    const si = extractYouTubeSi(raw);
    const embed = `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1${si ? `&si=${encodeURIComponent(si)}` : ""}`;

    return (
      <div className={`rounded-lg overflow-hidden bg-black border ${heightClass} ${className}`}>
        <iframe
          title="YouTube video player"
          src={embed}
          className={`w-full ${heightClass}`}
          frameBorder="0"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }


  if (isDirectVideoUrl(src) || src.startsWith("http://") || src.startsWith("https://") || src.startsWith("blob:")) {
    return (
      <div className={`rounded-lg overflow-hidden bg-black border ${className}`}>
        <video src={src} controls className={`w-full ${heightClass} object-cover bg-black`} preload="metadata" />
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
};

/* =========================
   SearchableSelectSingle — НЕ portal
   ========================= */
const SearchableSelectSingle = ({
  value,
  onChange,
  options,
  placeholder = "Выберите...",
  searchPlaceholder = "Поиск...",
  disabled = false,
  getLabel = (o) => o?.label ?? "",
  getValue = (o) => o?.value ?? "",
  className = "",
}) => {
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
            <button type="button" onClick={() => pick("")} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
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
                  className={["w-full text-left px-3 py-2 text-sm hover:bg-gray-50", isActive ? "bg-blue-50" : ""].join(" ")}
                >
                  {label}
                </button>
              );
            })}

            {filtered.length === 0 && <div className="px-3 py-3 text-sm text-gray-500">Ничего не найдено</div>}
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================
   Attachments view
   ========================= */
const AttachmentsView = ({ attachments }) => {
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
                <a href={toAbsUrl(url)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
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
};

/* =========================
   Homework materials single file
   ========================= */
const LessonHomeworkMaterialsSingle = ({ file, existingUrl, onPick, onClear }) => {
  const fileRef = useRef(null);

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">Материалы к ДЗ</div>

      {existingUrl ? (
        <div className="text-sm">
          Текущий файл:{" "}
          <a href={toAbsUrl(existingUrl)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
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
};

/* =========================
   Modal
   ========================= */
const Modal = ({ title, isOpen, onClose, children, closeOnOverlay = true }) => {
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
};

/* =========================
   Confirm modal
   ========================= */
const ConfirmModal = ({ isOpen, title, description, onCancel, onConfirm, confirmText = "Удалить" }) => {
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
};

/* =========================
   Normalizers
   ========================= */
const normalizeCourseId = (c) => String(c?.id ?? c?.course_id ?? c?.pk ?? "");
const normalizeCategoryName = (c) => c?.categoryName ?? c?.category_name ?? c?.category?.name ?? c?.category?.title ?? "";
const normalizeCourseTitle = (c) => c?.title ?? c?.name ?? c?.course_title ?? "";

const normalizeLessonId = (l) => String(l?.id ?? l?.pk ?? "");
const normalizeLessonTitle = (l) => l?.title ?? l?.lesson_title ?? "";
const normalizeLessonCourseId = (l) => {
  const c = l?.course;
  const cid = l?.courseId ?? l?.course_id ?? (c && typeof c === "object" ? c.id : c) ?? "";
  return String(cid || "");
};

const normalizeHomework = (hw) => {
  const id = hw?.id ?? "";
  const courseId = hw?.course_id ?? hw?.courseId ?? hw?.course ?? "";
  const courseTitle = hw?.course_title ?? hw?.courseTitle ?? "";
  const lessonId = hw?.lesson ?? hw?.lesson_id ?? hw?.lessonId ?? hw?.lesson?.id ?? "";
  const lessonTitle = hw?.lesson_title ?? hw?.lessonTitle ?? hw?.lesson?.title ?? "";
  const userId = hw?.user ?? hw?.userId ?? hw?.student ?? hw?.student_id ?? "";
  const studentUsername = hw?.student_username ?? hw?.studentUsername ?? hw?.username ?? hw?.student?.username ?? "";
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
};

const pickLatestAttemptsByLesson = (list) => {
  const arr = Array.isArray(list) ? list : [];
  const map = new Map();
  for (const hw of arr) {
    const lid = String(hw?.lessonId || "");
    if (!lid) continue;

    const prev = map.get(lid);
    if (!prev) {
      map.set(lid, hw);
      continue;
    }

    const a = new Date(hw?.createdAt || 0).getTime();
    const b = new Date(prev?.createdAt || 0).getTime();

    if (a === b) {
      const ida = String(hw?.id || "");
      const idb = String(prev?.id || "");
      if (ida > idb) map.set(lid, hw);
    } else if (a > b) {
      map.set(lid, hw);
    }
  }
  return Array.from(map.values());
};

const isTeacherCanReview = (status) => {
  const s = normLow(status);
  return s === "examination" || s === "rework" || s === "declined" || !s;
};

/* =========================
   ✅ NEW COURSE validation helper
   ========================= */
const validateNewCourseForm = ({ title, categoryId, description, photo }) => {
  const errors = { title: "", category: "", description: "", photo: "" };

  const t = norm(title);
  if (!t) errors.title = "Название курса обязательно";
  else if (t.length < 3) errors.title = "Минимум 3 символа";

  const cat = norm(categoryId);
  if (!cat) errors.category = "Выберите категорию";

  const d = norm(description);
  if (d.length > 2000) errors.description = "Слишком длинное описание (макс 2000 символов)";

  if (photo) {
    const isImage = photo.type?.startsWith("image/");
    if (!isImage) errors.photo = "Можно загрузить только изображение";
    const maxMb = 5;
    if (photo.size > maxMb * 1024 * 1024) errors.photo = `Максимум ${maxMb}MB`;
  }

  const ok = !errors.title && !errors.category && !errors.description && !errors.photo;
  return { ok, errors };
};

/* =========================
   ✅ Video link normalization for payload
   - если YouTube -> youtube_video_id
   - если direct link (/media/mp4/https) -> video_url
   ========================= */
const buildLessonVideoPayload = (videoInput) => {
  const raw = norm(videoInput);
  if (!raw) return { ok: false, error: "Добавьте ссылку на видео (YouTube или mp4/webm/ogg)." };

  // Если это YouTube (url/shorts/live/id) — сохраняем в video_url
  const ytId = extractYouTubeId(raw);
  if (ytId) {
    // если ввели только ID, соберём каноничную ссылку
    const url = /^[a-zA-Z0-9_-]{11}$/.test(raw)
      ? `https://youtu.be/${ytId}`
      : raw;

    return { ok: true, payload: { video_url: url } };
  }

  // Иначе — прямой файл/ссылка
  const abs = toAbsUrl(raw);
  if (
    isDirectVideoUrl(abs) ||
    abs.startsWith("http://") ||
    abs.startsWith("https://") ||
    abs.startsWith("/media/")
  ) {
    return { ok: true, payload: { video_url: abs } };
  }

  return {
    ok: false,
    error: "Неверная ссылка. Нужен YouTube URL/ID или прямая ссылка на mp4/webm/ogg (или /media/... ).",
  };
};
/* =========================
   ✅ getLessonVideoSource
   Берём то, что реально приходит с бэка (разные варианты названий)
   ========================= */
const getLessonVideoSource = (lesson) => {
  if (!lesson) return "";

  const candidates = [
    lesson.video_url,
    lesson.videoUrl,
    lesson.video,
    lesson.video_link,
    lesson.videoLink,
    lesson.youtube_url,
    lesson.youtubeUrl,
    lesson.youtube_video_url,
    lesson.youtubeVideoUrl,
    lesson.youtube_video_id,
    lesson.youtubeVideoId,
  ]
    .map((v) => norm(v))
    .filter(Boolean);

  if (!candidates.length) return "";

  // если пришёл youtube id — превращаем в ссылку
  const first = candidates[0];
  const ytId = extractYouTubeId(first);
  if (ytId && /^[a-zA-Z0-9_-]{11}$/.test(first)) return `https://youtu.be/${ytId}`;

  return first;
};

/* =========================
   Teacher Dashboard
   ========================= */
export function TeacherDashboard () {
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

  const [ytProject, setYtProject] = useState({ loading: false, data: null });

  // NEW COURSE modal
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseCategoryId, setNewCourseCategoryId] = useState("");
  const [newCourseDescription, setNewCourseDescription] = useState("");
  const [newCoursePhoto, setNewCoursePhoto] = useState(null);

  const [newCourseErrors, setNewCourseErrors] = useState({
    title: "",
    category: "",
    description: "",
    photo: "",
  });

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
    // ✅ вместо file: ссылка на YouTube/прямой файл
    videoLink: "",
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
    // ✅ вместо file: ссылка на YouTube/прямой файл
    videoLink: "",
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
    if (!isAddingLesson) return undefined;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isAddingLesson]);

  if (!user) return null;

  const normalizedCourses = useMemo(() => (Array.isArray(courses) ? courses : []), [courses]);
  const normalizedLessons = useMemo(() => (Array.isArray(teacherLessons) ? teacherLessons : []), [teacherLessons]);
  const normalizedHomeworks = useMemo(
    () => (Array.isArray(teacherHomeworks) ? teacherHomeworks : []).map(normalizeHomework),
    [teacherHomeworks]
  );

  const teacherCourses = useMemo(() => {
    const uid = String(user.id);
    const list = normalizedCourses;

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

    const myCourseIds = new Set(
      (Array.isArray(normalizedLessons) ? normalizedLessons : [])
        .map((l) => normalizeLessonCourseId(l))
        .filter(Boolean)
        .map(String)
    );

    if (myCourseIds.size === 0) return [];
    return list.filter((c) => myCourseIds.has(String(normalizeCourseId(c))));
  }, [normalizedCourses, normalizedLessons, user.id]);

  const teacherCourseIds = useMemo(() => new Set(teacherCourses.map((c) => normalizeCourseId(c))), [teacherCourses]);

  const homeworksSafe = useMemo(() => {
    if (teacherCourseIds.size === 0) return [];
    return normalizedHomeworks.filter((hw) => teacherCourseIds.has(String(hw.courseId)));
  }, [normalizedHomeworks, teacherCourseIds]);

  const teacherHomeworksActiveRaw = useMemo(() => homeworksSafe.filter((hw) => !archivedIds.has(String(hw.id))), [homeworksSafe, archivedIds]);
  const teacherHomeworksArchivedRaw = useMemo(() => homeworksSafe.filter((hw) => archivedIds.has(String(hw.id))), [homeworksSafe, archivedIds]);

  const teacherHomeworksActive = useMemo(() => {
    const map = new Map();
    for (const hw of teacherHomeworksActiveRaw) {
      const sid = String(hw.userId || "unknown");
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid).push(hw);
    }
    const out = [];
    for (const [, list] of map.entries()) {
      out.push(...pickLatestAttemptsByLesson(list));
    }
    return out;
  }, [teacherHomeworksActiveRaw]);

  const teacherHomeworksArchived = useMemo(() => {
    const map = new Map();
    for (const hw of teacherHomeworksArchivedRaw) {
      const sid = String(hw.userId || "unknown");
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid).push(hw);
    }
    const out = [];
    for (const [, list] of map.entries()) {
      out.push(...pickLatestAttemptsByLesson(list));
    }
    return out;
  }, [teacherHomeworksArchivedRaw]);

  const pendingCount = teacherHomeworksActive.filter((hw) => {
    const s = normLow(hw.status);
    return s === "examination" || !s;
  }).length;

  const acceptedCount = teacherHomeworksActive.filter((hw) => normLow(hw.status) === "accepted").length;

  const filteredActive = useMemo(() => {
    if (homeworkFilter === "submitted") {
      return teacherHomeworksActive.filter((hw) => {
        const s = normLow(hw.status);
        return s === "examination" || !s;
      });
    }
    if (homeworkFilter === "accepted") return teacherHomeworksActive.filter((hw) => normLow(hw.status) === "accepted");
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
        if (pa !== pb) return pa - pb;

        const ta = new Date(a.createdAt || 0).getTime();
        const tb = new Date(b.createdAt || 0).getTime();
        return tb - ta;
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

  const handleReview = useCallback(
    async (homeworkId, status) => {
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
    },
    [comments, reviewHomework, loadTeacherHomeworks]
  );

  const archiveLocal = useCallback(
    (hwId) => {
      const id = String(hwId);
      const next = new Set(archivedIds);
      next.add(id);
      setArchivedIds(next);
      setTeacherArchivedSet(user.id, next);
    },
    [archivedIds, user.id]
  );

  const unarchiveLocal = useCallback(
    (hwId) => {
      const id = String(hwId);
      const next = new Set(archivedIds);
      next.delete(id);
      setArchivedIds(next);
      setTeacherArchivedSet(user.id, next);
    },
    [archivedIds, user.id]
  );

  const handleArchive = useCallback(
    async (hw) => {
      if (normLow(hw.status) !== "accepted") {
        toast.error("В архив можно отправить только «Принято»");
        return;
      }
      archiveLocal(hw.id);
      toast.success("Отправлено в архив");
    },
    [archiveLocal]
  );

  const handleUnarchive = useCallback(
    async (hwId) => {
      unarchiveLocal(hwId);
      toast.success("Разархивировано");
    },
    [unarchiveLocal]
  );

  const toggleStudent = useCallback((studentId) => {
    setExpandedStudents((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  }, []);

  const toggleArchiveStudent = useCallback((studentId) => {
    setExpandedArchiveStudents((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  }, []);

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
        res?.data?.auth_url || res?.data?.url || res?.auth_url || res?.url || res?.data?.authorization_url || "";

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
  const openAddCourse = useCallback(() => {
    setNewCourseTitle("");
    setNewCourseCategoryId("");
    setNewCourseDescription("");
    setNewCoursePhoto(null);
    setNewCourseErrors({ title: "", category: "", description: "", photo: "" });
    setIsAddCourseOpen(true);
  }, []);

  const createNewCourse = useCallback(async () => {
    const v = validateNewCourseForm({
      title: newCourseTitle,
      categoryId: newCourseCategoryId,
      description: newCourseDescription,
      photo: newCoursePhoto,
    });

    setNewCourseErrors(v.errors);

    if (!v.ok) {
      toast.error("Заполните обязательные поля");
      return;
    }

    if (!addCourse) {
      toast.error("addCourse не подключён в DataContext");
      return;
    }

    try {
      const payload = {
        title: norm(newCourseTitle),
        description: norm(newCourseDescription),
        category: newCourseCategoryId,
        photo: newCoursePhoto || undefined,
      };

      const res = await addCourse(payload);

      if (res?.ok === false) {
        toast.error(res?.error || "Не удалось добавить курс");
        return;
      }

      const cid =
        typeof res === "number" || typeof res === "string"
          ? res
          : res?.id ?? res?.data?.id ?? res?.course_id ?? null;

      if (!cid) {
        toast.error("Не удалось добавить курс (id не вернулся)");
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
  }, [
    addCourse,
    loadPublic,
    newCourseTitle,
    newCourseDescription,
    newCourseCategoryId,
    newCoursePhoto,
  ]);

  const openEditCourse = useCallback((course) => {
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
  }, []);

  const saveEditCourse = useCallback(async () => {
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
  }, [editCourseId, updateCourse, editCourseForm, loadPublic]);

  const askDeleteCourse = useCallback((course) => {
    const cid = String(normalizeCourseId(course) || "").trim();
    setConfirmDeleteCourse({
      open: true,
      courseId: cid,
      courseTitle: normalizeCourseTitle(course) || "Курс",
    });
  }, []);

  const confirmDeleteCourseNow = useCallback(async () => {
    const { courseId } = confirmDeleteCourse;
    const cidRaw = String(courseId || "").trim();
    if (!cidRaw) return;

    if (!deleteCourse) {
      toast.error("deleteCourse не подключён в DataContext");
      return;
    }

    try {
      let res = await deleteCourse(cidRaw);

      if (res?.ok === false) {
        const cidNum = Number(cidRaw);
        if (Number.isFinite(cidNum)) {
          res = await deleteCourse(cidNum);
        }
      }

      if (res?.ok === false) {
        toast.error(res?.error || "Не удалось удалить курс");
        return;
      }

      toast.success("Курс удалён");
      setConfirmDeleteCourse({ open: false, courseId: "", courseTitle: "" });
      setIsEditCourseOpen(false);

      await Promise.all([loadPublic?.(), loadTeacherLessons?.(), loadTeacherHomeworks?.()]);
      setExpandedCourse((prev) => (String(prev) === cidRaw ? null : prev));
    } catch (e) {
      console.error(e);
      toast.error("Ошибка удаления курса");
    }
  }, [confirmDeleteCourse, deleteCourse, loadPublic, loadTeacherLessons, loadTeacherHomeworks]);

  /* =========================
     Lessons
     ========================= */
const openEditLessonModal = useCallback((lesson) => {
  const id = normalizeLessonId(lesson);

  const backendVideo = getLessonVideoSource(lesson); // ✅ правильно

  const backendHomeworkFileUrl = norm(lesson?.homework_file || "");

  setEditLessonId(id);
  setEditLessonForm({
    title: normalizeLessonTitle(lesson),
    description: lesson?.description ?? "",
    order: String(lesson?.order ?? ""),
    videoLink: backendVideo,
    backendVideo,
    youtube_status: lesson?.youtube_status ?? lesson?.youtubeStatus ?? "",
    youtube_error: lesson?.youtube_error ?? lesson?.youtubeError ?? "",
    homeworkDescription: lesson?.homework_description ?? "",
    homeworkFile: null,
    homeworkExistingFileUrl: backendHomeworkFileUrl,
  });

  setIsEditLessonOpen(true);
}, []);



  const closeEditLessonModal = useCallback(() => {
    setIsEditLessonOpen(false);
    setEditLessonId("");
    setEditLessonForm({
      title: "",
      description: "",
      order: "",
      videoLink: "",
      backendVideo: "",
      youtube_status: "",
      youtube_error: "",
      homeworkDescription: "",
      homeworkFile: null,
      homeworkExistingFileUrl: "",
    });
  }, []);

  const saveEditLesson = useCallback(async () => {
    if (!editLessonId) return;
    if (!updateLesson) {
      toast.error("updateLesson не подключён в DataContext");
      return;
    }

    const videoInput = norm(editLessonForm.videoLink || editLessonForm.backendVideo);
    if (!videoInput) {
      toast.error("Урок без видео нельзя сохранить");
      return;
    }

    const videoPayload = buildLessonVideoPayload(videoInput);
    if (!videoPayload.ok) {
      toast.error(videoPayload.error);
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
        ...(editLessonForm.homeworkFile ? { homework_file: editLessonForm.homeworkFile } : {}),
        ...videoPayload.payload, // ✅ youtube_video_id или video_url
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
  }, [editLessonId, updateLesson, editLessonForm, closeEditLessonModal, loadTeacherLessons, youtubeRefreshLessonStatus]);

  const askDeleteLesson = useCallback((lessonId, lessonTitle) => {
    setConfirmDeleteLesson({
      open: true,
      lessonId: String(lessonId || ""),
      lessonTitle: String(lessonTitle || "Урок"),
    });
  }, []);

  const confirmDeleteLessonNow = useCallback(async () => {
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
  }, [confirmDeleteLesson, deleteLesson, closeEditLessonModal, loadTeacherLessons]);

  const handleAddLesson = useCallback(async () => {
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

    const title = norm(addForm.title);
    if (!title) {
      toast.error("Введите название урока");
      return;
    }

    const videoInput = norm(addForm.videoLink);
    if (!videoInput) {
      toast.error("Вставьте ссылку на YouTube (или прямую ссылку на видео)");
      return;
    }

    const videoPayload = buildLessonVideoPayload(videoInput);
    if (!videoPayload.ok) {
      toast.error(videoPayload.error);
      return;
    }

    const orderNum = Number(addForm.order);
    const orderValue = String(addForm.order).trim() === "" || !Number.isFinite(orderNum) ? undefined : orderNum;

    setIsAddingLesson(true);
    try {
      const payload = {
        course: Number(cid),
        title,
        description: norm(addForm.description),
        order: orderValue,
        homework_description: norm(addForm.homeworkDescription),
        ...(addForm.homeworkFile ? { homework_file: addForm.homeworkFile } : {}),
        ...videoPayload.payload, // ✅ youtube_video_id или video_url
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
        videoLink: "",
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
  }, [isAddingLesson, addForm, addLesson, loadTeacherLessons, normalizedLessons, youtubeRefreshStatusBatch]);

  const categoriesOptions = useMemo(() => {
    const base = Array.isArray(categories) ? categories : [];
    return base
      .map((c) => ({ value: String(c?.id ?? c?.pk ?? ""), label: String(c?.name ?? c?.title ?? "") }))
      .filter((x) => x.value && x.label);
  }, [categories]);

  const teacherCoursesOptions = useMemo(() => {
    return teacherCourses
      .map((c) => ({ value: normalizeCourseId(c), label: normalizeCourseTitle(c) }))
      .filter((x) => x.value && x.label);
  }, [teacherCourses]);

  const isAnyLoading = !!loading?.public || !!loading?.teacherLessons || !!loading?.teacherHomeworks || false;
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

          {/* (опционально) кнопки YouTube (если у тебя вообще остались эндпоинты) */}
          {/* <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={fetchYouTubeProjectStatus} disabled={!youtubeProjectStatus}>
              <RefreshCw className="w-4 h-4 mr-2" />
              YouTube статус
            </Button>
            <Button type="button" variant="outline" onClick={startYouTubeOAuth} disabled={!youtubeProjectOauthStart}>
              <LinkIcon className="w-4 h-4 mr-2" />
              YouTube OAuth
            </Button>
          </div> */}
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
                          <div className="font-semibold">{list?.[0]?.studentUsername || "Студент"}</div>
                          <div className="text-sm text-gray-600">
                            Всего (последние попытки): {list.length} • На проверке: {submitted}
                          </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 transition ${isOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isOpen && (
                        <div className="mt-5 space-y-4">
                          {list.map((hw) => {
                            const lesson = normalizedLessons.find((l) => normalizeLessonId(l) === String(hw.lessonId));
                            const comment = comments[hw.id] || "";
                            const canReview = isTeacherCanReview(hw.status);

                            return (
                              <div key={hw.id} className="border rounded-lg p-4 bg-white">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="font-semibold">
                                      {hw.courseTitle || "Курс"} •{" "}
                                      {normalizeLessonTitle(lesson) || hw.lessonTitle || `Урок ${hw.lessonId}`}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Отправлено: {hw.createdAt ? new Date(hw.createdAt).toLocaleDateString() : "—"}
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
                                    <div className="text-sm font-medium mb-1">Комментарий преподавателя:</div>
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
                                      <Button onClick={() => handleReview(hw.id, "accepted")} className="bg-green-600 hover:bg-green-700">
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Принять
                                      </Button>

                                      <Button onClick={() => handleReview(hw.id, "rework")} className="bg-orange-600 hover:bg-orange-700">
                                        <XCircle className="w-4 h-4 mr-2" />
                                        На доработку
                                      </Button>

                                      <Button onClick={() => handleReview(hw.id, "declined")} variant="destructive">
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
                        <button onClick={() => setExpandedCourse(isOpen ? null : courseId)} className="flex-1 text-left" type="button">
                          <CardTitle className="text-xl">{normalizeCourseTitle(course) || "Курс"}</CardTitle>
                          <p className="text-sm text-gray-600 mt-2">
                            {(normalizeCategoryName(course) || "Без категории") + " • " + courseLessons.length + " уроков"}
                          </p>
                          {course?.description ? (
                            <p className="text-sm text-gray-700 mt-2 line-clamp-2">{course.description}</p>
                          ) : null}
                        </button>

                        <div className="flex items-center gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => openEditCourse(course)}>
                            <FolderPen className="w-4 h-4 mr-2" />
                            Курс
                          </Button>

                          <Button type="button" variant="destructive" size="sm" onClick={() => askDeleteCourse(course)}>
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
                            const backendVideo = getLessonVideoSource(l);


                            const orderLabel = Number.isFinite(Number(l?.order)) ? l.order : idx + 1;

                            return (
                              <div key={lid} className="border rounded-lg p-4 bg-white">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-2">
                                    <div className="font-semibold flex items-center gap-2 flex-wrap">
                                      <span>
                                        {orderLabel}. {normalizeLessonTitle(l) || "Урок"}
                                      </span>
                                      <YouTubeStatusBadge status={l?.youtube_status ?? l?.youtubeStatus} error={l?.youtube_error ?? l?.youtubeError} />
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {/* <Button variant="outline" size="sm" onClick={() => refreshOneLessonStatus(lid)}>
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Статус
                                      </Button> */}

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

                                {l?.description ? <p className="text-sm text-gray-700 mt-3">{l.description}</p> : null}
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

                      <Button type="button" variant="outline" onClick={openAddCourse} className="shrink-0" disabled={isAddingLesson}>
                        <Plus className="w-4 h-4 mr-2" />
                        Новый курс
                      </Button>
                    </div>
                  </div>

                  {/* ✅ ВМЕСТО ФАЙЛА: ссылка */}
                  <div className="space-y-2">
                    <label className="text-sm">Ссылка на видео (YouTube)</label>
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-gray-600" />
                      <Input
                        value={addForm.videoLink}
                        onChange={(e) => setAddForm((p) => ({ ...p, videoLink: e.target.value }))}
                        placeholder="https://youtu.be/OT-MQBtMVTo"
                        disabled={isAddingLesson}
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      Можно вставить: YouTube ссылку, или просто ID (11 символов). Также можно прямую ссылку на mp4/webm/ogg.
                    </div>
                  </div>
                </div>

                {addForm.videoLink ? (
                  <div className="max-w-md">
                    <VideoPreview source={addForm.videoLink} heightClass="h-[180px]" />
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
                      <button onClick={() => toggleArchiveStudent(studentId)} className="w-full flex items-center justify-between" type="button">
                        <div className="text-left">
                          <div className="font-semibold">{list?.[0]?.studentUsername || "Студент"}</div>
                          <div className="text-sm text-gray-600">В архиве: {list.length}</div>
                        </div>
                        <ChevronDown className={`w-5 h-5 transition ${isOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isOpen && (
                        <div className="mt-5 space-y-3">
                          {list.map((hw) => {
                            const lesson = normalizedLessons.find((l) => normalizeLessonId(l) === String(hw.lessonId));

                            return (
                              <div key={hw.id} className="border rounded-lg p-4 bg-white">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="font-semibold">
                                      {hw.courseTitle || "Курс"} •{" "}
                                      {normalizeLessonTitle(lesson) || hw.lessonTitle || `Урок ${hw.lessonId}`}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Проверено: {hw.reviewedAt ? new Date(hw.reviewedAt).toLocaleDateString() : "—"}
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
          onClose={() => {
            setIsAddCourseOpen(false);
            setNewCourseErrors({ title: "", category: "", description: "", photo: "" });
          }}
          closeOnOverlay={false}
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm">Название курса</label>
              <Input
                value={newCourseTitle}
                onChange={(e) => {
                  setNewCourseTitle(e.target.value);
                  if (newCourseErrors.title) setNewCourseErrors((p) => ({ ...p, title: "" }));
                }}
                placeholder="React с нуля"
                className={newCourseErrors.title ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {newCourseErrors.title ? <div className="text-xs text-red-600">{newCourseErrors.title}</div> : null}
            </div>

            <div className="space-y-1">
              <label className="text-sm">Описание (опционально)</label>
              <Textarea
                rows={3}
                value={newCourseDescription}
                onChange={(e) => {
                  setNewCourseDescription(e.target.value);
                  if (newCourseErrors.description) setNewCourseErrors((p) => ({ ...p, description: "" }));
                }}
                placeholder="Коротко о курсе"
                className={newCourseErrors.description ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {newCourseErrors.description ? <div className="text-xs text-red-600">{newCourseErrors.description}</div> : null}
            </div>

            <div className="space-y-1">
              <label className="text-sm">
                Категория <span className="text-red-600">*</span>
              </label>

              <div className={newCourseErrors.category ? "rounded-md ring-2 ring-red-500" : ""}>
                <SearchableSelectSingle
                  value={newCourseCategoryId}
                  onChange={(v) => {
                    setNewCourseCategoryId(v);
                    if (newCourseErrors.category) setNewCourseErrors((p) => ({ ...p, category: "" }));
                  }}
                  options={categoriesOptions}
                  placeholder="Выберите категорию"
                  searchPlaceholder="Найти категорию..."
                />
              </div>

              {newCourseErrors.category ? <div className="text-xs text-red-600">{newCourseErrors.category}</div> : null}
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
                    if (newCourseErrors.photo) setNewCourseErrors((p) => ({ ...p, photo: "" }));
                    e.target.value = "";
                  }}
                />
                <div
                  className={[
                    "w-full border rounded-md px-3 py-2 bg-white hover:bg-gray-50 transition flex items-center gap-2 cursor-pointer",
                    newCourseErrors.photo ? "border-red-500" : "",
                  ].join(" ")}
                >
                  <ImageIcon className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">{newCoursePhoto ? newCoursePhoto.name : "Выбрать картинку"}</span>
                </div>
              </label>

              {newCourseErrors.photo ? <div className="text-xs text-red-600">{newCourseErrors.photo}</div> : null}
            </div>

            <div className="flex gap-3">
              <Button onClick={createNewCourse} className="w-full">
                Добавить
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddCourseOpen(false);
                  setNewCourseErrors({ title: "", category: "", description: "", photo: "" });
                }}
                className="w-full"
              >
                Закрыть
              </Button>
            </div>
          </div>
        </Modal>

        {/* MODAL: редактировать курс */}
        <Modal title="Редактировать курс" isOpen={isEditCourseOpen} onClose={() => setIsEditCourseOpen(false)} closeOnOverlay={false}>
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
                  <span className="text-sm text-gray-700">{editCourseForm.photoFile ? editCourseForm.photoFile.name : "Выбрать картинку"}</span>
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
            <VideoPreview source={editLessonForm.videoLink || editLessonForm.backendVideo} heightClass="h-[160px]" />



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
              <Textarea
                rows={3}
                value={editLessonForm.description}
                onChange={(e) => setEditLessonForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            {/* ✅ ВМЕСТО "Выбрать новое видео": ссылка */}
            <div className="space-y-1">
              <label className="text-sm">Ссылка на видео (YouTube / прямое видео)</label>
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-gray-600" />
                <Input
                  value={editLessonForm.videoLink}
                  onChange={(e) => setEditLessonForm((p) => ({ ...p, videoLink: e.target.value }))}
                  placeholder="https://youtu.be/OT-MQBtMVTo"
                />
              </div>
              <div className="text-xs text-gray-500">
                Пример: https://youtu.be/OT-MQBtMVTo или ID (11 символов).
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm">Домашнее задание (опционально)</label>
              <Textarea
                rows={2}
                value={editLessonForm.homeworkDescription}
                onChange={(e) => setEditLessonForm((p) => ({ ...p, homeworkDescription: e.target.value }))}
              />
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

        {/* Overlay: adding (теперь без аплоада видео, но пусть остается как "сохранение") */}
        {isAddingLesson ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" role="status" aria-live="polite">
            <div className="absolute inset-0 bg-black/70" />
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl border p-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600" />
                <div className="text-xl font-semibold">Сохраняем урок</div>
                <div className="text-sm text-gray-600">Пожалуйста, не выходите</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TeacherDashboard;
