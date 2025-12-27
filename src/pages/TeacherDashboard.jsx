// src/pages/TeacherDashboard.jsx
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import YouTube from "react-youtube";
import { BookOpen, CheckCircle, Clock, XCircle, Archive, ChevronDown, Pencil } from "lucide-react";

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
  // ID (пример: dQw4w9WgXcQ)
  if (/^[a-zA-Z0-9_-]{6,}$/.test(v) && !v.includes("http")) return v;

  // ссылки
  const m1 = v.match(/(?:youtube\.com\/watch\?v=)([^&]+)/);
  if (m1?.[1]) return m1[1];
  const m2 = v.match(/(?:youtu\.be\/)([^?&]+)/);
  if (m2?.[1]) return m2[1];

  // если вставили мусор — попробуем вытащить последний похожий кусок
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
    addLesson,
    updateLesson,
  } = useData();

  const [comments, setComments] = useState({}); // { [homeworkId]: "text" }
  const [expandedStudents, setExpandedStudents] = useState({}); // { [studentId]: bool }
  const [expandedArchiveStudents, setExpandedArchiveStudents] = useState({}); // { [studentId]: bool }

  // course expand for edit
  const [expandedCourse, setExpandedCourse] = useState(null); // courseId
  const [editLessonId, setEditLessonId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", videoUrl: "", homeworkDescription: "" });

  // add lesson form
  const [addForm, setAddForm] = useState({
    courseId: "",
    title: "",
    description: "",
    videoUrl: "",
    homeworkDescription: "",
  });

  if (!user) return null;

  const teacherCourses = useMemo(() => {
    return courses.filter((c) => c.teacherId === user.id);
  }, [courses, user.id]);

  const teacherCourseIds = useMemo(() => new Set(teacherCourses.map((c) => c.id)), [teacherCourses]);

  const teacherHomeworksActive = useMemo(() => {
    return homeworks.filter((hw) => teacherCourseIds.has(hw.courseId) && !hw.isArchived);
  }, [homeworks, teacherCourseIds]);

  const teacherHomeworksArchived = useMemo(() => {
    return homeworks.filter((hw) => teacherCourseIds.has(hw.courseId) && hw.isArchived);
  }, [homeworks, teacherCourseIds]);

  const pendingCount = teacherHomeworksActive.filter((hw) => hw.status === "submitted").length;
  const acceptedCount = teacherHomeworksActive.filter((hw) => hw.status === "accepted").length;

  const groupedByStudent = useMemo(() => {
    const map = new Map();
    for (const hw of teacherHomeworksActive) {
      const sid = hw.userId;
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid).push(hw);
    }
    // сортировка: сначала submitted
    for (const [sid, arr] of map.entries()) {
      arr.sort((a, b) => {
        const pa = a.status === "submitted" ? 0 : 1;
        const pb = b.status === "submitted" ? 0 : 1;
        return pa - pb;
      });
      map.set(sid, arr);
    }
    return map;
  }, [teacherHomeworksActive]);

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

  function handleArchive(homeworkId) {
    archiveHomework(homeworkId);
    toast.success("Отправлено в архив");
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
    });
  }

  function saveEditLesson() {
    if (!editLessonId) return;
    updateLesson(editLessonId, {
      title: norm(editForm.title),
      description: norm(editForm.description),
      videoUrl: norm(editForm.videoUrl),
      homeworkDescription: norm(editForm.homeworkDescription),
    });
    toast.success("Урок обновлен");
    setEditLessonId(null);
  }

  function cancelEdit() {
    setEditLessonId(null);
    setEditForm({ title: "", description: "", videoUrl: "", homeworkDescription: "" });
  }

  function handleAddLesson() {
    const cid = norm(addForm.courseId);
    if (!cid) {
      toast.error("Выберите курс");
      return;
    }
    const vid = getYouTubeId(addForm.videoUrl);
    if (!vid) {
      toast.error("Укажите YouTube ссылку или ID");
      return;
    }

    addLesson({
      courseId: cid,
      title: addForm.title,
      description: addForm.description,
      videoUrl: vid, // ✅ сохраняем уже чистый ID
      homeworkDescription: addForm.homeworkDescription,
    });

    toast.success("Урок добавлен");
    setAddForm({ courseId: cid, title: "", description: "", videoUrl: "", homeworkDescription: "" });
    setExpandedCourse(cid);
  }

  // small video opts (для кабинета учителя)
  const smallOpts = {
    width: "100%",
    height: "140",
    playerVars: { autoplay: 0 },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl mb-8">Кабинет преподавателя</h1>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 flex items-center gap-3">
              <BookOpen className="w-10 h-10 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{teacherCourses.length}</div>
                <div className="text-sm text-gray-600">Мои курсы</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-3">
              <Clock className="w-10 h-10 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <div className="text-sm text-gray-600">На проверке</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-3">
              <CheckCircle className="w-10 h-10 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{acceptedCount}</div>
                <div className="text-sm text-gray-600">Принято</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="homework" className="space-y-6">
          <TabsList>
            <TabsTrigger value="homework">Домашние задания</TabsTrigger>
            <TabsTrigger value="courses">Мои курсы</TabsTrigger>
            <TabsTrigger value="add">Добавить урок</TabsTrigger>
            <TabsTrigger value="archive">Архив</TabsTrigger>
          </TabsList>

          {/* Домашки — группируем по студенту (1 студент = 1 див/карточка) */}
          <TabsContent value="homework" className="space-y-4">
            {teacherHomeworksActive.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">Пока нет домашних заданий</p>
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
                            const canArchive = hw.status === "accepted" || hw.status === "rejected";

                            return (
                              <div key={hw.id} className="border rounded-lg p-4 bg-white">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="font-semibold">
                                      {courseDetails?.title || "Курс"} • {lesson?.title || `Урок ${hw.lessonId}`}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Отправлено: {hw.submittedAt ? new Date(hw.submittedAt).toLocaleDateString() : "—"}
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

                                {canArchive && (
                                  <div className="mt-4">
                                    <Button variant="outline" onClick={() => handleArchive(hw.id)}>
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

          {/* Мои курсы — 2 курса, внутри каждого 3 видео, можно редактировать */}
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
                                <div className="font-semibold">{l.order}. {l.title}</div>
                                <Button variant="outline" size="sm" onClick={() => openEditLesson(l)}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Редактировать
                                </Button>
                              </div>

                              {/* маленькое видео */}
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

                                  <div className="space-y-1">
                                    <label className="text-sm">YouTube ссылка или ID</label>
                                    <Input
                                      placeholder="например: https://youtu.be/... или dQw4w9WgXcQ"
                                      value={editForm.videoUrl}
                                      onChange={(e) => setEditForm((p) => ({ ...p, videoUrl: e.target.value }))}
                                    />
                                    <p className="text-xs text-gray-500">
                                      ID будет вытащен автоматически: <span className="font-mono">{getYouTubeId(editForm.videoUrl) || "—"}</span>
                                    </p>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-sm">Домашнее задание (опционально)</label>
                                    <Textarea
                                      rows={2}
                                      value={editForm.homeworkDescription}
                                      onChange={(e) => setEditForm((p) => ({ ...p, homeworkDescription: e.target.value }))}
                                    />
                                  </div>

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

          {/* Добавить урок — выбор курса + youtube link/id + предпросмотр */}
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

                  <div className="space-y-1">
                    <label className="text-sm">YouTube ссылка или ID</label>
                    <Input
                      placeholder="https://youtube.com/watch?v=... или ID"
                      value={addForm.videoUrl}
                      onChange={(e) => setAddForm((p) => ({ ...p, videoUrl: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500">
                      Выбран ID: <span className="font-mono">{getYouTubeId(addForm.videoUrl) || "—"}</span>
                    </p>
                  </div>
                </div>

                {/* маленький предпросмотр */}
                <div className="max-w-md">
                  <div className="rounded overflow-hidden bg-black">
                    {getYouTubeId(addForm.videoUrl) ? (
                      <YouTube videoId={getYouTubeId(addForm.videoUrl)} opts={smallOpts} />
                    ) : (
                      <div className="h-[140px] flex items-center justify-center text-white/70 text-sm">
                        Вставьте ссылку или ID — появится предпросмотр
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

                <Button onClick={handleAddLesson}>Добавить</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Архив — 2 студента отдельно, по клику раскрывается всё по студенту */}
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
