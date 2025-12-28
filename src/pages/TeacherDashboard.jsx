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

function slugify(s) {
  const v = norm(s).toLowerCase();
  if (!v) return `course-${Date.now()}`;
  return (
    v
      .replace(/[\s_]+/g, "-")
      .replace(/[^\w\u0400-\u04FF-]+/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || `course-${Date.now()}`
  );
}

function StatusBadge({ status }) {
  if (status === "accepted") return <Badge className="bg-green-600 text-white border-transparent">Принято</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Отклонено</Badge>;
  if (status === "submitted") return <Badge variant="secondary">На проверке</Badge>;
  return <Badge variant="outline">—</Badge>;
}

function AttachmentsView({ attachments }) {
  const list = Array.isArray(attachments) ? attachments : [];
  if (!list.length) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-gray-600">Прикрепления:</p>
      <div className="space-y-1">
        {list.map((a, idx) => {
          const key = `${a?.type || "x"}_${idx}`;
          const url = a?.url || "";
          const name = a?.name || "Файл";
          const isLink = a?.type === "link";
          return (
            <div key={key} className="text-sm">
              {url ? (
                <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
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

/** Материалы к ДЗ: только файл */
function LessonHomeworkMaterials({ value, onChange }) {
  const list = Array.isArray(value) ? value : [];
  const fileRef = useRef(null);

  const addFile = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    onChange([...list, { type: "file", name: file.name, url }]);
  };

  const removeItem = (idx) => {
    const item = list[idx];
    if (item?.url?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(item.url);
      } catch (_) {}
    }
    onChange(list.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">Материалы к ДЗ</div>

      <div className="space-y-1">
        <label className="text-xs text-gray-600">Файлы (кликни чтобы выбрать)</label>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full text-left border rounded-md px-3 py-2 bg-white hover:bg-gray-50 transition flex items-center gap-2"
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
            if (f) addFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {!!list.length && (
        <div className="border rounded-lg p-3 bg-white space-y-2">
          {list.map((a, idx) => (
            <div key={`${a.type}_${idx}`} className="flex items-start justify-between gap-3">
              <div className="text-sm break-all">
                📎{" "}
                {a.url ? (
                  <a href={a.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    {a.name}
                  </a>
                ) : (
                  <span>{a.name}</span>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => removeItem(idx)}>
                Удалить
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-xl border">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function TeacherDashboard() {
  const { user } = useAuth();
  const {
    categories,
    courses,
    homeworks,
    lessons,
    findUserById,
    getCourseWithDetails,
    getLessonsByCourse,
    reviewHomework,
    archiveHomework,
    unarchiveHomework,
    addLesson,
    updateLesson,
    addCourse,
    updateCourse, // ✅
  } = useData();

  const [tab, setTab] = useState("homework");
  const [homeworkFilter, setHomeworkFilter] = useState("all"); // all | submitted | accepted

  const [comments, setComments] = useState({});
  const [expandedStudents, setExpandedStudents] = useState({});
  const [expandedArchiveStudents, setExpandedArchiveStudents] = useState({});
  const [expandedCourse, setExpandedCourse] = useState(null);

  // MODAL: add course
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseCategoryId, setNewCourseCategoryId] = useState("");

  // MODAL: edit course ✅
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
    videoFile: null,
    videoPreviewUrl: "",
    homeworkDescription: "",
    homeworkAttachments: [],
  });

  // ADD LESSON
  const [addForm, setAddForm] = useState({
    courseId: "",
    title: "",
    description: "",
    videoFile: null,
    videoPreviewUrl: "",
    homeworkDescription: "",
    homeworkAttachments: [],
  });

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

  const teacherCourses = useMemo(() => {
    const base = Array.isArray(courses) ? courses : [];
    return base.filter((c) => c.teacherId === user.id);
  }, [courses, user.id]);

  const teacherCourseIds = useMemo(() => new Set(teacherCourses.map((c) => c.id)), [teacherCourses]);

  const teacherHomeworksActive = useMemo(() => {
    const base = Array.isArray(homeworks) ? homeworks : [];
    return base.filter((hw) => teacherCourseIds.has(hw.courseId) && !hw.isArchived);
  }, [homeworks, teacherCourseIds]);

  const teacherHomeworksArchived = useMemo(() => {
    const base = Array.isArray(homeworks) ? homeworks : [];
    return base.filter((hw) => teacherCourseIds.has(hw.courseId) && hw.isArchived);
  }, [homeworks, teacherCourseIds]);

  const pendingCount = teacherHomeworksActive.filter((hw) => hw.status === "submitted").length;
  const acceptedCount = teacherHomeworksActive.filter((hw) => hw.status === "accepted").length;

  const filteredActive = useMemo(() => {
    if (homeworkFilter === "submitted") return teacherHomeworksActive.filter((hw) => hw.status === "submitted");
    if (homeworkFilter === "accepted") return teacherHomeworksActive.filter((hw) => hw.status === "accepted");
    return teacherHomeworksActive;
  }, [teacherHomeworksActive, homeworkFilter]);

  const groupedByStudent = useMemo(() => {
    const map = new Map();
    for (const hw of filteredActive) {
      const sid = hw.userId;
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid).push(hw);
    }
    for (const [sid, arr] of map.entries()) {
      arr.sort((a, b) => {
        const pa = a.status === "submitted" ? 0 : 1;
        const pb = b.status === "submitted" ? 0 : 1;
        return pa - pb;
      });
      map.set(sid, arr);
    }
    return map;
  }, [filteredActive]);

  const groupedArchiveByStudent = useMemo(() => {
    const map = new Map();
    for (const hw of teacherHomeworksArchived) {
      const sid = hw.userId;
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
      Array.from(groupedByStudent.keys()).forEach((sid) => {
        open[sid] = true;
      });
      setExpandedStudents(open);
    },
    [groupedByStudent]
  );

  function setCommentFor(id, text) {
    setComments((prev) => ({ ...prev, [id]: text }));
  }

  function handleReview(homeworkId, status) {
    const comment = norm(comments[homeworkId]);
    if (!comment) {
      toast.error("Добавьте комментарий к проверке");
      return;
    }
    reviewHomework(homeworkId, status, comment);
    toast.success("Домашнее задание проверено");
    setComments((prev) => ({ ...prev, [homeworkId]: "" }));
  }

  function handleArchive(hw) {
    if (hw.status !== "accepted") {
      toast.error("В архив можно отправить только статус «Принято»");
      return;
    }
    archiveHomework(hw.id);
    toast.success("Отправлено в архив");
  }

  function handleUnarchive(hwId) {
    unarchiveHomework(hwId);
    toast.success("Разархивировано");
  }

  function toggleStudent(studentId) {
    setExpandedStudents((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  }

  function toggleArchiveStudent(studentId) {
    setExpandedArchiveStudents((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  }

  // ===== course modals =====
  function openAddCourse() {
    setNewCourseTitle("");
    setNewCourseCategoryId("");
    setIsAddCourseOpen(true);
  }

  function createNewCourse() {
    const title = norm(newCourseTitle);
    if (!title) {
      toast.error("Введите название курса");
      return;
    }

    const cid = addCourse({
      id: `c_${Date.now()}`,
      teacherId: user.id,
      title,
      slug: slugify(title),
      description: "",
      categoryId: newCourseCategoryId || null,
    });

    if (!cid) {
      toast.error("Не удалось добавить курс");
      return;
    }

    toast.success("Курс добавлен");
    setAddForm((p) => ({ ...p, courseId: cid }));
    setExpandedCourse(cid);
    setIsAddCourseOpen(false);
    setTab("courses");
  }

  function openEditCourse(course) {
    setEditCourseId(course.id);
    setEditCourseForm({
      title: course.title || "",
      description: course.description || "",
      categoryId: course.categoryId || "",
    });
    setIsEditCourseOpen(true);
  }

  function saveEditCourse() {
    if (!editCourseId) return;

    const title = norm(editCourseForm.title);
    if (!title) {
      toast.error("Название курса не может быть пустым");
      return;
    }

    updateCourse(editCourseId, {
      title,
      description: editCourseForm.description,
      categoryId: editCourseForm.categoryId || null,
      slug: slugify(title),
    });

    toast.success("Курс обновлён");
    setIsEditCourseOpen(false);
  }

  // ===== lessons =====
  function openEditLesson(lesson) {
    setEditLessonId(lesson.id);
    const vurl = norm(lesson.videoUrl);

    setEditForm({
      title: lesson.title || "",
      description: lesson.description || "",
      videoFile: null,
      videoPreviewUrl: vurl || "",
      homeworkDescription: lesson.homeworkDescription || "",
      homeworkAttachments: Array.isArray(lesson.homeworkAttachments) ? lesson.homeworkAttachments : [],
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
      videoFile: null,
      videoPreviewUrl: "",
      homeworkDescription: "",
      homeworkAttachments: [],
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
    toast.success("Видео выбрано");
  }

  function saveEditLesson() {
    if (!editLessonId) return;
    if (!editForm.videoPreviewUrl) {
      toast.error("Выберите видео");
      return;
    }

    updateLesson(editLessonId, {
      title: norm(editForm.title),
      description: norm(editForm.description),
      videoUrl: editForm.videoPreviewUrl,
      homeworkDescription: norm(editForm.homeworkDescription),
      homeworkAttachments: Array.isArray(editForm.homeworkAttachments) ? editForm.homeworkAttachments : [],
    });

    toast.success("Урок обновлен");
    setEditLessonId(null);
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

  function handleAddLesson() {
    const cid = norm(addForm.courseId);
    if (!cid) {
      toast.error("Выберите курс");
      return;
    }
    if (!addForm.videoPreviewUrl) {
      toast.error("Выберите видео");
      return;
    }

    addLesson({
      courseId: cid,
      title: norm(addForm.title),
      description: norm(addForm.description),
      videoUrl: addForm.videoPreviewUrl,
      homeworkDescription: norm(addForm.homeworkDescription),
      homeworkAttachments: Array.isArray(addForm.homeworkAttachments) ? addForm.homeworkAttachments : [],
    });

    toast.success("Урок добавлен");

    setAddForm({
      courseId: cid,
      title: "",
      description: "",
      videoFile: null,
      videoPreviewUrl: "",
      homeworkDescription: "",
      homeworkAttachments: [],
    });

    setExpandedCourse(cid);
    setTab("courses");
  }

  function canPlayVideo(url) {
    const u = norm(url);
    if (!u) return false;
    if (u.startsWith("blob:")) return true;
    if (u.startsWith("http://") || u.startsWith("https://")) return true;
    return false;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl mb-8">Кабинет преподавателя</h1>

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
                const student = findUserById(studentId);
                const isOpen = !!expandedStudents[studentId];
                const submitted = list.filter((x) => x.status === "submitted").length;

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
                            {student?.name || "Студент"}{" "}
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
                            const courseDetails = getCourseWithDetails(hw.courseId);
                            const lesson = lessons.find((l) => l.id === hw.lessonId);
                            const comment = comments[hw.id] || "";

                            return (
                              <div key={hw.id} className="border rounded-lg p-4 bg-white">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="font-semibold">
                                      {courseDetails?.title || "Курс"} • {lesson?.title || `Урок ${hw.lessonId}`}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Отправлено:{" "}
                                      {hw.submittedAt ? new Date(hw.submittedAt).toLocaleDateString() : "—"}
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

                                {hw.status === "submitted" && (
                                  <div className="mt-4 space-y-3">
                                    <Textarea
                                      rows={3}
                                      placeholder="Комментарий к проверке..."
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

                                      <Button onClick={() => handleReview(hw.id, "rejected")} variant="destructive">
                                        <XCircle className="w-4 h-4 mr-2" />
                                        На доработку
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {hw.teacherComment ? (
                                  <div className="mt-4 p-3 bg-blue-50 rounded">
                                    <div className="text-sm font-medium mb-1">Комментарий преподавателя:</div>
                                    <div className="text-sm whitespace-pre-wrap">{hw.teacherComment}</div>
                                  </div>
                                ) : null}

                                {hw.status === "accepted" && (
                                  <div className="mt-4">
                                    <Button variant="outline" onClick={() => handleArchive(hw)}>
                                      <Archive className="w-4 h-4 mr-2" />
                                      В архив
                                    </Button>
                                  </div>
                                )}
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
            {/* ✅ кнопка добавить курс прямо тут */}
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={openAddCourse}>
                <Plus className="w-4 h-4 mr-2" />
                Новый курс
              </Button>
            </div>

            {teacherCourses.map((course) => {
              const details = getCourseWithDetails(course.id);
              const courseLessons = getLessonsByCourse(course.id);
              const isOpen = expandedCourse === course.id;

              return (
                <Card key={course.id}>
                  {/* ✅ “папка” чуть больше: padding и высота */}
                  <CardHeader className="py-6">
                    <div className="flex items-start justify-between gap-4">
                      <button
                        onClick={() => setExpandedCourse(isOpen ? null : course.id)}
                        className="flex-1 text-left"
                        type="button"
                      >
                        <CardTitle className="text-xl">{course.title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-2">
                          {(details?.category?.name || "Без категории") + " • " + courseLessons.length + " урока"}
                        </p>
                        {course.description ? (
                          <p className="text-sm text-gray-700 mt-2 line-clamp-2">{course.description}</p>
                        ) : null}
                      </button>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditCourse(course)}>
                          <FolderPen className="w-4 h-4 mr-2" />
                          Курс
                        </Button>

                        <button
                          onClick={() => setExpandedCourse(isOpen ? null : course.id)}
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
                        {courseLessons.map((l) => {
                          const isEditing = editLessonId === l.id;
                          const previewUrl = isEditing ? editForm.videoPreviewUrl : norm(l.videoUrl);

                          return (
                            <div key={l.id} className="border rounded-lg p-4 bg-white">
                              <div className="flex items-start justify-between gap-3">
                                <div className="font-semibold">
                                  {l.order}. {l.title}
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
                                      Видео указано, но не является ссылкой/файлом
                                    </div>
                                  )}
                                </div>
                              ) : null}

                              <p className="text-sm text-gray-700 mt-3">{l.description}</p>

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
                                    <label className="text-sm">Видео</label>
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

                                  <LessonHomeworkMaterials
                                    value={editForm.homeworkAttachments}
                                    onChange={(arr) => setEditForm((p) => ({ ...p, homeworkAttachments: arr }))}
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
            })}
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
                      <select
                        className="w-full border rounded-md px-3 py-2 bg-white"
                        value={addForm.courseId}
                        onChange={(e) => setAddForm((p) => ({ ...p, courseId: e.target.value }))}
                      >
                        <option value="">Выберите курс</option>
                        {teacherCourses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>

                      <Button type="button" variant="outline" onClick={openAddCourse} className="shrink-0">
                        <Plus className="w-4 h-4 mr-2" />
                        Новый курс
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm">Видео</label>
                    <label className="block">
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
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
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm">Описание</label>
                  <Textarea
                    rows={3}
                    value={addForm.description}
                    onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Коротко о чем урок"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm">Домашнее задание (опционально)</label>
                  <Textarea
                    rows={2}
                    value={addForm.homeworkDescription}
                    onChange={(e) => setAddForm((p) => ({ ...p, homeworkDescription: e.target.value }))}
                    placeholder="Что студент должен сделать"
                  />
                </div>

                <LessonHomeworkMaterials
                  value={addForm.homeworkAttachments}
                  onChange={(arr) => setAddForm((p) => ({ ...p, homeworkAttachments: arr }))}
                />

                <Button onClick={handleAddLesson}>Добавить</Button>
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
                const student = findUserById(studentId);
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
                            {student?.name || "Студент"}{" "}
                            <span className="text-gray-500 font-normal">({studentId})</span>
                          </div>
                          <div className="text-sm text-gray-600">В архиве: {list.length}</div>
                        </div>
                        <ChevronDown className={`w-5 h-5 transition ${isOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isOpen && (
                        <div className="mt-5 space-y-3">
                          {list.map((hw) => {
                            const courseDetails = getCourseWithDetails(hw.courseId);
                            const lesson = lessons.find((l) => l.id === hw.lessonId);

                            return (
                              <div key={hw.id} className="border rounded-lg p-4 bg-white">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="font-semibold">
                                      {courseDetails?.title || "Курс"} • {lesson?.title || `Урок ${hw.lessonId}`}
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

        {/* MODAL: добавить курс */}
        <Modal title="Новый курс" isOpen={isAddCourseOpen} onClose={() => setIsAddCourseOpen(false)}>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm">Название курса</label>
              <Input value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value)} placeholder="React с нуля" />
            </div>

            <div className="space-y-1">
              <label className="text-sm">Категория (опционально)</label>
              <select
                className="w-full border rounded-md px-3 py-2 bg-white"
                value={newCourseCategoryId}
                onChange={(e) => setNewCourseCategoryId(e.target.value)}
              >
                <option value="">Без категории</option>
                {(Array.isArray(categories) ? categories : []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
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

        {/* MODAL: редактировать курс ✅ */}
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
              <select
                className="w-full border rounded-md px-3 py-2 bg-white"
                value={editCourseForm.categoryId}
                onChange={(e) => setEditCourseForm((p) => ({ ...p, categoryId: e.target.value }))}
              >
                <option value="">Без категории</option>
                {(Array.isArray(categories) ? categories : []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
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
      </div>
    </div>
  );
}
