import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { toast } from "sonner";
import { PlayCircle, Lock, CheckCircle, Send, Link as LinkIcon, Clock, XCircle } from "lucide-react";

import { useAuth } from "../contexts/AuthContext.jsx";
import { useData } from "../contexts/DataContext.jsx";

import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { Textarea } from "../components/ui/textarea.jsx";
import { Input } from "../components/ui/input.jsx";
import { Badge } from "../components/ui/badge.jsx";

const norm = (s) => String(s ?? "").trim();

function getYouTubeId(raw) {
  const v = norm(raw);
  if (!v) return "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

  const short = v.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (short?.[1]) return short[1];

  const m = v.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (m?.[1]) return m[1];

  const emb = v.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (emb?.[1]) return emb[1];

  return "";
}

function statusBadge(status) {
  if (status === "accepted") return <Badge className="bg-green-600 text-white border-transparent">Принято</Badge>;
  if (status === "rejected") return <Badge variant="destructive">На доработку</Badge>;
  if (status === "submitted") return <Badge variant="secondary">На проверке</Badge>;
  return null;
}

function LessonStatusIcon({ status }) {
  if (status === "accepted") return <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />;
  if (status === "rejected") return <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />;
  if (status === "submitted") return <Clock className="w-5 h-5 text-orange-600 flex-shrink-0" />;
  return <PlayCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />;
}

function DashNavInline({ title }) {
  const items = [
    { to: "/dashboard?tab=courses", label: "Мои курсы" },
    { to: "/dashboard?tab=homework", label: "Домашние задания" },
    { to: "/dashboard?tab=activate", label: "Активировать токен" },
    { to: "/dashboard?tab=archive", label: "Архив" },
  ];

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <Link key={it.to} to={it.to} className="block">
            <span className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm transition select-none bg-white border-gray-200 text-gray-800 hover:bg-gray-100">
              {it.label}
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-3 text-sm text-gray-600">{title}</div>
    </div>
  );
}

function getId(x) {
  return x?.id ?? x?.pk ?? x?.course_id ?? x?.courseId ?? "";
}
function getLessonId(x) {
  return String(x?.id ?? x?.pk ?? "");
}
function getHwLessonId(hw) {
  return String(hw?.lesson ?? hw?.lesson_id ?? hw?.lessonId ?? hw?.lesson?.id ?? hw?.lesson?.pk ?? "");
}
function getHwCourseId(hw) {
  return String(hw?.course ?? hw?.course_id ?? hw?.courseId ?? hw?.lesson_course ?? hw?.lesson?.course ?? hw?.lesson?.course_id ?? "");
}
function getHwStatus(hw) {
  return String(hw?.status ?? "").toLowerCase();
}
function getHwTeacherComment(hw) {
  return hw?.teacher_comment ?? hw?.teacherComment ?? hw?.comment ?? "";
}

export function StudentCoursePage() {
  const { courseId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const data = useData();

  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [homeworkText, setHomeworkText] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [openErr, setOpenErr] = useState("");

  const queryLessonId = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return sp.get("lesson") || "";
  }, [location.search]);

  const cameFromHomework = !!queryLessonId;

  useEffect(() => {
    if (!user || !courseId) return;

    data.loadMyCourses();
    data.loadMyHomeworks();
    data.loadLessonsPublicByCourse(courseId);
  }, [user, courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const course = useMemo(() => {
    const list = Array.isArray(data.myCourses) ? data.myCourses : [];
    return list.find((c) => String(getId(c)) === String(courseId)) || null;
  }, [data.myCourses, courseId]);

  const lessons = useMemo(() => {
    const map = data.lessonsByCourse || {};
    const arr = map[String(courseId)] || [];
    return Array.isArray(arr) ? arr : [];
  }, [data.lessonsByCourse, courseId]);

  useEffect(() => {
    if (!lessons.length) return;

    if (queryLessonId) {
      const exists = lessons.find((l) => getLessonId(l) === String(queryLessonId));
      if (exists) {
        setSelectedLessonId(getLessonId(exists));
        return;
      }
    }

    if (!selectedLessonId) setSelectedLessonId(getLessonId(lessons[0]));
  }, [lessons, queryLessonId, selectedLessonId]);

  const currentLesson = useMemo(() => {
    if (!selectedLessonId) return null;
    return lessons.find((l) => getLessonId(l) === String(selectedLessonId)) || null;
  }, [lessons, selectedLessonId]);

  const lessonKey = getLessonId(currentLesson);

  const openedLesson = useMemo(() => {
    if (!lessonKey) return null;
    return (data.openedLessons || {})[lessonKey] || null;
  }, [data.openedLessons, lessonKey]);

  // ВАЖНО: видео получаем только через /api/lessons/open/
  useEffect(() => {
    if (!lessonKey) return;
    setOpenErr("");

    (async () => {
      const res = await data.openLesson(lessonKey, { force: true });
      if (res?.ok === false) setOpenErr(res?.error || "Нет доступа к видео");
    })();
  }, [lessonKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const myHomeworks = useMemo(() => (Array.isArray(data.myHomeworks) ? data.myHomeworks : []), [data.myHomeworks]);

  const myHwForLesson = useMemo(() => {
    if (!currentLesson) return null;
    const lid = getLessonId(currentLesson);
    const cid = String(courseId);

    const list = myHomeworks
      .filter((hw) => getHwCourseId(hw) === cid && getHwLessonId(hw) === lid)
      .slice()
      .sort((a, b) => new Date((b.updated_at || b.updatedAt || b.created_at || b.createdAt || 0)) - new Date((a.updated_at || a.updatedAt || a.created_at || a.createdAt || 0)));

    return list[0] || null;
  }, [myHomeworks, currentLesson, courseId]);

  useEffect(() => {
    setHomeworkText(myHwForLesson?.content || "");
    setLinkInput("");
  }, [myHwForLesson?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const lessonHomeworkStatusMap = useMemo(() => {
    const map = new Map();
    const cid = String(courseId);

    myHomeworks
      .filter((hw) => getHwCourseId(hw) === cid)
      .forEach((hw) => {
        const lid = getHwLessonId(hw);
        const prev = map.get(lid);
        const rank = (s) => (s === "accepted" ? 3 : s === "submitted" ? 2 : s === "rejected" ? 1 : 0);
        const st = getHwStatus(hw);
        if (!prev || rank(st) > rank(prev)) map.set(lid, st);
      });

    return map;
  }, [myHomeworks, courseId]);

  const isAccepted = getHwStatus(myHwForLesson) === "accepted";
  const canEdit = !!currentLesson && !isAccepted;

  const pickRawVideo = useCallback(() => {
    const o = openedLesson || {};
    // DataContext сохраняет payload + __picked_video (если нашёл)
    const v = o.__picked_video || "";
    if (norm(v)) return v;

    // fallback: если вдруг бэк отдаёт видео прямо в другом поле
    return (
      o.video_url ||
      o.videoUrl ||
      o.video ||
      o.file_url ||
      o.fileUrl ||
      o.youtube_video_id ||
      o.youtubeVideoId ||
      o.youtube_id ||
      o.youtubeId ||
      ""
    );
  }, [openedLesson]);

  const renderVideo = useCallback(() => {
    const raw = pickRawVideo();
    const ytId = getYouTubeId(raw);
    const isLoading = !!data.loading?.openLesson?.[lessonKey];

    if (isLoading) return <div className="w-full h-full flex items-center justify-center text-white/70">Загрузка видео...</div>;

    if (ytId) {
      // youtube-nocookie + embed — самый мягкий вариант
      const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId)}?autoplay=0&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1`;
      return (
        <iframe
          title="video"
          src={src}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    const url = norm(raw);
    if (url) return <video src={url} controls className="w-full h-full object-cover bg-black" preload="metadata" />;

    return (
      <div className="w-full h-full flex items-center justify-center text-white/70 text-center px-4">
        {openErr || "Видео недоступно. Проверь backend /api/lessons/open/"}
      </div>
    );
  }, [pickRawVideo, data.loading?.openLesson, lessonKey, openErr]);

  function addLinkIntoHomeworkText() {
    const url = norm(linkInput);
    if (!url) return;
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const next = homeworkText ? `${homeworkText}\n\nСсылка: ${normalized}` : `Ссылка: ${normalized}`;
    setHomeworkText(next);
    setLinkInput("");
  }

  async function handleSendHomework() {
    if (!currentLesson) return;

    const text = norm(homeworkText);
    if (!text) {
      toast.error("Добавьте текст (и/или ссылку)");
      return;
    }

    const lid = getLessonId(currentLesson);
    const res = await data.submitHomework({ lessonId: lid, content: text });

    if (res?.ok) toast.success("Отправлено на проверку");
    else toast.error(res?.error || "Не удалось отправить ДЗ");
  }

  if (!user || !courseId) return null;

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-12">
          <DashNavInline title="Раздел: Мои курсы → Курс" />
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">Курс не найден (или нет доступа)</p>
              <div className="mt-4">
                <Link to="/dashboard?tab=courses"><Button variant="outline">Назад</Button></Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const courseTitle = course?.title || course?.name || "Курс";
  const teacherName = course?.teacher_name || course?.teacher?.name || course?.teacher?.username || course?.teacher_username || "";
  const categoryName = course?.category_name || course?.category?.name || "";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <DashNavInline title="Раздел: Мои курсы → Курс" />

        <div className="mb-6">
          <h1 className="text-3xl mb-2">{courseTitle}</h1>
          <p className="text-gray-600">
            {teacherName ? `Преподаватель: ${teacherName}` : "Курс"}
            {categoryName ? <span className="ml-2">• {categoryName}</span> : null}
          </p>
        </div>

        <div className={cameFromHomework ? "grid lg:grid-cols-1 gap-6" : "grid lg:grid-cols-3 gap-6"}>
          {!cameFromHomework ? (
            <div className="lg:col-span-1">
              <Card>
                <CardHeader><CardTitle>Уроки курса</CardTitle></CardHeader>
                <CardContent>
                  {data.loading?.lessonsByCourse?.[String(courseId)] ? (
                    <div className="text-sm text-gray-600">Загрузка уроков...</div>
                  ) : lessons.length === 0 ? (
                    <div className="text-sm text-gray-600">Пока нет уроков в этом курсе.</div>
                  ) : (
                    <div className="space-y-2">
                      {lessons.map((lesson, idx) => {
                        const id = getLessonId(lesson) || String(idx);
                        const st = lessonHomeworkStatusMap.get(id);
                        const active = String(selectedLessonId) === String(id);

                        return (
                          <button
                            key={id}
                            onClick={() => setSelectedLessonId(id)}
                            className={[
                              "w-full text-left p-3 rounded-lg transition border",
                              active ? "bg-blue-100 border-blue-600" : "hover:bg-gray-100 border-gray-200",
                            ].join(" ")}
                            type="button"
                          >
                            <div className="flex items-center gap-3">
                              <LessonStatusIcon status={st} />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{lesson?.title || `Урок ${idx + 1}`}</p>
                                <p className="text-xs text-gray-600 truncate">{lesson?.description || ""}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          <div className={cameFromHomework ? "space-y-6" : "lg:col-span-2 space-y-6"}>
            {!currentLesson ? (
              <Card><CardContent className="py-12 text-center"><p className="text-gray-600">Выберите урок</p></CardContent></Card>
            ) : (
              <>
                <Card>
                  <CardHeader className="flex-row items-start justify-between">
                    <CardTitle className="min-w-0">{currentLesson?.title || "Урок"}</CardTitle>
                    {myHwForLesson?.status ? statusBadge(getHwStatus(myHwForLesson)) : null}
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">{renderVideo()}</div>
                    {currentLesson?.description ? <p className="mt-4 text-gray-700">{currentLesson.description}</p> : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Домашнее задание</CardTitle></CardHeader>
                  <CardContent>
                    {currentLesson?.homework_title || currentLesson?.homework_description || currentLesson?.homework_link ? (
                      <div className="mb-4 space-y-2">
                        {currentLesson?.homework_title ? <p className="font-medium">{currentLesson.homework_title}</p> : null}
                        {currentLesson?.homework_description ? (
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{currentLesson.homework_description}</p>
                        ) : (
                          <p className="text-sm text-gray-600">Можно отправить решение текстом и ссылкой.</p>
                        )}

                        {currentLesson?.homework_link ? (
                          <a
                            className="text-sm text-blue-600 hover:underline break-all inline-flex items-center gap-2"
                            href={currentLesson.homework_link}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <LinkIcon className="w-4 h-4" />
                            {currentLesson.homework_link}
                          </a>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mb-4 text-sm text-gray-600">Можно отправить решение текстом и ссылкой.</p>
                    )}

                    {getHwTeacherComment(myHwForLesson) ? (
                      <div className="mb-4 p-3 bg-blue-50 rounded">
                        <div className="text-sm font-medium mb-1">Комментарий преподавателя:</div>
                        <div className="text-sm whitespace-pre-wrap">{getHwTeacherComment(myHwForLesson)}</div>
                      </div>
                    ) : null}

                    <Textarea
                      placeholder="Ваш ответ или пояснение..."
                      value={homeworkText}
                      onChange={(e) => setHomeworkText(e.target.value)}
                      rows={5}
                      disabled={!canEdit || !!data.loading?.submitHomework}
                    />

                    <div className="mt-4 flex flex-col md:flex-row gap-3">
                      <div className="flex gap-2 w-full">
                        <Input
                          placeholder="Ссылка (GitHub, Google Drive...)"
                          value={linkInput}
                          onChange={(e) => setLinkInput(e.target.value)}
                          disabled={!canEdit || !!data.loading?.submitHomework}
                        />
                        <Button type="button" variant="outline" onClick={addLinkIntoHomeworkText} disabled={!canEdit || !!data.loading?.submitHomework}>
                          <LinkIcon className="w-4 h-4 mr-2" />
                          Добавить
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      {isAccepted ? (
                        <Button disabled className="bg-green-600 hover:bg-green-600">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Принято — отправка закрыта
                        </Button>
                      ) : (
                        <Button onClick={handleSendHomework} disabled={!canEdit || !!data.loading?.submitHomework}>
                          <Send className="w-4 h-4 mr-2" />
                          {data.loading?.submitHomework ? "Отправка..." : "Отправить на проверку"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentCoursePage;
