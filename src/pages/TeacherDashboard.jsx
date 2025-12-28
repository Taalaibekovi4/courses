import React, { useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import YouTube from "react-youtube";
import {
  BookOpen,
  CheckCircle,
  Clock,
  XCircle,
  Archive,
  ChevronDown,
  Pencil,
  Undo2,
  Link as LinkIcon,
  Paperclip,
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

function getYouTubeId(raw) {
  const v = norm(raw);
  if (!v) return "";
  if (/^[a-zA-Z0-9_-]{6,}$/.test(v) && !v.includes("http")) return v;

  const m1 = v.match(/(?:youtube\.com\/watch\?v=)([^&]+)/);
  if (m1?.[1]) return m1[1];
  const m2 = v.match(/(?:youtu\.be\/)([^?&]+)/);
  if (m2?.[1]) return m2[1];
  const m3 = v.match(/([a-zA-Z0-9_-]{6,})/);
  return m3?.[1] || "";
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

function LessonHomeworkMaterials({ value, onChange }) {
  const list = Array.isArray(value) ? value : [];

  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const addLink = () => {
    const name = norm(linkName) || "Ссылка";
    const url = norm(linkUrl);
    if (!url) {
      toast.error("Вставьте ссылку");
      return;
    }
    onChange([...list, { type: "link", name, url }]);
    setLinkName("");
    setLinkUrl("");
  };

  const addFile = (file) => {
    if (!file) return;
    // демо: сохраняем имя + blob url (в реальном проекте — загрузка на сервер)
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

      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-600">Название ссылки</label>
          <Input value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="Например: Макет Figma" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-600">Ссылка</label>
          <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={addLink}>
          <LinkIcon className="w-4 h-4 mr-2" />
          Добавить ссылку
        </Button>

        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="file"
            className="hidden"
            onChange={(e) => addFile(e.target.files?.[0] || null)}
          />
          <span className="inline-flex items-center px-3 py-2 border rounded-md text-sm hover:bg-gray-50">
            <Paperclip className="w-4 h-4 mr-2" />
            Прикрепить файл
          </span>
        </label>
      </div>

      {!!list.length && (
        <div className="border rounded-lg p-3 bg-white space-y-2">
          {list.map((a, idx) => (
            <div key={`${a.type}_${idx}`} className="flex items-start justify-between gap-3">
              <div className="text-sm break-all">
                {a.type === "link" ? "🔗 " : "📎 "}
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

export function TeacherDashboard() {
  const { user } = useAuth();
  const {
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
  } = useData();

  const [tab, setTab] = useState("homework");
  const [homeworkFilter, setHomeworkFilter] = useState("all"); // all | submitted | accepted

  const [comments, setComments] = useState({});
  const [expandedStudents, setExpandedStudents] = useState({});
  const [expandedArchiveStudents, setExpandedArchiveStudents] = useState({});

  const [expandedCourse, setExpandedCourse] = useState(null);
  const [editLessonId, setEditLessonId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    videoUrl: "",
    homeworkDescription: "",
    homeworkAttachments: [],
  });

  const [addForm, setAddForm] = useState({
    courseId: "",
    title: "",
    description: "",
    videoUrl: "",
    selectedVideoId: "",
    homeworkDescription: "",
    homeworkAttachments: [],
  });

  if (!user) return null;

  const teacherCourses = useMemo(() => courses.filter((c) => c.teacherId === user.id), [courses, user.id]);
  const teacherCourseIds = useMemo(() => new Set(teacherCourses.map((c) => c.id)), [teacherCourses]);

  const teacherHomeworksActive = useMemo(
    () => homeworks.filter((hw) => teacherCourseIds.has(hw.courseId) && !hw.isArchived),
    [homeworks, teacherCourseIds]
  );

  const teacherHomeworksArchived = useMemo(
    () => homeworks.filter((hw) => teacherCourseIds.has(hw.courseId) && hw.isArchived),
    [homeworks, teacherCourseIds]
  );

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

      // раскрываем студентов, у которых есть задачи в фильтре
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

  function openEditLesson(lesson) {
    setEditLessonId(lesson.id);
    setEditForm({
      title: lesson.title || "",
      description: lesson.description || "",
      videoUrl: lesson.videoUrl || "",
      homeworkDescription: lesson.homeworkDescription || "",
      homeworkAttachments: Array.isArray(lesson.homeworkAttachments) ? lesson.homeworkAttachments : [],
    });
  }

  function chooseEditVideo() {
    const vid = getYouTubeId(editForm.videoUrl);
    if (!vid) {
      toast.error("Укажите YouTube ссылку или ID");
      return;
    }
    setEditForm((p) => ({ ...p, videoUrl: vid }));
    toast.success("Видео выбрано");
  }

  function saveEditLesson() {
    if (!editLessonId) return;

    const vid = getYouTubeId(editForm.videoUrl);
    if (!vid) {
      toast.error("Укажите корректную YouTube ссылку или ID");
      return;
    }

    updateLesson(editLessonId, {
      title: norm(editForm.title),
      description: norm(editForm.description),
      videoUrl: vid, // ✅ всегда ID
      homeworkDescription: norm(editForm.homeworkDescription),
      homeworkAttachments: Array.isArray(editForm.homeworkAttachments) ? editForm.homeworkAttachments : [],
    });
    toast.success("Урок обновлен");
    setEditLessonId(null);
  }

  function cancelEdit() {
    setEditLessonId(null);
    setEditForm({
      title: "",
      description: "",
      videoUrl: "",
      homeworkDescription: "",
      homeworkAttachments: [],
    });
  }

  function chooseAddVideo() {
    const vid = getYouTubeId(addForm.videoUrl);
    if (!vid) {
      toast.error("Укажите YouTube ссылку или ID");
      return;
    }
    setAddForm((p) => ({ ...p, selectedVideoId: vid, videoUrl: vid }));
    toast.success("Видео выбрано");
  }

  function handleAddLesson() {
    const cid = norm(addForm.courseId);
    if (!cid) {
      toast.error("Выберите курс");
      return;
    }

    const vid = getYouTubeId(addForm.videoUrl);
    if (!vid) {
      toast.error("Сначала выберите видео (YouTube ссылка или ID)");
      return;
    }

    addLesson({
      courseId: cid,
      title: addForm.title,
      description: addForm.description,
      videoUrl: vid,
      homeworkDescription: addForm.homeworkDescription,
      homeworkAttachments: Array.isArray(addForm.homeworkAttachments) ? addForm.homeworkAttachments : [],
    });

    toast.success("Урок добавлен");
    setAddForm({
      courseId: cid,
      title: "",
      description: "",
      videoUrl: "",
      selectedVideoId: "",
      homeworkDescription: "",
      homeworkAttachments: [],
    });
    setExpandedCourse(cid);
  }

  const smallOpts = {
    width: "100%",
    height: "140",
    playerVars: { autoplay: 0, controls: 1 },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl mb-8">Кабинет преподавателя</h1>

        {/* Stats (кнопки-фильтры) */}
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
            <TabsTrigger
              value="homework"
              onClick={() => setHomeworkFilter("all")}
            >
              Домашние задания
            </TabsTrigger>
            <TabsTrigger value="courses">Мои курсы</TabsTrigger>
            <TabsTrigger value="add">Добавить урок</TabsTrigger>
            <TabsTrigger value="archive">Архив</TabsTrigger>
          </TabsList>

          {/* Домашки — группируем по студенту */}
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

                                      <Button
                                        onClick={() => handleReview(hw.id, "rejected")}
                                        variant="destructive"
                                      >
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

                                {/* ✅ В архив только если Принято */}
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
            {teacherCourses.map((course) => {
              const details = getCourseWithDetails(course.id);
              const courseLessons = getLessonsByCourse(course.id);
              const isOpen = expandedCourse === course.id;

              return (
                <Card key={course.id}>
                  <CardHeader>
                    <button
                      onClick={() => setExpandedCourse(isOpen ? null : course.id)}
                      className="w-full flex items-start justify-between gap-4 text-left"
                      type="button"
                    >
                      <div>
                        <CardTitle>{course.title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {details?.category?.name || "Категория"} • {courseLessons.length} урока
                        </p>
                      </div>
                      <ChevronDown className={`w-5 h-5 mt-1 transition ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                  </CardHeader>

                  {isOpen && (
                    <CardContent className="space-y-4">
                      <p className="text-gray-700">{course.description}</p>

                      <div className="grid md:grid-cols-2 gap-4">
                        {courseLessons.map((l) => {
                          const isEditing = editLessonId === l.id;
                          const previewId = getYouTubeId(isEditing ? editForm.videoUrl : l.videoUrl);

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

                              <div className="mt-3 rounded overflow-hidden bg-black">
                                {previewId ? (
                                  <YouTube videoId={previewId} opts={smallOpts} />
                                ) : (
                                  <div className="h-[140px] flex items-center justify-center text-white/70 text-sm">
                                    Нет видео
                                  </div>
                                )}
                              </div>

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

                                  {/* ✅ выбрать видео */}
                                  <div className="space-y-2">
                                    <label className="text-sm">YouTube ссылка или ID</label>
                                    <div className="flex gap-2">
                                      <Input
                                        placeholder="https://youtube.com/watch?v=... или ID"
                                        value={editForm.videoUrl}
                                        onChange={(e) => setEditForm((p) => ({ ...p, videoUrl: e.target.value }))}
                                      />
                                      <Button type="button" variant="outline" onClick={chooseEditVideo}>
                                        Выбрать
                                      </Button>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                      Выбран ID: <span className="font-mono">{getYouTubeId(editForm.videoUrl) || "—"}</span>
                                    </p>
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

                                  {/* ✅ материалы к ДЗ */}
                                  <LessonHomeworkMaterials
                                    value={editForm.homeworkAttachments}
                                    onChange={(arr) => setEditForm((p) => ({ ...p, homeworkAttachments: arr }))}
                                  />

                                  <div className="flex gap-3">
                                    <Button onClick={saveEditLesson}>Сохранить</Button>
                                    <Button variant="outline" onClick={cancelEdit}>Отмена</Button>
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
                  <div className="space-y-1">
                    <label className="text-sm">Курс</label>
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
                  </div>

                  {/* ✅ выбрать видео */}
                  <div className="space-y-2">
                    <label className="text-sm">YouTube ссылка или ID</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://youtube.com/watch?v=... или ID"
                        value={addForm.videoUrl}
                        onChange={(e) => setAddForm((p) => ({ ...p, videoUrl: e.target.value }))}
                      />
                      <Button type="button" variant="outline" onClick={chooseAddVideo}>
                        Выбрать
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Выбран ID: <span className="font-mono">{getYouTubeId(addForm.videoUrl) || "—"}</span>
                    </p>
                  </div>
                </div>

                {/* ✅ предпросмотр */}
                <div className="max-w-md">
                  <div className="rounded overflow-hidden bg-black">
                    {getYouTubeId(addForm.videoUrl) ? (
                      <YouTube videoId={getYouTubeId(addForm.videoUrl)} opts={smallOpts} />
                    ) : (
                      <div className="h-[140px] flex items-center justify-center text-white/70 text-sm">
                        Вставьте ссылку/ID и нажмите “Выбрать”
                      </div>
                    )}
                  </div>
                </div>

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

                {/* ✅ прикрепить ссылку/файл к ДЗ */}
                <LessonHomeworkMaterials
                  value={addForm.homeworkAttachments}
                  onChange={(arr) => setAddForm((p) => ({ ...p, homeworkAttachments: arr }))}
                />

                <Button onClick={handleAddLesson}>Добавить</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Архив — можно разархивировать */}
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

                                {/* ✅ разархивировать */}
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
      </div>
    </div>
  );
}
