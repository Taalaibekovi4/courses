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
  if (s === "declined")
    return <Badge variant="destructive">Отклонено</Badge>;
  if (s === "submitted" || !s)
    return <Badge variant="secondary">На проверке</Badge>;

  return <Badge variant="outline">—</Badge>;
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

          <div className="max-h-64 overflow-auto">
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
                  href={url}
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
            href={existingUrl}
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
            Удалить
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
   Modal
   ========================= */
function Modal({ title, isOpen, onClose, children }) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
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

        <div className="p-4 max-h-[85vh] overflow-auto transition-all">{children}</div>
      </div>
    </div>
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
  const cid = l?.courseId ?? l?.course_id ?? l?.course ?? "";
  return String(cid || "");
}

function normalizeHomework(hw) {
  const id = hw?.id ?? "";
  const courseId = hw?.course_id ?? hw?.courseId ?? hw?.course ?? "";
  const courseTitle = hw?.course_title ?? hw?.courseTitle ?? "";
  const lessonId =
    hw?.lesson ??
    hw?.lesson_id ??
    hw?.lessonId ??
    hw?.lesson?.id ??
    hw?.lesson?.pk ??
    "";
  const lessonTitle = hw?.lesson_title ?? hw?.lessonTitle ?? hw?.lesson?.title ?? "";
  const userId = hw?.user ?? hw?.userId ?? hw?.student ?? hw?.student_id ?? "";
  const studentUsername =
    hw?.student_username ?? hw?.studentUsername ?? hw?.username ?? hw?.student?.username ?? "";
  const content = hw?.content ?? "";
  const status = hw?.status ?? "submitted";
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
    status: String(status || "submitted"),
    teacherComment: String(teacherComment || ""),
    createdAt: String(createdAt || ""),
    reviewedAt: String(reviewedAt || ""),
    attachments: hw?.attachments ?? [],
  };
}

function canPlayVideo(url) {
  const u = norm(url);
  if (!u) return false;
  if (u.startsWith("blob:")) return true;
  if (u.startsWith("http://") || u.startsWith("https://")) return true;
  return false;
}

function isTeacherCanReview(status) {
  const s = normLow(status);
  return s === "submitted" || !s || s === "rework";
}

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
    addCourse,
    updateCourse,

    loading,
    error,
  } = data || {};

  const [tab, setTab] = useState("homework");
  const [homeworkFilter, setHomeworkFilter] = useState("all"); // all | submitted | accepted

  const [comments, setComments] = useState({});
  const [expandedStudents, setExpandedStudents] = useState({});
  const [expandedArchiveStudents, setExpandedArchiveStudents] = useState({});
  const [expandedCourse, setExpandedCourse] = useState(null);

  // локальный архив
  const [archivedIds, setArchivedIds] = useState(() => new Set());

  // MODAL: add course
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseCategoryId, setNewCourseCategoryId] = useState("");

  // MODAL: edit course
  const [isEditCourseOpen, setIsEditCourseOpen] = useState(false);
  const [editCourseId, setEditCourseId] = useState("");
  const [editCourseForm, setEditCourseForm] = useState({
    title: "",
    description: "",
    categoryId: "",
  });

  // EDIT LESSON
  const [editLessonId, setEditLessonId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    videoInput: "",
    videoFile: null,
    videoPreviewUrl: "",
    homeworkDescription: "",
    homeworkFile: null,
    homeworkExistingFileUrl: "",
  });

  // ADD LESSON
  const [addForm, setAddForm] = useState({
    courseId: "",
    title: "",
    description: "",
    videoInput: "",
    videoFile: null,
    videoPreviewUrl: "",
    homeworkDescription: "",
    homeworkFile: null,
  });

  // ✅ большой оверлей загрузки
  const [isAddingLesson, setIsAddingLesson] = useState(false);

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
    return () => {
      if (addForm.videoPreviewUrl?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(addForm.videoPreviewUrl);
        } catch (_) {}
      }
      if (editForm.videoPreviewUrl?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(editForm.videoPreviewUrl);
        } catch (_) {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const teacherCourses = useMemo(() => {
    const uid = String(user.id);
    const list = normalizedCourses;

    const anyTeacherField = list.some(
      (c) =>
        c?.teacherId != null ||
        c?.teacher_id != null ||
        c?.teacher != null ||
        c?.teacher?.id != null ||
        c?.owner_id != null
    );
    if (!anyTeacherField) return list;

    return list.filter((c) => {
      const t =
        c?.teacherId ??
        c?.teacher_id ??
        (typeof c?.teacher === "number" || typeof c?.teacher === "string" ? c.teacher : null) ??
        c?.teacher?.id ??
        c?.owner_id ??
        null;
      return String(t ?? "") === uid;
    });
  }, [normalizedCourses, user.id]);

  const teacherCourseIds = useMemo(
    () => new Set(teacherCourses.map((c) => normalizeCourseId(c))),
    [teacherCourses]
  );

  const homeworksSafe = useMemo(() => {
    if (teacherCourseIds.size === 0) return normalizedHomeworks;
    return normalizedHomeworks.filter((hw) => teacherCourseIds.has(String(hw.courseId)));
  }, [normalizedHomeworks, teacherCourseIds]);

  const teacherHomeworksActive = useMemo(() => {
    return homeworksSafe.filter((hw) => !archivedIds.has(String(hw.id)));
  }, [homeworksSafe, archivedIds]);

  const teacherHomeworksArchived = useMemo(() => {
    return homeworksSafe.filter((hw) => archivedIds.has(String(hw.id)));
  }, [homeworksSafe, archivedIds]);

  const pendingCount = teacherHomeworksActive.filter(
    (hw) => normLow(hw.status) === "submitted" || !normLow(hw.status)
  ).length;

  const acceptedCount = teacherHomeworksActive.filter((hw) => normLow(hw.status) === "accepted").length;

  const filteredActive = useMemo(() => {
    if (homeworkFilter === "submitted")
      return teacherHomeworksActive.filter((hw) => normLow(hw.status) === "submitted" || !normLow(hw.status));
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
        const pa = normLow(a.status) === "submitted" || !normLow(a.status) ? 0 : 1;
        const pb = normLow(b.status) === "submitted" || !normLow(b.status) ? 0 : 1;
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
     Courses
     ========================= */
  function openAddCourse() {
    setNewCourseTitle("");
    setNewCourseCategoryId("");
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
        name: title,
        description: "",
        categoryId: newCourseCategoryId || undefined,
        category_id: newCourseCategoryId || undefined,
        category: newCourseCategoryId || undefined,
      };

      const res = await addCourse(payload);

      const cid =
        typeof res === "number" || typeof res === "string"
          ? res
          : res?.id ?? res?.data?.id ?? res?.course_id ?? null;

      if (!cid) {
        toast.error("Не удалось добавить курс");
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
        name: title,
        description: editCourseForm.description ?? "",
        categoryId: editCourseForm.categoryId || undefined,
        category_id: editCourseForm.categoryId || undefined,
        category: editCourseForm.categoryId || undefined,
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

  /* =========================
     Lessons
     ========================= */
  function openEditLesson(lesson) {
    const id = normalizeLessonId(lesson);
    setEditLessonId(id);

    const backendVideo = norm(
      lesson?.youtubeVideoId ??
        lesson?.youtube_video_id ??
        lesson?.videoUrl ??
        lesson?.video_url ??
        ""
    );

    const backendHomeworkFileUrl = norm(
      lesson?.homeworkFile ??
        lesson?.homework_file ??
        lesson?.homeworkFileUrl ??
        ""
    );

    setEditForm({
      title: normalizeLessonTitle(lesson),
      description: lesson?.description ?? "",
      videoInput: backendVideo,
      videoFile: null,
      videoPreviewUrl: "",
      homeworkDescription: lesson?.homeworkDescription ?? lesson?.homework_description ?? "",
      homeworkFile: null,
      homeworkExistingFileUrl: backendHomeworkFileUrl,
    });
  }

  function cancelEditLesson() {
    if (editForm.videoPreviewUrl?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(editForm.videoPreviewUrl);
      } catch (_) {}
    }

    setEditLessonId(null);
    setEditForm({
      title: "",
      description: "",
      videoInput: "",
      videoFile: null,
      videoPreviewUrl: "",
      homeworkDescription: "",
      homeworkFile: null,
      homeworkExistingFileUrl: "",
    });
  }

  function onPickEditVideo(file) {
    if (!file) return;
    if (editForm.videoPreviewUrl?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(editForm.videoPreviewUrl);
      } catch (_) {}
    }
    const url = URL.createObjectURL(file);
    setEditForm((p) => ({ ...p, videoFile: file, videoPreviewUrl: url }));
    toast.success("Видео выбрано (превью)");
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
    toast.success("Видео выбрано (превью)");
  }

  function buildLessonPayload(form, { courseId }) {
    const payload = {};

    const title = norm(form.title);
    const description = norm(form.description);
    const videoInput = norm(form.videoInput);
    const homeworkDescription = norm(form.homeworkDescription);

    if (courseId) {
      payload.course = String(courseId);
      payload.course_id = String(courseId);
      payload.courseId = String(courseId);
    }

    if (title) payload.title = title;
    if (description) payload.description = description;

    if (videoInput) {
      payload.youtube_video_id = videoInput;
      payload.youtubeVideoId = videoInput;
      payload.video_url = videoInput;
      payload.videoUrl = videoInput;
    }

    if (homeworkDescription) {
      payload.homework_description = homeworkDescription;
      payload.homeworkDescription = homeworkDescription;
    }

    if (form.videoFile) {
      payload.video_file = form.videoFile;
      payload.videoFile = form.videoFile;
    }

    if (form.homeworkFile) {
      payload.homework_file = form.homeworkFile;
      payload.homeworkFile = form.homeworkFile;
    }

    return payload;
  }

  async function saveEditLesson() {
    if (!editLessonId) return;
    if (!updateLesson) {
      toast.error("updateLesson не подключён в DataContext");
      return;
    }

    const videoInput = norm(editForm.videoInput);
    const hasVideo = !!videoInput || !!editForm.videoFile || !!editForm.videoPreviewUrl;
    if (!hasVideo) {
      toast.error("Укажите ссылку/ID или выберите видео");
      return;
    }

    try {
      const payload = buildLessonPayload(editForm, { courseId: null });
      const res = await updateLesson(editLessonId, payload);

      if (res?.ok === false) {
        toast.error(res?.error || "Не удалось обновить урок");
        return;
      }

      toast.success("Урок обновлён");
      cancelEditLesson();
      await loadTeacherLessons?.();
    } catch (e) {
      console.error(e);
      toast.error("Ошибка обновления урока");
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

    const videoInput = norm(addForm.videoInput);
    const hasVideo = !!videoInput || !!addForm.videoFile || !!addForm.videoPreviewUrl;
    if (!hasVideo) {
      toast.error("Укажите ссылку/ID или выберите видео");
      return;
    }

    setIsAddingLesson(true);
    try {
      const payload = buildLessonPayload(addForm, { courseId: cid });

      // ✅ ВАЖНО: пытаемся убрать axios timeout (если addLesson прокидывает config во внутрь)
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
        videoInput: "",
        videoFile: null,
        videoPreviewUrl: "",
        homeworkDescription: "",
        homeworkFile: null,
      });

      setExpandedCourse(cid);
      setTab("courses");
      await loadTeacherLessons?.();
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
      return normalizedLessons.filter((l) => normalizeLessonCourseId(l) === cid);
    },
    [normalizedLessons]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl mb-8">Кабинет преподавателя</h1>

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
                const submitted = list.filter(
                  (x) => normLow(x.status) === "submitted" || !normLow(x.status)
                ).length;

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

                                      <Button onClick={() => handleReview(hw.id, "declined")} variant="destructive">
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Отклонить
                                      </Button>
                                    </div>

                                    {normLow(hw.status) === "rework" ? (
                                      <div className="text-xs text-gray-600">
                                        Если студент исправит и отправит снова — статус должен вернуться в{" "}
                                        <b>На проверке</b>.
                                      </div>
                                    ) : null}
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
            <div className="flex justify-end">
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
                          <CardTitle className="text-xl">{normalizeCourseTitle(course) || "Курс"}</CardTitle>
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
                          <Button type="button" variant="outline" size="sm" onClick={() => openEditCourse(course)}>
                            <FolderPen className="w-4 h-4 mr-2" />
                            Курс
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
                            const isEditing = editLessonId === lid;

                            const previewUrl = isEditing ? editForm.videoPreviewUrl : "";
                            const showUrl = isEditing
                              ? norm(editForm.videoInput)
                              : norm(
                                  l?.youtubeVideoId ?? l?.youtube_video_id ?? l?.videoUrl ?? l?.video_url ?? ""
                                );

                            const orderLabel = l?.order ? l.order : idx + 1;

                            return (
                              <div key={lid} className="border rounded-lg p-4 bg-white">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="font-semibold">
                                    {orderLabel}. {normalizeLessonTitle(l) || "Урок"}
                                  </div>
                                  <Button variant="outline" size="sm" onClick={() => openEditLesson(l)}>
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Редактировать
                                  </Button>
                                </div>

                                {previewUrl ? (
                                  <div className="mt-3 rounded overflow-hidden bg-black">
                                    {canPlayVideo(previewUrl) ? (
                                      <video
                                        src={previewUrl}
                                        controls
                                        className="w-full h-[140px] object-cover bg-black"
                                        preload="metadata"
                                      />
                                    ) : (
                                      <div className="h-[140px] flex items-center justify-center text-white/70 text-sm">
                                        Видео выбрано, но не воспроизводится
                                      </div>
                                    )}
                                  </div>
                                ) : null}

                                {showUrl ? (
                                  <div className="mt-3 text-xs text-gray-600 break-all">
                                    Видео (URL/ID): <span className="text-gray-900">{showUrl}</span>
                                  </div>
                                ) : null}

                                {l?.description ? <p className="text-sm text-gray-700 mt-3">{l.description}</p> : null}

                                {isEditing && (
                                  <div className="mt-4 space-y-3">
                                    <div className="space-y-1">
                                      <label className="text-sm">Название</label>
                                      <Input
                                        value={editForm.title}
                                        onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-sm">Описание</label>
                                      <Textarea
                                        rows={3}
                                        value={editForm.description}
                                        onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <label className="text-sm">Ссылка или ID</label>
                                      <Input
                                        value={editForm.videoInput}
                                        onChange={(e) => setEditForm((p) => ({ ...p, videoInput: e.target.value }))}
                                        placeholder="https://youtu.be/... или dQw4w9WgXcQ"
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <label className="text-sm">Видео файл (превью)</label>
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
                                          <span className="text-sm text-gray-700">Выбрать видео</span>
                                        </div>
                                      </label>
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-sm">Домашнее задание (опционально)</label>
                                      <Textarea
                                        rows={2}
                                        value={editForm.homeworkDescription}
                                        onChange={(e) =>
                                          setEditForm((p) => ({ ...p, homeworkDescription: e.target.value }))
                                        }
                                      />
                                    </div>

                                    <LessonHomeworkMaterialsSingle
                                      file={editForm.homeworkFile}
                                      existingUrl={editForm.homeworkExistingFileUrl}
                                      onPick={(f) => setEditForm((p) => ({ ...p, homeworkFile: f }))}
                                      onClear={() => setEditForm((p) => ({ ...p, homeworkFile: null }))}
                                    />

                                    <div className="flex gap-3">
                                      <Button onClick={saveEditLesson}>Сохранить</Button>
                                      <Button variant="outline" onClick={cancelEditLesson}>
                                        Отмена
                                      </Button>
                                    </div>
                                  </div>
                                )}
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
                    <label className="text-sm">Ссылка или ID</label>
                    <Input
                      value={addForm.videoInput}
                      onChange={(e) => setAddForm((p) => ({ ...p, videoInput: e.target.value }))}
                      placeholder="https://youtu.be/... или dQw4w9WgXcQ"
                      disabled={isAddingLesson}
                    />

                    <div className="space-y-2">
                      <label className="text-sm">Видео файл (превью)</label>
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
                          <span className="text-sm text-gray-700">Выбрать видео</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {addForm.videoPreviewUrl ? (
                  <div className="max-w-md">
                    <div className="rounded overflow-hidden bg-black">
                      <video
                        src={addForm.videoPreviewUrl}
                        controls
                        className="w-full h-[180px] object-cover bg-black"
                        preload="metadata"
                      />
                    </div>
                  </div>
                ) : null}

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

        {/* MODAL: добавить курс */}
        <Modal title="Новый курс" isOpen={isAddCourseOpen} onClose={() => setIsAddCourseOpen(false)}>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm">Название курса</label>
              <Input
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                placeholder="React с нуля"
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

            <div className="flex gap-3">
              <Button onClick={createNewCourse} className="w-full">
                Добавить
              </Button>
              <Button variant="outline" onClick={() => setIsAddCourseOpen(false)} className="w-full">
                Отмена
              </Button>
            </div>
          </div>
        </Modal>

        {/* MODAL: редактировать курс */}
        <Modal title="Редактировать курс" isOpen={isEditCourseOpen} onClose={() => setIsEditCourseOpen(false)}>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm">Название</label>
              <Input
                value={editCourseForm.title}
                onChange={(e) => setEditCourseForm((p) => ({ ...p, title: e.target.value }))}
              />
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

            <div className="flex gap-3">
              <Button onClick={saveEditCourse} className="w-full">
                Сохранить
              </Button>
              <Button variant="outline" onClick={() => setIsEditCourseOpen(false)} className="w-full">
                Отмена
              </Button>
            </div>
          </div>
        </Modal>

        {/* ✅ ОВЕРЛЕЙ: большой, по центру */}
        {isAddingLesson ? (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center px-4"
            role="status"
            aria-live="polite"
            aria-label="Видео загружается"
          >
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
