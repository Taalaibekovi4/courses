// src/pages/StudentCoursePage.jsx
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
  RefreshCcw,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext.jsx";
import { useData } from "../contexts/DataContext.jsx";

import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { Textarea } from "../components/ui/textarea.jsx";
import { Input } from "../components/ui/input.jsx";
import { Badge } from "../components/ui/badge.jsx";

const norm = (s) => String(s ?? "").trim();

/* =========================
   ✅ ABS URL helper (чтобы /media/... работал)
   VITE_API_URL может быть:
   - https://site.com/api
   - https://site.com/api/
   - https://site.com
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

function isDirectVideoUrl(input) {
  const v = norm(String(input || "")).toLowerCase();
  if (!v) return false;
  if (v.startsWith("blob:")) return true;
  if (v.startsWith("/media/") || v.includes("/media/")) return true;
  if (v.startsWith("http://") || v.startsWith("https://")) {
    return (
      v.endsWith(".mp4") ||
      v.endsWith(".webm") ||
      v.endsWith(".ogg") ||
      v.includes(".mp4?") ||
      v.includes(".webm?") ||
      v.includes(".ogg?")
    );
  }
  return (
    v.endsWith(".mp4") ||
    v.endsWith(".webm") ||
    v.endsWith(".ogg") ||
    v.includes(".mp4?") ||
    v.includes(".webm?") ||
    v.includes(".ogg?")
  );
}

function getYouTubeId(raw) {
  const v = norm(raw);
  if (!v) return "";

  if (/^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

  try {
    const u = new URL(v);
    const host = (u.hostname || "").toLowerCase();

    if (host.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }

    if (host.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;

      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "embed");
      if (idx >= 0 && /^[a-zA-Z0-9_-]{11}$/.test(parts[idx + 1] || "")) return parts[idx + 1];

      const sidx = parts.findIndex((p) => p === "shorts");
      if (sidx >= 0 && /^[a-zA-Z0-9_-]{11}$/.test(parts[sidx + 1] || "")) return parts[sidx + 1];

      const lidx = parts.findIndex((p) => p === "live");
      if (lidx >= 0 && /^[a-zA-Z0-9_-]{11}$/.test(parts[lidx + 1] || "")) return parts[lidx + 1];
    }
  } catch (_) {}

  const short = v.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (short?.[1]) return short[1];

  const m = v.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (m?.[1]) return m[1];

  const emb = v.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (emb?.[1]) return emb[1];

  const shorts = v.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shorts?.[1]) return shorts[1];

  const live = v.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
  if (live?.[1]) return live[1];

  return "";
}

/** ✅ si параметр из YouTube ссылки (часто встречается в embed) */
function extractYouTubeSi(raw) {
  const v = norm(raw);
  if (!v) return "";
  try {
    const u = new URL(v);
    const si = u.searchParams.get("si");
    return si ? String(si) : "";
  } catch (_) {}
  const m = v.match(/[?&]si=([^&]+)/i);
  return m?.[1] ? String(m[1]) : "";
}

/** ✅ стабильный embed: youtube.com + referrerPolicy + si */
function buildYouTubeEmbedUrl({ videoId, rawUrl }) {
  const si = extractYouTubeSi(rawUrl);
  const base = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
  const params = new URLSearchParams();
  params.set("autoplay", "0");
  params.set("rel", "0");
  params.set("modestbranding", "1");
  params.set("iv_load_policy", "3");
  params.set("playsinline", "1");
  if (si) params.set("si", si);
  return `${base}?${params.toString()}`;
}

function statusBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "accepted") {
    return <Badge className="bg-green-600 text-white border-transparent">Принято</Badge>;
  }
  if (s === "examination") return <Badge variant="outline">На проверке</Badge>;
  if (s === "rework") return <Badge variant="secondary">На доработку</Badge>;
  if (s === "declined") return <Badge variant="destructive">Отклонено</Badge>;
  if (s) return <Badge variant="outline">Отправлено</Badge>;
  return null;
}

function LessonStatusIcon({ status }) {
  const s = String(status || "").toLowerCase();
  if (s === "accepted") return <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />;
  if (s === "examination") return <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />;
  if (s === "rework") return <Clock className="w-5 h-5 text-orange-600 flex-shrink-0" />;
  if (s === "declined") return <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />;
  return <PlayCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />;
}

/* =========================
   ✅ ВЕРХ НЕ ТРОГАЕМ: как было раньше
   ========================= */
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

/* =========================
   ✅ Attachments view (student) + abs url
   ========================= */
function AttachmentsViewStudent({ attachments }) {
  const list = Array.isArray(attachments) ? attachments : [];
  if (!list.length) return null;

  return (
    <div className="mt-2 space-y-1">
      {list.map((a, idx) => {
        const key = `${a?.type || "x"}_${idx}`;
        const url = a?.url || a?.file || a?.link || "";
        const name = a?.name || a?.filename || "Файл";
        return url ? (
          <a
            key={key}
            href={toAbsUrl(url)}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline break-all text-sm"
          >
            📎 {name}
          </a>
        ) : (
          <div key={key} className="text-sm text-gray-700">
            📎 {name}
          </div>
        );
      })}
    </div>
  );
}

/* =========================
   ✅ Chat bubbles (student left, teacher right)
   ========================= */
function Bubble({ side = "left", title, meta, children }) {
  const isLeft = side === "left";
  return (
    <div className={`flex ${isLeft ? "justify-start" : "justify-end"}`}>
      <div
        className={[
          "max-w-[860px] w-full sm:w-[92%] md:w-[85%] rounded-2xl border shadow-sm overflow-hidden",
          isLeft ? "bg-white" : "bg-blue-50",
        ].join(" ")}
      >
        <div className="px-4 py-3 border-b flex items-start justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{title}</div>
            {meta ? <div className="text-xs text-gray-500 mt-0.5 truncate">{meta}</div> : null}
          </div>
        </div>
        <div className="px-4 py-3">{children}</div>
      </div>
    </div>
  );
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

    setOpenErr("");

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

  const serverOpenedFlag = Boolean(currentLesson?.is_opened);
  const sessionOpenedFlag = Boolean(openedLesson);
  const lessonOpenedForUI = serverOpenedFlag || sessionOpenedFlag;

  const remainingVideos = useMemo(() => {
    const v = course?.access?.remaining_videos;
    return v == null ? null : Number(v);
  }, [course?.access?.remaining_videos]);

  const pickRawVideoFromOpened = useCallback(() => {
    const o = openedLesson || {};
    const picked = o.__picked_video || "";
    if (norm(picked)) return picked;

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

  const ensureVideoLoadedIfAlreadyOpened = useCallback(async () => {
    if (!lessonKey) return;
    if (!serverOpenedFlag) return;
    if (openedLesson) return;

    setOpenErr("");
    const res = await data.openLesson?.(lessonKey, { force: false });
    if (res?.ok === false) {
      setOpenErr(res?.error || "Не удалось загрузить видео");
    }
  }, [data, lessonKey, serverOpenedFlag, openedLesson]);

  useEffect(() => {
    ensureVideoLoadedIfAlreadyOpened();
  }, [ensureVideoLoadedIfAlreadyOpened]);

  const openCurrentLesson = useCallback(
    async ({ force }) => {
      if (!lessonKey) return;
      setOpenErr("");

      const res = await data.openLesson?.(lessonKey, { force: !!force });
      if (res?.ok === false) {
        setOpenErr(res?.error || "Нет доступа к видео");
        toast.error(res?.error || "Нет доступа к видео");
        return;
      }

      toast.success(force ? "Видео открыто" : "Видео загружено");
      data.loadMyCourses?.();
    },
    [data, lessonKey]
  );

  const myHomeworks = useMemo(
    () => (Array.isArray(data.myHomeworks) ? data.myHomeworks : []),
    [data.myHomeworks]
  );

  const myHwListForLesson = useMemo(() => {
    if (!currentLesson) return [];
    const lid = getLessonId(currentLesson);
    const cid = String(courseId);

    return myHomeworks
      .filter((hw) => getHwCourseId(hw) === cid && getHwLessonId(hw) === lid)
      .slice()
      .sort((a, b) => new Date(getHwDate(a) || 0) - new Date(getHwDate(b) || 0));
  }, [myHomeworks, currentLesson, courseId]);

  const lastHw = myHwListForLesson[myHwListForLesson.length - 1] || null;

  useEffect(() => {
    setHomeworkText(lastHw?.content || "");
    setLinkInput("");
  }, [lastHw?.id]);

  const lessonHomeworkStatusMap = useMemo(() => {
    const map = new Map();
    const cid = String(courseId);

    const rank = (s) =>
      s === "accepted"
        ? 4
        : s === "examination"
        ? 3
        : s === "rework"
        ? 2
        : s === "declined"
        ? 1
        : s
        ? 0.5
        : 0;

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

  const hwStatus = getHwStatus(lastHw);
  const isAccepted = hwStatus === "accepted";
  const hasHw = !!lastHw?.id;

  const canEdit = !!currentLesson && !isAccepted;

  const submitMode = useMemo(() => {
    if (!hasHw) return "create";
    if (hwStatus === "rework" || hwStatus === "declined") return "create_new_version";
    return "update_current";
  }, [hasHw, hwStatus]);

  const actionLabel = useMemo(() => {
    if (isAccepted) return "Принято — отправка закрыта";
    if (submitMode === "create") return "Отправить на проверку";
    if (submitMode === "create_new_version") return "Отправить исправленную версию";
    return "Сохранить изменения (пока на проверке)";
  }, [isAccepted, submitMode]);

  const renderVideo = useCallback(() => {
    const isLoading = !!data.loading?.openLesson?.[lessonKey];

    const raw = pickRawVideoFromOpened();
    const rawAbs = toAbsUrl(raw);

    const ytId = getYouTubeId(rawAbs) || getYouTubeId(raw);
    const directPlayable = isDirectVideoUrl(rawAbs) ? rawAbs : "";
    const hasPlayable = Boolean(ytId || directPlayable);

    if (!hasPlayable) {
      const noRemaining = remainingVideos !== null && Number(remainingVideos) <= 0;
      const canLoadWithoutSpend = serverOpenedFlag;

      return (
        <div className="w-full h-full flex items-center justify-center text-white/80 text-center px-4">
          <div className="max-w-md">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Lock className="w-5 h-5" />
              <div className="font-medium">
                {canLoadWithoutSpend ? "Видео доступно, но не загружено" : "Видео закрыто"}
              </div>
            </div>

            <div className="text-sm text-white/70">
              {canLoadWithoutSpend
                ? "Нажмите “Загрузить видео”, чтобы получить ссылку на воспроизведение."
                : "Нажмите “Открыть видео”, чтобы получить доступ к уроку."}

              {remainingVideos !== null ? (
                <>
                  <br />
                  Осталось открытий: <span className="font-semibold">{remainingVideos}</span>
                </>
              ) : null}
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
              {canLoadWithoutSpend ? (
                <Button
                  type="button"
                  onClick={() => openCurrentLesson({ force: false })}
                  disabled={isLoading}
                  className="bg-white text-black hover:bg-white/90"
                >
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  {isLoading ? "Загрузка..." : "Загрузить видео"}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => openCurrentLesson({ force: true })}
                  disabled={isLoading || noRemaining}
                  className="bg-white text-black hover:bg-white/90"
                >
                  {isLoading ? "Открываем..." : "Открыть видео"}
                </Button>
              )}

              {!canLoadWithoutSpend && noRemaining ? (
                <div className="w-full mt-2 text-xs text-white/60">Нет доступных открытий видео</div>
              ) : null}

              {openErr ? <div className="w-full mt-2 text-xs text-red-300">{openErr}</div> : null}
            </div>
          </div>
        </div>
      );
    }

    if (isLoading) {
      return <div className="w-full h-full flex items-center justify-center text-white/70">Загрузка видео...</div>;
    }

    if (ytId) {
      const src = buildYouTubeEmbedUrl({ videoId: ytId, rawUrl: rawAbs || raw });

      return (
        <iframe
          key={`yt_${lessonKey}_${ytId}`}
          title="YouTube video player"
          src={src}
          className="w-full h-full"
          frameBorder="0"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      );
    }

    return (
      <video
        key={`vd_${lessonKey}_${directPlayable}`}
        src={directPlayable}
        controls
        playsInline
        preload="metadata"
        className="w-full h-full object-contain bg-black"
      />
    );
  }, [
    data.loading?.openLesson,
    lessonKey,
    remainingVideos,
    openErr,
    pickRawVideoFromOpened,
    serverOpenedFlag,
    openCurrentLesson,
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
    const homeworkIdToSend = submitMode === "update_current" ? lastHw?.id : null;

    const res = await data.submitHomework?.({
      lessonId: lid,
      content: text,
      homeworkId: homeworkIdToSend,
    });

    if (res?.ok) {
      if (submitMode === "create") toast.success("Отправлено на проверку");
      else if (submitMode === "create_new_version") toast.success("Отправлено новой версией");
      else toast.success("Изменения сохранены (ДЗ всё ещё на проверке)");
      data.loadMyHomeworks?.();
    } else {
      toast.error(res?.error || "Не удалось отправить ДЗ");
    }
  }

  if (!user || !courseId) return null;

  if (!course) {
    return (
      <div className="min-h-[100dvh] w-full bg-gray-50 overflow-x-hidden">
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-8">
          <DashNavInline title="Раздел: Мои курсы → Курс" />
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">У вас нет доступа к этому курсу.</p>
              <div className="mt-4 flex gap-3 justify-center flex-wrap">
                <Link to="/dashboard?tab=activate">
                  <Button className="w-full sm:w-auto">Взять доступ</Button>
                </Link>
                <Link to="/dashboard?tab=courses">
                  <Button variant="outline" className="w-full sm:w-auto">
                    Назад
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const courseTitle = course?.title || course?.name || course?.access?.course_title || "Курс";

  const hwDesc =
    currentLesson?.homework_description ??
    currentLesson?.homeworkDescription ??
    currentLesson?.hw_description ??
    currentLesson?.hwDescription ??
    "";

  const hwFile =
    currentLesson?.homework_file ??
    currentLesson?.homeworkFile ??
    currentLesson?.homework_file_url ??
    currentLesson?.homeworkFileUrl ??
    currentLesson?.hw_file ??
    currentLesson?.hwFile ??
    "";

  return (
    <div className="min-h-[100dvh] w-full bg-gray-50 overflow-x-hidden">
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <DashNavInline title="Раздел: Мои курсы → Курс" />

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl mb-2 break-words">{courseTitle}</h1>
          {course?.access?.remaining_videos != null ? (
            <p className="text-sm sm:text-base text-gray-600">
              Осталось открытий видео: <span className="font-medium">{course.access.remaining_videos}</span>
            </p>
          ) : (
            <p className="text-sm sm:text-base text-gray-600">Курс</p>
          )}
        </div>

        <div
          className={[
            "grid gap-4 sm:gap-6",
            cameFromHomework ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3",
          ].join(" ")}
        >
          {!cameFromHomework ? (
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Уроки курса</CardTitle>
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

                        const openedInSession = Boolean((data.openedLessons || {})[id]);
                        const opened = Boolean(lesson?.is_opened) || openedInSession;

                        return (
                          <button
                            key={id}
                            onClick={() => setSelectedLessonId(id)}
                            className={[
                              "w-full text-left p-3 rounded-lg transition border overflow-hidden",
                              active ? "bg-blue-100 border-blue-600" : "hover:bg-gray-100 border-gray-200",
                            ].join(" ")}
                            type="button"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <LessonStatusIcon status={st} />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{lesson?.title || `Урок ${idx + 1}`}</p>
                                <p className="text-xs text-gray-600 truncate">{opened ? "Открыт" : "Не открыт"}</p>
                              </div>
                              {!opened ? <Lock className="w-4 h-4 text-gray-500 flex-shrink-0" /> : null}
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

          <div className={cameFromHomework ? "space-y-4 sm:space-y-6" : "lg:col-span-2 space-y-4 sm:space-y-6"}>
            {!currentLesson ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">Выберите урок</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <CardTitle className="min-w-0 break-words">{currentLesson?.title || "Урок"}</CardTitle>
                    <div className="flex-shrink-0">{lastHw?.status ? statusBadge(getHwStatus(lastHw)) : null}</div>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-black rounded-xl overflow-hidden">{renderVideo()}</div>

                    {lessonOpenedForUI && !openedLesson ? (
                      <div className="mt-3 text-xs text-gray-500">
                        Урок отмечен как открытый, но ссылка на видео не загружена (обычно после обновления страницы).
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Домашнее задание</CardTitle>
                  </CardHeader>

                  <CardContent>
                    {hwDesc ? (
                      <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="text-sm font-medium mb-1">Задание от преподавателя:</div>
                        <div className="text-sm whitespace-pre-wrap text-gray-800 break-words">{hwDesc}</div>
                      </div>
                    ) : null}

                    {hwFile ? (
                      <div className="mb-6">
                        <a
                          href={toAbsUrl(hwFile)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline break-all text-sm"
                        >
                          📎 Материал к домашнему заданию
                        </a>
                      </div>
                    ) : null}

                    <div className="mb-6">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                        <div className="font-semibold">Диалог по ДЗ</div>
                        <div className="flex-shrink-0">{lastHw?.status ? statusBadge(getHwStatus(lastHw)) : null}</div>
                      </div>

                      {myHwListForLesson.length === 0 ? (
                        <div className="text-sm text-gray-600">
                          Пока нет отправок. Напишите ответ и отправьте на проверку.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {myHwListForLesson.map((hw, idx) => {
                            const st = getHwStatus(hw);
                            const dt = getHwDate(hw);
                            const meta = dt ? new Date(dt).toLocaleString() : "";
                            const vLabel = `Версия #${idx + 1} • ${meta}`;

                            return (
                              <div key={String(hw?.id || idx)} className="space-y-2">
                                <Bubble side="left" title="Студент" meta={vLabel}>
                                  {hw?.content ? (
                                    <div className="text-sm whitespace-pre-wrap break-words text-gray-800">
                                      {hw.content}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-600">—</div>
                                  )}
                                  <AttachmentsViewStudent attachments={hw?.attachments} />
                                  <div className="mt-2">{statusBadge(st)}</div>
                                </Bubble>

                                {getHwTeacherComment(hw) ? (
                                  <Bubble
                                    side="right"
                                    title="Преподаватель"
                                    meta={st === "accepted" ? "Результат: принято" : "Комментарий"}
                                  >
                                    <div className="text-sm whitespace-pre-wrap break-words">
                                      {getHwTeacherComment(hw)}
                                    </div>
                                  </Bubble>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border bg-white p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                        <div className="font-semibold">Ваш ответ</div>
                        <div className="flex-shrink-0">
                          {isAccepted ? (
                            <Badge className="bg-green-600 text-white border-transparent">Закрыто</Badge>
                          ) : submitMode === "update_current" ? (
                            <Badge variant="secondary">Можно редактировать до проверки</Badge>
                          ) : (
                            <Badge variant="outline">Новая отправка</Badge>
                          )}
                        </div>
                      </div>

                      <Textarea
                        placeholder="Ваш ответ или пояснение..."
                        value={homeworkText}
                        onChange={(e) => setHomeworkText(e.target.value)}
                        rows={6}
                        disabled={!canEdit || !!data.loading?.submitHomework}
                      />

                      {/* ✅ FIX 320px: ссылка + кнопка не ломают ширину */}
                      <div className="mt-4">
                        <div className="flex flex-col sm:flex-row gap-2 w-full">
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
                            className="w-full sm:w-auto"
                          >
                            <LinkIcon className="w-4 h-4 mr-2" />
                            Добавить
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        {isAccepted ? (
                          <Button disabled className="bg-green-600 hover:bg-green-600 w-full sm:w-auto">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Принято — отправка закрыта
                          </Button>
                        ) : (
                          <Button
                            onClick={handleSendHomework}
                            disabled={!canEdit || !!data.loading?.submitHomework}
                            className="w-full sm:w-auto"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {data.loading?.submitHomework ? "Отправка..." : actionLabel}
                          </Button>
                        )}
                      </div>

                      {submitMode === "update_current" && !isAccepted ? (
                        <div className="mt-2 text-xs text-gray-500">
                          Вы можете менять текст сколько угодно — учитель увидит актуальную версию, пока не проверил.
                        </div>
                      ) : null}

                      {(hwStatus === "rework" || hwStatus === "declined") && !isAccepted ? (
                        <div className="mt-2 text-xs text-gray-500">
                          После “На доработку/Отклонено” отправка создаст новую версию, но всё останется в одном блоке.
                        </div>
                      ) : null}
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
