import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  PlayCircle,
  CheckCircle,
  Send,
  Link as LinkIcon,
  Clock,
  XCircle,
  Lock,
} from "lucide-react";

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
  if (status === "accepted")
    return <Badge className="bg-green-600 text-white border-transparent">Принято</Badge>;
  if (status === "rework") return <Badge variant="secondary">На доработку</Badge>;
  if (status === "declined") return <Badge variant="destructive">Отклонено</Badge>;
  if (status) return <Badge variant="outline">Отправлено</Badge>;
  return null;
}

function LessonStatusIcon({ status }) {
  if (status === "accepted") return <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />;
  if (status === "rework") return <Clock className="w-5 h-5 text-orange-600 flex-shrink-0" />;
  if (status === "declined") return <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />;
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

function getCourseId(course) {
  return String(course?.id ?? course?.course_id ?? "").trim();
}
function getLessonId(x) {
  return String(x?.id ?? x?.pk ?? "").trim();
}
function getHwLessonId(hw) {
  return String(hw?.lesson ?? hw?.lesson_id ?? hw?.lessonId ?? hw?.lesson?.id ?? hw?.lesson?.pk ?? "");
}
function getHwCourseId(hw) {
  return String(hw?.course_id ?? hw?.courseId ?? hw?.course ?? "");
}
function getHwStatus(hw) {
  return String(hw?.status ?? "").toLowerCase();
}
function getHwTeacherComment(hw) {
  return hw?.comment ?? "";
}
function getHwDate(hw) {
  return hw?.updated_at || hw?.created_at || "";
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
    data.loadMyCourses?.();
    data.loadMyHomeworks?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, courseId]);

  const course = useMemo(() => {
    const list = Array.isArray(data.myCourses) ? data.myCourses : [];
    return list.find((c) => String(getCourseId(c)) === String(courseId)) || null;
  }, [data.myCourses, courseId]);

  const lessons = useMemo(() => {
    const arr = Array.isArray(course?.lessons) ? course.lessons : [];
    return arr.filter((l) => !!getLessonId(l));
  }, [course?.lessons]);

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

  const isLessonOpened = useMemo(() => {
    return Boolean(currentLesson?.is_opened) || Boolean(openedLesson);
  }, [currentLesson?.is_opened, openedLesson]);

  const remainingVideos = useMemo(() => {
    const v = course?.access?.remaining_videos;
    return v == null ? null : Number(v);
  }, [course?.access?.remaining_videos]);

  const openCurrentLesson = useCallback(async () => {
    if (!lessonKey) return;
    setOpenErr("");
    const res = await data.openLesson?.(lessonKey, { force: true });
    if (res?.ok === false) {
      setOpenErr(res?.error || "Нет доступа к видео");
      toast.error(res?.error || "Нет доступа к видео");
    } else {
      toast.success("Видео открыто");
    }
  }, [data, lessonKey]);

  const myHomeworks = useMemo(
    () => (Array.isArray(data.myHomeworks) ? data.myHomeworks : []),
    [data.myHomeworks]
  );

  const myHwForLesson = useMemo(() => {
    if (!currentLesson) return null;
    const lid = getLessonId(currentLesson);
    const cid = String(courseId);

    const list = myHomeworks
      .filter((hw) => getHwCourseId(hw) === cid && getHwLessonId(hw) === lid)
      .slice()
      .sort(
        (a, b) =>
          new Date((b.updated_at || b.created_at || 0)) - new Date((a.updated_at || a.created_at || 0))
      );

    return list[0] || null;
  }, [myHomeworks, currentLesson, courseId]);

  useEffect(() => {
    // ✅ всегда показываем то, что студент уже отправлял
    setHomeworkText(myHwForLesson?.content || "");
    setLinkInput("");
  }, [myHwForLesson?.id]);

  const lessonHomeworkStatusMap = useMemo(() => {
    const map = new Map();
    const cid = String(courseId);

    const rank = (s) => (s === "accepted" ? 3 : s === "rework" ? 2 : s === "declined" ? 1 : s ? 0.5 : 0);

    myHomeworks
      .filter((hw) => getHwCourseId(hw) === cid)
      .forEach((hw) => {
        const lid = getHwLessonId(hw);
        const prev = map.get(lid);
        const st = getHwStatus(hw);
        if (!prev || rank(st) > rank(prev)) map.set(lid, st);
      });

    return map;
  }, [myHomeworks, courseId]);

  const hwStatus = getHwStatus(myHwForLesson);
  const isAccepted = hwStatus === "accepted";
  const canEdit = !!currentLesson && !isAccepted;

  const canResend = hwStatus === "rework" || hwStatus === "declined";
  const hasHw = !!myHwForLesson?.id;

  const actionLabel = useMemo(() => {
    if (isAccepted) return "Принято — отправка закрыта";
    if (!hasHw) return "Отправить";
    if (canResend) return "Отправить снова";
    return "Сохранить изменения";
  }, [isAccepted, hasHw, canResend]);

  const pickRawVideo = useCallback(() => {
    const o = openedLesson || {};
    const v = o.__picked_video || "";
    if (norm(v)) return v;

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
    const isLoading = !!data.loading?.openLesson?.[lessonKey];

    if (!isLessonOpened) {
      const noRemaining = remainingVideos !== null && Number(remainingVideos) <= 0;
      return (
        <div className="w-full h-full flex items-center justify-center text-white/80 text-center px-4">
          <div className="max-w-md">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Lock className="w-5 h-5" />
              <div className="font-medium">Видео закрыто</div>
            </div>
            <div className="text-sm text-white/70">
              Нажмите “Открыть видео”, чтобы получить доступ к уроку.
              {remainingVideos !== null ? (
                <>
                  <br />
                  Осталось открытий: <span className="font-semibold">{remainingVideos}</span>
                </>
              ) : null}
            </div>
            <div className="mt-4">
              <Button
                type="button"
                onClick={openCurrentLesson}
                disabled={isLoading || noRemaining}
                className="bg-white text-black hover:bg-white/90"
              >
                {isLoading ? "Открываем..." : "Открыть видео"}
              </Button>
              {noRemaining ? (
                <div className="mt-2 text-xs text-white/60">Нет доступных открытий видео</div>
              ) : null}
              {openErr ? <div className="mt-2 text-xs text-red-300">{openErr}</div> : null}
            </div>
          </div>
        </div>
      );
    }

    if (isLoading) {
      return <div className="w-full h-full flex items-center justify-center text-white/70">Загрузка видео...</div>;
    }

    const raw = pickRawVideo();
    const ytId = getYouTubeId(raw);

    if (ytId) {
      const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
        ytId
      )}?autoplay=0&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1`;

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
        {openErr || "Видео недоступно"}
      </div>
    );
  }, [
    data.loading?.openLesson,
    lessonKey,
    isLessonOpened,
    remainingVideos,
    openCurrentLesson,
    openErr,
    pickRawVideo,
  ]);

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

    const res = await data.submitHomework?.({
      lessonId: lid,
      content: text,
      homeworkId: myHwForLesson?.id ?? null,
    });

    if (res?.ok) {
      if (!hasHw) toast.success("Отправлено");
      else if (canResend) toast.success("Отправлено повторно");
      else toast.success("Изменения сохранены");
    } else {
      toast.error(res?.error || "Не удалось отправить ДЗ");
    }
  }

  if (!user || !courseId) return null;

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-12">
          <DashNavInline title="Раздел: Мои курсы → Курс" />
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">У вас нет доступа к этому курсу.</p>
              <div className="mt-4 flex gap-3 justify-center flex-wrap">
                <Link to="/dashboard?tab=activate">
                  <Button>Взять доступ</Button>
                </Link>
                <Link to="/dashboard?tab=courses">
                  <Button variant="outline">Назад</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const courseTitle = course?.title || course?.name || course?.access?.course_title || "Курс";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <DashNavInline title="Раздел: Мои курсы → Курс" />

        <div className="mb-6">
          <h1 className="text-3xl mb-2">{courseTitle}</h1>
          {course?.access?.remaining_videos != null ? (
            <p className="text-gray-600">
              Осталось открытий видео:{" "}
              <span className="font-medium">{course.access.remaining_videos}</span>
            </p>
          ) : (
            <p className="text-gray-600">Курс</p>
          )}
        </div>

        <div className={cameFromHomework ? "grid lg:grid-cols-1 gap-6" : "grid lg:grid-cols-3 gap-6"}>
          {!cameFromHomework ? (
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Уроки курса</CardTitle>
                </CardHeader>
                <CardContent>
                  {lessons.length === 0 ? (
                    <div className="text-sm text-gray-600">Пока нет уроков в этом курсе.</div>
                  ) : (
                    <div className="space-y-2">
                      {lessons.map((lesson, idx) => {
                        const id = getLessonId(lesson) || `lesson_${idx}`;
                        const st = lessonHomeworkStatusMap.get(id);
                        const active = String(selectedLessonId) === String(id);
                        const opened = !!lesson?.is_opened;

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
                                <p className="text-xs text-gray-600 truncate">
                                  {opened ? "Открыт" : "Не открыт"}
                                </p>
                              </div>
                              {!opened ? <Lock className="w-4 h-4 text-gray-500" /> : null}
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
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">Выберите урок</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader className="flex-row items-start justify-between">
                    <CardTitle className="min-w-0">{currentLesson?.title || "Урок"}</CardTitle>
                    {myHwForLesson?.status ? statusBadge(getHwStatus(myHwForLesson)) : null}
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">{renderVideo()}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Домашнее задание</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* ✅ показываем студенту, что он уже отправлял */}
                    {myHwForLesson ? (
                      <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-medium">Ваше отправленное ДЗ</div>
                          {statusBadge(hwStatus)}
                        </div>

                        {getHwDate(myHwForLesson) ? (
                          <div className="text-xs text-gray-500 mt-1">
                            Дата: {String(getHwDate(myHwForLesson))}
                          </div>
                        ) : null}

                        <div className="mt-3 text-sm whitespace-pre-wrap text-gray-800">
                          {myHwForLesson?.content || "—"}
                        </div>
                      </div>
                    ) : (
                      <p className="mb-4 text-sm text-gray-600">
                        Можно отправить решение текстом и ссылкой.
                      </p>
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
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addLinkIntoHomeworkText}
                          disabled={!canEdit || !!data.loading?.submitHomework}
                        >
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
                        <Button
                          onClick={handleSendHomework}
                          disabled={!canEdit || !!data.loading?.submitHomework}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {data.loading?.submitHomework ? "Отправка..." : actionLabel}
                        </Button>
                      )}
                    </div>

                    {!isAccepted && hasHw && !canResend ? (
                      <div className="mt-3 text-xs text-gray-500">
                        После первой отправки вы не создаёте новую заявку — вы редактируете текущую, пока преподаватель не отправит “На доработку/Отклонено”.
                      </div>
                    ) : null}
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
