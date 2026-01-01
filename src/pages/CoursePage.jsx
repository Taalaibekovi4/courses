// src/pages/CoursePage.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import axios from "axios";

import { Button } from "../components/ui/button.jsx";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { PlayCircle, CheckCircle, X, BookOpen, GraduationCap, ShoppingCart } from "lucide-react";

const WHATSAPP_NUMBER = "996221000953";
const PREVIEW_SECONDS = 5;

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80";

const fullBleed = "w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]";

function pickCourseIdFromParams(params) {
  return String(params?.id ?? params?.slug ?? params?.courseId ?? params?.pk ?? "").trim();
}

function extractArrayAny(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  const keys = ["results", "items", "data", "lessons", "lesson_list", "lessons_list", "list"];
  for (const k of keys) {
    if (Array.isArray(data?.[k])) return data[k];
  }
  if (data?.data && typeof data.data === "object") {
    for (const k of keys) {
      if (Array.isArray(data?.data?.[k])) return data.data[k];
    }
  }
  return [];
}

function getCourseId(obj) {
  return obj?.id ?? obj?.pk ?? obj?.courseId ?? obj?.course_id ?? null;
}
function getCourseTitle(obj) {
  return obj?.title || obj?.name || "Курс";
}
function getCourseDesc(obj) {
  return obj?.description || obj?.desc || "";
}
function getTeacherNameFromAny(obj) {
  return (
    obj?.instructor_name ||
    obj?.instructorName ||
    obj?.teacherName ||
    obj?.teacher_name ||
    obj?.teacher?.full_name ||
    obj?.teacher?.username ||
    obj?.teacher?.email ||
    obj?.instructor?.full_name ||
    obj?.instructor?.username ||
    obj?.instructor?.email ||
    "—"
  );
}
function getCategoryNameFromAny(obj) {
  return obj?.categoryName || obj?.category_name || obj?.category?.name || obj?.category_title || "";
}

function normalizeLessonCourseId(l) {
  const c = l?.course;
  const cid =
    l?.courseId ??
    l?.course_id ??
    (c && typeof c === "object" ? c.id : c) ??
    l?.course?.id ??
    "";
  return String(cid ?? "");
}

function pickLessonVideo(obj) {
  const v =
    obj?.youtube_video_id ||
    obj?.youtubeVideoId ||
    obj?.youtube_id ||
    obj?.youtubeId ||
    obj?.video_url ||
    obj?.videoUrl ||
    obj?.video ||
    obj?.url ||
    "";
  return String(v || "").trim();
}

function extractLessonsFromCourse(courseLike) {
  const raw =
    courseLike?.lessons ||
    courseLike?.lesson_list ||
    courseLike?.lessons_list ||
    courseLike?._raw?.lessons ||
    courseLike?._raw?.lesson_list ||
    courseLike?._raw?.lessons_list ||
    null;

  const arr = extractArrayAny(raw);
  if (!arr.length) return [];

  return arr.map((l, idx) => ({
    id: l?.id ?? l?.pk ?? `embedded-${idx + 1}`,
    title: l?.title || l?.name || `Урок ${idx + 1}`,
    description: l?.description || "",
    order: l?.order ?? idx + 1,
    videoUrl: pickLessonVideo(l),
    youtubeStatus: String(l?.youtube_status || ""),
    youtubeError: String(l?.youtube_error || ""),
    homeworkDescription: l?.homework_description || "",
    courseId: normalizeLessonCourseId(l),
    _raw: l,
  }));
}

function normalizeLessonsList(arr) {
  const list = extractArrayAny(arr);
  return (list || []).map((l, idx) => ({
    id: l?.id ?? l?.pk ?? `lesson-${idx + 1}`,
    title: l?.title || l?.name || `Урок ${idx + 1}`,
    description: l?.description || "",
    order: l?.order ?? idx + 1,
    videoUrl: pickLessonVideo(l),
    youtubeStatus: String(l?.youtube_status || ""),
    youtubeError: String(l?.youtube_error || ""),
    homeworkDescription: l?.homework_description || "",
    courseId: normalizeLessonCourseId(l),
    _raw: l,
  }));
}

/** ✅ теперь умеет shorts и live */
function getYouTubeId(input) {
  const s = String(input || "").trim();
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
}

async function tryGet(apiInstance, path, config = {}) {
  try {
    const r = await apiInstance.get(path, config);
    return { ok: true, data: r.data };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function ensureYouTubeScriptWithTimeout(ms = 3500) {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(true);

    const existing = document.getElementById("yt-iframe-api");
    let done = false;

    const finish = (ok) => {
      if (done) return;
      done = true;
      resolve(ok);
    };

    const t = setTimeout(() => finish(false), ms);

    const check = () => {
      if (window.YT && window.YT.Player) {
        clearTimeout(t);
        finish(true);
      }
    };

    if (existing) {
      const i = setInterval(() => {
        check();
        if (done) clearInterval(i);
      }, 100);
      return;
    }

    const tag = document.createElement("script");
    tag.id = "yt-iframe-api";
    tag.src = "https://www.youtube.com/iframe_api";
    tag.onerror = () => finish(false);
    document.body.appendChild(tag);

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        if (typeof prev === "function") prev();
      } catch (_) {}
      check();
    };
  });
}

function normalizeTariff(t) {
  return {
    id: String(t?.id ?? ""),
    title: String(t?.title ?? ""),
    price: String(t?.price ?? ""),
    courseId: String(t?.course ?? t?.course_id ?? t?.courseId ?? ""),
    _raw: t,
  };
}

function moneySom(v) {
  const s = String(v ?? "").trim();
  if (!s) return "—";
  return `${s} сом`;
}

export function CoursePage() {
  const params = useParams();
  const courseId = pickCourseIdFromParams(params);

  const location = useLocation();
  const preview = location?.state?.coursePreview || null;

  // ✅ если у тебя нет Vite proxy — поставь VITE_API_URL="http://127.0.0.1:8000/api"
  const API_BASE = (import.meta?.env?.VITE_API_URL || "/api").trim();

  const publicApi = useMemo(() => axios.create({ baseURL: API_BASE, timeout: 20000 }), [API_BASE]);

  const [course, setCourse] = useState(() => {
    const pid = getCourseId(preview);
    if (pid != null && String(pid) === String(courseId)) return preview;
    if (preview?.slug && String(preview.slug) === String(courseId)) return preview;
    return null;
  });

  const [courseLoading, setCourseLoading] = useState(false);

  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState("");

  const [tariffs, setTariffs] = useState([]);
  const [tariffsLoading, setTariffsLoading] = useState(false);
  const [tariffsError, setTariffsError] = useState("");

  const [selectedLessonIds, setSelectedLessonIds] = useState([]);
  const [activeLessonId, setActiveLessonId] = useState(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [isVideoEnded, setIsVideoEnded] = useState(false);

  const [fallbackIframeId, setFallbackIframeId] = useState("");

  const tariffsRef = useRef(null);

  const ytWrapRef = useRef(null);
  const ytMountRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytTimerRef = useRef(null);

  // ✅ guard от двойного useEffect в React 18 StrictMode (DEV)
  const didLoadLessonsRef = useRef(false);

  const courseLessonsCount = useMemo(() => {
    const c = course?._raw || course || {};
    const n = Number(c?.lessonsCount ?? c?.lessons_count ?? c?.lessonsTotal ?? c?.lessons_total ?? 0);
    return Number.isFinite(n) ? n : 0;
  }, [course]);

  const categoryName = useMemo(
    () => getCategoryNameFromAny(course) || course?.categoryName || "Категория",
    [course]
  );
  const teacherName = useMemo(
    () => getTeacherNameFromAny(course) || course?.teacherName || "—",
    [course]
  );

  const loadCourse = useCallback(async () => {
    const cid = String(courseId || "").trim();
    if (!cid) return;

    setCourseLoading(true);
    try {
      const res = await tryGet(publicApi, `/courses/${cid}/`);
      if (!res.ok || !res.data) {
        setCourse(null);
        return;
      }

      const fetched = res.data;
      setCourse({
        id: getCourseId(fetched) ?? preview?.id ?? cid,
        title: getCourseTitle(fetched) || preview?.title || "Курс",
        description: getCourseDesc(fetched) || preview?.description || "",
        lessonsCount: fetched?.lessonsCount ?? fetched?.lessons_count ?? preview?.lessonsCount ?? 0,
        teacherName: getTeacherNameFromAny(fetched) !== "—" ? getTeacherNameFromAny(fetched) : preview?.teacherName || "—",
        categoryName: getCategoryNameFromAny(fetched) || preview?.categoryName || "",
        _raw: fetched,
      });
    } finally {
      setCourseLoading(false);
    }
  }, [courseId, publicApi, preview]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const loadTariffs = useCallback(async () => {
    const cid = getCourseId(course) ?? courseId;
    if (!cid) return;

    setTariffsLoading(true);
    setTariffsError("");

    try {
      const r1 = await tryGet(publicApi, "/tariffs/", { params: { course_id: cid } });
      let arr = r1.ok ? extractArrayAny(r1.data) : [];

      if (!arr.length) {
        const r2 = await tryGet(publicApi, "/tariffs/", { params: { course: cid } });
        arr = r2.ok ? extractArrayAny(r2.data) : [];
      }

      const normed = (arr || []).map(normalizeTariff).filter((t) => t.id);
      const filtered = normed.filter((t) => String(t.courseId || "") === String(cid));
      setTariffs(filtered.length ? filtered : normed);
    } catch (_) {
      setTariffsError("Не удалось загрузить тарифы");
      setTariffs([]);
    } finally {
      setTariffsLoading(false);
    }
  }, [publicApi, course, courseId]);

  useEffect(() => {
    loadTariffs();
  }, [loadTariffs]);

  const loadLessons = useCallback(async () => {
    const cid = getCourseId(course);
    if (!cid) return;

    setLessonsLoading(true);
    setLessonsError("");

    try {
      // ✅ 1) embedded lessons в /courses/{id}/ (самый правильный вариант)
      const embedded = extractLessonsFromCourse(course);
      if (embedded.length) {
        let filtered = embedded.filter((l) => String(l.courseId || "") === String(cid));
        if (!filtered.length) filtered = embedded;
        filtered.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
        setLessons(filtered);
        return;
      }

      // ✅ 2) единственный fallback: /lessons/
      let res = await tryGet(publicApi, "/lessons/", { params: { course_id: cid } });
      let arr = res.ok ? extractArrayAny(res.data) : [];

      if (!arr.length) {
        res = await tryGet(publicApi, "/lessons/", { params: { course: cid } });
        arr = res.ok ? extractArrayAny(res.data) : [];
      }

      if (arr.length) {
        const normalized = normalizeLessonsList(arr);
        let filtered = normalized.filter((l) => String(l.courseId || "") === String(cid));
        if (!filtered.length) filtered = normalized;
        filtered.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
        setLessons(filtered);
        return;
      }

      setLessons([]);
      if (courseLessonsCount > 0) {
        setLessonsError("Уроки в курсе есть, но сервер не отдаёт публичный список уроков. Добавь lessons в /courses/{id}/ или сделай публичный эндпоинт /lessons/?course_id=.");
      }
    } finally {
      setLessonsLoading(false);
    }
  }, [course, publicApi, courseLessonsCount]);

  // ✅ anti-spam: один раз при заходе на страницу
  useEffect(() => {
    if (didLoadLessonsRef.current) return;
    if (!course) return;
    didLoadLessonsRef.current = true;
    loadLessons();
  }, [course, loadLessons]);

  const lessonsById = useMemo(() => {
    const map = new Map();
    (lessons || []).forEach((l) => map.set(l.id, l));
    return map;
  }, [lessons]);

  const activeLesson = useMemo(() => {
    const first = (lessons || [])[0] || null;
    if (!activeLessonId) return first;
    return lessonsById.get(activeLessonId) || first;
  }, [activeLessonId, lessons, lessonsById]);

  const selectedLessons = useMemo(() => {
    return (selectedLessonIds || []).map((id) => lessonsById.get(id)).filter(Boolean);
  }, [selectedLessonIds, lessonsById]);

  const toggleSelectLesson = useCallback((lessonId) => {
    setSelectedLessonIds((prev) => {
      const set = new Set(prev);
      if (set.has(lessonId)) set.delete(lessonId);
      else set.add(lessonId);
      return Array.from(set);
    });
  }, []);

  const stopYouTubeTimer = useCallback(() => {
    if (ytTimerRef.current) {
      clearInterval(ytTimerRef.current);
      ytTimerRef.current = null;
    }
  }, []);

  const destroyYouTubePlayer = useCallback(() => {
    stopYouTubeTimer();
    const p = ytPlayerRef.current;
    ytPlayerRef.current = null;
    if (p && typeof p.destroy === "function") {
      try {
        p.destroy();
      } catch (_) {}
    }
  }, [stopYouTubeTimer]);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setIsPaywallOpen(false);
    setIsVideoReady(false);
    setVideoError("");
    setIsVideoEnded(false);
    setFallbackIframeId("");
    destroyYouTubePlayer();
  }, [destroyYouTubePlayer]);

  const openPreview = useCallback((lessonId) => {
    setActiveLessonId(lessonId);
    setIsPaywallOpen(false);
    setIsPreviewOpen(true);
    setIsVideoReady(false);
    setVideoError("");
    setIsVideoEnded(false);
    setFallbackIframeId("");
  }, []);

  useEffect(() => {
    return () => destroyYouTubePlayer();
  }, [destroyYouTubePlayer]);

  useEffect(() => {
    if (!isPreviewOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isPreviewOpen]);

  useEffect(() => {
    if (!isPreviewOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPreviewOpen, closePreview]);

  const clampPreviewYouTube = useCallback(() => {
    const p = ytPlayerRef.current;
    if (!p || typeof p.getCurrentTime !== "function") return;

    const t = Number(p.getCurrentTime() || 0);
    if (t >= PREVIEW_SECONDS) {
      try {
        p.pauseVideo();
        p.seekTo(PREVIEW_SECONDS, true);
      } catch (_) {}
      setIsPaywallOpen(true);
      stopYouTubeTimer();
    }
  }, [stopYouTubeTimer]);

  const startYouTubeTimer = useCallback(() => {
    stopYouTubeTimer();
    ytTimerRef.current = setInterval(clampPreviewYouTube, 200);
  }, [clampPreviewYouTube, stopYouTubeTimer]);

  const initYouTubePlayer = useCallback(
    async (videoId) => {
      const ok = await ensureYouTubeScriptWithTimeout(3500);

      if (!ok) {
        setFallbackIframeId(videoId);
        setIsVideoReady(true);
        setVideoError("");
        setTimeout(() => setIsPaywallOpen(true), PREVIEW_SECONDS * 1000);
        return;
      }

      if (!ytMountRef.current) return;

      destroyYouTubePlayer();

      setFallbackIframeId("");
      setIsVideoReady(false);
      setVideoError("");
      setIsVideoEnded(false);

      try {
        ytPlayerRef.current = new window.YT.Player(ytMountRef.current, {
          videoId,
          width: "100%",
          height: "100%",
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            iv_load_policy: 3,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              setIsVideoReady(true);
              setVideoError("");
              try {
                e.target.seekTo(0, true);
                e.target.playVideo();
              } catch (_) {}
              startYouTubeTimer();
            },
            onStateChange: (e) => {
              if (!window.YT) return;
              if (e?.data === window.YT.PlayerState.ENDED) {
                stopYouTubeTimer();
                setIsVideoEnded(true);
              }
            },
            onError: () => {
              setVideoError("Видео не воспроизводится. Проверь youtube_video_id на бэке.");
              setIsVideoReady(false);
              setIsVideoEnded(false);
              stopYouTubeTimer();
            },
          },
        });
      } catch (_) {
        setVideoError("Не удалось загрузить плеер.");
        setIsVideoReady(false);
        setIsVideoEnded(false);
        stopYouTubeTimer();
      }
    },
    [destroyYouTubePlayer, startYouTubeTimer, stopYouTubeTimer]
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!isPreviewOpen) return;

      setIsPaywallOpen(false);
      setIsVideoReady(false);
      setVideoError("");
      setIsVideoEnded(false);
      setFallbackIframeId("");

      const l = activeLesson;
      if (!l) {
        setVideoError("Урок не найден.");
        return;
      }

      const raw = String(l?.videoUrl || pickLessonVideo(l?._raw) || "").trim();
      const ytId = getYouTubeId(raw);

      if (!raw) {
        setVideoError("В этом уроке нет видео (youtube_video_id пустой на сервере).");
        return;
      }
      if (!ytId) {
        setVideoError("Неверная ссылка/ID. Нужен YouTube URL или videoId (11 символов).");
        return;
      }

      if (!alive) return;
      setTimeout(() => initYouTubePlayer(ytId), 50);
    })();

    return () => {
      alive = false;
    };
  }, [isPreviewOpen, activeLesson, initYouTubePlayer]);

  const scrollToTariffs = useCallback(() => {
    const el = tariffsRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  function generateWhatsAppTariffLink(t) {
    const msg = `Хочу купить доступ к курсу: ${getCourseTitle(course)}
Преподаватель: ${teacherName}
Тариф: ${t?.title || t?.id}
Цена: ${t?.price || ""} сом`;

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  }

  function generateWhatsAppSelectedLessonsLink() {
    const count = selectedLessons.length;
    if (!count) return "#";

    const list = selectedLessons.map((l, i) => `${i + 1}) ${l.title}`).join("\n");

    const msg = `Хочу доступ к урокам курса: ${getCourseTitle(course)}
Преподаватель: ${teacherName}
Нужно уроков: ${count}

Список уроков:
${list}`;

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  }

  if (!course && !courseLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="app-container py-12">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">Курс не найден</p>
              <div className="mt-4">
                <Link to="/courses">
                  <Button variant="outline">Назад к курсам</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const coverUrl = FALLBACK_COVER;

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <section className={`relative text-white overflow-hidden ${fullBleed}`}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${coverUrl})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-700/85 to-purple-700/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />

        <div className="relative app-container py-12">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-white/15 text-white border-white/20" variant="secondary">
                {categoryName}
              </Badge>

              <span className="inline-flex items-center gap-2 text-sm bg-white/10 border border-white/15 rounded-md px-3 py-2">
                <BookOpen className="w-4 h-4" />
                {courseLessonsCount || lessons.length || 0} уроков
              </span>

              <span className="inline-flex items-center gap-2 text-sm bg-white/10 border border-white/15 rounded-md px-3 py-2">
                <GraduationCap className="w-4 h-4" />
                {teacherName}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl mt-4 leading-tight">{getCourseTitle(course)}</h1>
            <p className="text-lg sm:text-xl text-white/90 mt-3 max-w-3xl">{getCourseDesc(course)}</p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-gray-50 to-transparent" />
      </section>

      <div className="app-container py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle>Программа курса</CardTitle>
                <Button variant="outline" onClick={() => loadLessons()} disabled={lessonsLoading}>
                  Обновить
                </Button>
              </CardHeader>

              <CardContent>
                {lessonsLoading && (
                  <div className="py-6 text-center text-gray-600">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700 mx-auto" />
                    <div className="mt-2">Загружаем уроки...</div>
                  </div>
                )}

                {!lessonsLoading && lessons.length === 0 && (
                  <div className="py-6 text-center">
                    <div className="text-gray-900 font-semibold">
                      {lessonsError
                        ? "Не удалось показать список уроков."
                        : courseLessonsCount > 0
                          ? "Уроки в курсе есть, но список не пришёл."
                          : "Пока нет уроков."}
                    </div>

                    {lessonsError ? (
                      <div className="mt-2 text-sm text-gray-600 max-w-xl mx-auto">{lessonsError}</div>
                    ) : null}

                    <div className="mt-4">
                      <Button onClick={() => loadLessons()}>Проверить снова</Button>
                    </div>
                  </div>
                )}

                {!lessonsLoading && lessons.length > 0 && (
                  <div className="space-y-3">
                    {lessons.map((lesson, index) => {
                      const isSelected = selectedLessonIds.includes(lesson.id);

                      return (
                        <div
                          key={lesson.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleSelectLesson(lesson.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") toggleSelectLesson(lesson.id);
                          }}
                          className={[
                            "group flex items-start gap-3 p-4 rounded-2xl border transition cursor-pointer",
                            "bg-white hover:bg-gray-50",
                            isSelected ? "border-green-300 ring-1 ring-green-200" : "border-gray-200",
                          ].join(" ")}
                        >
                          <div
                            className={[
                              "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm mt-0.5 font-semibold",
                              isSelected ? "bg-green-600 text-white" : "bg-gray-100 text-gray-900",
                            ].join(" ")}
                          >
                            {index + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <h4 className="font-semibold text-gray-900 truncate">{lesson.title}</h4>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{lesson.description}</p>

                                {lesson.homeworkDescription ? (
                                  <div className="mt-2 text-xs text-blue-700 inline-flex items-center gap-1 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Домашнее задание
                                  </div>
                                ) : null}
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPreview(lesson.id);
                                }}
                                className="shrink-0 inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition"
                                aria-label="Смотреть"
                              >
                                <PlayCircle className="w-5 h-5 text-gray-700" />
                                <span className="hidden sm:inline text-gray-800">Смотреть</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-0 shadow-sm lg:sticky lg:top-24">
              <CardHeader>
                <CardTitle>Тарифы</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div ref={tariffsRef} />

                {tariffsLoading ? (
                  <div className="py-2 text-sm text-gray-600">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-700" />
                    <div className="mt-2">Загрузка тарифов...</div>
                  </div>
                ) : tariffsError ? (
                  <div className="text-sm text-red-600">{tariffsError}</div>
                ) : tariffs.length === 0 ? (
                  <div className="text-sm text-gray-600">Тарифы пока не добавлены.</div>
                ) : (
                  <div className="space-y-3">
                    {tariffs.map((t) => (
                      <div key={t.id} className="rounded-2xl border border-gray-200 p-4 bg-white">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{t.title || `Тариф #${t.id}`}</div>
                            <div className="text-sm text-gray-600 mt-1">{moneySom(t.price)}</div>
                          </div>

                          <a
                            href={generateWhatsAppTariffLink(t)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0"
                          >
                            <Button variant="outline" className="gap-2">
                              <ShoppingCart className="w-4 h-4" />
                              Купить
                            </Button>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-2xl border border-gray-200 p-4 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Выбранные уроки</div>
                    <Badge variant="secondary">{selectedLessons.length}</Badge>
                  </div>

                  {selectedLessons.length > 0 ? (
                    <div className="mt-3 space-y-2 max-h-40 overflow-auto pr-1">
                      {selectedLessons.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-start justify-between gap-3 text-sm border border-gray-100 bg-gray-50 rounded-xl p-2"
                        >
                          <span className="text-gray-800 leading-snug">{l.title}</span>
                          <button
                            type="button"
                            onClick={() => toggleSelectLesson(l.id)}
                            className="text-gray-500 hover:text-red-600 transition"
                            aria-label="Убрать"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-600">Выбери уроки слева — и купи их одним сообщением.</p>
                  )}

                  <a
                    className={`mt-4 block ${selectedLessons.length ? "" : "pointer-events-none opacity-50"}`}
                    href={generateWhatsAppSelectedLessonsLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="w-full" variant="outline">
                      Купить выбранные уроки
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70" />

          <div className="relative z-10 w-full max-w-3xl bg-white rounded-2xl overflow-hidden shadow-xl border border-white/10">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-semibold truncate pr-3">{activeLesson?.title || "Просмотр урока"}</div>
              <button
                type="button"
                onClick={closePreview}
                className="p-2 rounded-xl hover:bg-gray-100 transition"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-gray-950">
              <div ref={ytWrapRef} className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                {fallbackIframeId ? (
                  <iframe
                    title="lesson-video"
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube-nocookie.com/embed/${fallbackIframeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div ref={ytMountRef} className="absolute inset-0 w-full h-full" />
                )}

                {!videoError && isPaywallOpen && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-30">
                    <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-xl">
                      <div className="text-lg font-semibold">У вас нет доступа</div>
                      <p className="text-sm text-gray-600 mt-1">
                        Вы можете посмотреть только первые {PREVIEW_SECONDS} секунд. Чтобы получить полный доступ — купите тариф.
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <Button variant="outline" onClick={closePreview}>
                          Закрыть
                        </Button>
                        <Button
                          onClick={() => {
                            closePreview();
                            setTimeout(() => scrollToTariffs(), 100);
                          }}
                        >
                          Купить доступ
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {videoError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 px-6 text-center z-30">
                    <div className="text-base font-semibold mb-2">Видео не загрузилось</div>
                    <div className="text-sm text-white/70 break-words">{videoError}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-600" />
          </div>
        </div>
      )}
    </div>
  );
}

export default CoursePage;
